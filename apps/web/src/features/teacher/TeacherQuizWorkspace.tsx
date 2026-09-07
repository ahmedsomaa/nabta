import { Link, Navigate, Outlet, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@heroui/react';
import { ArrowLeft, ChartColumn, Clock, Percent, Users } from 'lucide-react';
import type {
  TeacherAssessmentDetail,
  TeacherAssessmentResults,
  TeacherAttemptReview,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalMetric, PortalPanel } from '@/components/portal/PortalChrome';
import { PortalNavTabs } from '@/components/portal/PortalTabs';
import { usePageTrail } from '@/layouts/PageTrail';
import { formatDue } from '@/features/student/StatusChip';
import { QuizHtml, formatDuration, quizStatus, quizStatusChipColor } from './quizShared';
import { cn } from '@/lib/cn';
import { useState } from 'react';

export type QuizOutlet = { quiz: TeacherAssessmentDetail; results: TeacherAssessmentResults };

export function TeacherQuizWorkspace() {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const quizQuery = useQuery({
    queryKey: ['teacher-assessment', id],
    queryFn: () => apiFetch<TeacherAssessmentDetail>(`/teacher/assessments/${id}`),
    enabled: Boolean(id),
  });
  const resultsQuery = useQuery({
    queryKey: ['teacher-assessment-results', id],
    queryFn: () => apiFetch<TeacherAssessmentResults>(`/teacher/assessments/${id}/results`),
    enabled: Boolean(id),
  });

  usePageTrail(quizQuery.data ? [{ label: quizQuery.data.title }] : []);

  if (quizQuery.isLoading || resultsQuery.isLoading) return <QueryLoading variant="assignment" />;
  if (quizQuery.isError || !quizQuery.data) return <QueryError onRetry={() => void quizQuery.refetch()} />;
  if (resultsQuery.isError || !resultsQuery.data) {
    return <QueryError onRetry={() => void resultsQuery.refetch()} />;
  }

  const quiz = quizQuery.data;
  const results = resultsQuery.data;
  const base = `/teacher/assessments/${quiz.id}`;
  const onIndex = location.pathname === base;
  if (!quiz.publishedAt && onIndex) {
    return <Navigate to={`${base}/edit`} replace />;
  }

  const status = quizStatus(quiz);
  const avgTime = formatDuration(results.averageTimeSeconds);

  return (
    <div className="space-y-6">
      <Link
        to="/teacher/assessments"
        className="inline-flex items-center gap-1 text-sm text-muted no-underline hover:text-accent"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('nav.quizzes')}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">{quiz.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {quiz.subjectName} · {quiz.className}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Chip size="sm" color={quizStatusChipColor(status)} variant="soft">
              {t(`teacher.quizStatus.${status}`)}
            </Chip>
            {quiz.dueAt ? (
              <span className="text-sm text-muted">{t('teacher.due', { date: formatDue(quiz.dueAt, i18n.language) })}</span>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onPress={() => navigate(`${base}/edit`)}>
            {t('teacher.editQuiz')}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PortalMetric
          icon={Users}
          label={t('teacher.submissions')}
          value={`${results.submittedCount} / ${results.studentCount}`}
          onPress={() => navigate(`${base}/submissions`)}
        />
        <PortalMetric
          icon={Percent}
          label={t('teacher.average')}
          value={results.averagePercent == null ? t('teacher.noGrade') : `${results.averagePercent}%`}
        />
        <PortalMetric
          icon={ChartColumn}
          label={t('teacher.completion')}
          value={results.completionRate == null ? '—' : `${results.completionRate}%`}
        />
        <PortalMetric icon={Clock} label={t('teacher.avgTime')} value={avgTime || '—'} />
      </div>
      <PortalNavTabs
        label={t('teacher.tabOverview')}
        items={[
          { to: base, title: t('teacher.tabOverview'), end: true },
          { to: `${base}/questions`, title: t('teacher.tabQuestions') },
          {
            to: `${base}/submissions`,
            title: t('teacher.submissions'),
            count: results.submittedCount || undefined,
          },
          { to: `${base}/analytics`, title: t('teacher.tabAnalytics') },
        ]}
      />
      <Outlet context={{ quiz, results }} />
    </div>
  );
}

function useQuizOutlet() {
  return useOutletContext<QuizOutlet>();
}

export function TeacherQuizOverviewPage() {
  const { t } = useTranslation();
  const { results } = useQuizOutlet();
  const lowest = [...results.questionStats]
    .filter((item) => item.correctRate != null)
    .sort((a, b) => (a.correctRate ?? 100) - (b.correctRate ?? 100))
    .slice(0, 3);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PortalPanel>
        <h2 className="text-sm font-semibold">{t('teacher.scoreDistribution')}</h2>
        <ul className="mt-3 space-y-2">
          {results.scoreDistribution.map((bucket) => (
            <li key={bucket.bucket} className="flex items-center justify-between text-sm">
              <span>{bucket.bucket}%</span>
              <span className="tabular-nums text-muted">{bucket.count}</span>
            </li>
          ))}
        </ul>
      </PortalPanel>
      <PortalPanel>
        <h2 className="text-sm font-semibold">{t('teacher.recentSubmissions')}</h2>
        {results.recentSubmissions.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t('teacher.emptySubmissions')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {results.recentSubmissions.map((row) => (
              <li key={row.attemptId} className="flex justify-between gap-2 text-sm">
                <span>
                  {row.givenName} {row.familyName}
                </span>
                <span className="tabular-nums text-muted">
                  {row.score == null ? '—' : `${row.score}/${row.maxScore}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PortalPanel>
      <PortalPanel>
        <h2 className="text-sm font-semibold">{t('teacher.missingStudents')}</h2>
        {results.missingStudents.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t('teacher.allSubmitted')}</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {results.missingStudents.map((row) => (
              <li key={row.studentId}>
                {row.givenName} {row.familyName}
              </li>
            ))}
          </ul>
        )}
      </PortalPanel>
      <PortalPanel>
        <h2 className="text-sm font-semibold">{t('teacher.lowestQuestions')}</h2>
        {lowest.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t('teacher.noQuestionStats')}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lowest.map((item) => (
              <li key={item.id} className="text-sm">
                <QuizHtml html={item.prompt} className="line-clamp-2" />
                <p className="text-xs text-muted">{item.correctRate}%</p>
              </li>
            ))}
          </ul>
        )}
      </PortalPanel>
    </div>
  );
}

export function TeacherQuizQuestionsPage() {
  const { t } = useTranslation();
  const { results } = useQuizOutlet();
  if (results.questionStats.length === 0) {
    return <PortalEmptyState icon={ChartColumn}>{t('teacher.noQuestionStats')}</PortalEmptyState>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[32rem] text-start text-sm">
        <thead className="bg-surface text-muted">
          <tr>
            <th className="px-4 py-2 font-medium">{t('teacher.prompt')}</th>
            <th className="px-4 py-2 font-medium">{t('teacher.points')}</th>
            <th className="px-4 py-2 font-medium">{t('teacher.percentCorrect')}</th>
          </tr>
        </thead>
        <tbody>
          {results.questionStats.map((item) => (
            <tr key={item.id} className="border-t border-border">
              <td className="px-4 py-3">
                <p className="text-xs text-muted">{t(`teacher.questionTypes.${item.type}`)}</p>
                <QuizHtml html={item.prompt} />
              </td>
              <td className="px-4 py-3 tabular-nums">{item.points}</td>
              <td className="px-4 py-3 tabular-nums">
                {item.correctRate == null ? '—' : `${item.correctRate}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TeacherQuizAnalyticsPage() {
  const { t } = useTranslation();
  const { results } = useQuizOutlet();
  return (
    <div className="space-y-4">
      <PortalPanel>
        <h2 className="text-sm font-semibold">{t('teacher.scoreDistribution')}</h2>
        <div className="mt-4 flex h-40 items-end gap-3">
          {results.scoreDistribution.map((bucket) => {
            const max = Math.max(1, ...results.scoreDistribution.map((item) => item.count));
            return (
              <div key={bucket.bucket} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-accent/80"
                  style={{ height: `${Math.round((bucket.count / max) * 100)}%`, minHeight: bucket.count ? 8 : 2 }}
                />
                <p className="text-[11px] text-muted">{bucket.bucket}</p>
                <p className="text-xs tabular-nums">{bucket.count}</p>
              </div>
            );
          })}
        </div>
      </PortalPanel>
      <TeacherQuizQuestionsPage />
    </div>
  );
}

export function TeacherQuizSubmissionsPage() {
  const { t, i18n } = useTranslation();
  const { quiz, results } = useQuizOutlet();
  const [openId, setOpenId] = useState<string | null>(null);
  const review = useQuery({
    queryKey: ['teacher-attempt', quiz.id, openId],
    queryFn: () => apiFetch<TeacherAttemptReview>(`/teacher/assessments/${quiz.id}/attempts/${openId}`),
    enabled: Boolean(openId),
  });

  return (
    <div className="space-y-4">
      {results.students.length === 0 ? (
        <PortalEmptyState icon={Users}>{t('teacher.emptyRoster')}</PortalEmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[40rem] text-start text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t('teacher.student')}</th>
                <th className="px-4 py-2 font-medium">{t('teacher.status')}</th>
                <th className="px-4 py-2 font-medium">{t('teacher.score')}</th>
                <th className="px-4 py-2 font-medium">{t('teacher.submittedAt')}</th>
                <th className="px-4 py-2 font-medium">{t('teacher.timeTaken')}</th>
                <th className="px-4 py-2 font-medium">{t('teacher.results')}</th>
              </tr>
            </thead>
            <tbody>
              {results.students.map((row) => (
                <tr key={row.studentId} className="border-t border-border">
                  <td className="px-4 py-3">
                    {row.givenName} {row.familyName}
                  </td>
                  <td className="px-4 py-3">
                    {row.status === 'NOT_STARTED'
                      ? t('assessment.statusNotStarted')
                      : row.status === 'EXPIRED'
                        ? t('assessment.statusExpired')
                        : t('assessment.statusSubmitted')}
                  </td>
                  <td className="px-4 py-3">
                    {row.bestScore == null ? t('teacher.noGrade') : `${row.bestScore} / ${row.maxScore}`}
                    {row.passed === true ? (
                      <Chip size="sm" color="success" variant="soft" className="ms-2">
                        {t('teacher.passed')}
                      </Chip>
                    ) : null}
                    {row.passed === false ? (
                      <Chip size="sm" color="danger" variant="soft" className="ms-2">
                        {t('teacher.failed')}
                      </Chip>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {row.submittedAt ? formatDue(row.submittedAt, i18n.language) : '—'}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatDuration(row.durationSeconds) || '—'}</td>
                  <td className="px-4 py-3">
                    {row.attemptId ? (
                      <Button size="sm" variant="secondary" onPress={() => setOpenId(row.attemptId)}>
                        {t('teacher.open')}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openId && review.data ? <AttemptReviewPanel review={review.data} /> : null}
    </div>
  );
}

function AttemptReviewPanel({ review }: { review: TeacherAttemptReview }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">
        {review.givenName} {review.familyName}
      </h2>
      {review.questions.map((question, index) => (
        <PortalPanel key={question.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted">
              {t('student.questionOf', { current: index + 1, total: review.questions.length })}
            </p>
            <Chip size="sm" color={question.correct ? 'success' : 'danger'} variant="soft">
              {question.correct ? t('assessment.correct') : t('assessment.incorrect')}
            </Chip>
          </div>
          <QuizHtml html={question.prompt} className="mt-1 font-medium" />
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
                  <li key={option.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <p
                      className={cn(
                        'min-w-0 text-sm',
                        option.isCorrect && 'text-success',
                        selected && !option.isCorrect && 'text-danger',
                      )}
                    >
                      {option.text}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </PortalPanel>
      ))}
    </section>
  );
}

export function TeacherAssessmentResultsPage() {
  const { id = '' } = useParams();
  return <Navigate to={`/teacher/assessments/${id}/submissions`} replace />;
}
