import type { Post, ReportReason, Thread } from "@/types/domain";
import { trpcClient } from "@/lib/trpc/client";
import { toApiError } from "@/lib/trpc/mapError";
import { nullsToUndefined, toDateStrings } from "@/lib/api/serialization";

/**
 * Real backend-backed communities resource client. `orgId`/`userId`/
 * `createdByUserId`/`reportedByUserId`/`authorUserId` and the client-computed
 * `canModerate` boolean the mock signatures took are all dropped — the
 * backend infers the caller's org/identity from the session and re-derives
 * moderation permission itself (see `communities.ts` router's
 * `hasEditPermission`), never trusting a client-supplied flag for it.
 */



export interface ThreadSummary extends Thread {
  authorName: string;
  postCount: number;
  lastActivityAt: string;
}

function toThreadSummary(t: Record<string, unknown>): ThreadSummary {
  return toDateStrings(nullsToUndefined(t), ["createdAt", "lastActivityAt"]) as unknown as ThreadSummary;
}

export async function listCourseThreads(courseId: string): Promise<ThreadSummary[]> {
  try {
    const threads = await trpcClient.communities.listCourseThreads.query({ courseId });
    return threads.map(toThreadSummary);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listOrgThreads(): Promise<ThreadSummary[]> {
  try {
    const threads = await trpcClient.communities.listOrgThreads.query();
    return threads.map(toThreadSummary);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface PostRow extends Post {
  authorName: string;
}

export interface ThreadDetail extends ThreadSummary {
  posts: PostRow[];
}

export async function getThread(threadId: string): Promise<ThreadDetail> {
  try {
    const t = await trpcClient.communities.getThread.query({ threadId });
    return {
      ...toThreadSummary(t),
      posts: t.posts.map((p) => toDateStrings(nullsToUndefined(p), ["createdAt"]) as unknown as PostRow),
    };
  } catch (err) {
    throw toApiError(err);
  }
}

export async function createThread(input: {
  scope: "course" | "org";
  courseId?: string;
  title: string;
  body: string;
}): Promise<Thread> {
  try {
    const t = await trpcClient.communities.createThread.mutate(input);
    return toDateStrings(nullsToUndefined(t), ["createdAt"]) as unknown as Thread;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function replyToThread(input: { threadId: string; body: string }): Promise<Post> {
  try {
    const p = await trpcClient.communities.replyToThread.mutate(input);
    return toDateStrings(nullsToUndefined(p), ["createdAt"]) as unknown as Post;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function pinThread(threadId: string, pinned: boolean): Promise<void> {
  try {
    await trpcClient.communities.pinThread.mutate({ threadId, pinned });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function lockThread(threadId: string, locked: boolean): Promise<void> {
  try {
    await trpcClient.communities.lockThread.mutate({ threadId, locked });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function removeThread(threadId: string): Promise<void> {
  try {
    await trpcClient.communities.removeThread.mutate({ threadId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function removePost(postId: string): Promise<void> {
  try {
    await trpcClient.communities.removePost.mutate({ postId });
  } catch (err) {
    throw toApiError(err);
  }
}

export async function reportPost(input: { postId: string; reason: ReportReason }): Promise<void> {
  try {
    await trpcClient.communities.reportPost.mutate(input);
  } catch (err) {
    throw toApiError(err);
  }
}

export interface ModerationRow {
  id: string;
  orgId: string;
  postId: string;
  reportedByUserId: string;
  reason: ReportReason;
  createdAt: string;
  resolved: boolean;
  postBody: string;
  reporterName: string;
  threadTitle: string;
}

export async function listModerationQueue(): Promise<ModerationRow[]> {
  try {
    const rows = await trpcClient.communities.listModerationQueue.query();
    return rows.map((r) => toDateStrings(nullsToUndefined(r), ["createdAt"]) as unknown as ModerationRow);
  } catch (err) {
    throw toApiError(err);
  }
}

export async function dismissReport(reportId: string): Promise<void> {
  try {
    await trpcClient.communities.dismissReport.mutate({ reportId });
  } catch (err) {
    throw toApiError(err);
  }
}
