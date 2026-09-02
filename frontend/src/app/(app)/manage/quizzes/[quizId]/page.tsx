"use client";

import { useParams } from "next/navigation";
import { QuizBuilderScreen } from "@/components/quizzes/QuizBuilderScreen";

export default function QuizBuilderPage() {
  const { quizId } = useParams<{ quizId: string }>();
  return <QuizBuilderScreen quizId={quizId} kind="quiz" />;
}
