"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import * as quizzesApi from "@/lib/api/resources/quizzes";
import { ApiError } from "@/lib/api/errors";
import type { QuizQuestionType } from "@/types/domain";

export function AddQuestionDialog({
  quizId,
  open,
  onOpenChange,
  onAdded,
}: {
  quizId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded: () => void;
}) {
  const [type, setType] = useState<QuizQuestionType>("mcq");
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState(["", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [points, setPoints] = useState("5");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType("mcq");
    setPrompt("");
    setOptions(["", "", ""]);
    setCorrectIndex(0);
    setPoints("5");
    setError(null);
  }

  const add = useMutation({
    mutationFn: () =>
      quizzesApi.addQuestion({
        quizId,
        type,
        prompt,
        optionTexts: options,
        correctIndex,
        points: Number(points),
      }),
    onSuccess: () => {
      onAdded();
      onOpenChange(false);
      reset();
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
    },
  });

  /** True/False fixes its own options, so only the correct-answer pick matters. */
  const displayOptions = type === "truefalse" ? ["True", "False"] : options;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add question</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {error && (
            <p className="rounded-md bg-danger-bg p-2.5 text-xs font-medium text-danger">{error}</p>
          )}

          <div className="flex items-center gap-4 text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="qtype"
                checked={type === "mcq"}
                onChange={() => {
                  setType("mcq");
                  setCorrectIndex(0);
                }}
                className="accent-accent"
              />
              <span className="text-text-secondary">Multiple choice</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="qtype"
                checked={type === "truefalse"}
                onChange={() => {
                  setType("truefalse");
                  setCorrectIndex(0);
                }}
                className="accent-accent"
              />
              <span className="text-text-secondary">True/False</span>
            </label>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qq-prompt">Question text</Label>
            <textarea
              id="qq-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              className="rounded-md border border-border bg-surface p-2 text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Options</Label>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
                Correct?
              </span>
            </div>
            {displayOptions.map((value, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  aria-label={`Option ${i + 1}`}
                  value={value}
                  readOnly={type === "truefalse"}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                  }
                  className={type === "truefalse" ? "bg-surface-alt" : undefined}
                />
                <input
                  type="radio"
                  name="correct"
                  aria-label={`Mark option ${i + 1} correct`}
                  checked={correctIndex === i}
                  onChange={() => setCorrectIndex(i)}
                  className="size-4 shrink-0 accent-accent"
                />
                {type === "mcq" && options.length > 2 && (
                  <button
                    aria-label={`Remove option ${i + 1}`}
                    onClick={() => {
                      setOptions((prev) => prev.filter((_, j) => j !== i));
                      setCorrectIndex((prev) => (prev >= i && prev > 0 ? prev - 1 : prev));
                    }}
                    className="rounded p-0.5 text-text-tertiary hover:text-danger"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
            ))}
            {type === "mcq" && (
              <Button
                size="sm"
                variant="ghost"
                className="self-start"
                onClick={() => setOptions((prev) => [...prev, ""])}
              >
                + Add option
              </Button>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="qq-points">Points</Label>
            <Input
              id="qq-points"
              type="number"
              min={1}
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="max-w-24"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!prompt.trim()} loading={add.isPending} onClick={() => add.mutate()}>
            Add question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
