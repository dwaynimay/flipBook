import { describe, expect, it } from "vitest";

import type { QuizDefinition } from "../src/index.js";
import { scorePreviewQuiz } from "../src/index.js";

const quiz = {
  description: "Preview",
  id: "quiz-1",
  questions: [
    {
      correctOptionId: "yes",
      explanation: "Penjelasan",
      id: "question-1",
      options: [
        { id: "yes", label: "Ya" },
        { id: "no", label: "Tidak" },
      ],
      prompt: "Pilih ya",
      type: "multiple-choice",
    },
  ],
  title: "Kuis",
} as const satisfies QuizDefinition;

describe("scorePreviewQuiz", () => {
  it("scores submitted answers without trusting a supplied score", () => {
    expect(scorePreviewQuiz(quiz, [{ optionId: "yes", questionId: "question-1" }])).toEqual({
      correctCount: 1,
      score: 100,
      totalCount: 1,
    });
  });

  it("records a zero result", () => {
    expect(scorePreviewQuiz(quiz, [])).toEqual({ correctCount: 0, score: 0, totalCount: 1 });
  });
});
