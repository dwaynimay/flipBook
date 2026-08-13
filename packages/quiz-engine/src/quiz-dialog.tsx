import { Button, Dialog, Progress } from "@booklet/ui";
import { CheckCircle2, RotateCcw, Sparkles } from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useState } from "react";

import type { QuizAnswer, QuizDefinition, QuizResult } from "./contracts.js";
import { scorePreviewQuiz } from "./scoring.js";

export interface QuizDialogProps {
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmitted?: (result: QuizResult) => void;
  readonly open: boolean;
  readonly quiz: QuizDefinition;
}

type QuizView = "questions" | "result";

export function QuizDialog({ onOpenChange, onSubmitted, open, quiz }: QuizDialogProps) {
  const [answers, setAnswers] = useState<readonly QuizAnswer[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [view, setView] = useState<QuizView>("questions");
  const reduceMotion = useReducedMotion();
  const currentQuestion = quiz.questions[questionIndex];
  const currentAnswer =
    currentQuestion === undefined
      ? undefined
      : answers.find((answer) => answer.questionId === currentQuestion.id);

  const reset = (): void => {
    setAnswers([]);
    setQuestionIndex(0);
    setResult(null);
    setView("questions");
  };

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  };

  const selectAnswer = (questionId: string, optionId: string): void => {
    setAnswers((current) => [
      ...current.filter((answer) => answer.questionId !== questionId),
      { optionId, questionId },
    ]);
  };

  const advance = (): void => {
    if (questionIndex < quiz.questions.length - 1) {
      setQuestionIndex((index) => index + 1);
      return;
    }

    const nextResult = scorePreviewQuiz(quiz, answers);
    setResult(nextResult);
    setView("result");
    onSubmitted?.(nextResult);
  };

  return (
    <Dialog
      description={`${quiz.description} Penilaian ini hanya simulasi lokal pada preview.`}
      onOpenChange={handleOpenChange}
      open={open}
      title={quiz.title}
    >
      <LazyMotion features={domAnimation} strict>
        <AnimatePresence initial={false} mode="wait">
          {view === "questions" && currentQuestion !== undefined ? (
            <m.div
              animate={{ opacity: 1, x: 0 }}
              className="quiz-panel"
              exit={{ opacity: 0, x: reduceMotion ? 0 : -16 }}
              initial={{ opacity: 0, x: reduceMotion ? 0 : 16 }}
              key={currentQuestion.id}
              transition={{ duration: reduceMotion ? 0 : 0.18 }}
            >
              <Progress
                label={`Pertanyaan ${questionIndex + 1} dari ${quiz.questions.length}`}
                value={((questionIndex + 1) / quiz.questions.length) * 100}
              />
              <fieldset className="quiz-fieldset">
                <legend>{currentQuestion.prompt}</legend>
                <div className="quiz-options">
                  {currentQuestion.options.map((option) => (
                    <label className="quiz-option" key={option.id}>
                      <input
                        checked={currentAnswer?.optionId === option.id}
                        name={currentQuestion.id}
                        onChange={() => selectAnswer(currentQuestion.id, option.id)}
                        type="radio"
                        value={option.id}
                      />
                      <span className="quiz-option__marker" />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="quiz-actions">
                <span className="quiz-hint">
                  <Sparkles aria-hidden="true" size={15} /> Pilih satu jawaban
                </span>
                <Button disabled={currentAnswer === undefined} onClick={advance}>
                  {questionIndex === quiz.questions.length - 1
                    ? "Lihat hasil"
                    : "Pertanyaan berikutnya"}
                </Button>
              </div>
            </m.div>
          ) : null}

          {view === "result" && result !== null ? (
            <m.div
              animate={{ opacity: 1, scale: 1 }}
              className="quiz-result"
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
              key="result"
              transition={{ duration: reduceMotion ? 0 : 0.22 }}
            >
              <div className="quiz-result__mark">
                <CheckCircle2 aria-hidden="true" size={34} />
              </div>
              <p className="quiz-result__eyebrow">Kuis selesai</p>
              <strong>{result.score}</strong>
              <p>
                {result.correctCount} dari {result.totalCount} jawaban tepat.
              </p>
              <div className="quiz-review">
                {quiz.questions.map((question) => (
                  <div key={question.id}>
                    <span>{question.prompt}</span>
                    <p>{question.explanation}</p>
                  </div>
                ))}
              </div>
              <div className="quiz-actions quiz-actions--result">
                <Button onClick={reset} variant="soft">
                  <RotateCcw aria-hidden="true" size={16} /> Coba lagi
                </Button>
                <Button onClick={() => handleOpenChange(false)}>Kembali membaca</Button>
              </div>
            </m.div>
          ) : null}
        </AnimatePresence>
      </LazyMotion>
    </Dialog>
  );
}
