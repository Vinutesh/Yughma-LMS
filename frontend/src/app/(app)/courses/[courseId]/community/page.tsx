"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSessionStore } from "@/state/sessionStore";
import * as coursesApi from "@/lib/api/resources/courses";
import { ThreadListScreen } from "@/components/communities/ThreadListScreen";

export default function CourseDiscussionPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const session = useSessionStore((s) => s.session);

  const { data: course } = useQuery({
    queryKey: ["course", courseId, session?.user.id],
    queryFn: () => coursesApi.getCourse(courseId, true),
    enabled: !!session,
  });

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link
        href={`/courses/${courseId}`}
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← {course?.title ?? "Course"}
      </Link>
      <h1 className="mb-5 text-xl font-semibold text-text-primary">Discussion</h1>
      <ThreadListScreen scope="course" courseId={courseId} basePath={`/courses/${courseId}/community`} />
    </div>
  );
}
