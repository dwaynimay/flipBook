export interface QuizOption {
  readonly id: string;
  readonly label: string;
}

export interface MultipleChoiceQuestion {
  readonly correctOptionId: string;
  readonly explanation: string;
  readonly id: string;
  readonly options: readonly QuizOption[];
  readonly prompt: string;
  readonly type: "multiple-choice";
}

export type QuizQuestion = MultipleChoiceQuestion;

export interface QuizDefinition {
  readonly description: string;
  readonly id: string;
  readonly questions: readonly QuizQuestion[];
  readonly title: string;
}

export interface QuizAnswer {
  readonly optionId: string;
  readonly questionId: string;
}

export interface QuizResult {
  readonly correctCount: number;
  readonly score: number;
  readonly totalCount: number;
}
