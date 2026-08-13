import type { MediaId, MythFactId, QuizId } from "@booklet/content-schema";

export interface ImageResource {
  readonly altTextOverride?: string;
  readonly src: string;
}

export interface YouTubeVideoResource {
  readonly kind: "youtube";
  readonly title: string;
  readonly videoId: string;
}

export type VideoResource = YouTubeVideoResource;

export interface MythFactResource {
  readonly explanation: string;
  readonly fact: string;
  readonly myth: string;
  readonly sourceLabel?: string;
  readonly sourceUrl?: string;
}

export interface BlockResourceResolver {
  readonly image: (mediaId: MediaId) => ImageResource | undefined;
  readonly mythFact: (mythFactId: MythFactId) => MythFactResource | undefined;
  readonly video: (mediaId: MediaId) => VideoResource | undefined;
}

export interface BlockInteractionHandlers {
  readonly openQuiz: (quizId: QuizId) => void;
}
