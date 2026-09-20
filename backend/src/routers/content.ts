import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, requirePermission, protectedProcedure } from "../trpc/trpc.js";
import {
  buildStorageKey,
  deleteObject,
  getDownloadUrl,
  getObjectBuffer,
  getUploadUrl,
  isStorageConfigured,
  putObjectBuffer,
} from "../storage/r2.js";
import { getStreamingUrl, isCdnConfigured } from "../storage/cdn.js";
import { extractScormPackage, ScormExtractionError } from "../scorm/extract.js";

/**
 * Prefers the Cloudflare Worker/CDN path (`storage-worker/` — Worker → R2
 * binding, all inside Cloudflare's network) over a direct R2 presigned URL.
 * The direct-R2 fallback exists only for the gap between "storage is
 * configured" and "the Worker is actually deployed" — once
 * `CONTENT_WORKER_URL`/`CONTENT_SIGNING_SECRET` are set, every playback URL
 * this router hands out switches to the CDN automatically, no code change
 * needed.
 */
export async function resolvePlaybackUrl(storageKey: string | null): Promise<string | undefined> {
  if (!storageKey) return undefined;
  if (isCdnConfigured()) return getStreamingUrl(storageKey);
  if (isStorageConfigured()) return getDownloadUrl(storageKey);
  return undefined;
}

/**
 * Mirrors `frontend/src/lib/api/resources/content.ts`. `Asset` and
 * `AssetFolder` are both directly tenant-scoped (see tenantScope.ts), so
 * every query/mutation here goes straight through `ctx.db` with no manual
 * org check needed — unlike `courses.ts`'s `Lesson`/`CourseModule`.
 *
 * Real object storage (Cloudflare R2, via `../storage/r2.ts`): the browser
 * uploads directly to R2 using a short-lived signed URL this server hands
 * out (`requestUpload`) — file bytes never pass through this process.
 * Playback/download likewise goes through a freshly-signed URL per request
 * (`list`/`get`), not a public bucket, so access still runs through this
 * app's own permission checks first. Until `R2_*` env vars are set (see
 * `.env.example`), `requestUpload` throws a clear, catchable error rather
 * than every other content-library feature (listing, folders, tags)
 * breaking too — those don't need storage at all.
 */

function kindFromFilename(filename: string): "video" | "document" | "image" | "other" | "scorm" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "zip") return "scorm";
  if (["mp4", "mov", "webm", "avi", "mkv"].includes(ext)) return "video";
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp3", "wav", "m4a", "aac"].includes(ext)) return "other";
  return "document";
}

/**
 * Every uploaded file is assumed malicious until proven otherwise (per the
 * audit brief). Two things stop an attacker from turning the content
 * library into an open file host / stored-XSS vector:
 *
 * 1. `contentType` is entirely client-supplied and becomes the R2 object's
 *    actual `Content-Type` header — served back verbatim on every signed
 *    download URL. Without an allowlist, a caller could upload an
 *    `.png`-named file with `contentType: "text/html"` (or
 *    `image/svg+xml`, which itself carries `<script>`) and get a stored-XSS
 *    payload other org members would execute just by opening the "image".
 *    `.svg` and `text/html`/`application/xhtml+xml`/`text/xml` are
 *    deliberately excluded from every category below for this reason.
 * 2. `sizeBytes` had no upper bound at all — any org member with
 *    `courses:edit` could mint an unlimited-size signed PUT and run up
 *    storage costs or exhaust a bucket quota. Capped per kind, generous
 *    enough for real course video without being unbounded.
 */
const ALLOWED_CONTENT_TYPES: Record<"video" | "image" | "document" | "other" | "scorm", Set<string>> = {
  video: new Set(["video/mp4", "video/quicktime", "video/webm", "video/x-msvideo", "video/x-matroska"]),
  image: new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]),
  other: new Set(["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac"]),
  document: new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ]),
  // Browsers/OSes report zip files under any of these three depending on
  // platform — all three are accepted, but only ever for a .zip filename
  // (kindFromFilename already gates that), so this never widens what a
  // "document" upload can claim to be.
  scorm: new Set(["application/zip", "application/x-zip-compressed", "application/octet-stream"]),
};

const MAX_UPLOAD_BYTES: Record<"video" | "image" | "document" | "other" | "scorm", number> = {
  video: 5 * 1024 * 1024 * 1024, // 5 GB
  image: 25 * 1024 * 1024, // 25 MB
  other: 250 * 1024 * 1024, // 250 MB
  document: 100 * 1024 * 1024, // 100 MB
  scorm: 500 * 1024 * 1024, // 500 MB — the zip itself; extraction has its own separate uncompressed cap
};

export const contentRouter = router({
  list: requirePermission("courses", "view").query(async ({ ctx }) => {
    const [assets, lessons, users] = await Promise.all([
      ctx.db.asset.findMany({ orderBy: { uploadedAt: "desc" } }),
      ctx.db.lesson.findMany({ where: { assetId: { not: null } }, include: { course: true } }),
      ctx.db.user.findMany({ select: { id: true, name: true } }),
    ]);
    const userName = new Map(users.map((u) => [u.id, u.name]));
    return Promise.all(
      assets.map(async (a) => ({
        ...a,
        sizeBytes: Number(a.sizeBytes),
        uploadedByName: userName.get(a.uploadedByUserId) ?? "Unknown",
        url: await resolvePlaybackUrl(a.storageKey),
        references: lessons
          .filter((l) => l.assetId === a.id)
          .map((l) => ({ courseId: l.courseId, courseTitle: l.course.title, lessonTitle: l.title })),
      })),
    );
  }),

  listFolders: requirePermission("courses", "view").query(({ ctx }) => ctx.db.assetFolder.findMany()),

  /**
   * The learner-facing playback/download path — deliberately NOT gated by
   * `requirePermission`, since a plain Learner role holds zero permissions
   * (see the seed script) and would be locked out of every lesson's video
   * entirely if this required `courses:view` the way `list` above does.
   * Matches the intended architecture's Video Playback Flow exactly:
   * auth (via `protectedProcedure`) + tenant (via `ctx.db`) + enrollment are
   * all re-checked here, server-side, before a signed URL is ever minted —
   * never trusted from the frontend, which only decided to *call* this
   * because its own (client-side, non-authoritative) enrollment check
   * passed. A course editor previewing an unpublished lesson uses `list`
   * above instead (gated by `courses:edit`), not this procedure.
   */
  getLessonAssetUrl: protectedProcedure
    .input(z.object({ lessonId: z.string() }))
    .query(async ({ ctx, input }) => {
      // `Lesson`/`Enrollment` are unscoped models already (no `orgId` of
      // their own — `ctx.db` never filters them). `Asset` IS tenant-scoped
      // and now lives in the platform org, not the learner's — `ctx.db`
      // (scoped to the caller) would never find it, so this reads it via
      // `rawDb` once the enrollment check below has already proven access.
      const lesson = await ctx.rawDb.lesson.findUnique({ where: { id: input.lessonId } });
      if (!lesson || !lesson.assetId) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });

      const enrollment = await ctx.rawDb.enrollment.findUnique({
        where: { courseId_userId: { courseId: lesson.courseId, userId: ctx.session.userId } },
      });
      if (!enrollment || enrollment.status === "requested") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not enrolled in this course." });
      }

      const asset = await ctx.rawDb.asset.findUnique({ where: { id: lesson.assetId } });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found." });

      return { name: asset.name, url: await resolvePlaybackUrl(asset.storageKey) };
    }),

  createFolder: requirePermission("courses", "edit")
    .input(z.object({ name: z.string().min(1) }))
    .mutation(({ ctx, input }) =>
      ctx.db.assetFolder.create({ data: { orgId: ctx.session.orgId, name: input.name.trim() } }),
    ),

  /**
   * Step 1 of a real upload: creates the `Asset` row (so it shows up in the
   * library immediately, even mid-upload) and returns a signed PUT URL the
   * browser uploads the actual file bytes to directly — this server never
   * touches them. `durationSeconds` for video can't be known without
   * processing the file server-side (out of scope here, same simplification
   * the mock had) so it stays a placeholder.
   */
  requestUpload: requirePermission("courses", "edit")
    .input(
      z.object({
        filename: z.string().min(1),
        sizeBytes: z.number().int().nonnegative(),
        contentType: z.string().min(1),
        folderId: z.string().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isStorageConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "File storage isn't configured yet — uploads aren't available until it is.",
        });
      }
      const kind = kindFromFilename(input.filename);

      if (!ALLOWED_CONTENT_TYPES[kind].has(input.contentType.toLowerCase())) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That file type isn't supported.",
        });
      }
      if (input.sizeBytes > MAX_UPLOAD_BYTES[kind]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That file is too large.",
        });
      }

      const asset = await ctx.db.asset.create({
        data: {
          orgId: ctx.session.orgId,
          name: input.filename,
          kind,
          sizeBytes: input.sizeBytes,
          durationSeconds: kind === "video" ? 180 : null,
          folderId: input.folderId,
          tags: [],
          uploadedByUserId: ctx.session.userId,
        },
      });
      const storageKey = buildStorageKey(ctx.session.orgId, asset.id, input.filename);
      const [uploadUrl] = await Promise.all([
        getUploadUrl(storageKey, input.contentType),
        ctx.db.asset.update({ where: { id: asset.id }, data: { storageKey } }),
      ]);
      return { assetId: asset.id, uploadUrl };
    }),

  /**
   * Step 2 of a SCORM upload — called by the frontend once the raw zip PUT
   * from `requestUpload` finishes. Downloads the zip back from R2 (the only
   * place in this app that pulls file bytes onto the server itself — every
   * other asset type deliberately never does), extracts it under the
   * zip-slip/zip-bomb guards in `scorm/extract.ts`, and re-uploads each
   * extracted file to its own prefix so the launch route (a Next.js Route
   * Handler, not this tRPC router — it has to serve raw HTML/JS/CSS bytes,
   * not JSON) can read them back per request.
   */
  processScormPackage: requirePermission("courses", "edit")
    .input(z.object({ assetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const asset = await ctx.db.asset.findUnique({ where: { id: input.assetId } });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found." });
      if (asset.kind !== "scorm" || !asset.storageKey) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "This asset isn't a SCORM package." });
      }
      if (!isStorageConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "File storage isn't configured yet." });
      }

      let extracted;
      try {
        const zipBuffer = await getObjectBuffer(asset.storageKey);
        extracted = extractScormPackage(zipBuffer);
      } catch (err) {
        const message = err instanceof ScormExtractionError ? err.message : "Couldn't process that package.";
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }

      const prefix = `${ctx.session.orgId}/scorm/${asset.id}`;
      await Promise.all(
        extracted.files.map((f) => putObjectBuffer(`${prefix}/${f.relativePath}`, f.data, f.contentType)),
      );

      await Promise.all([
        ctx.db.asset.update({ where: { id: asset.id }, data: { scormLaunchPath: extracted.launchPath } }),
        ctx.db.lesson.updateMany({
          where: { assetId: asset.id, contentType: "scorm" },
          data: { scormStatus: "ready" },
        }),
      ]);

      return { ok: true, launchPath: extracted.launchPath };
    }),

  update: requirePermission("courses", "edit")
    .input(z.object({ id: z.string(), name: z.string().min(1).optional(), tags: z.array(z.string()).optional(), folderId: z.string().nullable().optional() }))
    .mutation(async ({ ctx, input: { id, ...patch } }) => {
      const asset = await ctx.db.asset.update({ where: { id }, data: patch });
      return { ...asset, sizeBytes: Number(asset.sizeBytes) };
    }),

  delete: requirePermission("courses", "edit")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // `Lesson` has no orgId of its own — this asset is already confirmed to
      // belong to the caller's org by the scoped findUnique below, so
      // counting lessons that reference it by this asset's (now-verified) id
      // is safe without a separate org check on the lesson side.
      const asset = await ctx.db.asset.findUnique({ where: { id: input.id } });
      if (!asset) throw new TRPCError({ code: "NOT_FOUND", message: "Asset not found." });

      const refCount = await ctx.db.lesson.count({ where: { assetId: input.id } });
      if (refCount > 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Still used in ${refCount} ${refCount === 1 ? "place" : "places"}. Remove it from those first.`,
        });
      }
      await ctx.db.asset.delete({ where: { id: input.id } });
      // Best-effort: a stray orphaned object in the bucket is a cost/cleanup
      // concern, not a data-integrity one (the row driving the app's own
      // behavior is already gone), so a storage-side failure here shouldn't
      // fail the whole request.
      if (asset.storageKey && isStorageConfigured()) {
        try {
          await deleteObject(asset.storageKey);
        } catch (err) {
          console.error(`Failed to delete R2 object ${asset.storageKey}:`, err);
        }
      }
      return { ok: true };
    }),
});
