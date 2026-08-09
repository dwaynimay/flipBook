import { isCurrentBlockType } from "./block-types.js";
import type {
  ContentValidationIssue,
  PageBlock,
  PageDocument,
  PageMigrationCode,
  PageMigrationIssue,
  SafeMigratePageDocumentResult,
} from "./contracts.js";
import { safeCloneContentJsonInput, safeParsePageDocument } from "./schema.js";

export const CURRENT_PAGE_SCHEMA_VERSION = 1 as const;

const migrationMessage = {
  downgrade_not_supported: "Page documents cannot be migrated to an older schema version.",
  invalid_document: "Page document input is not a valid JSON-compatible object.",
  invalid_schema_version: "Page document schemaVersion must be a non-negative integer.",
  invalid_target_version: "Migration target version must be a non-negative integer.",
  migration_failed: "Page document migration did not produce a valid current document.",
  migration_gap: "No exact next migration step is registered for this document.",
  missing_schema_version: "Page document schemaVersion is required.",
  unsupported_future_version: "This reader does not support the document's future schema version.",
  unsupported_target_version: "This package does not support the requested target schema version.",
} as const satisfies Readonly<Record<PageMigrationCode, string>>;

type JsonRecord = Readonly<Record<string, unknown>>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function migrationIssue(
  code: PageMigrationCode,
  path: readonly (number | string)[],
  validationIssues: readonly ContentValidationIssue[] = [],
): PageMigrationIssue {
  return { code, message: migrationMessage[code], path, validationIssues };
}

type LegacyBlockMigrationResult =
  | { readonly block: JsonRecord; readonly success: true }
  | { readonly issue: PageMigrationIssue; readonly success: false };

type LegacyBlockMigrator = (block: JsonRecord, blockIndex: number) => LegacyBlockMigrationResult;

function migrateLegacyBlockVersion(
  block: JsonRecord,
  blockIndex: number,
): LegacyBlockMigrationResult {
  if (block.version !== 0) {
    return {
      issue: migrationIssue("migration_gap", ["blocks", blockIndex, "version"]),
      success: false,
    };
  }
  if (!isJsonRecord(block.props)) {
    return {
      issue: migrationIssue("migration_failed", ["blocks", blockIndex, "props"]),
      success: false,
    };
  }
  return { block: { ...block, version: 1 }, success: true };
}

const legacyBlockMigrationRegistry = {
  "button-link": migrateLegacyBlockVersion,
  callout: migrateLegacyBlockVersion,
  divider: migrateLegacyBlockVersion,
  heading: migrateLegacyBlockVersion,
  image: migrateLegacyBlockVersion,
  "myth-fact": migrateLegacyBlockVersion,
  paragraph: migrateLegacyBlockVersion,
  "quiz-trigger": migrateLegacyBlockVersion,
  quote: migrateLegacyBlockVersion,
  video: migrateLegacyBlockVersion,
} satisfies Readonly<Record<PageBlock["type"], LegacyBlockMigrator>>;

type DocumentMigrationResult =
  | { readonly document: JsonRecord; readonly success: true }
  | { readonly issue: PageMigrationIssue; readonly success: false };

interface PageMigrationStep {
  readonly fromVersion: number;
  readonly migrate: (document: JsonRecord) => DocumentMigrationResult;
  readonly toVersion: number;
}

function migrateDraftImportV0(document: JsonRecord): DocumentMigrationResult {
  if (!Array.isArray(document.blocks)) {
    return { issue: migrationIssue("migration_failed", ["blocks"]), success: false };
  }

  const blocks: JsonRecord[] = [];
  for (const [blockIndex, candidate] of document.blocks.entries()) {
    if (!isJsonRecord(candidate) || !isCurrentBlockType(candidate.type)) {
      return {
        issue: migrationIssue("migration_failed", ["blocks", blockIndex]),
        success: false,
      };
    }
    const migratedBlock = legacyBlockMigrationRegistry[candidate.type](candidate, blockIndex);
    if (!migratedBlock.success) {
      return migratedBlock;
    }
    blocks.push(migratedBlock.block);
  }

  return {
    document: { ...document, blocks, schemaVersion: CURRENT_PAGE_SCHEMA_VERSION },
    success: true,
  };
}

const pageMigrationRegistry: Readonly<Record<number, PageMigrationStep | undefined>> = {
  0: { fromVersion: 0, migrate: migrateDraftImportV0, toVersion: 1 },
};

function runMigrationSteps(
  document: JsonRecord,
  sourceVersion: number,
  targetVersion: number,
): DocumentMigrationResult {
  let currentDocument = document;
  let currentVersion = sourceVersion;

  while (currentVersion < targetVersion) {
    const step = pageMigrationRegistry[currentVersion];
    if (
      step === undefined ||
      step.fromVersion !== currentVersion ||
      step.toVersion !== currentVersion + 1 ||
      step.toVersion > targetVersion
    ) {
      return { issue: migrationIssue("migration_gap", ["schemaVersion"]), success: false };
    }

    const result = step.migrate(currentDocument);
    if (!result.success) {
      return result;
    }
    currentDocument = result.document;
    currentVersion = step.toVersion;
  }

  return { document: currentDocument, success: true };
}

export class PageDocumentMigrationError extends Error {
  readonly issues: readonly PageMigrationIssue[];

  constructor(issues: readonly PageMigrationIssue[]) {
    super("Page document migration failed.");
    this.name = "PageDocumentMigrationError";
    this.issues = issues;
  }
}

export function safeMigratePageDocument(
  input: unknown,
  targetVersion: number = CURRENT_PAGE_SCHEMA_VERSION,
): SafeMigratePageDocumentResult {
  if (!Number.isSafeInteger(targetVersion) || targetVersion < 0) {
    return { issues: [migrationIssue("invalid_target_version", [])], success: false };
  }
  if (targetVersion > CURRENT_PAGE_SCHEMA_VERSION) {
    return { issues: [migrationIssue("unsupported_target_version", [])], success: false };
  }

  const clonedInput = safeCloneContentJsonInput(input);
  if (!clonedInput.success || !isJsonRecord(clonedInput.data)) {
    return {
      issues: [
        migrationIssue("invalid_document", [], clonedInput.success ? [] : clonedInput.issues),
      ],
      success: false,
    };
  }
  if (!Object.hasOwn(clonedInput.data, "schemaVersion")) {
    return {
      issues: [migrationIssue("missing_schema_version", ["schemaVersion"])],
      success: false,
    };
  }

  const sourceVersion = clonedInput.data.schemaVersion;
  if (
    typeof sourceVersion !== "number" ||
    !Number.isSafeInteger(sourceVersion) ||
    sourceVersion < 0
  ) {
    return {
      issues: [migrationIssue("invalid_schema_version", ["schemaVersion"])],
      success: false,
    };
  }
  if (sourceVersion > CURRENT_PAGE_SCHEMA_VERSION) {
    return {
      issues: [migrationIssue("unsupported_future_version", ["schemaVersion"])],
      success: false,
    };
  }
  if (targetVersion < sourceVersion) {
    return {
      issues: [migrationIssue("downgrade_not_supported", ["schemaVersion"])],
      success: false,
    };
  }
  if (targetVersion !== CURRENT_PAGE_SCHEMA_VERSION) {
    return {
      issues: [migrationIssue("unsupported_target_version", ["schemaVersion"])],
      success: false,
    };
  }

  const migrated = runMigrationSteps(clonedInput.data, sourceVersion, targetVersion);
  if (!migrated.success) {
    return { issues: [migrated.issue], success: false };
  }

  const parsed = safeParsePageDocument(migrated.document);
  if (!parsed.success) {
    return {
      issues: [migrationIssue("migration_failed", [], parsed.issues)],
      success: false,
    };
  }

  return {
    data: parsed.data,
    fromVersion: sourceVersion,
    migrated: sourceVersion !== targetVersion,
    success: true,
    toVersion: CURRENT_PAGE_SCHEMA_VERSION,
  };
}

export function migratePageDocument(
  input: unknown,
  targetVersion: number = CURRENT_PAGE_SCHEMA_VERSION,
): PageDocument {
  const result = safeMigratePageDocument(input, targetVersion);
  if (!result.success) {
    throw new PageDocumentMigrationError(result.issues);
  }
  return result.data;
}
