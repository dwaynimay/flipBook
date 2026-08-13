import type { ReaderPageBlock, ReaderPageDocument } from "@booklet/content-schema";
import { Button } from "@booklet/ui";
import type { ReactElement } from "react";

import type { BlockInteractionHandlers, BlockResourceResolver } from "./contracts.js";
import { MythFactCard } from "./myth-fact-card.js";
import { normalizeImageResource, normalizeMythFactResource } from "./resource-policy.js";
import { VideoBlockView } from "./video-block.js";

export interface PageRendererProps {
  readonly document: ReaderPageDocument;
  readonly interactions: BlockInteractionHandlers;
  readonly resources: BlockResourceResolver;
}

function renderHeading(level: 1 | 2 | 3, text: string): ReactElement {
  if (level === 1) return <h1 className="reader-heading reader-heading--1">{text}</h1>;
  if (level === 2) return <h2 className="reader-heading reader-heading--2">{text}</h2>;
  return <h3 className="reader-heading reader-heading--3">{text}</h3>;
}

function renderBlock(
  block: ReaderPageBlock,
  resources: BlockResourceResolver,
  interactions: BlockInteractionHandlers,
): ReactElement {
  switch (block.type) {
    case "heading":
      return renderHeading(block.props.level, block.props.text);
    case "paragraph":
      return <p className="reader-paragraph">{block.props.text}</p>;
    case "image": {
      const resource = normalizeImageResource(resources.image(block.props.mediaId));
      if (resource === undefined) {
        return (
          <div className="reader-resource-fallback" role="status">
            Gambar belum tersedia.
          </div>
        );
      }
      return (
        <figure className="reader-image">
          <img
            alt={block.props.decorative ? "" : (resource.altTextOverride ?? block.props.altText)}
            loading="lazy"
            src={resource.src}
            style={{ aspectRatio: block.props.aspectRatio.width / block.props.aspectRatio.height }}
          />
          {block.props.caption === undefined ? null : (
            <figcaption>{block.props.caption}</figcaption>
          )}
        </figure>
      );
    }
    case "video":
      return (
        <VideoBlockView
          aspectRatio={block.props.aspectRatio.width / block.props.aspectRatio.height}
          resource={resources.video(block.props.mediaId)}
          {...(block.props.caption === undefined ? {} : { caption: block.props.caption })}
        />
      );
    case "callout":
      return (
        <aside className={`reader-callout reader-callout--${block.props.tone}`}>
          {block.props.title === undefined ? null : <strong>{block.props.title}</strong>}
          <p>{block.props.text}</p>
        </aside>
      );
    case "quote":
      return (
        <blockquote className="reader-quote">
          <p>“{block.props.text}”</p>
          {block.props.attribution === undefined ? null : <cite>{block.props.attribution}</cite>}
        </blockquote>
      );
    case "button-link":
      return (
        <a
          className={`reader-link reader-link--${block.props.appearance}`}
          data-reader-interactive="true"
          href={block.props.href}
          rel="noreferrer"
          target="_blank"
        >
          {block.props.label}
        </a>
      );
    case "divider":
      return <hr className={`reader-divider reader-divider--${block.props.style}`} />;
    case "myth-fact": {
      const content = resources.mythFact(block.props.mythFactId);
      return content === undefined ? (
        <div className="reader-resource-fallback" role="status">
          Konten mitos/fakta belum tersedia.
        </div>
      ) : (
        <MythFactCard content={normalizeMythFactResource(content)} />
      );
    }
    case "quiz-trigger":
      return (
        <section className="reader-quiz-trigger" data-reader-interactive="true">
          <span className="reader-quiz-trigger__mark" aria-hidden="true">
            ?
          </span>
          <div>
            <strong>Cek pemahamanmu</strong>
            <p>Tiga pertanyaan singkat, sekitar satu menit.</p>
          </div>
          <Button onClick={() => interactions.openQuiz(block.props.quizId)}>Mulai kuis</Button>
        </section>
      );
    case "unknown-block":
      return (
        <aside className="reader-unknown-block" role="status">
          Bagian “{block.originalTypeLabel}” belum didukung. Konten lain tetap dapat dibaca.
        </aside>
      );
    default: {
      const exhaustive: never = block;
      return exhaustive;
    }
  }
}

export function PageRenderer({ document, interactions, resources }: PageRendererProps) {
  return (
    <article
      className={`reader-page reader-page--${document.layout.background}`}
      data-page-id={document.pageId}
    >
      {document.blocks.map((block) => (
        <div className={`reader-block reader-block--${block.type}`} key={block.id}>
          {renderBlock(block, resources, interactions)}
        </div>
      ))}
    </article>
  );
}
