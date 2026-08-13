import { Button } from "@booklet/ui";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useState } from "react";

import type { MythFactResource } from "./contracts.js";

export interface MythFactCardProps {
  readonly content: MythFactResource;
}

export function MythFactCard({ content }: MythFactCardProps) {
  const [revealed, setRevealed] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <section className="reader-myth" data-reader-interactive="true">
      <div className="reader-myth__topline">
        <span>Mitos atau fakta?</span>
        <span aria-hidden="true">✦</span>
      </div>
      <p className="reader-myth__statement">
        <strong>Mitos</strong>
        {content.myth}
      </p>
      <Button
        aria-expanded={revealed}
        onClick={() => setRevealed((value) => !value)}
        variant="soft"
      >
        {revealed ? "Sembunyikan fakta" : "Buka faktanya"}
      </Button>
      <LazyMotion features={domAnimation} strict>
        <AnimatePresence initial={false}>
          {revealed ? (
            <m.div
              animate={{ height: "auto", opacity: 1 }}
              className="reader-myth__reveal"
              exit={{ height: 0, opacity: 0 }}
              initial={{ height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
            >
              <div>
                <p>
                  <strong>Fakta</strong>
                  {content.fact}
                </p>
                <p>{content.explanation}</p>
                {content.sourceUrl === undefined ? null : (
                  <a href={content.sourceUrl} rel="noreferrer" target="_blank">
                    {content.sourceLabel ?? "Buka sumber"}
                  </a>
                )}
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </LazyMotion>
    </section>
  );
}
