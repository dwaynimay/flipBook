import type { ImageResource, MythFactResource } from "./contracts.js";

const safeDataImagePattern = /^data:image\/(?:gif|jpeg|png|webp);base64,[a-z0-9+/]+=*$/i;

function safeHttpsUrl(value: string): string | undefined {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.username === "" && parsed.password === ""
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function normalizeImageResource(
  resource: ImageResource | undefined,
): ImageResource | undefined {
  if (resource === undefined) return undefined;
  const src = safeDataImagePattern.test(resource.src) ? resource.src : safeHttpsUrl(resource.src);
  if (src === undefined) return undefined;
  return resource.altTextOverride === undefined
    ? { src }
    : { altTextOverride: resource.altTextOverride, src };
}

export function normalizeMythFactResource(resource: MythFactResource): MythFactResource {
  const sourceUrl = resource.sourceUrl === undefined ? undefined : safeHttpsUrl(resource.sourceUrl);
  return {
    explanation: resource.explanation,
    fact: resource.fact,
    myth: resource.myth,
    ...(resource.sourceLabel === undefined ? {} : { sourceLabel: resource.sourceLabel }),
    ...(sourceUrl === undefined ? {} : { sourceUrl }),
  };
}
