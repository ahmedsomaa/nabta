export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SYSTEM_ADMIN';
export type UserStatus = 'active' | 'disabled';
export type Locale = 'en' | 'ar';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  schoolId: string | null;
  schoolName: string;
  schoolLogoUrl: string | null;
  locale: Locale;
  theme: ThemePreference;
  status: UserStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiListMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiListSuccess<T> {
  data: T[];
  meta: ApiListMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  gradeId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  schoolId: string;
  gradeId: string | null;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  schoolId: string;
  userId: string;
  givenName: string;
  familyName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile {
  id: string;
  schoolId: string;
  userId: string;
  givenName: string;
  familyName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingAssignment {
  id: string;
  schoolId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  createdAt: string;
  updatedAt: string;
}

export type LessonType = 'RICH_TEXT' | 'VIDEO' | 'PDF' | 'IMAGE' | 'EXTERNAL';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RETURNED';
export type StudentAssignmentStatus = 'NOT_STARTED' | SubmissionStatus;

export interface StudentMe {
  id: string;
  givenName: string;
  familyName: string;
  classId: string | null;
  className: string | null;
}

export interface TimetableSlotView {
  id: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  room: string | null;
  subjectId: string;
  subjectName: string;
}

export interface UpcomingAssignment {
  id: string;
  kind?: 'assignment' | 'assessment';
  title: string;
  dueAt: string | null;
  subjectName: string;
  status: string;
}

export interface ContinueLearning {
  lessonId: string;
  lessonTitle: string;
  subjectId: string;
  subjectName: string;
}

export interface StudentDashboard {
  schedule: TimetableSlotView[];
  upcoming: UpcomingAssignment[];
  continueLearning: ContinueLearning | null;
  overview: { submitted: number; total: number };
}

export interface StudentSubjectListItem {
  id: string;
  name: string;
  code: string | null;
  teacherName: string | null;
  className: string;
  progressPercent: number;
}

export interface StudentLessonSummary {
  id: string;
  title: string;
  type: LessonType;
  sortOrder: number;
  completed: boolean;
}

export interface StudentUnit {
  id: string;
  title: string;
  sortOrder: number;
  lessons: StudentLessonSummary[];
}

export interface StudentSubjectDetail {
  id: string;
  name: string;
  code: string | null;
  teacherName: string | null;
  className: string;
  progressPercent: number;
  units: StudentUnit[];
  assignments: UpcomingAssignment[];
  assessments: StudentAssessmentListItem[];
}

export interface StudentLessonDetail {
  id: string;
  subjectId: string;
  unitId: string;
  title: string;
  type: LessonType;
  body: string | null;
  url: string | null;
  completed: boolean;
  units: StudentUnit[];
}

export interface StudentAssignmentDetail {
  id: string;
  title: string;
  instructions: string;
  dueAt: string;
  subjectId: string;
  subjectName: string;
  status: StudentAssignmentStatus;
  canSubmit: boolean;
  maxScore: number;
  score: number | null;
  feedback: string | null;
  attachments: { id: string; fileName: string; mimeType: string; size: number }[];
  files: { id: string; fileName: string; mimeType: string; size: number }[];
}

export interface FilePresignResult {
  storageKey: string;
  uploadUrl: string;
}

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface TeacherMe {
  id: string;
  givenName: string;
  familyName: string;
}

export interface TeacherClassItem {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

export interface TeacherScheduleSlot {
  id: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  room: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

export interface TeacherToGradeItem {
  assignmentId: string;
  title: string;
  pending: number;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

export interface TeacherAlert {
  kind: 'missing_work' | 'low_progress' | 'low_score';
  message: string;
  classId: string;
  subjectId: string;
}

export interface TeacherDashboard {
  schedule: TeacherScheduleSlot[];
  toGrade: TeacherToGradeItem[];
  alerts: TeacherAlert[];
}

export interface TeacherLessonSummary {
  id: string;
  title: string;
  type: LessonType;
  sortOrder: number;
  publishedAt: string | null;
}

export interface TeacherUnit {
  id: string;
  title: string;
  sortOrder: number;
  lessons: TeacherLessonSummary[];
}

export interface TeacherAssignmentListItem {
  id: string;
  title: string;
  dueAt: string;
  publishedAt: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  pendingCount: number;
}

export interface TeacherClassDetail {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  units: TeacherUnit[];
  assignments: TeacherAssignmentListItem[];
}

export interface TeacherRosterRow {
  studentId: string;
  givenName: string;
  familyName: string;
  progressPercent: number;
  attendancePercent: number | null;
  average: number | null;
  missingWork: number;
}

export interface TeacherStudentOverview {
  studentId: string;
  givenName: string;
  familyName: string;
  lessons: { id: string; title: string; completed: boolean }[];
  assignments: {
    id: string;
    title: string;
    status: StudentAssignmentStatus;
    score: number | null;
  }[];
}

export interface TeacherLessonDetail {
  id: string;
  unitId: string;
  title: string;
  type: LessonType;
  body: string | null;
  url: string | null;
  publishedAt: string | null;
  sortOrder: number;
  materials: { id: string; fileName: string; mimeType: string; size: number }[];
}

export interface TeacherAssignmentDetail {
  id: string;
  title: string;
  instructions: string;
  dueAt: string;
  maxScore: number;
  publishedAt: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  files: { id: string; fileName: string; mimeType: string; size: number }[];
}

export interface TeacherSubmissionListItem {
  id: string | null;
  studentId: string;
  givenName: string;
  familyName: string;
  status: StudentAssignmentStatus;
  submittedAt: string | null;
  score: number | null;
  gradesPublishedAt: string | null;
}

export interface TeacherSubmissionDetail {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  maxScore: number;
  studentId: string;
  givenName: string;
  familyName: string;
  status: SubmissionStatus;
  submittedAt: string | null;
  score: number | null;
  feedback: string | null;
  gradesPublishedAt: string | null;
  files: { id: string; fileName: string; mimeType: string; size: number; downloadUrl: string }[];
}

export interface TeacherGradebook {
  classId: string;
  subjectId: string;
  students: { id: string; givenName: string; familyName: string }[];
  assignments: { id: string; title: string; maxScore: number; publishedAt: string | null }[];
  assessments: { id: string; title: string; maxScore: number; publishedAt: string | null }[];
  cells: {
    studentId: string;
    assignmentId: string;
    score: number | null;
    status: StudentAssignmentStatus;
  }[];
  assessmentCells: {
    studentId: string;
    assessmentId: string;
    score: number | null;
    passed: boolean | null;
  }[];
}

export interface TeacherAttendance {
  date: string;
  records: {
    studentId: string;
    givenName: string;
    familyName: string;
    status: AttendanceStatus | null;
  }[];
}

export type QuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_ANSWER' | 'TRUE_FALSE' | 'SHORT_ANSWER';
export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED';
export type StudentAssessmentStatus = 'NOT_STARTED' | AttemptStatus;

export interface TeacherQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

export interface TeacherQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  sortOrder: number;
  feedback: string | null;
  options: TeacherQuestionOption[];
}

export interface TeacherAssessmentListItem {
  id: string;
  title: string;
  publishedAt: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  questionCount: number;
  attemptCount: number;
}

export interface TeacherAssessmentDetail {
  id: string;
  title: string;
  instructions: string;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  passingScore: number;
  randomizeQuestions: boolean;
  publishedAt: string | null;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  unitId: string | null;
  questions: TeacherQuestion[];
}

export interface TeacherAssessmentResults {
  assessmentId: string;
  title: string;
  passingScore: number;
  attemptCount: number;
  average: number | null;
  passRate: number | null;
  students: {
    studentId: string;
    givenName: string;
    familyName: string;
    bestScore: number | null;
    maxScore: number;
    passed: boolean | null;
    attemptId: string | null;
  }[];
}

export interface TeacherAttemptReview {
  id: string;
  studentId: string;
  givenName: string;
  familyName: string;
  status: AttemptStatus;
  score: number | null;
  maxScore: number;
  passed: boolean | null;
  submittedAt: string | null;
  questions: {
    id: string;
    prompt: string;
    type: QuestionType;
    points: number;
    feedback: string | null;
    correct: boolean;
    options: TeacherQuestionOption[];
    selectedOptionIds: string[];
    textAnswer: string | null;
  }[];
}

export interface StudentAssessmentListItem {
  id: string;
  title: string;
  subjectName: string;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  passingScore: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  inProgressAttemptId: string | null;
  bestScore: number | null;
  maxScore: number;
  passed: boolean | null;
  status: StudentAssessmentStatus;
}

export interface StudentAssessmentOverview {
  id: string;
  title: string;
  instructions: string;
  subjectName: string;
  timeLimitMinutes: number | null;
  maxAttempts: number;
  passingScore: number;
  randomizeQuestions: boolean;
  questionCount: number;
  attemptsUsed: number;
  attemptsRemaining: number;
  inProgressAttemptId: string | null;
  canStart: boolean;
  bestScore: number | null;
  maxScore: number;
  passed: boolean | null;
}

export interface StudentAttemptQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  points: number;
  options: { id: string; text: string; sortOrder: number }[];
  selectedOptionIds: string[];
  textAnswer: string | null;
}

export interface StudentAttemptView {
  id: string;
  assessmentId: string;
  status: AttemptStatus;
  expiresAt: string | null;
  questions: StudentAttemptQuestion[];
}

export interface StudentAttemptResult {
  id: string;
  assessmentId: string;
  title: string;
  status: AttemptStatus;
  score: number;
  maxScore: number;
  passed: boolean;
  submittedAt: string | null;
  questions: {
    id: string;
    type: QuestionType;
    prompt: string;
    points: number;
    awarded: number;
    feedback: string | null;
    options: { id: string; text: string; sortOrder: number; isCorrect: boolean }[];
    selectedOptionIds: string[];
    textAnswer: string | null;
  }[];
}

export interface StudentGradeListItem {
  subjectId: string;
  subjectName: string;
  className: string;
  percentage: number | null;
  letter: string | null;
}

export interface StudentGradeDetail {
  subjectId: string;
  subjectName: string;
  className: string;
  percentage: number | null;
  letter: string | null;
  assignments: {
    id: string;
    title: string;
    score: number | null;
    maxScore: number;
    feedback: string | null;
  }[];
  assessments: {
    id: string;
    title: string;
    score: number | null;
    maxScore: number;
    passed: boolean | null;
  }[];
}
