export type ScoreableQuestion = {
  type: 'MULTIPLE_CHOICE' | 'MULTIPLE_ANSWER' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  points: number;
  options: { id: string; isCorrect: boolean; text: string }[];
};

export function scoreQuestion(
  question: ScoreableQuestion,
  optionIds: string[],
  textAnswer: string | null | undefined,
): number {
  if (question.type === 'SHORT_ANSWER') {
    const answer = (textAnswer ?? '').trim().toLowerCase();
    if (!answer) return 0;
    const accepted = question.options
      .filter((option) => option.isCorrect)
      .map((option) => option.text.trim().toLowerCase());
    return accepted.includes(answer) ? question.points : 0;
  }
  const selected = new Set(optionIds);
  const correct = new Set(
    question.options.filter((option) => option.isCorrect).map((option) => option.id),
  );
  if (selected.size === 0 || selected.size !== correct.size) return 0;
  for (const id of correct) {
    if (!selected.has(id)) return 0;
  }
  return question.points;
}

export function letterFromPercent(percent: number): string {
  if (percent >= 90) return 'A';
  if (percent >= 80) return 'B';
  if (percent >= 70) return 'C';
  if (percent >= 60) return 'D';
  return 'F';
}

export function shuffleIds(ids: string[]): string[] {
  const next = [...ids];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = next[i]!;
    const swap = next[j]!;
    next[i] = swap;
    next[j] = current;
  }
  return next;
}
