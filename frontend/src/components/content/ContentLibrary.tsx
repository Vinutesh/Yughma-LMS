"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Film, Image as ImageIcon, Music, Package, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { useSessionStore } from "@/state/sessionStore";
import * as contentApi from "@/lib/api/resources/content";
import type { AssetWithMeta } from "@/lib/api/resources/content";
import { ApiError } from "@/lib/api/errors";
import type { AssetKind } from "@/types/domain";
import { AssetDetailPanel } from "./AssetDetailPanel";

const KIND_ICON: Record<AssetKind, typeof FileText> = {
  video: Film,
  document: FileText,
  image: ImageIcon,
  other: Music,
  scorm: Package,
};

export function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

export function formatDuration(seconds?: number) {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

interface PendingUpload {
  tempId: string;
  filename: string;
  progress: number;
}

interface ContentLibraryProps {
  /** "manage" opens a detail panel on tile click; "picker" selects instead. */
  mode: "manage" | "picker";
  onUseSelected?: (asset: AssetWithMeta) => void;
}

export function ContentLibrary({ mode, onUseSelected }: ContentLibraryProps) {
  const session = useSessionStore((s) => s.session);
  const org = session?.org;
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [folderId, setFolderId] = useState("");
  const [tag, setTag] = useState("");
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["assets", org?.id],
    queryFn: () => contentApi.listAssets(),
    enabled: !!org,
  });
  const { data: folders = [] } = useQuery({
    queryKey: ["folders", org?.id],
    queryFn: () => contentApi.listFolders(),
    enabled: !!org,
  });

  const allTags = useMemo(
    () => [...new Set(assets.flatMap((a) => a.tags))].sort(),
    [assets],
  );

  const visible = useMemo(
    () =>
      assets.filter((a) => {
        if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (folderId && a.folderId !== folderId) return false;
        if (tag && !a.tags.includes(tag)) return false;
        return true;
      }),
    [assets, search, folderId, tag],
  );

  const upload = useMutation({
    mutationFn: ({ file, tempId }: { file: File; tempId: string }) =>
      contentApi.uploadAsset(file, folderId || undefined, (percent) => {
        setPending((p) => p.map((u) => (u.tempId === tempId ? { ...u, progress: percent } : u)));
      }),
    onSuccess: (asset, { tempId }) => {
      setPending((p) => p.filter((u) => u.tempId !== tempId));
      qc.invalidateQueries({ queryKey: ["assets"] });
      if (mode === "picker") setSelectedId(asset.id);
    },
    onError: (err, { tempId }) => {
      setPending((p) => p.filter((u) => u.tempId !== tempId));
      setUploadError(err instanceof ApiError ? err.message : "Upload failed. Try again.");
    },
  });

  function startUpload(files: FileList | null) {
    if (!files || !org) return;
    setUploadError(null);
    for (const file of Array.from(files)) {
      const tempId = crypto.randomUUID();
      setPending((p) => [{ tempId, filename: file.name, progress: 0 }, ...p]);
      upload.mutate({ file, tempId });
    }
  }

  const selected = assets.find((a) => a.id === selectedId) ?? null;
  const detail = assets.find((a) => a.id === detailId) ?? null;

  function activate(assetId: string) {
    if (mode === "picker") setSelectedId(assetId);
    else setDetailId(assetId);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            placeholder="Search..."
            aria-label="Search content"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-56"
          />
          <select
            aria-label="Folder"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
          >
            <option value="">All folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-text-primary"
          >
            <option value="">All tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => fileInputRef.current?.click()}>
          {mode === "picker" ? "Upload new" : "Upload"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            startUpload(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {uploadError && (
        <p className="rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{uploadError}</p>
      )}

      {isLoading ? (
        <p className="p-6 text-sm text-text-tertiary">Loading library...</p>
      ) : visible.length === 0 && pending.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <p className="text-sm font-semibold text-text-primary">
            {assets.length === 0 ? "Nothing in the library yet" : "No matches"}
          </p>
          <p className="text-xs text-text-tertiary">
            {assets.length === 0
              ? "Upload a video or document to reuse it across courses."
              : "Try a different search or clear the filters."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {pending.map((u) => (
            <Card key={u.tempId} className="flex flex-col gap-2 p-3">
              <div className="flex h-20 items-center justify-center rounded bg-surface-alt">
                <div className="h-1.5 w-4/5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-accent transition-[width]"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              </div>
              <p className="truncate text-xs font-medium text-text-primary">{u.filename}</p>
              <p className="text-[11px] text-text-tertiary">{u.progress}% uploading</p>
            </Card>
          ))}
          {visible.map((a) => {
            const Icon = KIND_ICON[a.kind];
            const isSelected = mode === "picker" && selectedId === a.id;
            return (
              <Card
                key={a.id}
                role="button"
                tabIndex={0}
                aria-pressed={mode === "picker" ? isSelected : undefined}
                onClick={() => activate(a.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    activate(a.id);
                  }
                }}
                className={
                  "relative flex cursor-pointer flex-col gap-2 p-3 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring" +
                  (isSelected ? " border-accent ring-1 ring-accent" : "")
                }
              >
                {isSelected && (
                  <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-accent text-accent-fg">
                    <Check className="size-3" />
                  </span>
                )}
                <div className="flex h-20 items-center justify-center rounded bg-surface-alt">
                  <Icon className="size-7 text-text-tertiary" />
                </div>
                <p className="truncate text-xs font-medium text-text-primary" title={a.name}>
                  {a.name}
                </p>
                <p className="text-[11px] text-text-tertiary">
                  {[formatDuration(a.durationSeconds), formatSize(a.sizeBytes)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </Card>
            );
          })}
        </div>
      )}

      {mode === "picker" && (
        <div className="flex items-center justify-end gap-3 border-t border-border pt-3">
          {selected && (
            <span className="text-xs text-text-tertiary">Selected: {selected.name}</span>
          )}
          <Button disabled={!selected} onClick={() => selected && onUseSelected?.(selected)}>
            Use selected
          </Button>
        </div>
      )}

      {mode === "manage" && (
        // Keyed so its form fields re-initialize for each asset rather than
        // carrying the previously opened asset's edits over.
        <AssetDetailPanel
          key={detail?.id ?? "none"}
          asset={detail}
          folders={folders}
          onClose={() => setDetailId(null)}
          onChanged={() => qc.invalidateQueries({ queryKey: ["assets"] })}
        />
      )}
    </div>
  );
}
