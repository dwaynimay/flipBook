import { PageRenderer } from "@booklet/block-renderer";
import type { QuizId } from "@booklet/content-schema";
import { FlipbookReader, type ReaderMode } from "@booklet/flipbook-engine";
import { QuizDialog } from "@booklet/quiz-engine";
import { Progress } from "@booklet/ui";
import { BookOpenText, CircleHelp, HeartPulse, ShieldCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { anemiaQuiz, readerDocuments, resources } from "./booklet-content.js";

const chapters = [
  { label: "Mulai dari dasar", pageIndexes: [0, 1], pages: "01–02" },
  { label: "Tonton singkat", pageIndexes: [2], pages: "03" },
  { label: "Mitos atau fakta", pageIndexes: [3], pages: "04" },
  { label: "Bangun kebiasaan", pageIndexes: [4], pages: "05" },
  { label: "Refleksi", pageIndexes: [5], pages: "06" },
] as const;

export function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<ReaderMode>("flip");
  const [quizOpen, setQuizOpen] = useState(false);
  const [engineNotice, setEngineNotice] = useState<string | null>(null);

  const openQuiz = useCallback((quizId: QuizId) => {
    if (quizId === anemiaQuiz.id) setQuizOpen(true);
  }, []);
  const interactions = useMemo(() => ({ openQuiz }), [openQuiz]);
  const pages = useMemo(
    () =>
      readerDocuments.map((document, index) => ({
        content: (
          <PageRenderer document={document} interactions={interactions} resources={resources} />
        ),
        isCover: index === 0 || index === readerDocuments.length - 1,
        pageId: document.pageId,
      })),
    [interactions],
  );

  const handlePageChange = useCallback(({ index }: { readonly index: number }) => {
    setCurrentIndex(index);
  }, []);
  const handleModeChange = useCallback((nextMode: ReaderMode) => setMode(nextMode), []);
  const handleEngineError = useCallback(() => {
    setEngineNotice("Efek flip tidak tersedia. Isi tetap aman dalam mode baca vertikal.");
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#reader" aria-label="Ruang Sehat, kembali ke reader">
          <span className="brand__mark">
            <HeartPulse aria-hidden="true" size={21} />
          </span>
          <span>
            <strong>Ruang Sehat</strong>
            <small>Booklet interaktif</small>
          </span>
        </a>
        <div className="topbar__meta">
          <span className="status-pill">
            <span /> Preview lokal
          </span>
          <span className="mode-pill">
            <BookOpenText aria-hidden="true" size={15} />{" "}
            {mode === "flip" ? "Mode flip" : "Mode baca"}
          </span>
        </div>
      </header>

      <main className="reader-layout" id="reader">
        <aside className="reader-sidebar">
          <div className="sidebar-cover" aria-hidden="true">
            <span>Ruang Sehat</span>
            <strong>
              Kenali
              <br />
              Anemia
            </strong>
            <i />
            <i />
            <i />
          </div>
          <div className="sidebar-title">
            <span>Daftar isi</span>
            <strong>6 halaman</strong>
          </div>
          <ol className="chapter-list">
            {chapters.map((chapter, index) => (
              <li
                className={
                  chapter.pageIndexes.some((pageIndex) => pageIndex === currentIndex)
                    ? "is-current"
                    : ""
                }
                key={chapter.label}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <strong>{chapter.label}</strong>
                  <small>Halaman {chapter.pages}</small>
                </div>
              </li>
            ))}
          </ol>
          <div className="sidebar-progress">
            <Progress label="Progres baca" value={((currentIndex + 1) / pages.length) * 100} />
          </div>
          <div className="privacy-note">
            <ShieldCheck aria-hidden="true" size={17} />
            <span>Preview tidak menyimpan data pribadi.</span>
          </div>
        </aside>

        <section className="reader-workspace">
          <div className="workspace-heading">
            <div>
              <span>Edukasi kesehatan · Demo</span>
              <h1>Kenali Anemia</h1>
            </div>
            <div className="workspace-hint">
              <CircleHelp aria-hidden="true" size={17} />
              <span>Gunakan panah keyboard atau tombol halaman</span>
            </div>
          </div>
          {engineNotice === null ? null : (
            <div className="engine-notice" role="status">
              {engineNotice}
            </div>
          )}
          <FlipbookReader
            onEngineError={handleEngineError}
            onModeChange={handleModeChange}
            onPageChange={handlePageChange}
            pages={pages}
          />
          <p className="reader-disclaimer">
            Konten demonstrasi untuk edukasi, bukan diagnosis atau rekomendasi medis personal.
          </p>
        </section>
      </main>

      <QuizDialog onOpenChange={setQuizOpen} open={quizOpen} quiz={anemiaQuiz} />
    </div>
  );
}
