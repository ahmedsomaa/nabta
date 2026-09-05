import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import type { LucideIcon } from "lucide-react";
import { BookOpen, CircleHelp, ClipboardList } from "lucide-react";
import type { StudentSubjectListItem } from "@nabta/types";
import { apiFetch } from "@/lib/api";
import { QueryError, QueryLoading } from "./QueryState";
import {
  StudentEmptyState,
  StudentPageHeader,
  StudentProgress,
} from "./StudentChrome";
import { StudentFilterChips } from "./StudentTabs";
import {
  BookTextIcon,
  type BookTextIconHandle,
} from "@/components/icons/book-text";
import { cn } from "@/lib/cn";

type ClassFilter = "all" | "inProgress" | "completed";

function ClassStat({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {text}
    </span>
  );
}

function ClassCard({ subject }: { subject: StudentSubjectListItem }) {
  const { t } = useTranslation();
  const iconRef = useRef<BookTextIconHandle>(null);

  return (
    <Link
      to={`/student/classes/${subject.id}`}
      className="rounded-xl text-start text-inherit no-underline"
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <div className="rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent/40">
        <div className="flex h-24 items-center justify-center rounded-lg bg-accent/10 text-accent md:h-28">
          <BookTextIcon ref={iconRef} size={32} aria-hidden />
        </div>
        <div className="space-y-2 pt-3">
          <p className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">
            {subject.name}
          </p>
          <p className="truncate text-sm text-muted">
            {subject.teacherName ?? subject.className}
          </p>
          <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
            <ClassStat
              icon={BookOpen}
              text={t("student.lessonCount", { count: subject.lessonCount })}
            />
            <ClassStat
              icon={ClipboardList}
              text={t("student.assignmentCount", {
                count: subject.assignmentCount,
              })}
            />
            <ClassStat
              icon={CircleHelp}
              text={t("student.quizCount", { count: subject.quizCount })}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <StudentProgress
              value={subject.progressPercent}
              label={t("student.progress", {
                percent: subject.progressPercent,
              })}
            />
            <span
              className={cn(
                "shrink-0 text-xs tabular-nums text-muted",
                subject.progressPercent >= 100 && "text-accent",
              )}
            >
              {t("student.progressShort", { percent: subject.progressPercent })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function StudentClassesPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<ClassFilter>("all");
  const query = useQuery({
    queryKey: ["student-subjects"],
    queryFn: () => apiFetch<StudentSubjectListItem[]>("/me/subjects"),
  });

  if (query.isLoading) return <QueryLoading variant="squares" />;
  if (query.isError || !query.data)
    return <QueryError onRetry={() => void query.refetch()} />;

  const visible = query.data.filter((subject) => {
    if (filter === "completed") return subject.progressPercent === 100;
    if (filter === "inProgress") return subject.progressPercent < 100;
    return true;
  });

  return (
    <div className="space-y-6">
      <StudentPageHeader
        title={t("nav.subjects")}
        subtitle={t("student.classesSubtitle")}
      />
      {query.data.length === 0 ? (
        <StudentEmptyState icon={BookTextIcon}>
          {t("student.emptySubjects")}
        </StudentEmptyState>
      ) : (
        <>
          <StudentFilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { id: "all", label: t("student.filterAll") },
              { id: "inProgress", label: t("student.filterInProgress") },
              { id: "completed", label: t("student.filterCompleted") },
            ]}
          />
          {visible.length === 0 ? (
            <StudentEmptyState icon={BookTextIcon}>
              {t("student.emptyFilter")}
            </StudentEmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((subject) => (
                <ClassCard key={subject.id} subject={subject} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
