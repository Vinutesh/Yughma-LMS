import { ThreadListScreen } from "@/components/communities/ThreadListScreen";

export default function CommunityPage() {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-1 text-xl font-semibold text-text-primary">Community</h1>
      <p className="mb-5 text-sm text-text-tertiary">Org-wide discussion, open to everyone.</p>
      <ThreadListScreen scope="org" basePath="/community" />
    </div>
  );
}
