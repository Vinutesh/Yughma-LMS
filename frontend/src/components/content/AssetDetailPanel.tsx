"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import * as contentApi from "@/lib/api/resources/content";
import type { AssetWithMeta } from "@/lib/api/resources/content";
import { ApiError } from "@/lib/api/errors";
import type { AssetFolder } from "@/types/domain";
import { formatDuration, formatSize } from "./ContentLibrary";

export function AssetDetailPanel({
  asset,
  folders,
  onClose,
  onChanged,
}: {
  asset: AssetWithMeta | null;
  folders: AssetFolder[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [name, setName] = useState(asset?.name ?? "");
  const [tagsText, setTagsText] = useState(asset?.tags.join(", ") ?? "");
  const [folderId, setFolderId] = useState(asset?.folderId ?? "");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      contentApi.updateAsset(asset!.id, {
        name,
        tags: tagsText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        folderId: folderId || undefined,
      }),
    onSuccess: onChanged,
  });

  const remove = useMutation({
    mutationFn: () => contentApi.deleteAsset(asset!.id),
    onSuccess: () => {
      onChanged();
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) setDeleteError(err.message);
    },
  });

  if (!asset) return null;

  const uploadedOn = new Date(asset.uploadedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent aria-describedby={undefined}>
        <DrawerTitle>{asset.name}</DrawerTitle>

        <div className="mt-4 flex h-32 items-center justify-center overflow-hidden rounded-md bg-surface-alt text-xs text-text-tertiary">
          {!asset.url ? (
            // A SCORM package has no downloadable archive by design: the
            // original .zip is discarded once it's been extracted (keeping
            // it meant paying storage twice for a file nothing ever reads
            // again), so it plays from its extracted form or not at all.
            asset.kind === "scorm" ? (
              "Extracted and ready — SCORM packages play inside the course, not from here"
            ) : (
              "Preview unavailable — file storage isn't configured yet"
            )
          ) : asset.kind === "video" ? (
            <video src={asset.url} controls className="h-full w-full object-contain" />
          ) : asset.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed URL isn't a stable src Next/Image can cache
            <img src={asset.url} alt={asset.name} className="h-full w-full object-contain" />
          ) : (
            <a href={asset.url} target="_blank" rel="noopener noreferrer" className="font-medium text-accent hover:underline">
              Open {asset.name}
            </a>
          )}
        </div>

        <p className="mt-3 text-xs text-text-secondary">
          {[formatDuration(asset.durationSeconds), formatSize(asset.sizeBytes)]
            .filter(Boolean)
            .join(" · ")}{" "}
          · uploaded by {asset.uploadedByName}, {uploadedOn}
        </p>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asset-name">Name</Label>
            <Input id="asset-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asset-tags">Tags</Label>
            <Input
              id="asset-tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="comma, separated"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="asset-folder">Folder</Label>
            <select
              id="asset-folder"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <Button size="sm" loading={save.isPending} onClick={() => save.mutate()}>
            Save details
          </Button>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
            Used in
          </p>
          {asset.references.length === 0 ? (
            <p className="text-xs text-text-tertiary">Not used in any lesson yet.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {asset.references.map((r, i) => (
                <li key={i} className="text-xs text-text-secondary">
                  {r.courseTitle} — {r.lessonTitle}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          {deleteError && (
            <p className="mb-2 rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">
              {deleteError}
            </p>
          )}
          {asset.references.length > 0 && !deleteError && (
            <Badge variant="warning" className="mb-2">
              Referenced — can&apos;t delete
            </Badge>
          )}
          <Button
            size="sm"
            variant="destructive"
            loading={remove.isPending}
            onClick={() => remove.mutate()}
          >
            Delete
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
