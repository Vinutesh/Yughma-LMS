"use client";

import { useParams } from "next/navigation";
import { QuizBuilderScreen } from "@/components/quizzes/QuizBuilderScreen";

export default function AssessmentBuilderPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  return <QuizBuilderScreen quizId={assessmentId} kind="assessment" />;
}
