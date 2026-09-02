"use client";

import { useParams } from "next/navigation";
import { QuizTakeScreen } from "@/components/quizzes/QuizTakeScreen";

export default function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  return <QuizTakeScreen quizId={quizId} kind="quiz" />;
}
