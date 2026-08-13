import {
  parsePageDocument,
  preparePageDocumentForReader,
  safeParsePageDocument,
} from "@booklet/content-schema";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { BlockResourceResolver } from "../src/index.js";
import { PageRenderer } from "../src/index.js";

const resources: BlockResourceResolver = {
  image: () => undefined,
  mythFact: () => ({
    explanation: "Tubuh membutuhkan zat besi untuk membantu pembentukan hemoglobin.",
    fact: "Anemia perlu dikenali melalui informasi dan pemeriksaan yang tepat.",
    myth: "Lelah selalu berarti anemia.",
  }),
  video: () => undefined,
};

describe("PageRenderer", () => {
  it("renders every supported v1 block through the shared contract", () => {
    const parseResult = safeParsePageDocument({
      blocks: [
        {
          id: "block_all_heading",
          props: { level: 1, text: "Judul" },
          type: "heading",
          version: 1,
        },
        {
          id: "block_all_paragraph",
          props: { text: "Paragraf aman" },
          type: "paragraph",
          version: 1,
        },
        {
          id: "block_all_image",
          props: {
            altText: "Ilustrasi edukasi",
            aspectRatio: { height: 3, width: 4 },
            decorative: false,
            mediaId: "media_image_all",
          },
          type: "image",
          version: 1,
        },
        {
          id: "block_all_video",
          props: { aspectRatio: { height: 9, width: 16 }, mediaId: "media_video_all" },
          type: "video",
          version: 1,
        },
        {
          id: "block_all_callout",
          props: { text: "Catatan", tone: "info" },
          type: "callout",
          version: 1,
        },
        { id: "block_all_quote", props: { text: "Kutipan" }, type: "quote", version: 1 },
        {
          id: "block_all_link",
          props: { appearance: "link", href: "https://example.org/learn", label: "Pelajari" },
          type: "button-link",
          version: 1,
        },
        { id: "block_all_divider", props: { style: "solid" }, type: "divider", version: 1 },
        {
          id: "block_all_myth",
          props: { mythFactId: "myth_fact_all" },
          type: "myth-fact",
          version: 1,
        },
        { id: "block_all_quiz", props: { quizId: "quiz_all" }, type: "quiz-trigger", version: 1 },
      ],
      layout: { background: "surface-default", preset: "portrait" },
      pageId: "page_all_blocks",
      schemaVersion: 1,
    });
    if (!parseResult.success) throw new Error(JSON.stringify(parseResult.issues));
    const document = parseResult.data;
    const allResources: BlockResourceResolver = {
      image: () => ({ src: "https://example.org/education.png" }),
      mythFact: resources.mythFact,
      video: () => ({ kind: "youtube", title: "Video edukasi", videoId: "dQw4w9WgXcQ" }),
    };

    const markup = renderToStaticMarkup(
      <PageRenderer
        document={document}
        interactions={{ openQuiz: () => undefined }}
        resources={allResources}
      />,
    );

    for (const marker of [
      "Judul",
      "Paragraf aman",
      "Ilustrasi edukasi",
      "Video edukasi",
      "Catatan",
      "Kutipan",
      "Pelajari",
      "reader-divider--solid",
      "Buka faktanya",
      "Mulai kuis",
    ]) {
      expect(markup).toContain(marker);
    }
  });

  it("renders known blocks and an accessible quiz action", () => {
    const document = parsePageDocument({
      blocks: [
        {
          id: "block_heading",
          props: { level: 1, text: "Kenali Anemia" },
          type: "heading",
          version: 1,
        },
        { id: "block_quiz", props: { quizId: "quiz_anemia" }, type: "quiz-trigger", version: 1 },
      ],
      layout: { background: "surface-default", preset: "portrait" },
      pageId: "page_one",
      schemaVersion: 1,
    });

    const markup = renderToStaticMarkup(
      <PageRenderer
        document={document}
        interactions={{ openQuiz: () => undefined }}
        resources={resources}
      />,
    );
    expect(markup).toContain("<h1");
    expect(markup).toContain("Kenali Anemia");
    expect(markup).toContain("Mulai kuis");
  });

  it("renders myth disclosure controls and unknown blocks safely", () => {
    const preparation = preparePageDocumentForReader({
      blocks: [
        {
          id: "block_myth_fact_1",
          props: { mythFactId: "myth_fact_iron_1" },
          type: "myth-fact",
          version: 1,
        },
        {
          id: "block_future_1",
          props: { format: "future-safe-envelope" },
          type: "future-widget",
          version: 7,
        },
      ],
      layout: { background: "accent-subtle", preset: "portrait" },
      pageId: "page_anemia_2",
      schemaVersion: 1,
    });

    const markup = renderToStaticMarkup(
      <PageRenderer
        document={preparation.document}
        interactions={{ openQuiz: () => undefined }}
        resources={resources}
      />,
    );
    expect(markup).toContain("belum didukung");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("Buka faktanya");
  });
});
