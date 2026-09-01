import type { ReactNode } from 'react';
import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { StudentAttemptResult } from '@nabta/types';
import { StudentPanel } from './StudentChrome';
import { cn } from '@/lib/cn';

export function QuizFact({ label, children }: { label: string; children: ReactNode }) {
  if (children == null || children === '') return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export function QuizAnswerReview({ result }: { result: StudentAttemptResult }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {t('assessment.questions', { count: result.questions.length })}
      </h2>
      {result.questions.map((question, index) => {
        const correct = question.awarded === question.points;
        return (
          <StudentPanel key={question.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted">
                {t('student.questionOf', { current: index + 1, total: result.questions.length })}
              </p>
              <Chip size="sm" color={correct ? 'success' : 'danger'} variant="soft">
                {correct ? t('assessment.correct') : t('assessment.incorrect')}
                <span className="tabular-nums">
                  {' '}
                  ({question.awarded}/{question.points})
                </span>
              </Chip>
            </div>
            <p className="mt-1 font-medium">{question.prompt}</p>
            {question.textAnswer ? (
              <p className="mt-3 text-sm">
                <span className="text-xs font-medium text-muted">{t('assessment.yourAnswer')}</span>
                <span className="mt-0.5 block">{question.textAnswer}</span>
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {question.options.map((option) => {
                  const selected = question.selectedOptionIds.includes(option.id);
                  return (
                    <li
                      key={option.id}
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <p
                        className={cn(
                          'min-w-0 text-sm',
                          option.isCorrect && 'text-success',
                          selected && !option.isCorrect && 'text-danger',
                        )}
                      >
                        {option.text}
                      </p>
                      {option.isCorrect || selected ? (
                        <Chip
                          size="sm"
                          color={option.isCorrect ? 'success' : 'danger'}
                          variant="soft"
                          className="shrink-0"
                        >
                          {option.isCorrect ? t('assessment.correct') : t('assessment.yourAnswer')}
                        </Chip>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
            {question.feedback ? (
              <p className="mt-3 text-sm text-muted">
                <span className="text-xs font-medium">{t('assessment.feedback')}</span>
                <span className="mt-0.5 block">{question.feedback}</span>
              </p>
            ) : null}
          </StudentPanel>
        );
      })}
    </section>
  );
}
