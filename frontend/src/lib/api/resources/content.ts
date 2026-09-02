import type { Asset, AssetFolder } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined } from "@/lib/api/serialization";
import { ApiError } from "@/lib/api/errors";


export interface AssetReference {
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
}

export interface AssetWithMeta extends Asset {
  folderName?: string;
  uploadedByName: string;
  references: AssetReference[];
  /** Freshly-signed, short-lived playback/download URL — undefined if
   * storage isn't configured yet or the asset predates real storage. */
  url?: string;
}

export async function listAssets(): Promise<AssetWithMeta[]> {
  try {
    const assets = await trpcClient.content.list.query();
    return assets.map((a) => ({
      ...nullsToUndefined(a),
      uploadedAt: new Date(a.uploadedAt).toISOString(),
    })) as unknown as AssetWithMeta[];
  } catch (err) {
    throw toApiError(err);
  }
}

export interface LessonAsset {
  name: string;
  /** Undefined if storage isn't configured yet. */
  url?: string;
}

/** The learner-facing counterpart to `listAssets` — enrollment-gated
 * server-side (see `content.ts` router's `getLessonAssetUrl`), scoped to
 * exactly the one asset attached to this lesson, rather than requiring the
 * `courses:view` manage permission a plain Learner role never holds. */
export async function getLessonAssetUrl(lessonId: string): Promise<LessonAsset> {
  try {
    return await trpcClient.content.getLessonAssetUrl.query({ lessonId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listFolders(): Promise<AssetFolder[]> {
  try {
    return await trpcClient.content.listFolders.query();
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createFolder(name: string): Promise<AssetFolder> {
  try {
    return await trpcClient.content.createFolder.mutate({ name });
  } catch (err) {
    throw toApiError(err);
  }
}

/** PUTs the file directly to R2 using the signed URL the backend hands
 * out — this app's own server never sees the file's bytes. `onProgress`
 * reports real upload progress (0-100), not a simulated timer, since
 * `XMLHttpRequest` is the only browser API that exposes upload progress
 * events (`fetch` doesn't). */
function putWithProgress(url: string, file: File, onProgress?: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new ApiError("validation", "Upload failed. Try again."));
    };
    xhr.onerror = () => reject(new ApiError("validation", "Upload failed. Try again."));
    xhr.send(file);
  });
}

/** Two steps: ask the backend for a signed upload URL (also creates the
 * `Asset` row so it appears in the library right away), then upload the
 * actual bytes straight to R2. Throws a validation-shaped `ApiError` with a
 * clear message if storage isn't configured yet (`PRECONDITION_FAILED` from
 * the backend), rather than a confusing generic failure. */
export async function uploadAsset(
  file: File,
  folderId: string | undefined,
  onProgress?: (percent: number) => void,
): Promise<{ id: string }> {
  try {
    const { assetId, uploadUrl } = await trpcClient.content.requestUpload.mutate({
      filename: file.name,
      sizeBytes: file.size,
      contentType: file.type || "application/octet-stream",
      folderId: folderId ?? null,
    });
    await putWithProgress(uploadUrl, file, onProgress);
    return { id: assetId };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateAsset(
  id: string,
  patch: Partial<Pick<Asset, "name" | "tags" | "folderId">>,
): Promise<void> {
  try {
    await trpcClient.content.update.mutate({ id, ...patch, folderId: patch.folderId === undefined ? undefined : (patch.folderId ?? null) });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function deleteAsset(id: string): Promise<void> {
  try {
    await trpcClient.content.delete.mutate({ id });
  } catch (err) {
    throw toApiError(err);
  }
}
