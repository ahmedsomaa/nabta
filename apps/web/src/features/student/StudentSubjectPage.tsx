import { useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  Circle,
  ClipboardList,
} from "lucide-react";
import type {
  StudentActivityItem,
  StudentAssessmentListItem,
  StudentSubjectDetail,
  StudentUnit,
  TimetableSlotView,
  UpcomingAssignment,
} from "@nabta/types";
import { apiFetch } from "@/lib/api";
import { EmptyCard, QueryError, QueryLoading } from "./QueryState";
import { dueUrgency, formatDue } from "./StatusChip";
import { formatRelativeDue, formatShortMonthDay } from "./studentDates";
import { StudentProgress } from "./StudentChrome";
import { StudentFilterChips, StudentTabs } from "./StudentTabs";
import { usePageTrail } from "@/layouts/PageTrail";
import {
  BookTextIcon,
  type BookTextIconHandle,
} from "@/components/icons/book-text";
import { cn } from "@/lib/cn";
import {
  ACTIONABLE_ASSIGNMENT,
  ACTIONABLE_QUIZ,
  COMPLETED_QUIZ,
} from "./studentWork";

const TODO_PREVIEW = 3;

type LessonFilter = "all" | "inProgress" | "completed";
type AssignmentFilter = "all" | "todo" | "submitted" | "graded";
type QuizFilter = "all" | "todo" | "completed";

function consecutiveDays(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.every(
    (day, index) => index === 0 || day === sorted[index - 1]! + 1,
  );
}

function formatDaySpan(
  days: number[],
  weekdayLabel: (day: number) => string,
  everyDay: string,
) {
  const unique = [...new Set(days)].sort((a, b) => a - b);
  if (unique.length === 7) return everyDay;
  if (unique.length >= 2 && consecutiveDays(unique)) {
    return `${weekdayLabel(unique[0]!)}–${weekdayLabel(unique[unique.length - 1]!)}`;
  }
  return unique.map(weekdayLabel).join(" · ");
}

function scheduleGroups(
  slots: TimetableSlotView[],
  weekdayLabel: (day: number) => string,
  everyDay: string,
  roomLabel: (room: string) => string,
) {
  const groups = new Map<
    string,
    { startsAt: string; endsAt: string; room: string | null; days: number[] }
  >();
  for (const slot of slots) {
    const key = `${slot.startsAt}|${slot.endsAt}|${slot.room ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.days.push(slot.weekday);
    } else {
      groups.set(key, {
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        room: slot.room,
        days: [slot.weekday],
      });
    }
  }
  return [...groups.values()].map((group) => ({
    days: formatDaySpan(group.days, weekdayLabel, everyDay),
    time: `${group.startsAt}–${group.endsAt}`,
    room: group.room ? roomLabel(group.room) : null,
  }));
}

function ClassInfoTable({
  rows,
}: {
  rows: { label: string; value: ReactNode }[];
}) {
  return (
    <dl className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="gap-x-8 sm:col-span-2 sm:grid sm:grid-cols-subgrid"
        >
          <dt className="text-muted">{row.label}</dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function formatActivityDate(
  iso: string,
  locale: string,
  t: (key: string) => string,
) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const days = Math.round(
    (startOfDate.getTime() - startOfToday.getTime()) / 86_400_000,
  );
  if (days === 0) return t("student.activityToday");
  if (days === -1) return t("student.activityYesterday");
  return new Intl.DateTimeFormat(locale.startsWith("ar") ? "ar" : "en", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function activityHref(item: StudentActivityItem, subjectId: string) {
  if (item.kind === "lesson")
    return `/student/classes/${subjectId}/lessons/${item.id}`;
  if (item.kind === "assignment") return `/student/assignments/${item.id}`;
  return `/student/assessments/${item.id}`;
}

function OverviewCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4",
        className,
      )}
    >
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function LessonMarker({ state }: { state: "done" | "current" | "open" }) {
  if (state === "done") {
    return (
      <Check className="size-4 text-accent" strokeWidth={2.5} aria-hidden />
    );
  }
  if (state === "current") {
    return <span className="size-2.5 rounded-full bg-accent" aria-hidden />;
  }
  return <Circle className="size-3.5 text-muted" aria-hidden />;
}

function nextIncomplete(units: StudentUnit[]) {
  for (const unit of units) {
    const lesson = unit.lessons.find((item) => !item.completed);
    if (lesson) return { unit, lesson };
  }
  return null;
}

function quizSubtitle(
  item: StudentAssessmentListItem,
  t: (key: string, opts?: Record<string, unknown>) => string,
) {
  return [
    t("assessment.questions", { count: item.questionCount }),
    item.timeLimitMinutes
      ? t("assessment.timeLimit", { minutes: item.timeLimitMinutes })
      : null,
    t("assessment.attempts", {
      used: item.attemptsUsed,
      max: item.maxAttempts,
    }),
  ]
    .filter(Boolean)
    .join(" · ");
}

export function StudentSubjectPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { subjectId = "" } = useParams();
  const [lessonFilter, setLessonFilter] = useState<LessonFilter>("all");
  const [assignmentFilter, setAssignmentFilter] =
    useState<AssignmentFilter>("all");
  const [quizFilter, setQuizFilter] = useState<QuizFilter>("all");
  const iconRef = useRef<BookTextIconHandle>(null);
  const query = useQuery({
    queryKey: ["student-subject", subjectId],
    queryFn: () => apiFetch<StudentSubjectDetail>(`/me/subjects/${subjectId}`),
    enabled: Boolean(subjectId),
  });
  usePageTrail(query.data ? [{ label: query.data.name }] : []);

  if (query.isLoading) return <QueryLoading variant="subject" />;
  if (query.isError || !query.data)
    return <QueryError onRetry={() => void query.refetch()} />;

  const subject = query.data;
  const lessons = subject.units.flatMap((unit) => unit.lessons);
  const doneCount = lessons.filter((lesson) => lesson.completed).length;
  const next = nextIncomplete(subject.units);
  const groups = scheduleGroups(
    subject.schedule ?? [],
    (day) => t(`student.weekdayLong.${day}`),
    t("student.everyDay"),
    (room) => t("student.room", { room }),
  );
  const infoRows = [
    { label: t("student.teacher"), value: subject.teacherName ?? "—" },
    { label: t("student.classLabel"), value: subject.className },
    {
      label: t("student.schedule"),
      value:
        groups.length === 0 ? (
          t("student.emptyClassSchedule")
        ) : (
          <div className="space-y-0.5">
            {groups.map((group) => (
              <p key={`${group.days}-${group.time}`}>
                {[group.days, group.time, group.room]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            ))}
          </div>
        ),
    },
  ];

  const assignmentRows = subject.assignments.map(
    (item: UpcomingAssignment) => ({
      id: item.id,
      kind: "assignment" as const,
      title: item.title,
      subtitle: t("student.due", {
        date: formatDue(item.dueAt, i18n.language),
      }),
      status: item.status,
      href: `/student/assignments/${item.id}`,
      dueAt: item.dueAt,
      maxScore: item.maxScore,
      score: item.score ?? null,
    }),
  );
  const quizRows = subject.assessments.map(
    (item: StudentAssessmentListItem) => ({
      ...item,
      kind: "assessment" as const,
      subtitle: quizSubtitle(item, t),
      href: `/student/assessments/${item.id}`,
      dueAt: null as string | null,
    }),
  );
  const toDo = [...assignmentRows, ...quizRows]
    .filter((item) =>
      item.kind === "assessment"
        ? ACTIONABLE_QUIZ.has(item.status)
        : ACTIONABLE_ASSIGNMENT.has(item.status),
    )
    .sort((a, b) => {
      const aOverdue = dueUrgency(a.dueAt, a.status) === "overdue" ? 0 : 1;
      const bOverdue = dueUrgency(b.dueAt, b.status) === "overdue" ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999");
    });
  const toDoPreview = toDo.slice(0, TODO_PREVIEW);

  const path = subject.units.flatMap((unit) =>
    unit.lessons.map((lesson) => ({ unit, lesson })),
  );
  const visiblePath = path.filter(({ lesson }) => {
    if (lessonFilter === "completed") return lesson.completed;
    if (lessonFilter === "inProgress") return next?.lesson.id === lesson.id;
    return true;
  });
  const lessonList =
    path.length === 0 ? (
      <EmptyCard>{t("student.emptyLessons")}</EmptyCard>
    ) : (
      <div className="space-y-4">
        <StudentFilterChips
          value={lessonFilter}
          onChange={setLessonFilter}
          bordered
          options={[
            { id: "all", label: t("student.filterAll"), count: path.length },
            {
              id: "inProgress",
              label: t("student.filterInProgress"),
              count: next ? 1 : 0,
            },
            {
              id: "completed",
              label: t("student.filterCompleted"),
              count: doneCount,
            },
          ]}
        />
        {visiblePath.length === 0 ? (
          <EmptyCard>{t("student.emptyFilter")}</EmptyCard>
        ) : (
          <ol className="rounded-xl border border-border bg-surface px-4 py-2">
            {visiblePath.map(({ lesson }) => {
              const index = path.findIndex(
                (item) => item.lesson.id === lesson.id,
              );
              const isCurrent = next?.lesson.id === lesson.id;
              const state = lesson.completed
                ? "done"
                : isCurrent
                  ? "current"
                  : "open";
              const status = lesson.completed
                ? t("student.completed")
                : isCurrent
                  ? t("student.filterInProgress")
                  : t("student.statusNotStarted");
              return (
                <li
                  key={lesson.id}
                  className="border-b border-border last:border-b-0"
                >
                  <Link
                    to={`/student/classes/${subject.id}/lessons/${lesson.id}`}
                    className="flex items-start gap-3 py-3 text-inherit no-underline hover:text-accent"
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                      <LessonMarker state={state} />
                    </span>
                    <span className="w-8 shrink-0 pt-0.5 text-sm tabular-nums text-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium [overflow-wrap:anywhere]">
                        {lesson.title}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">
                        {status}
                      </span>
                      {isCurrent ? (
                        <span className="mt-2 inline-flex items-center rounded-lg border border-border px-2.5 py-1 text-sm">
                          {t("student.continue")}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    );

  const assignmentTodo = assignmentRows.filter((item) =>
    ACTIONABLE_ASSIGNMENT.has(item.status),
  );
  const visibleAssignments = [...assignmentRows]
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))
    .filter((item) => {
      if (assignmentFilter === "todo")
        return ACTIONABLE_ASSIGNMENT.has(item.status);
      if (assignmentFilter === "submitted") return item.status === "SUBMITTED";
      if (assignmentFilter === "graded") return item.status === "GRADED";
      return true;
    });

  const quizTodo = quizRows.filter((item) => ACTIONABLE_QUIZ.has(item.status));
  const quizCompleted = quizRows.filter((item) =>
    COMPLETED_QUIZ.has(item.status),
  );
  const visibleQuizzes = quizRows.filter((item) => {
    if (quizFilter === "todo") return ACTIONABLE_QUIZ.has(item.status);
    if (quizFilter === "completed") return COMPLETED_QUIZ.has(item.status);
    return true;
  });

  const assignmentSubmitted = assignmentRows.filter(
    (item) => item.status === "SUBMITTED",
  );
  const assignmentGraded = assignmentRows.filter(
    (item) => item.status === "GRADED",
  );

  const assignmentList = (
    <div className="space-y-4">
      {assignmentRows.length === 0 ? (
        <EmptyCard>{t("student.emptyAssignments")}</EmptyCard>
      ) : (
        <>
          <StudentFilterChips
            value={assignmentFilter}
            onChange={setAssignmentFilter}
            bordered
            options={[
              {
                id: "all",
                label: t("student.filterAll"),
                count: assignmentRows.length,
              },
              {
                id: "todo",
                label: t("student.tabToDo"),
                count: assignmentTodo.length,
              },
              {
                id: "submitted",
                label: t("student.tabSubmitted"),
                count: assignmentSubmitted.length,
              },
              {
                id: "graded",
                label: t("student.tabGraded"),
                count: assignmentGraded.length,
              },
            ]}
          />
          {visibleAssignments.length === 0 ? (
            <EmptyCard>{t("student.emptyFilter")}</EmptyCard>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border bg-surface">
              {visibleAssignments.map((item) => {
                const urgency = dueUrgency(item.dueAt, item.status);
                const done =
                  item.status === "SUBMITTED" || item.status === "GRADED";
                const statusLabel =
                  item.status === "GRADED"
                    ? t("student.statusGraded")
                    : item.status === "SUBMITTED"
                      ? t("student.statusSubmitted")
                      : urgency === "overdue"
                        ? t("student.overdue")
                        : urgency === "soon" ||
                            formatRelativeDue(item.dueAt, i18n.language, t)
                          ? formatRelativeDue(item.dueAt, i18n.language, t) ||
                            t("student.statusNotStarted")
                          : t("student.statusNotStarted");
                return (
                  <li
                    key={item.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <Link
                      to={item.href}
                      className="flex items-start gap-3 px-4 py-3 text-inherit no-underline hover:bg-overlay"
                    >
                      {done ? (
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-accent"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      ) : (
                        <ClipboardList
                          className="mt-0.5 size-4 shrink-0 text-muted"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className="font-medium [overflow-wrap:anywhere]">
                            {item.title}
                          </span>
                          {item.dueAt ? (
                            <span className="shrink-0 text-sm text-muted">
                              {t("student.due", {
                                date: formatShortMonthDay(
                                  item.dueAt,
                                  i18n.language,
                                ),
                              })}
                            </span>
                          ) : null}
                        </span>
                        {item.maxScore != null ? (
                          <span className="mt-1 block text-sm text-muted">
                            {t("student.assignmentPoints", {
                              count: item.maxScore,
                            })}
                          </span>
                        ) : null}
                        <span className="mt-2 flex items-end justify-between gap-3">
                          <span>
                            <span
                              className={cn(
                                "block text-sm text-muted",
                                urgency === "overdue" && "text-danger",
                              )}
                            >
                              {statusLabel}
                            </span>
                            {item.status === "GRADED" &&
                            item.score != null &&
                            item.maxScore != null ? (
                              <span className="mt-0.5 block text-sm tabular-nums">
                                {item.score} / {item.maxScore}
                              </span>
                            ) : null}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-1 text-sm text-accent">
                            {done
                              ? t("student.viewWork")
                              : t("student.openWork")}
                            <ArrowRight
                              className="size-3.5 rtl:rotate-180"
                              aria-hidden
                            />
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );

  const quizList = (
    <div className="space-y-4">
      {quizRows.length === 0 ? (
        <EmptyCard>{t("assessment.empty")}</EmptyCard>
      ) : (
        <>
          <StudentFilterChips
            value={quizFilter}
            onChange={setQuizFilter}
            bordered
            options={[
              {
                id: "all",
                label: t("student.filterAll"),
                count: quizRows.length,
              },
              {
                id: "todo",
                label: t("student.tabToDo"),
                count: quizTodo.length,
              },
              {
                id: "completed",
                label: t("student.tabCompleted"),
                count: quizCompleted.length,
              },
            ]}
          />
          {visibleQuizzes.length === 0 ? (
            <EmptyCard>{t("student.emptyFilter")}</EmptyCard>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border bg-surface">
              {visibleQuizzes.map((item) => {
                const done = COMPLETED_QUIZ.has(item.status);
                const percent =
                  item.bestScore != null && item.maxScore > 0
                    ? Math.round((item.bestScore / item.maxScore) * 100)
                    : null;
                return (
                  <li
                    key={item.id}
                    className="border-b border-border last:border-b-0"
                  >
                    <Link
                      to={item.href}
                      className="flex items-start gap-3 px-4 py-4 text-inherit no-underline hover:bg-overlay"
                    >
                      {done ? (
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-accent"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                      ) : (
                        <Brain
                          className="mt-0.5 size-4 shrink-0 text-muted"
                          aria-hidden
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium [overflow-wrap:anywhere]">
                          {item.title}
                        </span>
                        {done ? (
                          <>
                            {item.submittedAt ? (
                              <span className="mt-1 block text-sm text-muted">
                                {t("student.quizCompletedOn", {
                                  date: formatShortMonthDay(
                                    item.submittedAt,
                                    i18n.language,
                                  ),
                                })}
                              </span>
                            ) : null}
                            {item.bestScore != null ? (
                              <span className="mt-3 block">
                                <span className="block text-2xl font-semibold tabular-nums">
                                  {item.bestScore} / {item.maxScore}
                                </span>
                                {percent != null ? (
                                  <span className="text-sm text-muted">
                                    {percent}%
                                  </span>
                                ) : null}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <span className="mt-1 block text-sm text-muted">
                              {quizSubtitle(item, t)}
                            </span>
                            <span className="mt-2 block text-sm text-muted">
                              {item.status === "IN_PROGRESS"
                                ? t("assessment.statusInProgress")
                                : t("assessment.statusNotStarted")}
                            </span>
                          </>
                        )}
                        <span className="mt-3 flex justify-end">
                          <span className="inline-flex items-center gap-1 text-sm text-accent">
                            {done
                              ? t("assessment.viewResults")
                              : item.status === "IN_PROGRESS"
                                ? t("assessment.resume")
                                : t("assessment.start")}
                            <ArrowRight
                              className="size-3.5 rtl:rotate-180"
                              aria-hidden
                            />
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link
          to="/student/classes"
          className="inline-flex items-center gap-1.5 text-sm text-muted no-underline hover:text-accent"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("student.backToSubjects")}
        </Link>
        <div
          className="space-y-5 rounded-xl border border-border bg-surface p-4 md:p-5"
          onMouseEnter={() => iconRef.current?.startAnimation()}
          onMouseLeave={() => iconRef.current?.stopAnimation()}
        >
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <BookTextIcon ref={iconRef} size={28} aria-hidden />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
                {subject.name}
              </h1>
              {subject.code ? (
                <p className="mt-0.5 text-sm text-muted">{subject.code}</p>
              ) : null}
            </div>
          </div>
          <ClassInfoTable rows={infoRows} />
        </div>
      </div>

      <StudentTabs
        label={t("student.subjectSubtitle")}
        items={[
          {
            id: "overview",
            title: t("nav.overview"),
            content: (
              <div className="space-y-3">
                <OverviewCard title={t("student.continueLearning")}>
                  {next ? (
                    <>
                      <p className="text-sm font-medium [overflow-wrap:anywhere]">
                        {next.unit.title} – {next.lesson.title}
                      </p>
                      <div className="flex items-center gap-3">
                        <StudentProgress
                          value={subject.progressPercent}
                          label={t("student.progress", {
                            percent: subject.progressPercent,
                          })}
                        />
                        <span
                          className={cn(
                            "shrink-0 text-sm tabular-nums text-muted",
                            subject.progressPercent >= 100 && "text-accent",
                          )}
                        >
                          {t("student.progressShort", {
                            percent: subject.progressPercent,
                          })}
                        </span>
                      </div>
                      <div className="mt-auto flex justify-end">
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            navigate(
                              `/student/classes/${subject.id}/lessons/${next.lesson.id}`,
                            )
                          }
                        >
                          {t("student.continue")}
                          <ArrowRight
                            className="size-3.5 rtl:rotate-180"
                            aria-hidden
                          />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted">
                      {t("student.emptyContinue")}
                    </p>
                  )}
                </OverviewCard>
                <div className="grid gap-3 md:grid-cols-2">
                  <OverviewCard title={t("student.tabToDo")}>
                    {toDoPreview.length === 0 ? (
                      <p className="text-sm text-muted">
                        {t("student.emptyClassTodo")}
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {toDoPreview.map((item) => {
                          const Icon =
                            item.kind === "assessment" ? Brain : ClipboardList;
                          return (
                            <li key={`${item.kind}-${item.id}`}>
                              <Link
                                to={item.href}
                                className="flex items-start gap-2.5 text-inherit no-underline hover:text-accent"
                              >
                                <Icon
                                  className="mt-0.5 size-4 shrink-0 text-muted"
                                  aria-hidden
                                />
                                <span className="min-w-0">
                                  <span className="block font-medium [overflow-wrap:anywhere]">
                                    {item.title}
                                  </span>
                                  {item.kind === "assignment" ? (
                                    <span
                                      className={cn(
                                        "mt-0.5 block text-sm text-muted",
                                        dueUrgency(item.dueAt, item.status) ===
                                          "overdue" && "text-danger",
                                      )}
                                    >
                                      {formatRelativeDue(
                                        item.dueAt,
                                        i18n.language,
                                        t,
                                      )}
                                    </span>
                                  ) : null}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </OverviewCard>
                  <OverviewCard title={t("student.yourProgress")}>
                    {lessons.length === 0 ? (
                      <p className="text-sm text-muted">
                        {t("student.emptyLessons")}
                      </p>
                    ) : (
                      <>
                        <p
                          className={cn(
                            "text-4xl font-semibold tabular-nums tracking-tight",
                            subject.progressPercent >= 100 && "text-accent",
                          )}
                        >
                          {t("student.progressShort", {
                            percent: subject.progressPercent,
                          })}
                        </p>
                        <p className="text-sm text-muted">
                          {t("student.lessonsComplete", {
                            done: doneCount,
                            total: lessons.length,
                          })}
                        </p>
                      </>
                    )}
                  </OverviewCard>
                </div>
                <section className="space-y-3 pt-2">
                  <h3 className="text-sm font-semibold">
                    {t("student.recentActivity")}
                  </h3>
                  <div className="border-t border-border pt-3">
                    {(subject.recentActivity ?? []).length === 0 ? (
                      <p className="text-sm text-muted">
                        {t("student.emptyActivity")}
                      </p>
                    ) : (
                      <ul className="space-y-3">
                        {(subject.recentActivity ?? []).map((item) => {
                          const percent =
                            item.score != null &&
                            item.maxScore != null &&
                            item.maxScore > 0
                              ? Math.round((item.score / item.maxScore) * 100)
                              : null;
                          const label =
                            item.kind === "lesson"
                              ? t("student.lessonCompleted", {
                                  title: item.title,
                                })
                              : item.kind === "assessment" && percent != null
                                ? t("student.activityQuizScore", {
                                    title: item.title,
                                    percent,
                                  })
                                : item.title;
                          return (
                            <li key={`${item.kind}-${item.id}`}>
                              <Link
                                to={activityHref(item, subject.id)}
                                className="flex items-start justify-between gap-4 text-inherit no-underline hover:text-accent"
                              >
                                <span className="flex min-w-0 items-start gap-2">
                                  <Check
                                    className="mt-0.5 size-4 shrink-0 text-accent"
                                    strokeWidth={2.5}
                                    aria-hidden
                                  />
                                  <span className="[overflow-wrap:anywhere]">
                                    {label}
                                  </span>
                                </span>
                                <span className="shrink-0 text-sm text-muted">
                                  {formatActivityDate(
                                    item.occurredAt,
                                    i18n.language,
                                    t,
                                  )}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>
              </div>
            ),
          },
          {
            id: "lessons",
            title: t("student.lessons"),
            count: path.length,
            content: lessonList,
          },
          {
            id: "assignments",
            title: t("nav.assignments"),
            count: assignmentRows.length,
            content: assignmentList,
          },
          {
            id: "quizzes",
            title: t("nav.quizzes"),
            count: quizRows.length,
            content: quizList,
          },
        ]}
      />
    </div>
  );
}
