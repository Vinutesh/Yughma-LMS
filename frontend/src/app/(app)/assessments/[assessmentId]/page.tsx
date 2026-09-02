"use client";

import { useParams } from "next/navigation";
import { QuizTakeScreen } from "@/components/quizzes/QuizTakeScreen";

export default function AssessmentPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  return <QuizTakeScreen quizId={assessmentId} kind="assessment" />;
}
