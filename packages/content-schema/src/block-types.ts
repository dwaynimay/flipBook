import type { PageBlock } from "./contracts.js";

const currentBlockTypeRegistry = {
  "button-link": true,
  callout: true,
  divider: true,
  heading: true,
  image: true,
  "myth-fact": true,
  paragraph: true,
  "quiz-trigger": true,
  quote: true,
  video: true,
} as const satisfies Readonly<Record<PageBlock["type"], true>>;

export function isCurrentBlockType(value: unknown): value is PageBlock["type"] {
  return typeof value === "string" && Object.hasOwn(currentBlockTypeRegistry, value);
}
