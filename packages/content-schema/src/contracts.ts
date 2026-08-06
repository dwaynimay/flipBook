declare const blockIdBrand: unique symbol;
declare const mediaIdBrand: unique symbol;
declare const mythFactIdBrand: unique symbol;
declare const pageIdBrand: unique symbol;
declare const quizIdBrand: unique symbol;
declare const safeHttpsUrlBrand: unique symbol;

export type BlockId = string & { readonly [blockIdBrand]: "BlockId" };
export type MediaId = string & { readonly [mediaIdBrand]: "MediaId" };
export type MythFactId = string & { readonly [mythFactIdBrand]: "MythFactId" };
export type PageId = string & { readonly [pageIdBrand]: "PageId" };
export type QuizId = string & { readonly [quizIdBrand]: "QuizId" };
export type SafeHttpsUrl = string & { readonly [safeHttpsUrlBrand]: "SafeHttpsUrl" };

export type ContentValueKind =
  "block-id" | "media-id" | "myth-fact-id" | "page-id" | "quiz-id" | "safe-https-url";

export type ContentValidationCode =
  | "dangerous_key"
  | "decorative_image_alt_text_forbidden"
  | "duplicate_block_id"
  | "image_alt_text_required"
  | "invalid_element"
  | "invalid_format"
  | "invalid_identifier"
  | "invalid_increment"
  | "invalid_key"
  | "invalid_type"
  | "invalid_value"
  | "invalid_variant"
  | "non_json_value"
  | "unknown_field"
  | "validation_failed"
  | "value_too_complex"
  | "value_too_large"
  | "value_too_small";

export interface ContentValidationIssue {
  readonly code: ContentValidationCode;
  readonly message: string;
  readonly path: readonly (number | string)[];
}

export type SafeParseResult<TValue> =
  | { readonly data: TValue; readonly success: true }
  | { readonly issues: readonly ContentValidationIssue[]; readonly success: false };

export type SafeParseBlockIdResult = SafeParseResult<BlockId>;
export type SafeParseMediaIdResult = SafeParseResult<MediaId>;
export type SafeParseMythFactIdResult = SafeParseResult<MythFactId>;
export type SafeParsePageIdResult = SafeParseResult<PageId>;
export type SafeParseQuizIdResult = SafeParseResult<QuizId>;
export type SafeParseSafeHttpsUrlResult = SafeParseResult<SafeHttpsUrl>;

export type LayoutPreset = "portrait";
export type PageBackgroundToken = "accent-subtle" | "surface-default" | "surface-subtle";

export interface PageLayout {
  readonly background: PageBackgroundToken;
  readonly preset: LayoutPreset;
}

export interface AspectRatio {
  readonly height: number;
  readonly width: number;
}

interface BlockBase<TType extends string, TProps> {
  readonly id: BlockId;
  readonly props: TProps;
  readonly type: TType;
  readonly version: 1;
}

export interface HeadingBlockProps {
  readonly level: 1 | 2 | 3;
  readonly text: string;
}

export type HeadingBlock = BlockBase<"heading", HeadingBlockProps>;

export interface ParagraphBlockProps {
  readonly text: string;
}

export type ParagraphBlock = BlockBase<"paragraph", ParagraphBlockProps>;

export interface ImageBlockProps {
  readonly altText: string;
  readonly aspectRatio: AspectRatio;
  readonly caption?: string;
  readonly decorative: boolean;
  readonly mediaId: MediaId;
}

export type ImageBlock = BlockBase<"image", ImageBlockProps>;

export interface VideoBlockProps {
  readonly aspectRatio: AspectRatio;
  readonly caption?: string;
  readonly mediaId: MediaId;
}

export type VideoBlock = BlockBase<"video", VideoBlockProps>;

export interface CalloutBlockProps {
  readonly text: string;
  readonly title?: string;
  readonly tone: "info" | "tip" | "warning";
}

export type CalloutBlock = BlockBase<"callout", CalloutBlockProps>;

export interface QuoteBlockProps {
  readonly attribution?: string;
  readonly text: string;
}

export type QuoteBlock = BlockBase<"quote", QuoteBlockProps>;

export interface ButtonLinkBlockProps {
  readonly appearance: "button" | "link";
  readonly href: SafeHttpsUrl;
  readonly label: string;
}

export type ButtonLinkBlock = BlockBase<"button-link", ButtonLinkBlockProps>;

export interface DividerBlockProps {
  readonly style: "solid" | "dashed";
}

export type DividerBlock = BlockBase<"divider", DividerBlockProps>;

export interface MythFactBlockProps {
  readonly mythFactId: MythFactId;
}

export type MythFactBlock = BlockBase<"myth-fact", MythFactBlockProps>;

export interface QuizTriggerBlockProps {
  readonly quizId: QuizId;
}

export type QuizTriggerBlock = BlockBase<"quiz-trigger", QuizTriggerBlockProps>;

export type PageBlock =
  | HeadingBlock
  | ParagraphBlock
  | ImageBlock
  | VideoBlock
  | CalloutBlock
  | QuoteBlock
  | ButtonLinkBlock
  | DividerBlock
  | MythFactBlock
  | QuizTriggerBlock;

export interface PageDocument {
  readonly blocks: readonly PageBlock[];
  readonly layout: PageLayout;
  readonly pageId: PageId;
  readonly schemaVersion: 1;
}

export type PageDocumentValidationIssue = ContentValidationIssue;
export type SafeParsePageDocumentResult = SafeParseResult<PageDocument>;
