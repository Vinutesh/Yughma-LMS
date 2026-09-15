import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import path from "node:path";

/**
 * A SCORM package is a learner- or instructor-uploaded zip full of HTML/JS —
 * untrusted content by definition (see SECURITY_REVIEW.md). Two concrete
 * attacks this guards against before anything gets re-uploaded to storage:
 *
 * 1. Zip-slip — a crafted entry name like "../../../etc/whatever" that
 *    escapes the extraction root when naively joined. Every entry's
 *    normalized path is checked to still live under the root before it's
 *    trusted.
 * 2. Zip bombs — a small file that decompresses to gigabytes. Both total
 *    uncompressed size and file count are capped; extraction aborts the
 *    moment either is exceeded, not after the fact.
 */
const MAX_TOTAL_UNCOMPRESSED_BYTES = 300 * 1024 * 1024; // 300 MB
const MAX_FILE_COUNT = 3000;

export class ScormExtractionError extends Error {}

export interface ExtractedFile {
  /** Forward-slash relative path within the package, e.g. "js/app.js". */
  relativePath: string;
  data: Buffer;
  contentType: string;
}

export interface ExtractedScormPackage {
  /** Relative path to the manifest-declared launch file. */
  launchPath: string;
  files: ExtractedFile[];
}

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".htm": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".xml": "application/xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".pdf": "application/pdf",
};

export function contentTypeFor(relativePath: string): string {
  const ext = path.extname(relativePath).toLowerCase();
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** Normalizes a zip entry name to a safe, forward-slash relative path, or
 * returns null if it's an attempt to escape the extraction root. */
function safeRelativePath(entryName: string): string | null {
  const normalized = entryName.replace(/\\/g, "/").replace(/^\/+/, "");
  const resolved = path.posix.normalize(normalized);
  if (resolved.startsWith("..") || path.posix.isAbsolute(resolved) || resolved.includes("\0")) {
    return null;
  }
  return resolved;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/** Reads the manifest-declared launch file from a parsed imsmanifest.xml —
 * the default organization's first item, resolved through <resources> to
 * its href. Covers SCORM 1.2 and 2004 alike; both use this same shape for
 * the part that matters here. */
function findLaunchPath(manifestXml: string): string {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  let parsed: Record<string, unknown>;
  try {
    parsed = parser.parse(manifestXml);
  } catch {
    throw new ScormExtractionError("imsmanifest.xml isn't valid XML.");
  }

  const manifest = parsed.manifest as Record<string, unknown> | undefined;
  if (!manifest) throw new ScormExtractionError("imsmanifest.xml has no <manifest> root element.");

  const organizations = manifest.organizations as Record<string, unknown> | undefined;
  const orgs = toArray(organizations?.organization as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const defaultOrgId = organizations?.["@_default"] as string | undefined;
  const org = orgs.find((o) => o["@_identifier"] === defaultOrgId) ?? orgs[0];
  if (!org) throw new ScormExtractionError("Manifest has no <organization> to launch.");

  const items = toArray(org.item as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const item = items[0];
  const identifierref = item?.["@_identifierref"] as string | undefined;
  if (!identifierref) {
    throw new ScormExtractionError("Manifest's first <item> has no identifierref — nothing to launch.");
  }

  const resourcesEl = manifest.resources as Record<string, unknown> | undefined;
  const resources = toArray(resourcesEl?.resource as Record<string, unknown> | Record<string, unknown>[] | undefined);
  const resource = resources.find((r) => r["@_identifier"] === identifierref);
  const href = resource?.["@_href"] as string | undefined;
  if (!href) {
    throw new ScormExtractionError("Manifest's launch resource has no href.");
  }
  const safe = safeRelativePath(href);
  if (!safe) throw new ScormExtractionError("Manifest's launch href is not a safe relative path.");
  return safe;
}

export function extractScormPackage(zipBuffer: Buffer): ExtractedScormPackage {
  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch {
    throw new ScormExtractionError("That file isn't a valid zip archive.");
  }

  const entries = zip.getEntries();
  if (entries.length > MAX_FILE_COUNT) {
    throw new ScormExtractionError(`Package has too many files (${entries.length} > ${MAX_FILE_COUNT}).`);
  }

  const files: ExtractedFile[] = [];
  let manifestXml: string | null = null;
  let totalBytes = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const safe = safeRelativePath(entry.entryName);
    if (!safe) {
      throw new ScormExtractionError(`Package contains an unsafe file path: "${entry.entryName}".`);
    }

    const data = entry.getData();
    totalBytes += data.length;
    if (totalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new ScormExtractionError(
        `Package is too large uncompressed (over ${MAX_TOTAL_UNCOMPRESSED_BYTES / 1024 / 1024} MB).`,
      );
    }

    if (safe.toLowerCase() === "imsmanifest.xml") {
      manifestXml = data.toString("utf-8");
    }
    files.push({ relativePath: safe, data, contentType: contentTypeFor(safe) });
  }

  if (!manifestXml) {
    throw new ScormExtractionError("Package has no imsmanifest.xml at its root — not a valid SCORM package.");
  }

  const launchPath = findLaunchPath(manifestXml);
  const launchExists = files.some((f) => f.relativePath === launchPath);
  if (!launchExists) {
    throw new ScormExtractionError(`Manifest points at "${launchPath}", which isn't in the package.`);
  }

  return { launchPath, files };
}
