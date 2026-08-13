import type { QuizAnswer, QuizDefinition, QuizResult } from "./contracts.js";

export function scorePreviewQuiz(quiz: QuizDefinition, answers: readonly QuizAnswer[]): QuizResult {
  const answersByQuestion = new Map(answers.map((answer) => [answer.questionId, answer.optionId]));
  let correctCount = 0;

  for (const question of quiz.questions) {
    if (answersByQuestion.get(question.id) === question.correctOptionId) {
      correctCount += 1;
    }
  }

  const totalCount = quiz.questions.length;
  return {
    correctCount,
    score: totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100),
    totalCount,
  };
}
