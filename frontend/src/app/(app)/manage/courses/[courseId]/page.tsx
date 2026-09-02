"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { ComingSoon } from "@/components/patterns/ComingSoon";
import { usePermission } from "@/hooks/usePermission";
import * as coursesApi from "@/lib/api/resources/courses";
import { CourseContentTab } from "@/components/courses/CourseContentTab";
import { CourseSettingsTab } from "@/components/courses/CourseSettingsTab";
import { PublishButton } from "@/components/courses/PublishButton";
import type { CourseStatus } from "@/types/domain";

const STATUS_VARIANT: Record<CourseStatus, "success" | "neutral" | "warning"> = {
  published: "success",
  draft: "neutral",
  archived: "warning",
};

export default function CourseBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const canEdit = usePermission("courses", "edit");
  const [tab, setTab] = useState("content");

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: () => coursesApi.getCourse(courseId),
    enabled: canEdit,
  });

  if (!canEdit) return <ComingSoon title="Course builder" />;
  if (isLoading) return <p className="p-8 text-sm text-text-tertiary">Loading course...</p>;
  if (!course) return <p className="p-8 text-sm text-text-tertiary">Course not found.</p>;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link
        href="/manage/courses"
        className="mb-3 inline-block text-sm font-medium text-accent hover:underline"
      >
        ← Courses
      </Link>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{course.title}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[course.status]} className="capitalize">
              {course.status}
            </Badge>
            <span className="text-xs text-text-tertiary">
              {course.moduleCount} {course.moduleCount === 1 ? "module" : "modules"} ·{" "}
              {course.lessonCount} {course.lessonCount === 1 ? "lesson" : "lessons"}
            </span>
          </div>
        </div>
        <PublishButton course={course} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="content">
          <CourseContentTab course={course} />
        </TabsContent>
        <TabsContent value="settings">
          <CourseSettingsTab course={course} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
