import { describe, expect, it } from "vitest";

import { anemiaQuiz, readerDocuments } from "../src/booklet-content.js";

describe("visible reader fixture", () => {
  it("uses stable, unique page IDs", () => {
    const pageIds = readerDocuments.map((document) => document.pageId);
    expect(new Set(pageIds).size).toBe(pageIds.length);
    expect(pageIds).toContain("page_quiz");
  });

  it("keeps the preview quiz fully authored", () => {
    expect(anemiaQuiz.questions).toHaveLength(3);
    for (const question of anemiaQuiz.questions) {
      expect(question.options.some((option) => option.id === question.correctOptionId)).toBe(true);
    }
  });
});
