"use client";

import { useParams, useRouter } from "next/navigation";
import { ThreadDetailScreen } from "@/components/communities/ThreadDetailScreen";

export default function CommunityThreadPage() {
  const { threadId } = useParams<{ threadId: string }>();
  const router = useRouter();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <ThreadDetailScreen
        threadId={threadId}
        onBack={() => router.push("/community")}
        backLabel="Community"
      />
    </div>
  );
}
