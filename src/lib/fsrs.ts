import type { FlashcardProgress } from './cookies';

export const Grade = {
  FORGOT: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
} as const;

export type Grade = (typeof Grade)[keyof typeof Grade];

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const F = 19.0 / 81.0;
const C = -0.5;
export const DESIRED_RETENTION = 0.9;

/**
 * Default weight vector taken from FSRS reference implementation.
 * Source: https://github.com/open-spaced-repetition/fsrs4anki
 */
export const DEFAULT_FSRS_WEIGHTS: number[] = [
  0.4, -0.23, 0.046, -0.3, 0.25, 0.01, 0.06, 0.8, 1.0, -1.5, -0.138, -0.01,
  0.048, -0.05, 0.02, 1.0, 0.4, 0.9, 0.3,
];

type FsrsState = Pick<
  FlashcardProgress,
  'stability' | 'difficulty' | 'interval' | 'due' | 'lastReview' | 'reviewCount'
>;

export function retrievability(
  elapsedDays: number,
  stability: number | undefined
): number {
  if (!stability || stability <= 0) {
    return 0;
  }
  return (1 + F * (elapsedDays / stability)) ** C;
}

export function intervalFromStability(
  stability: number,
  retention: number = DESIRED_RETENTION
): number {
  if (stability <= 0) {
    return 1;
  }
  return (stability / F) * (retention ** (1 / C) - 1);
}

export function initialStability(grade: Grade): number {
  switch (grade) {
    case Grade.FORGOT:
      return 0.3;
    case Grade.HARD:
      return 0.7;
    case Grade.GOOD:
      return 1.5;
    case Grade.EASY:
      return 2.5;
    default:
      return 1.0;
  }
}

export function initialDifficulty(grade: Grade): number {
  switch (grade) {
    case Grade.FORGOT:
      return 6.0;
    case Grade.HARD:
      return 4.5;
    case Grade.GOOD:
      return 3.5;
    case Grade.EASY:
      return 2.5;
    default:
      return 3.5;
  }
}

function gradeToNumber(grade: Grade): number {
  return grade;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function updateDifficulty(difficulty: number, grade: Grade): number {
  const g = gradeToNumber(grade);
  const w = DEFAULT_FSRS_WEIGHTS;
  const delta = -w[6] * (g - 3.0);
  const dp = difficulty + delta * ((10.0 - difficulty) / 9.0);
  const blended = w[7] * initialDifficulty(Grade.EASY) + (1 - w[7]) * dp;
  return clamp(blended, 1.0, 10.0);
}

function updateStability(
  difficulty: number,
  stability: number,
  retrievabilityValue: number,
  grade: Grade,
  isFirstReview: boolean
): number {
  if (isFirstReview) {
    return initialStability(grade);
  }

  const w = DEFAULT_FSRS_WEIGHTS;
  const g = gradeToNumber(grade);
  const safeStability = Math.max(stability, 1e-9);
  const safeRetrievability = Math.max(retrievabilityValue, 1e-9);
  const safeDifficulty = Math.max(difficulty, 1e-9);

  const multiplier = Math.exp(
    w[0] +
      w[1] * Math.log(safeStability) +
      w[2] * Math.log(safeDifficulty) +
      w[3] * Math.log(safeRetrievability) +
      w[4] * g
  );
  const additive = w[5];
  return Math.max(1e-6, multiplier * safeStability + additive);
}

export function evaluateFsrsReview(
  progress: FsrsState,
  grade: Grade,
  now: number = Date.now()
): FsrsState & { interval: number; due: number; retrievability: number } {
  const reviewCount = progress.reviewCount ?? 0;
  const isFirstReview = reviewCount === 0;
  const lastReview = progress.lastReview ?? now;

  const elapsedDays = (now - lastReview) / MS_PER_DAY;
  const currentStability = progress.stability ?? 0;
  const currentDifficulty = progress.difficulty ?? initialDifficulty(grade);

  const r = isFirstReview
    ? DESIRED_RETENTION
    : retrievability(elapsedDays, currentStability);

  const newStability = updateStability(
    currentDifficulty,
    currentStability,
    r,
    grade,
    isFirstReview
  );

  const newDifficulty = updateDifficulty(currentDifficulty, grade);
  const nextInterval = Math.max(
    1,
    Math.round(intervalFromStability(newStability))
  );
  const due = now + nextInterval * MS_PER_DAY;

  return {
    stability: newStability,
    difficulty: newDifficulty,
    interval: nextInterval,
    due,
    lastReview: now,
    reviewCount: reviewCount + 1,
    retrievability: r,
  };
}
