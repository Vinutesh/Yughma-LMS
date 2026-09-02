"use client";

import { ContentLibrary } from "@/components/content/ContentLibrary";
import { AccessDenied } from "@/components/patterns/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

export default function ContentLibraryPage() {
  const canEdit = usePermission("courses", "edit");
  if (!canEdit) return <AccessDenied title="Content Library" />;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Content Library</h1>
      <p className="mb-5 text-sm text-text-tertiary">
        Shared assets — upload once, reuse across any course.
      </p>
      <ContentLibrary mode="manage" />
    </div>
  );
}
