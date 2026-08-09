import { z } from "zod";

import type {
  BlockId,
  ContentValidationCode,
  ContentValidationIssue,
  ContentValueKind,
  MediaId,
  MythFactId,
  PageBlock,
  PageDocument,
  PageId,
  QuizId,
  SafeHttpsUrl,
  SafeParseBlockIdResult,
  SafeParseMediaIdResult,
  SafeParseMythFactIdResult,
  SafeParsePageDocumentResult,
  SafeParsePageIdResult,
  SafeParseQuizIdResult,
  SafeParseResult,
  SafeParseSafeHttpsUrlResult,
} from "./contracts.js";

const MAX_ASPECT_RATIO_COMPONENT = 10_000;
const MAX_JSON_DEPTH = 64;
const MAX_JSON_NODES = 10_000;
export const MAX_PAGE_BLOCKS = 100;
const dangerousObjectKeys = new Set(["__proto__", "constructor", "prototype"]);
const identifierSuffixPattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

const internalIssueMessage = {
  decorativeAlt: "internal.decorative-alt",
  duplicateBlockId: "internal.duplicate-block-id",
  identifier: "internal.identifier",
  informativeAlt: "internal.informative-alt",
} as const;

const stableMessage = {
  dangerous_key: "This object key is not allowed.",
  decorative_image_alt_text_forbidden: "Decorative images must use empty alternative text.",
  duplicate_block_id: "Block IDs must be unique within a page.",
  image_alt_text_required: "Informative images require alternative text.",
  invalid_element: "A collection element is invalid.",
  invalid_format: "Value has an invalid format.",
  invalid_identifier: "Identifier has an invalid format.",
  invalid_increment: "Number does not use an allowed increment.",
  invalid_key: "Object key is invalid.",
  invalid_type: "Value has an invalid type.",
  invalid_value: "Value is not allowed.",
  invalid_variant: "Value does not match an allowed variant.",
  non_json_value: "Page input must contain only JSON-compatible values.",
  unknown_field: "Field is not allowed.",
  validation_failed: "Value failed content validation.",
  value_too_complex: "Page input exceeds the allowed structural complexity.",
  value_too_large: "Value exceeds the allowed maximum.",
  value_too_small: "Value is below the allowed minimum.",
} as const satisfies Readonly<Record<ContentValidationCode, string>>;

function issue(
  code: ContentValidationCode,
  path: readonly (number | string)[],
): ContentValidationIssue {
  return { code, message: stableMessage[code], path };
}

function identifierSchema<TIdentifier extends string>(prefix: string): z.ZodType<TIdentifier> {
  return z
    .string()
    .min(prefix.length + 1)
    .max(80)
    .refine(
      (value) =>
        value.startsWith(prefix) && identifierSuffixPattern.test(value.slice(prefix.length)),
      internalIssueMessage.identifier,
    )
    .transform((value): TIdentifier => value as TIdentifier);
}

const blockIdSchema = identifierSchema<BlockId>("block_");
const mediaIdSchema = identifierSchema<MediaId>("media_");
const mythFactIdSchema = identifierSchema<MythFactId>("myth_fact_");
const pageIdSchema = identifierSchema<PageId>("page_");
const quizIdSchema = identifierSchema<QuizId>("quiz_");

const safeHttpsUrlSchema: z.ZodType<SafeHttpsUrl> = z
  .url({ protocol: /^https$/ })
  .max(2_048)
  .transform((value): SafeHttpsUrl => value as SafeHttpsUrl);

const shortTextSchema = z.string().trim().min(1).max(200);
const bodyTextSchema = z.string().trim().min(1).max(5_000);
const optionalCaptionSchema = z.string().trim().min(1).max(300).optional();
const aspectRatioSchema = z.strictObject({
  height: z.int().min(1).max(MAX_ASPECT_RATIO_COMPONENT),
  width: z.int().min(1).max(MAX_ASPECT_RATIO_COMPONENT),
});

const blockBaseShape = {
  id: blockIdSchema,
  version: z.literal(1),
};

const headingBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z.strictObject({
    level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    text: shortTextSchema,
  }),
  type: z.literal("heading"),
});

const paragraphBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z.strictObject({ text: bodyTextSchema }),
  type: z.literal("paragraph"),
});

const imageBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z
    .strictObject({
      altText: z.string().trim().max(500),
      aspectRatio: aspectRatioSchema,
      caption: optionalCaptionSchema,
      decorative: z.boolean(),
      mediaId: mediaIdSchema,
    })
    .superRefine((props, context) => {
      if (props.decorative && props.altText.length > 0) {
        context.addIssue({
          code: "custom",
          message: internalIssueMessage.decorativeAlt,
          path: ["altText"],
        });
      }
      if (!props.decorative && props.altText.length === 0) {
        context.addIssue({
          code: "custom",
          message: internalIssueMessage.informativeAlt,
          path: ["altText"],
        });
      }
    }),
  type: z.literal("image"),
});

const videoBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z.strictObject({
    aspectRatio: aspectRatioSchema,
    caption: optionalCaptionSchema,
    mediaId: mediaIdSchema,
  }),
  type: z.literal("video"),
});

const calloutBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z.strictObject({
    text: bodyTextSchema,
    title: shortTextSchema.optional(),
    tone: z.enum(["info", "tip", "warning"]),
  }),
  type: z.literal("callout"),
});

const quoteBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z.strictObject({ attribution: shortTextSchema.optional(), text: bodyTextSchema }),
  type: z.literal("quote"),
});

const buttonLinkBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z.strictObject({
    appearance: z.enum(["button", "link"]),
    href: safeHttpsUrlSchema,
    label: shortTextSchema,
  }),
  type: z.literal("button-link"),
});

const dividerBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z.strictObject({ style: z.enum(["solid", "dashed"]) }),
  type: z.literal("divider"),
});

const mythFactBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z.strictObject({ mythFactId: mythFactIdSchema }),
  type: z.literal("myth-fact"),
});

const quizTriggerBlockSchema = z.strictObject({
  ...blockBaseShape,
  props: z.strictObject({ quizId: quizIdSchema }),
  type: z.literal("quiz-trigger"),
});

const pageBlockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  imageBlockSchema,
  videoBlockSchema,
  calloutBlockSchema,
  quoteBlockSchema,
  buttonLinkBlockSchema,
  dividerBlockSchema,
  mythFactBlockSchema,
  quizTriggerBlockSchema,
]);

const pageDocumentSchema = z
  .strictObject({
    blocks: z.array(pageBlockSchema).max(MAX_PAGE_BLOCKS),
    layout: z.strictObject({
      background: z.enum(["accent-subtle", "surface-default", "surface-subtle"]),
      preset: z.literal("portrait"),
    }),
    pageId: pageIdSchema,
    schemaVersion: z.literal(1),
  })
  .superRefine((document, context) => {
    const blockIds = new Set<BlockId>();
    document.blocks.forEach((block, index) => {
      if (blockIds.has(block.id)) {
        context.addIssue({
          code: "custom",
          message: internalIssueMessage.duplicateBlockId,
          path: ["blocks", index, "id"],
        });
      }
      blockIds.add(block.id);
    });
  });

type ParsedPageBlock = z.output<typeof pageBlockSchema>;

function mapPageBlock(block: ParsedPageBlock): PageBlock {
  switch (block.type) {
    case "heading":
      return {
        id: block.id,
        props: { level: block.props.level, text: block.props.text },
        type: block.type,
        version: block.version,
      };
    case "paragraph":
      return {
        id: block.id,
        props: { text: block.props.text },
        type: block.type,
        version: block.version,
      };
    case "image": {
      const props = {
        altText: block.props.altText,
        aspectRatio: {
          height: block.props.aspectRatio.height,
          width: block.props.aspectRatio.width,
        },
        decorative: block.props.decorative,
        mediaId: block.props.mediaId,
      };
      return {
        id: block.id,
        props:
          block.props.caption === undefined ? props : { ...props, caption: block.props.caption },
        type: block.type,
        version: block.version,
      };
    }
    case "video": {
      const props = {
        aspectRatio: {
          height: block.props.aspectRatio.height,
          width: block.props.aspectRatio.width,
        },
        mediaId: block.props.mediaId,
      };
      return {
        id: block.id,
        props:
          block.props.caption === undefined ? props : { ...props, caption: block.props.caption },
        type: block.type,
        version: block.version,
      };
    }
    case "callout": {
      const props = { text: block.props.text, tone: block.props.tone };
      return {
        id: block.id,
        props: block.props.title === undefined ? props : { ...props, title: block.props.title },
        type: block.type,
        version: block.version,
      };
    }
    case "quote": {
      const props = { text: block.props.text };
      return {
        id: block.id,
        props:
          block.props.attribution === undefined
            ? props
            : { ...props, attribution: block.props.attribution },
        type: block.type,
        version: block.version,
      };
    }
    case "button-link":
      return {
        id: block.id,
        props: {
          appearance: block.props.appearance,
          href: block.props.href,
          label: block.props.label,
        },
        type: block.type,
        version: block.version,
      };
    case "divider":
      return {
        id: block.id,
        props: { style: block.props.style },
        type: block.type,
        version: block.version,
      };
    case "myth-fact":
      return {
        id: block.id,
        props: { mythFactId: block.props.mythFactId },
        type: block.type,
        version: block.version,
      };
    case "quiz-trigger":
      return {
        id: block.id,
        props: { quizId: block.props.quizId },
        type: block.type,
        version: block.version,
      };
    default: {
      const exhaustiveBlock: never = block;
      return exhaustiveBlock;
    }
  }
}

function mapPageDocument(document: z.output<typeof pageDocumentSchema>): PageDocument {
  return {
    blocks: document.blocks.map(mapPageBlock),
    layout: { background: document.layout.background, preset: document.layout.preset },
    pageId: document.pageId,
    schemaVersion: document.schemaVersion,
  };
}

function normalizePath(path: readonly PropertyKey[]): readonly (number | string)[] {
  return path.map((segment) =>
    typeof segment === "symbol" ? (segment.description ?? "symbol") : segment,
  );
}

function normalizeCustomIssue(message: string): ContentValidationCode {
  switch (message) {
    case internalIssueMessage.decorativeAlt:
      return "decorative_image_alt_text_forbidden";
    case internalIssueMessage.duplicateBlockId:
      return "duplicate_block_id";
    case internalIssueMessage.identifier:
      return "invalid_identifier";
    case internalIssueMessage.informativeAlt:
      return "image_alt_text_required";
    default:
      return "validation_failed";
  }
}

function normalizeZodIssue(zodIssue: z.ZodIssue): readonly ContentValidationIssue[] {
  const path = normalizePath(zodIssue.path);
  switch (zodIssue.code) {
    case "invalid_type":
      return [issue("invalid_type", path)];
    case "too_big":
      return [issue("value_too_large", path)];
    case "too_small":
      return [issue("value_too_small", path)];
    case "invalid_format":
      return [issue("invalid_format", path)];
    case "not_multiple_of":
      return [issue("invalid_increment", path)];
    case "unrecognized_keys":
      return zodIssue.keys.map((key) => issue("unknown_field", [...path, key]));
    case "invalid_union":
      return [issue("invalid_variant", path)];
    case "invalid_key":
      return [issue("invalid_key", path)];
    case "invalid_element":
      return [issue("invalid_element", path)];
    case "invalid_value":
      return [issue("invalid_value", path)];
    case "custom":
      return [issue(normalizeCustomIssue(zodIssue.message), path)];
    default: {
      const exhaustiveIssue: never = zodIssue;
      return exhaustiveIssue;
    }
  }
}

function normalizeZodIssues(issues: readonly z.ZodIssue[]): readonly ContentValidationIssue[] {
  return issues.flatMap(normalizeZodIssue);
}

interface JsonPreflightState {
  readonly active: WeakSet<object>;
  nodes: number;
}

interface JsonObjectReflection {
  readonly descriptors: PropertyDescriptorMap;
  readonly isArray: boolean;
  readonly keys: readonly (string | symbol)[];
  readonly prototype: object | null;
}

function reflectJsonObject(value: object): JsonObjectReflection | undefined {
  try {
    const isArray = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value);
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const keys = Reflect.ownKeys(descriptors);
    return { descriptors, isArray, keys, prototype };
  } catch {
    return undefined;
  }
}

function jsonPreflight(
  value: unknown,
  path: readonly (number | string)[],
  depth: number,
  state: JsonPreflightState,
): readonly ContentValidationIssue[] {
  state.nodes += 1;
  if (depth > MAX_JSON_DEPTH || state.nodes > MAX_JSON_NODES) {
    return [issue("value_too_complex", path)];
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return [];
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? [] : [issue("non_json_value", path)];
  }
  if (typeof value !== "object") {
    return [issue("non_json_value", path)];
  }
  if (state.active.has(value)) {
    return [issue("non_json_value", path)];
  }

  const reflection = reflectJsonObject(value);
  if (reflection === undefined) {
    return [issue("non_json_value", path)];
  }
  const { descriptors, isArray, keys, prototype } = reflection;
  if (
    (!isArray && prototype !== Object.prototype && prototype !== null) ||
    (isArray && prototype !== Array.prototype)
  ) {
    return [issue("non_json_value", path)];
  }

  state.active.add(value);
  const findings: ContentValidationIssue[] = [];

  if (isArray) {
    const length = descriptors.length?.value;
    if (typeof length !== "number" || !Number.isSafeInteger(length) || length < 0) {
      state.active.delete(value);
      return [issue("non_json_value", path)];
    }
    if (length > MAX_JSON_NODES) {
      state.active.delete(value);
      return [issue("value_too_complex", path)];
    }
    for (let index = 0; index < length; index += 1) {
      if (!Object.hasOwn(descriptors, String(index))) {
        findings.push(issue("non_json_value", [...path, index]));
      }
    }
  }

  for (const key of keys) {
    if (typeof key === "symbol") {
      findings.push(issue("non_json_value", [...path, key.description ?? "symbol"]));
      continue;
    }
    if (isArray && key === "length") {
      continue;
    }
    if (isArray && !/^(0|[1-9][0-9]*)$/.test(key)) {
      findings.push(issue("non_json_value", [...path, key]));
      continue;
    }
    const descriptor = descriptors[key];
    const segment = isArray && /^(0|[1-9][0-9]*)$/.test(key) ? Number(key) : key;
    const childPath = [...path, segment];
    if (dangerousObjectKeys.has(key)) {
      findings.push(issue("dangerous_key", childPath));
      continue;
    }
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      findings.push(issue("non_json_value", childPath));
      continue;
    }
    findings.push(...jsonPreflight(descriptor.value, childPath, depth + 1, state));
    if (state.nodes > MAX_JSON_NODES) {
      break;
    }
  }

  state.active.delete(value);
  return findings;
}

function preflightPageInput(input: unknown): readonly ContentValidationIssue[] {
  return jsonPreflight(input, [], 0, { active: new WeakSet<object>(), nodes: 0 });
}

type JsonCloneResult =
  | { readonly data: unknown; readonly success: true }
  | { readonly issue: ContentValidationIssue; readonly success: false };

interface JsonCloneState {
  readonly active: WeakSet<object>;
  nodes: number;
}

function cloneValidatedJson(
  value: unknown,
  path: readonly (number | string)[],
  depth: number,
  state: JsonCloneState,
): JsonCloneResult {
  state.nodes += 1;
  if (depth > MAX_JSON_DEPTH || state.nodes > MAX_JSON_NODES) {
    return { issue: issue("value_too_complex", path), success: false };
  }
  if (value === null || typeof value !== "object") {
    return { data: value, success: true };
  }
  if (state.active.has(value)) {
    return { issue: issue("non_json_value", path), success: false };
  }

  const reflection = reflectJsonObject(value);
  if (reflection === undefined) {
    return { issue: issue("non_json_value", path), success: false };
  }
  const { descriptors, isArray, keys, prototype } = reflection;
  if (
    (!isArray && prototype !== Object.prototype && prototype !== null) ||
    (isArray && prototype !== Array.prototype) ||
    keys.length > MAX_JSON_NODES
  ) {
    return { issue: issue("non_json_value", path), success: false };
  }
  if (isArray) {
    const length = descriptors.length?.value;
    if (
      typeof length !== "number" ||
      !Number.isSafeInteger(length) ||
      length < 0 ||
      length > MAX_JSON_NODES
    ) {
      return { issue: issue("non_json_value", path), success: false };
    }
    for (const key of keys) {
      if (typeof key === "symbol") {
        return {
          issue: issue("non_json_value", [...path, key.description ?? "symbol"]),
          success: false,
        };
      }
      if (dangerousObjectKeys.has(key)) {
        return { issue: issue("dangerous_key", [...path, key]), success: false };
      }
      if (key !== "length" && !/^(0|[1-9][0-9]*)$/.test(key)) {
        return { issue: issue("non_json_value", [...path, key]), success: false };
      }
    }
    const output: unknown[] = [];
    state.active.add(value);
    for (let index = 0; index < length; index += 1) {
      const descriptor = descriptors[String(index)];
      if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
        state.active.delete(value);
        return { issue: issue("non_json_value", [...path, index]), success: false };
      }
      const child = cloneValidatedJson(descriptor.value, [...path, index], depth + 1, state);
      if (!child.success) {
        state.active.delete(value);
        return child;
      }
      output.push(child.data);
    }
    state.active.delete(value);
    return { data: output, success: true };
  }

  const output: Record<string, unknown> = {};
  Object.setPrototypeOf(output, null);
  state.active.add(value);
  for (const key of keys) {
    if (typeof key === "symbol") {
      state.active.delete(value);
      return {
        issue: issue("non_json_value", [...path, key.description ?? "symbol"]),
        success: false,
      };
    }
    if (dangerousObjectKeys.has(key)) {
      state.active.delete(value);
      return { issue: issue("dangerous_key", [...path, key]), success: false };
    }
    const descriptor = descriptors[key];
    if (descriptor === undefined || !("value" in descriptor) || !descriptor.enumerable) {
      state.active.delete(value);
      return { issue: issue("non_json_value", [...path, key]), success: false };
    }
    const child = cloneValidatedJson(descriptor.value, [...path, key], depth + 1, state);
    if (!child.success) {
      state.active.delete(value);
      return child;
    }
    Object.defineProperty(output, key, {
      configurable: true,
      enumerable: true,
      value: child.data,
      writable: true,
    });
  }
  state.active.delete(value);
  return { data: output, success: true };
}

export function safeCloneContentJsonInput(input: unknown): SafeParseResult<unknown> {
  const preflightIssues = preflightPageInput(input);
  if (preflightIssues.length > 0) {
    return { issues: preflightIssues, success: false };
  }
  const clonedInput = cloneValidatedJson(input, [], 0, {
    active: new WeakSet<object>(),
    nodes: 0,
  });
  return clonedInput.success
    ? { data: clonedInput.data, success: true }
    : { issues: [clonedInput.issue], success: false };
}

interface BrandParser<TValue> {
  readonly parse: (input: unknown) => TValue;
  readonly safeParse: (input: unknown) => SafeParseResult<TValue>;
}

export class ContentValueValidationError extends Error {
  readonly issues: readonly ContentValidationIssue[];
  readonly valueKind: ContentValueKind;

  constructor(valueKind: ContentValueKind, issues: readonly ContentValidationIssue[]) {
    super(`Invalid ${valueKind}.`);
    this.name = "ContentValueValidationError";
    this.issues = issues;
    this.valueKind = valueKind;
  }
}

function createBrandParser<TValue>(
  valueKind: ContentValueKind,
  schema: z.ZodType<TValue>,
): BrandParser<TValue> {
  const safeParse = (input: unknown): SafeParseResult<TValue> => {
    const result = schema.safeParse(input);
    return result.success
      ? { data: result.data, success: true }
      : { issues: normalizeZodIssues(result.error.issues), success: false };
  };
  const parse = (input: unknown): TValue => {
    const result = safeParse(input);
    if (!result.success) {
      throw new ContentValueValidationError(valueKind, result.issues);
    }
    return result.data;
  };
  return { parse, safeParse };
}

const blockIdParser = createBrandParser("block-id", blockIdSchema);
const mediaIdParser = createBrandParser("media-id", mediaIdSchema);
const mythFactIdParser = createBrandParser("myth-fact-id", mythFactIdSchema);
const pageIdParser = createBrandParser("page-id", pageIdSchema);
const quizIdParser = createBrandParser("quiz-id", quizIdSchema);
const safeHttpsUrlParser = createBrandParser("safe-https-url", safeHttpsUrlSchema);

export const parseBlockId = (input: unknown): BlockId => blockIdParser.parse(input);
export const safeParseBlockId = (input: unknown): SafeParseBlockIdResult =>
  blockIdParser.safeParse(input);
export const parseMediaId = (input: unknown): MediaId => mediaIdParser.parse(input);
export const safeParseMediaId = (input: unknown): SafeParseMediaIdResult =>
  mediaIdParser.safeParse(input);
export const parseMythFactId = (input: unknown): MythFactId => mythFactIdParser.parse(input);
export const safeParseMythFactId = (input: unknown): SafeParseMythFactIdResult =>
  mythFactIdParser.safeParse(input);
export const parsePageId = (input: unknown): PageId => pageIdParser.parse(input);
export const safeParsePageId = (input: unknown): SafeParsePageIdResult =>
  pageIdParser.safeParse(input);
export const parseQuizId = (input: unknown): QuizId => quizIdParser.parse(input);
export const safeParseQuizId = (input: unknown): SafeParseQuizIdResult =>
  quizIdParser.safeParse(input);
export const parseSafeHttpsUrl = (input: unknown): SafeHttpsUrl => safeHttpsUrlParser.parse(input);
export const safeParseSafeHttpsUrl = (input: unknown): SafeParseSafeHttpsUrlResult =>
  safeHttpsUrlParser.safeParse(input);

export class PageDocumentValidationError extends Error {
  readonly issues: readonly ContentValidationIssue[];

  constructor(issues: readonly ContentValidationIssue[]) {
    super("Page document validation failed.");
    this.name = "PageDocumentValidationError";
    this.issues = issues;
  }
}

export function safeParsePageDocument(input: unknown): SafeParsePageDocumentResult {
  const clonedInput = safeCloneContentJsonInput(input);
  if (!clonedInput.success) {
    return clonedInput;
  }
  const result = pageDocumentSchema.safeParse(clonedInput.data);
  return result.success
    ? { data: mapPageDocument(result.data), success: true }
    : { issues: normalizeZodIssues(result.error.issues), success: false };
}

export function parsePageDocument(input: unknown): PageDocument {
  const result = safeParsePageDocument(input);
  if (!result.success) {
    throw new PageDocumentValidationError(result.issues);
  }
  return result.data;
}
