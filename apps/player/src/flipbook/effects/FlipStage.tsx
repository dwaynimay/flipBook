import React from 'react';
import type { PageManifest } from '@flip/manifest';
import type { Turning } from '../useFlipController';
import { SoftFlipStage, type SoftFlipStageRef } from './SoftFlipStage';

export interface StageProps {
  assetBase: string;
  spread: number;
  sheetCount: number;
  pages: PageManifest[];
  pageWidth: number;
  pageHeight: number;
  turning: Turning | null;
  angleOf(sheet: number): number;
  pageOf(index: number): PageManifest | null;
  settled: boolean;
  twoPage: boolean;
  soloIndex: number | null;
  onPageChange(pageIndex: number): void;
  onLinkClick(link: { url?: string; targetPage?: number }): void;
}

/**
 * Efek Flip Stage Utama: Memutar Halaman Lentur (Soft Page Flip).
 *
 * Menggunakan arsitektur StPageFlip (Soft Mode: `showCover={false}`) yang memodelkan
 * kelengkungan lipatan kertas lentur (paper curl), bayangan jatuh dinamis, dan
 * responsibilitas terhadap gestur drag kursor/sentuh.
 */
export const FlipStage = React.forwardRef<SoftFlipStageRef, StageProps>((props, ref) => {
  const currentPage = props.twoPage
    ? props.spread === 0
      ? 0
      : props.spread * 2 - 1
    : props.spread;

  return (
    <SoftFlipStage
      ref={ref}
      pages={props.pages}
      assetBase={props.assetBase}
      width={props.pageWidth}
      height={props.pageHeight}
      twoPage={props.twoPage}
      settled={props.settled}
      initialPage={currentPage}
      onPageChange={props.onPageChange}
      onLinkClick={props.onLinkClick}
    />
  );
});

FlipStage.displayName = 'FlipStage';
