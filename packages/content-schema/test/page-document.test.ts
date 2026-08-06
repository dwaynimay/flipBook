import { describe, expect, it } from "vitest";

import {
  ContentValueValidationError,
  PageDocumentValidationError,
  parseBlockId,
  parseMediaId,
  parseMythFactId,
  parsePageDocument,
  parsePageId,
  parseQuizId,
  parseSafeHttpsUrl,
  safeParseBlockId,
  safeParseMediaId,
  safeParseMythFactId,
  safeParsePageDocument,
  safeParsePageId,
  safeParseQuizId,
  safeParseSafeHttpsUrl,
  type PageBlock,
} from "../src/index.js";
import { validPageDocumentFixture } from "./fixtures.js";

function blockTypeContract(block: PageBlock): string {
  switch (block.type) {
    case "heading":
    case "paragraph":
    case "image":
    case "video":
    case "callout":
    case "quote":
    case "button-link":
    case "divider":
    case "myth-fact":
    case "quiz-trigger":
      return block.type;
    default: {
      const exhaustiveBlock: never = block;
      return exhaustiveBlock;
    }
  }
}

function documentWithBlock(block: unknown): unknown {
  return { ...validPageDocumentFixture, blocks: [block] };
}

describe("PageDocument v1", () => {
  it("parses all ten MVP variants and maps their typed props without a schema cast", () => {
    const document = parsePageDocument(validPageDocumentFixture);

    expect(document.blocks.map(blockTypeContract)).toEqual([
      "heading",
      "paragraph",
      "image",
      "video",
      "callout",
      "quote",
      "button-link",
      "divider",
      "myth-fact",
      "quiz-trigger",
    ]);

    for (const block of document.blocks) {
      if (block.type === "image") {
        expect(block.props.aspectRatio).toEqual({ height: 3, width: 4 });
        expect(block.props.caption).toBe("Sel darah merah membawa oksigen.");
      }
      if (block.type === "video") {
        expect(block.props.aspectRatio).toEqual({ height: 9, width: 16 });
        expect(block.props.mediaId).toBe("media_anemia_video");
      }
    }
  });

  it("publishes stable project-owned validation codes, messages, and paths", () => {
    const result = safeParsePageDocument({
      ...validPageDocumentFixture,
      layout: { ...validPageDocumentFixture.layout, arbitraryCss: "display:none" },
    });

    expect(result).toEqual({
      issues: [
        {
          code: "unknown_field",
          message: "Field is not allowed.",
          path: ["layout", "arbitraryCss"],
        },
      ],
      success: false,
    });
  });

  it("throws only the project-owned page error from the strict parse boundary", () => {
    expect(() => parsePageDocument(null)).toThrow(PageDocumentValidationError);
    expect(() => parsePageDocument(null)).toThrow("Page document validation failed.");
  });

  it.each([
    ["unknown document keys", { ...validPageDocumentFixture, css: "display:none" }],
    [
      "raw CSS background",
      { ...validPageDocumentFixture, layout: { background: "#FFFFFF", preset: "portrait" } },
    ],
    [
      "unknown block type",
      documentWithBlock({ id: "block_unknown_1", props: {}, type: "html", version: 1 }),
    ],
    [
      "unknown block keys",
      documentWithBlock({
        id: "block_heading_2",
        props: { level: 2, text: "Heading" },
        script: "alert(1)",
        type: "heading",
        version: 1,
      }),
    ],
    [
      "unknown props",
      documentWithBlock({
        id: "block_heading_3",
        props: { className: "arbitrary", level: 2, text: "Heading" },
        type: "heading",
        version: 1,
      }),
    ],
    [
      "wrong block version",
      documentWithBlock({
        id: "block_heading_4",
        props: { level: 2, text: "Heading" },
        type: "heading",
        version: 2,
      }),
    ],
    [
      "unsafe link protocol",
      documentWithBlock({
        id: "block_link_2",
        props: { appearance: "link", href: "javascript:alert(1)", label: "Unsafe" },
        type: "button-link",
        version: 1,
      }),
    ],
    [
      "embedded media URL",
      documentWithBlock({
        id: "block_video_2",
        props: {
          aspectRatio: { height: 9, width: 16 },
          mediaId: "media_video_2",
          url: "https://example.org/video.mp4",
        },
        type: "video",
        version: 1,
      }),
    ],
    [
      "an explicit undefined optional field",
      documentWithBlock({
        id: "block_video_3",
        props: {
          aspectRatio: { height: 9, width: 16 },
          caption: undefined,
          mediaId: "media_video_3",
        },
        type: "video",
        version: 1,
      }),
    ],
  ])("rejects %s", (_description, input) => {
    expect(safeParsePageDocument(input).success).toBe(false);
  });

  it.each([
    [
      "image without aspect ratio",
      {
        id: "block_image_missing_geometry",
        props: { altText: "Image", decorative: false, mediaId: "media_image_1" },
        type: "image",
        version: 1,
      },
    ],
    [
      "video without aspect ratio",
      {
        id: "block_video_missing_geometry",
        props: { mediaId: "media_video_4" },
        type: "video",
        version: 1,
      },
    ],
    [
      "zero aspect-ratio component",
      {
        id: "block_image_zero_geometry",
        props: {
          altText: "Image",
          aspectRatio: { height: 0, width: 4 },
          decorative: false,
          mediaId: "media_image_2",
        },
        type: "image",
        version: 1,
      },
    ],
    [
      "fractional aspect-ratio component",
      {
        id: "block_video_fractional_geometry",
        props: { aspectRatio: { height: 9, width: 16.5 }, mediaId: "media_video_5" },
        type: "video",
        version: 1,
      },
    ],
    [
      "oversized aspect-ratio component",
      {
        id: "block_video_large_geometry",
        props: { aspectRatio: { height: 9, width: 10_001 }, mediaId: "media_video_6" },
        type: "video",
        version: 1,
      },
    ],
    [
      "string aspect ratio",
      {
        id: "block_video_string_geometry",
        props: { aspectRatio: "16/9", mediaId: "media_video_7" },
        type: "video",
        version: 1,
      },
    ],
  ])("rejects %s", (_description, block) => {
    expect(safeParsePageDocument(documentWithBlock(block)).success).toBe(false);
  });

  it("preserves HTML-looking paragraph text as inert plain text", () => {
    const result = safeParsePageDocument(
      documentWithBlock({
        id: "block_plain_text_html",
        props: { text: "<strong>Teks ini bukan HTML.</strong>" },
        type: "paragraph",
        version: 1,
      }),
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.blocks[0]?.props).toEqual({
        text: "<strong>Teks ini bukan HTML.</strong>",
      });
    }
  });

  it("rejects duplicate block IDs with a stable semantic issue", () => {
    const result = safeParsePageDocument({
      ...validPageDocumentFixture,
      blocks: [validPageDocumentFixture.blocks[0], validPageDocumentFixture.blocks[0]],
    });

    expect(result).toEqual({
      issues: [
        {
          code: "duplicate_block_id",
          message: "Block IDs must be unique within a page.",
          path: ["blocks", 1, "id"],
        },
      ],
      success: false,
    });
  });

  it.each([
    [true, "This should be empty", "decorative_image_alt_text_forbidden"],
    [false, "", "image_alt_text_required"],
  ])("enforces alt-text invariant for decorative=%s", (decorative, altText, code) => {
    const result = safeParsePageDocument(
      documentWithBlock({
        id: "block_image_accessibility",
        props: {
          altText,
          aspectRatio: { height: 3, width: 4 },
          decorative,
          mediaId: "media_accessibility",
        },
        type: "image",
        version: 1,
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({ issues: [expect.objectContaining({ code })], success: false }),
    );
  });

  it("accepts valid decorative media geometry and HTTPS button links", () => {
    expect(
      safeParsePageDocument(
        documentWithBlock({
          id: "block_image_decorative",
          props: {
            altText: "",
            aspectRatio: { height: 1, width: 1 },
            decorative: true,
            mediaId: "media_decorative",
          },
          type: "image",
          version: 1,
        }),
      ).success,
    ).toBe(true);
    expect(
      safeParsePageDocument(
        documentWithBlock({
          id: "block_link_https",
          props: {
            appearance: "link",
            href: "https://example.org/learn/anemia",
            label: "Pelajari lebih lanjut",
          },
          type: "button-link",
          version: 1,
        }),
      ).success,
    ).toBe(true);
  });
});

describe("JSON-compatible trust preflight", () => {
  it.each([
    ['{"__proto__":{"polluted":true}}', ["__proto__"]],
    [
      '{"blocks":[{"props":{"constructor":{"polluted":true}}}]}',
      ["blocks", 0, "props", "constructor"],
    ],
    ['{"layout":{"prototype":{"polluted":true}}}', ["layout", "prototype"]],
  ])("rejects dangerous own keys without accepting Zod-stripped input", (json, path) => {
    const input: unknown = JSON.parse(json);
    const result = safeParsePageDocument(input);

    expect(result).toEqual({
      issues: [{ code: "dangerous_key", message: "This object key is not allowed.", path }],
      success: false,
    });
  });

  it("rejects accessors without invoking them", () => {
    const input = { ...validPageDocumentFixture };
    Object.defineProperty(input, "layout", {
      enumerable: true,
      get: () => {
        throw new Error("Getter must not run.");
      },
    });

    expect(() => safeParsePageDocument(input)).not.toThrow();
    expect(safeParsePageDocument(input)).toEqual({
      issues: [
        {
          code: "non_json_value",
          message: "Page input must contain only JSON-compatible values.",
          path: ["layout"],
        },
      ],
      success: false,
    });
  });

  it("rejects cyclic and non-plain values before schema traversal", () => {
    const cyclic: Record<string, unknown> = { ...validPageDocumentFixture };
    cyclic.self = cyclic;

    expect(safeParsePageDocument(cyclic)).toEqual(
      expect.objectContaining({
        issues: [expect.objectContaining({ code: "non_json_value", path: ["self"] })],
        success: false,
      }),
    );
    expect(safeParsePageDocument(new Date("2026-08-06T00:00:00Z"))).toEqual({
      issues: [
        {
          code: "non_json_value",
          message: "Page input must contain only JSON-compatible values.",
          path: [],
        },
      ],
      success: false,
    });
  });

  it("rejects sparse, augmented, and inherited object shapes", () => {
    const sparseBlocks: unknown[] = [];
    sparseBlocks.length = 1;
    const augmentedBlocks = [...validPageDocumentFixture.blocks];
    Object.defineProperty(augmentedBlocks, "extra", {
      enumerable: true,
      value: "not-json-array-shape",
    });
    const inherited: Record<string, unknown> = {};
    Object.setPrototypeOf(inherited, { hidden: "inherited" });
    Object.assign(inherited, validPageDocumentFixture);

    expect(safeParsePageDocument({ ...validPageDocumentFixture, blocks: sparseBlocks })).toEqual(
      expect.objectContaining({
        issues: [expect.objectContaining({ code: "non_json_value", path: ["blocks", 0] })],
        success: false,
      }),
    );
    expect(safeParsePageDocument({ ...validPageDocumentFixture, blocks: augmentedBlocks })).toEqual(
      expect.objectContaining({
        issues: [expect.objectContaining({ code: "non_json_value", path: ["blocks", "extra"] })],
        success: false,
      }),
    );
    expect(safeParsePageDocument(inherited)).toEqual(
      expect.objectContaining({
        issues: [expect.objectContaining({ code: "non_json_value", path: [] })],
        success: false,
      }),
    );
  });
});

describe("hostile Proxy containment", () => {
  const hostileProxyCases: readonly [string, () => unknown][] = [
    [
      "throwing getPrototypeOf trap",
      () =>
        new Proxy(
          { ...validPageDocumentFixture },
          {
            getPrototypeOf: () => {
              throw new Error("hostile-get-prototype-secret");
            },
          },
        ),
    ],
    [
      "throwing ownKeys trap",
      () =>
        new Proxy(
          { ...validPageDocumentFixture },
          {
            ownKeys: () => {
              throw new Error("hostile-own-keys-secret");
            },
          },
        ),
    ],
    [
      "throwing descriptor trap",
      () =>
        new Proxy(
          { ...validPageDocumentFixture },
          {
            getOwnPropertyDescriptor: () => {
              throw new Error("hostile-descriptor-secret");
            },
          },
        ),
    ],
    [
      "revoked Proxy",
      () => {
        const revocable = Proxy.revocable({ ...validPageDocumentFixture }, {});
        revocable.revoke();
        return revocable.proxy;
      },
    ],
  ];

  it.each(hostileProxyCases)("normalizes a %s without leaking its error", (_name, createInput) => {
    const result = safeParsePageDocument(createInput());

    expect(result).toEqual({
      issues: [
        {
          code: "non_json_value",
          message: "Page input must contain only JSON-compatible values.",
          path: [],
        },
      ],
      success: false,
    });
    expect(JSON.stringify(result)).not.toContain("hostile-");
  });

  it("contains a stateful Proxy that throws only during the clone reflection", () => {
    let ownKeysCalls = 0;
    const input = new Proxy(
      { ...validPageDocumentFixture },
      {
        ownKeys: (target) => {
          ownKeysCalls += 1;
          if (ownKeysCalls === 2) {
            throw new Error("hostile-second-reflection-secret");
          }
          return Reflect.ownKeys(target);
        },
      },
    );

    const result = safeParsePageDocument(input);

    expect(ownKeysCalls).toBe(2);
    expect(result).toEqual({
      issues: [
        {
          code: "non_json_value",
          message: "Page input must contain only JSON-compatible values.",
          path: [],
        },
      ],
      success: false,
    });
    expect(JSON.stringify(result)).not.toContain("hostile-");
  });
});

describe("clone-time structural budgets", () => {
  function mutatePropertyOnClone(
    propertyName: "blocks" | "layout",
    replacement: (proxy: object) => unknown,
  ): unknown {
    const target = { ...validPageDocumentFixture };
    let proxy: object = target;
    let propertyReads = 0;
    proxy = new Proxy(target, {
      getOwnPropertyDescriptor: (currentTarget, property) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(currentTarget, property);
        if (property === propertyName) {
          propertyReads += 1;
          if (propertyReads === 2 && descriptor !== undefined) {
            return { ...descriptor, value: replacement(proxy) };
          }
        }
        return descriptor;
      },
    });
    return proxy;
  }

  it("rejects a self-cycle introduced only during clone reflection", () => {
    const result = safeParsePageDocument(mutatePropertyOnClone("layout", (proxy) => proxy));

    expect(result).toEqual({
      issues: [
        {
          code: "non_json_value",
          message: "Page input must contain only JSON-compatible values.",
          path: ["layout"],
        },
      ],
      success: false,
    });
  });

  it("rejects excessive depth introduced only during clone reflection", () => {
    let nested: unknown = "leaf";
    for (let depth = 0; depth < 70; depth += 1) {
      nested = { value: nested };
    }

    const result = safeParsePageDocument(mutatePropertyOnClone("layout", () => nested));

    expect(result).toEqual(
      expect.objectContaining({
        issues: [expect.objectContaining({ code: "value_too_complex" })],
        success: false,
      }),
    );
  });

  it("enforces one cumulative clone node budget against late expansion", () => {
    const expandedBlocks = Array.from({ length: 6_000 }, (_value, index) => ({ index }));
    const result = safeParsePageDocument(mutatePropertyOnClone("blocks", () => expandedBlocks));

    expect(result).toEqual(
      expect.objectContaining({
        issues: [expect.objectContaining({ code: "value_too_complex" })],
        success: false,
      }),
    );
  });
});

describe("public branded-value constructors", () => {
  const cases = [
    [
      "block-id",
      "block_valid_1",
      "invalid_identifier_value",
      safeParseBlockId,
      parseBlockId,
      "invalid_identifier",
    ],
    [
      "media-id",
      "media_valid_1",
      "invalid_identifier_value",
      safeParseMediaId,
      parseMediaId,
      "invalid_identifier",
    ],
    [
      "myth-fact-id",
      "myth_fact_valid_1",
      "invalid_identifier_value",
      safeParseMythFactId,
      parseMythFactId,
      "invalid_identifier",
    ],
    [
      "page-id",
      "page_valid_1",
      "invalid_identifier_value",
      safeParsePageId,
      parsePageId,
      "invalid_identifier",
    ],
    [
      "quiz-id",
      "quiz_valid_1",
      "invalid_identifier_value",
      safeParseQuizId,
      parseQuizId,
      "invalid_identifier",
    ],
    [
      "safe-https-url",
      "https://example.org/source",
      "javascript:alert(1)",
      safeParseSafeHttpsUrl,
      parseSafeHttpsUrl,
      "invalid_format",
    ],
  ] as const;

  it.each(cases)(
    "constructs %s only through its validated public boundary",
    (valueKind, valid, invalid, safeParse, parse, code) => {
      expect(safeParse(valid)).toEqual({ data: valid, success: true });
      expect(parse(valid)).toBe(valid);
      expect(safeParse(invalid)).toEqual(
        expect.objectContaining({ issues: [expect.objectContaining({ code })], success: false }),
      );

      try {
        parse(invalid);
        throw new Error("Expected brand parsing to fail.");
      } catch (error: unknown) {
        expect(error).toBeInstanceOf(ContentValueValidationError);
        expect(error).toMatchObject({ valueKind });
        expect(String(error)).not.toContain(invalid);
      }
    },
  );
});
