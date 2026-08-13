import { Button } from "@booklet/ui";
import { Play } from "lucide-react";
import { useState } from "react";

import type { VideoResource } from "./contracts.js";

const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;

export interface VideoBlockViewProps {
  readonly aspectRatio: number;
  readonly caption?: string;
  readonly resource: VideoResource | undefined;
}

export function VideoBlockView({ aspectRatio, caption, resource }: VideoBlockViewProps) {
  const [loaded, setLoaded] = useState(false);

  if (resource === undefined || !youtubeIdPattern.test(resource.videoId)) {
    return (
      <div className="reader-resource-fallback" role="status">
        Video belum tersedia.
      </div>
    );
  }

  return (
    <figure className="reader-video" data-reader-interactive="true">
      <div className="reader-video__frame" style={{ aspectRatio }}>
        {loaded ? (
          <iframe
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            src={`https://www.youtube-nocookie.com/embed/${resource.videoId}?rel=0`}
            title={resource.title}
          />
        ) : (
          <div className="reader-video__poster">
            <div className="reader-video__orb reader-video__orb--one" />
            <div className="reader-video__orb reader-video__orb--two" />
            <span>Video edukasi</span>
            <strong>{resource.title}</strong>
            <Button aria-label={`Putar ${resource.title}`} onClick={() => setLoaded(true)}>
              <Play aria-hidden="true" fill="currentColor" size={17} /> Putar video
            </Button>
          </div>
        )}
      </div>
      {caption === undefined ? null : <figcaption>{caption}</figcaption>}
    </figure>
  );
}
