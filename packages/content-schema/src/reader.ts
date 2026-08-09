import { isCurrentBlockType } from "./block-types.js";
import type {
  ContentValidationIssue,
  ReaderPageBlock,
  ReaderPageDocument,
  ReaderPreparation,
  ReaderPreparationCode,
  ReaderPreparationIssue,
  SafePreparePageDocumentResult,
  UnknownBlockEvidence,
  UnknownBlockFallback,
} from "./contracts.js";
import {
  MAX_PAGE_BLOCKS,
  safeCloneContentJsonInput,
  safeParseBlockId,
  safeParsePageDocument,
} from "./schema.js";

const UNKNOWN_BLOCK_VERSION_MAX = 1_000;
const SAFE_UNKNOWN_TYPE_LABEL = /^[a-z][a-z0-9-]{0,39}$/;
const unknownBlockEnvelopeKeys = new Set(["id", "props", "type", "version"]);

const readerPreparationMessage = {
  duplicate_block_id: "Page document block IDs must be unique.",
  invalid_document: "Page document is not valid current-schema content.",
  malformed_block: "Page document contains a malformed block.",
} as const satisfies Readonly<Record<ReaderPreparationCode, string>>;

type JsonRecord = Readonly<Record<string, unknown>>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readerIssue(
  code: ReaderPreparationCode,
  path: readonly (number | string)[],
  validationIssues: readonly ContentValidationIssue[] = [],
): ReaderPreparationIssue {
  return { code, message: readerPreparationMessage[code], path, validationIssues };
}

function safeUnknownTypeLabel(type: string): string {
  return SAFE_UNKNOWN_TYPE_LABEL.test(type) ? type : "unrecognized";
}

interface KnownBlockPosition {
  readonly kind: "known";
  readonly knownIndex: number;
  readonly sourceIndex: number;
}

interface UnknownBlockPosition {
  readonly evidence: UnknownBlockEvidence;
  readonly fallback: UnknownBlockFallback;
  readonly kind: "unknown";
  readonly sourceIndex: number;
}

type BlockPosition = KnownBlockPosition | UnknownBlockPosition;

function malformedBlockIssue(blockIndex: number, field?: string): SafePreparePageDocumentResult {
  return {
    issues: [
      readerIssue(
        "malformed_block",
        field === undefined ? ["blocks", blockIndex] : ["blocks", blockIndex, field],
      ),
    ],
    success: false,
  };
}

export class PageDocumentReaderPreparationError extends Error {
  readonly issues: readonly ReaderPreparationIssue[];

  constructor(issues: readonly ReaderPreparationIssue[]) {
    super("Page document reader preparation failed.");
    this.name = "PageDocumentReaderPreparationError";
    this.issues = issues;
  }
}

export function safePreparePageDocumentForReader(input: unknown): SafePreparePageDocumentResult {
  const clonedInput = safeCloneContentJsonInput(input);
  if (!clonedInput.success || !isJsonRecord(clonedInput.data)) {
    return {
      issues: [readerIssue("invalid_document", [], clonedInput.success ? [] : clonedInput.issues)],
      success: false,
    };
  }

  if (!Array.isArray(clonedInput.data.blocks)) {
    return {
      issues: [readerIssue("invalid_document", ["blocks"])],
      success: false,
    };
  }
  if (clonedInput.data.blocks.length > MAX_PAGE_BLOCKS) {
    return {
      issues: [readerIssue("invalid_document", ["blocks"])],
      success: false,
    };
  }

  const knownBlocks: unknown[] = [];
  const knownSourceIndexes: number[] = [];
  const positions: BlockPosition[] = [];
  const seenEnvelopeIds = new Set<string>();

  for (const [blockIndex, candidate] of clonedInput.data.blocks.entries()) {
    if (!isJsonRecord(candidate) || typeof candidate.type !== "string") {
      return malformedBlockIssue(blockIndex, "type");
    }

    const parsedId = safeParseBlockId(candidate.id);
    if (!parsedId.success) {
      return malformedBlockIssue(blockIndex, "id");
    }
    if (seenEnvelopeIds.has(parsedId.data)) {
      return {
        issues: [readerIssue("duplicate_block_id", ["blocks", blockIndex, "id"])],
        success: false,
      };
    }
    seenEnvelopeIds.add(parsedId.data);

    if (isCurrentBlockType(candidate.type)) {
      positions.push({
        kind: "known",
        knownIndex: knownBlocks.length,
        sourceIndex: blockIndex,
      });
      knownBlocks.push(candidate);
      knownSourceIndexes.push(blockIndex);
      continue;
    }

    const unknownField = Object.keys(candidate).find((key) => !unknownBlockEnvelopeKeys.has(key));
    if (unknownField !== undefined) {
      return malformedBlockIssue(blockIndex, unknownField);
    }

    if (
      typeof candidate.version !== "number" ||
      !Number.isSafeInteger(candidate.version) ||
      candidate.version < 1 ||
      candidate.version > UNKNOWN_BLOCK_VERSION_MAX
    ) {
      return malformedBlockIssue(blockIndex, "version");
    }
    if (!isJsonRecord(candidate.props)) {
      return malformedBlockIssue(blockIndex, "props");
    }

    const originalTypeLabel = safeUnknownTypeLabel(candidate.type);
    positions.push({
      evidence: {
        blockId: parsedId.data,
        blockIndex,
        code: "unknown_block_replaced",
        originalTypeLabel,
        originalVersion: candidate.version,
      },
      fallback: {
        id: parsedId.data,
        originalTypeLabel,
        type: "unknown-block",
        version: 1,
      },
      kind: "unknown",
      sourceIndex: blockIndex,
    });
  }

  const parsedKnownDocument = safeParsePageDocument({
    ...clonedInput.data,
    blocks: knownBlocks,
  });
  if (!parsedKnownDocument.success) {
    const validationIssues = parsedKnownDocument.issues.map((issue) => {
      const knownIndex = issue.path[0] === "blocks" ? issue.path[1] : undefined;
      if (typeof knownIndex !== "number") return issue;
      const sourceIndex = knownSourceIndexes[knownIndex];
      return sourceIndex === undefined
        ? issue
        : { ...issue, path: ["blocks", sourceIndex, ...issue.path.slice(2)] };
    });
    const firstBlockIssue = validationIssues.find((issue) => issue.path[0] === "blocks");
    return {
      issues: [
        readerIssue(
          firstBlockIssue === undefined ? "invalid_document" : "malformed_block",
          firstBlockIssue?.path ?? [],
          validationIssues,
        ),
      ],
      success: false,
    };
  }

  const blocks: ReaderPageBlock[] = [];
  const evidence: UnknownBlockEvidence[] = [];

  for (const position of positions) {
    const block =
      position.kind === "known"
        ? parsedKnownDocument.data.blocks[position.knownIndex]
        : position.fallback;
    if (block === undefined) {
      return {
        issues: [readerIssue("invalid_document", ["blocks", position.sourceIndex])],
        success: false,
      };
    }
    blocks.push(block);
    if (position.kind === "unknown") {
      evidence.push(position.evidence);
    }
  }

  const data: ReaderPageDocument = {
    ...parsedKnownDocument.data,
    blocks,
  };

  return { data: { document: data, evidence }, success: true };
}

export function preparePageDocumentForReader(input: unknown): ReaderPreparation {
  const result = safePreparePageDocumentForReader(input);
  if (!result.success) {
    throw new PageDocumentReaderPreparationError(result.issues);
  }
  return result.data;
}
