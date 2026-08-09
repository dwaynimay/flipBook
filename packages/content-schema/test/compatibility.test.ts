import { describe, expect, it } from "vitest";

import {
  PageDocumentMigrationError,
  PageDocumentReaderPreparationError,
  migratePageDocument,
  preparePageDocumentForReader,
  safeMigratePageDocument,
  safeParsePageDocument,
  safePreparePageDocumentForReader,
} from "../src/index.js";
import { draftImportV0Fixture, validPageDocumentFixture } from "./fixtures.js";

function documentWithBlocks(blocks: readonly unknown[]): unknown {
  return { ...validPageDocumentFixture, blocks };
}

function unknownBlock(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    id: "block_future_1",
    props: { html: "<script>alert(1)</script>", script: "steal()", url: "javascript:x" },
    type: "future-widget",
    version: 7,
    ...overrides,
  };
}

describe("deterministic page migrations", () => {
  it("migrates the explicit pre-v1 draft/import fixture one exact step", () => {
    const result = safeMigratePageDocument(draftImportV0Fixture);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.fromVersion).toBe(0);
    expect(result.toVersion).toBe(1);
    expect(result.migrated).toBe(true);
    expect(result.data.schemaVersion).toBe(1);
    expect(result.data.blocks.map((block) => block.version)).toEqual(
      draftImportV0Fixture.blocks.map(() => 1),
    );
  });

  it("is idempotent for already-current v1 documents", () => {
    const first = safeMigratePageDocument(validPageDocumentFixture);
    const second = first.success ? safeMigratePageDocument(first.data) : first;

    expect(first).toMatchObject({ fromVersion: 1, migrated: false, success: true, toVersion: 1 });
    expect(second).toEqual(first);
  });

  it.each([
    [{ ...validPageDocumentFixture, schemaVersion: 2 }, "unsupported_future_version"],
    [
      (({ schemaVersion: _, ...document }) => document)(validPageDocumentFixture),
      "missing_schema_version",
    ],
    [{ ...validPageDocumentFixture, schemaVersion: "1" }, "invalid_schema_version"],
  ] as const)("rejects unsupported, missing, and malformed source versions", (input, code) => {
    expect(safeMigratePageDocument(input)).toMatchObject({ issues: [{ code }], success: false });
  });

  it("rejects downgrade and unsupported target requests", () => {
    expect(safeMigratePageDocument(validPageDocumentFixture, 0)).toMatchObject({
      issues: [{ code: "downgrade_not_supported" }],
      success: false,
    });
    expect(safeMigratePageDocument(validPageDocumentFixture, 2)).toMatchObject({
      issues: [{ code: "unsupported_target_version" }],
      success: false,
    });
    expect(safeMigratePageDocument(validPageDocumentFixture, 1.5)).toMatchObject({
      issues: [{ code: "invalid_target_version" }],
      success: false,
    });
  });

  it("rejects extra top-level fields on an unknown block envelope", () => {
    expect(
      safePreparePageDocumentForReader(
        documentWithBlocks([unknownBlock({ arbitraryEnvelopeData: "drop-me" })]),
      ),
    ).toMatchObject({
      issues: [
        {
          code: "malformed_block",
          path: ["blocks", 0, "arbitraryEnvelopeData"],
        },
      ],
      success: false,
    });
  });

  it("rejects a missing per-block step instead of skipping it", () => {
    const input = {
      ...draftImportV0Fixture,
      blocks: [{ ...draftImportV0Fixture.blocks[0], version: 2 }],
    };
    expect(safeMigratePageDocument(input)).toMatchObject({
      issues: [{ code: "migration_gap", path: ["blocks", 0, "version"] }],
      success: false,
    });
  });

  it("runs strict v1 validation after a step", () => {
    const heading = draftImportV0Fixture.blocks.find((block) => block.type === "heading");
    expect(heading).toBeDefined();
    if (heading === undefined) return;
    const input = {
      ...draftImportV0Fixture,
      blocks: [
        {
          ...heading,
          props: { ...heading.props, level: 4 },
        },
      ],
    };
    const result = safeMigratePageDocument(input);
    expect(result).toMatchObject({ issues: [{ code: "migration_failed" }], success: false });
    if (!result.success) {
      expect(result.issues[0]?.validationIssues.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("does not mutate either legacy or current input", () => {
    const legacyBefore = JSON.stringify(draftImportV0Fixture);
    const currentBefore = JSON.stringify(validPageDocumentFixture);
    safeMigratePageDocument(draftImportV0Fixture);
    safeMigratePageDocument(validPageDocumentFixture);
    expect(JSON.stringify(draftImportV0Fixture)).toBe(legacyBefore);
    expect(JSON.stringify(validPageDocumentFixture)).toBe(currentBefore);
  });

  it("rejects dangerous keys through the shared JSON trust boundary", () => {
    const input = JSON.parse(
      '{"schemaVersion":0,"pageId":"page_safe","layout":{"preset":"portrait","background":"surface-default"},"blocks":[],"__proto__":{}}',
    );
    expect(safeMigratePageDocument(input)).toMatchObject({
      issues: [{ code: "invalid_document" }],
      success: false,
    });
  });

  it("provides a project-owned throwing API", () => {
    expect(() => migratePageDocument(null)).toThrow(PageDocumentMigrationError);
  });
});

describe("unknown-block reader preparation", () => {
  it("keeps known blocks and replaces multiple unknown blocks in source order", () => {
    const input = documentWithBlocks([
      validPageDocumentFixture.blocks[0],
      unknownBlock(),
      validPageDocumentFixture.blocks[1],
      unknownBlock({ id: "block_future_2", type: "another-widget", version: 9 }),
    ]);
    const result = safePreparePageDocumentForReader(input);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.document.blocks.map((block) => block.type)).toEqual([
      "heading",
      "unknown-block",
      "paragraph",
      "unknown-block",
    ]);
    expect(result.data.evidence).toEqual([
      {
        blockId: "block_future_1",
        blockIndex: 1,
        code: "unknown_block_replaced",
        originalTypeLabel: "future-widget",
        originalVersion: 7,
      },
      {
        blockId: "block_future_2",
        blockIndex: 3,
        code: "unknown_block_replaced",
        originalTypeLabel: "another-widget",
        originalVersion: 9,
      },
    ]);
  });

  it("drops all hostile unknown props from output and evidence", () => {
    const result = safePreparePageDocumentForReader(documentWithBlocks([unknownBlock()]));
    expect(result.success).toBe(true);
    if (!result.success) return;
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("script");
    expect(serialized).not.toContain("javascript:x");
    expect(result.data.document.blocks[0]).toEqual({
      id: "block_future_1",
      originalTypeLabel: "future-widget",
      type: "unknown-block",
      version: 1,
    });
  });

  it("sanitizes hostile or oversized unknown type labels", () => {
    const result = safePreparePageDocumentForReader(
      documentWithBlocks([unknownBlock({ type: "<script>very unsafe label</script>" })]),
    );
    expect(result).toMatchObject({
      data: {
        document: { blocks: [{ originalTypeLabel: "unrecognized" }] },
        evidence: [{ originalTypeLabel: "unrecognized" }],
      },
      success: true,
    });
  });

  it("keeps publication strict while reader preparation is forward tolerant", () => {
    const input = documentWithBlocks([unknownBlock()]);
    expect(safeParsePageDocument(input).success).toBe(false);
    expect(safePreparePageDocumentForReader(input).success).toBe(true);
  });

  it("rejects malformed known blocks instead of disguising them as unknown", () => {
    const malformedKnown = {
      ...validPageDocumentFixture.blocks[0],
      props: { level: 99, text: "Invalid" },
    };
    expect(safePreparePageDocumentForReader(documentWithBlocks([malformedKnown]))).toMatchObject({
      issues: [{ code: "malformed_block" }],
      success: false,
    });
  });

  it("reports a malformed known block at its original index after an unknown block", () => {
    const malformedKnown = {
      ...validPageDocumentFixture.blocks[0],
      props: { level: 99, text: "Invalid" },
    };
    expect(
      safePreparePageDocumentForReader(documentWithBlocks([unknownBlock(), malformedKnown])),
    ).toMatchObject({
      issues: [
        {
          code: "malformed_block",
          path: ["blocks", 1, "props", "level"],
          validationIssues: [{ path: ["blocks", 1, "props", "level"] }],
        },
      ],
      success: false,
    });
  });

  it.each([
    [(({ id: _id, ...block }) => block)(unknownBlock()), "id"],
    [(({ version: _version, ...block }) => block)(unknownBlock()), "version"],
    [unknownBlock({ version: 0 }), "version"],
    [unknownBlock({ version: 1_001 }), "version"],
    [unknownBlock({ props: null }), "props"],
  ] as const)("rejects malformed unknown envelopes", (block, field) => {
    expect(safePreparePageDocumentForReader(documentWithBlocks([block]))).toMatchObject({
      issues: [{ code: "malformed_block", path: ["blocks", 0, field] }],
      success: false,
    });
  });

  it("rejects duplicate IDs across known and unknown blocks", () => {
    const duplicate = unknownBlock({ id: validPageDocumentFixture.blocks[0].id });
    expect(
      safePreparePageDocumentForReader(
        documentWithBlocks([validPageDocumentFixture.blocks[0], duplicate]),
      ),
    ).toMatchObject({
      issues: [{ code: "duplicate_block_id", path: ["blocks", 1, "id"] }],
      success: false,
    });
  });

  it("enforces the page block limit across known and unknown blocks", () => {
    const blocks = Array.from({ length: 101 }, (_, index) =>
      unknownBlock({ id: `block_future_${index + 1}` }),
    );
    expect(safePreparePageDocumentForReader(documentWithBlocks(blocks))).toMatchObject({
      issues: [{ code: "invalid_document", path: ["blocks"] }],
      success: false,
    });
  });

  it("rejects dangerous keys before fallback conversion", () => {
    const input = JSON.parse(
      '{"schemaVersion":1,"pageId":"page_safe","layout":{"preset":"portrait","background":"surface-default"},"blocks":[{"id":"block_future_1","type":"future-widget","version":1,"props":{"constructor":"unsafe"}}]}',
    );
    expect(safePreparePageDocumentForReader(input)).toMatchObject({
      issues: [{ code: "invalid_document" }],
      success: false,
    });
  });

  it("provides a project-owned throwing API", () => {
    expect(() => preparePageDocumentForReader(null)).toThrow(PageDocumentReaderPreparationError);
  });

  it("preserves typed evidence through the throwing convenience API", () => {
    expect(preparePageDocumentForReader(documentWithBlocks([unknownBlock()]))).toMatchObject({
      document: { blocks: [{ type: "unknown-block" }] },
      evidence: [{ code: "unknown_block_replaced", originalTypeLabel: "future-widget" }],
    });
  });
});
