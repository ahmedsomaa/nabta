> **Historical.** This file is not the working specification. Use the HTML docs under `docs/business/`, `docs/requirements/`, `docs/design/`, `docs/technical/`, and `docs/roadmap/`. Implement one phase folder at a time.

# Build a Scalable School LMS for Egyptian International Schools

You are a **senior software architect, product designer, and full-stack engineer**.

Build a production-quality, scalable **Learning Management System (LMS) for Egyptian international schools**.

This is not a generic online-course platform.

The system should support the day-to-day academic workflows of an international school: students, teachers, classes, subjects, academic years, grades, assignments, assessments, attendance, announcements, learning materials, and academic progress.

The application must have three primary experiences:

- **Student Portal**
- **Teacher Portal**
- **Admin Portal**

The architecture must be designed so that additional roles such as parents, coordinators, principals, counselors, and school staff can be added later without rewriting the system.

---

# 1. Core Product Vision

Create a modern school platform that sits between:

- LMS
- Student Information System
- Academic management platform
- Digital classroom
- Assessment platform

The primary goal is to make learning and academic management significantly easier.

### For students

> "What do I need to learn or do today?"

### For teachers

> "What do I need to teach, grade, or manage today?"

### For administrators

> "What is happening across the school?"

The interface should feel like a modern SaaS product rather than an old-school ERP.

Prioritize:

- Clarity
- Speed
- Simplicity
- Accessibility
- Responsive design
- Strong information hierarchy
- Smooth interactions
- Reliable data
- Scalable architecture

---

# 2. Target Environment

The system is designed for:

**Egyptian international schools**

Support common international-school structures such as:

- British curriculum
- American curriculum
- IB-style structures

Do not hardcode curriculum-specific assumptions into the core architecture.

Curriculum-specific functionality should be configurable.

---

# 3. Academic Structure

Model the school hierarchy explicitly.

```text
School
 └── Academic Year
      └── Grade
           └── Class / Section
                └── Subject
                     └── Teacher
                          └── Students
```

Examples:

```text
School: Cairo International School

Academic Year: 2026/2027

Grade:
Grade 10

Section:
10A

Subjects:
Mathematics
Physics
English
Biology
Computer Science
```

The system should support multiple schools in the future.

Design the architecture with **multi-tenancy** in mind even if the first release contains only one school.

---

# 4. User Roles

Initially implement:

## Student

Students can:

- View dashboard
- View timetable
- View enrolled subjects
- Access lessons
- View learning materials
- Submit assignments
- Take quizzes
- View grades
- View feedback
- Track academic progress
- View attendance
- Receive announcements
- View upcoming deadlines
- View notifications
- Manage profile

---

## Teacher

Teachers can:

- View dashboard
- View assigned classes
- View subjects
- Manage lessons
- Upload learning materials
- Create assignments
- Create quizzes
- Grade submissions
- Provide feedback
- Record attendance
- Publish announcements
- View student progress
- View class performance
- Manage their teaching schedule

---

## Admin

Admins can:

- Manage users
- Manage students
- Manage teachers
- Manage academic years
- Manage grades
- Manage classes
- Manage subjects
- Assign teachers
- Assign students
- Manage courses/content
- Manage curriculum structures
- Manage announcements
- View school analytics
- Manage system settings
- Manage permissions

Architect RBAC so that more granular permissions can be introduced later.

---

# 5. Future Roles

Do not implement these initially unless necessary, but make the architecture extensible for:

- Parent
- Principal
- Vice Principal
- Academic Coordinator
- Department Head
- Counselor
- Librarian
- School Administrator

Do not use hardcoded role checks throughout the application.

Use a centralized authorization system.

---

# 6. Technology Stack

## Frontend

Use:

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui
- Radix UI primitives
- Lucide React
- React Router
- TanStack Query
- React Hook Form
- Zod
- Framer Motion

Use strict TypeScript.

Avoid `any`.

---

## Backend

Use:

- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Redis

Structure NestJS using clear domain modules.

Recommended modules:

```text
auth
users
students
teachers
schools
academic-years
grades
classes
subjects
enrollments
lessons
materials
assignments
submissions
assessments
attendance
grades
announcements
notifications
analytics
files
```

Do not create a monolithic `app.service.ts` containing business logic.

---

# 7. Backend Architecture

Use a modular architecture.

Example:

```text
src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── students/
│   ├── teachers/
│   ├── academic/
│   ├── classes/
│   ├── subjects/
│   ├── lessons/
│   ├── assignments/
│   ├── assessments/
│   ├── attendance/
│   ├── grades/
│   ├── announcements/
│   ├── notifications/
│   └── analytics/
│
├── common/
│   ├── guards/
│   ├── decorators/
│   ├── interceptors/
│   ├── filters/
│   ├── pipes/
│   └── utils/
│
├── config/
└── main.ts
```

Each domain should own:

- Controller
- Service
- DTOs
- Validation
- Database access
- Domain logic

Avoid unnecessary coupling between modules.

---

# 8. Database

Use PostgreSQL as the primary database.

Use Prisma for:

- Schema
- Migrations
- Type-safe queries
- Relationships

Design normalized relational models.

Core entities should include:

```text
School
AcademicYear
User
Role
Permission
Student
Teacher
Grade
Class
Subject
Enrollment
TeachingAssignment
Lesson
LearningMaterial
Assignment
AssignmentSubmission
Assessment
Question
Answer
AssessmentAttempt
Attendance
GradeRecord
Announcement
Notification
CourseProgress
AuditLog
```

Add timestamps consistently:

```text
createdAt
updatedAt
```

Use UUIDs for public identifiers.

Do not expose sequential database IDs through APIs.

---

# 9. Multi-Tenancy

Design all school-owned entities around a `schoolId`.

Example:

```text
User
schoolId

Class
schoolId

Subject
schoolId

Assignment
schoolId
```

The backend must enforce tenant isolation.

A user from School A must never be able to access School B data.

Do not rely exclusively on frontend filtering for security.

---

# 10. Redis

Use Redis for:

- Session/cache where appropriate
- Rate limiting
- Temporary data
- Notification queues
- Background jobs
- Frequently accessed dashboard data
- Potential real-time features

Use a queue architecture such as BullMQ where appropriate.

Do not use Redis as the source of truth for persistent academic data.

PostgreSQL remains the source of truth.

---

# 11. Authentication

Implement secure authentication.

Support:

- Email/password initially
- Refresh tokens
- Secure password hashing
- Account status
- Role-based authorization
- Session management
- Logout
- Password reset architecture

Design the authentication layer so SSO can be added later.

Potential future integrations:

- Microsoft Entra ID
- Google Workspace
- Microsoft 365

Do not tightly couple the system to a single identity provider.

---

# 12. Authorization

Implement:

### RBAC

Roles:

```text
STUDENT
TEACHER
ADMIN
```

Permissions should eventually support:

```text
students.read
students.write
assignments.create
assignments.grade
grades.read
grades.write
attendance.read
attendance.write
```

Create reusable NestJS guards/decorators.

Frontend permissions should control UI visibility.

Backend permissions must enforce actual authorization.

Never rely on frontend authorization alone.

---

# 13. Student Portal

The student interface should be the most focused experience.

## Student Dashboard

The dashboard should answer:

**"What should I do today?"**

Header:

> Good morning, Ahmed

Display:

### Today's Schedule

Example:

```text
08:00
Mathematics
Room 204

09:00
Physics
Lab 2

10:30
English
Room 105
```

### Upcoming

Show:

- Assignments
- Quizzes
- Exams
- Deadlines

Example:

```text
Physics Assignment
Due tomorrow

Mathematics Quiz
Friday

Biology Project
Sep 8
```

### Continue Learning

Show the most recently accessed lesson.

### Academic Overview

Show:

- Current GPA / average where applicable
- Attendance
- Assignment completion
- Upcoming assessments

Do not overwhelm students with analytics.

---

# 14. Student — My Classes

Display:

```text
Mathematics
Physics
Biology
English
Computer Science
```

Each subject opens a dedicated subject page.

Subject page:

- Teacher
- Description
- Current unit
- Lessons
- Materials
- Assignments
- Assessments
- Announcements
- Progress

---

# 15. Student — Learning Experience

Build a focused lesson interface.

Desktop:

```text
┌───────────────────────────────────────────────┐
│ Header                                        │
├──────────────────────────────┬────────────────┤
│                              │                │
│ Lesson Content               │ Course/Unit    │
│                              │ Navigation     │
│ Video / Article / Material   │                │
│                              │                │
├──────────────────────────────┴────────────────┤
│ Previous Lesson              Next Lesson →    │
└───────────────────────────────────────────────┘
```

Support:

- Video
- Rich text
- PDFs
- Images
- External resources
- Downloadable files
- Embedded content

Track lesson progress.

---

# 16. Assignments

Students should be able to:

- View assignment instructions
- See due date
- See attached resources
- Upload submission
- Replace submission before deadline
- Submit
- View status
- View grade
- View teacher feedback

Statuses:

```text
Not Started
Draft
Submitted
Late
Graded
Returned
```

---

# 17. Assessments

Support:

- Multiple choice
- Multiple answer
- True/false
- Short answer

Assessment flow:

```text
Assessment Overview
        ↓
Start
        ↓
Questions
        ↓
Submit
        ↓
Result
        ↓
Feedback
```

Support configurable:

- Time limit
- Attempts
- Passing score
- Question randomization

Architect for future exam types without rewriting the assessment domain.

---

# 18. Grades

Students should have a clear academic performance view.

Display:

```text
Subject        Current Grade
Mathematics       A
Physics           B+
Biology           A-
English           A
```

Clicking a subject shows:

- Assessments
- Assignments
- Scores
- Teacher feedback
- Grade history

Do not assume all schools use the same grading system.

Create configurable grading schemes.

Examples:

```text
Percentage
Letter Grade
GPA
IB-style criteria
Custom school grading
```

---

# 19. Attendance

Students can view:

- Present
- Absent
- Late
- Excused

Show:

```text
Attendance: 96%

Present: 47
Absent: 1
Late: 1
Excused: 0
```

Teachers can record attendance per class/session.

Admins can view attendance analytics.

---

# 20. Teacher Portal

Teacher dashboard should answer:

**"What do I need to teach and manage today?"**

Show:

### Today's Classes

```text
08:00
Grade 10A — Physics

10:00
Grade 11B — Physics

12:00
Grade 9A — Science
```

### To Grade

```text
Physics Assignment
24 submissions

Quiz
18 submissions
```

### Student Alerts

Examples:

- Students falling behind
- Missing assignments
- Low assessment performance
- Attendance concerns

### Quick Actions

- Create Assignment
- Create Quiz
- Upload Material
- Take Attendance
- Post Announcement

---

# 21. Teacher — Class Management

Teachers can open a class and see:

- Students
- Lessons
- Assignments
- Assessments
- Attendance
- Grades
- Announcements

Student table:

```text
Student
Progress
Attendance
Average
Missing Work
```

Clicking a student opens their academic overview.

---

# 22. Teacher — Course / Subject Builder

Make content creation extremely simple.

Structure:

```text
Subject
 ├── Unit 1
 │    ├── Lesson 1
 │    ├── Lesson 2
 │    └── Quiz
 │
 ├── Unit 2
 │    ├── Lesson 1
 │    └── Assignment
```

Teachers can:

- Add unit
- Add lesson
- Reorder content
- Upload materials
- Add video
- Add text
- Create quiz
- Create assignment
- Publish/unpublish

Use drag-and-drop.

Autosave drafts where appropriate.

---

# 23. Admin Portal

Admin dashboard should be more data-oriented.

Show:

### School Overview

- Students
- Teachers
- Classes
- Subjects
- Active courses
- Attendance
- Assignment completion
- Academic performance

### Academic Overview

Allow filtering by:

- Academic year
- Grade
- Class
- Subject
- Teacher

---

# 24. Admin — Student Management

Searchable table:

```text
Student
Class
Grade
Attendance
Average
Status
```

Actions:

- View
- Edit
- Assign class
- Assign subjects
- Deactivate

Student profile should show the complete academic record.

---

# 25. Admin — Teacher Management

Show:

- Teacher
- Department
- Subjects
- Classes
- Status

Allow:

- Assign subject
- Assign class
- Update profile
- Deactivate

---

# 26. Admin — Academic Structure

Create interfaces for managing:

### Academic Years

```text
2026/2027
2027/2028
```

### Grades

```text
Grade 7
Grade 8
Grade 9
...
Grade 12
```

### Classes

```text
7A
7B
8A
...
```

### Subjects

Subjects should be configurable.

Do not hardcode subject lists.

---

# 27. Notifications

Implement an extensible notification system.

Channels:

- In-app
- Email (architecture-ready)
- Push notifications (future)

Events:

- Assignment created
- Assignment due soon
- Assignment graded
- New announcement
- Quiz published
- New material
- Attendance event
- Grade published

Use Redis/BullMQ for asynchronous notification processing.

---

# 28. Announcements

Teachers can publish announcements to:

- Class
- Subject
- Grade

Admins can publish school-wide announcements.

Support:

- Title
- Rich text
- Attachments
- Publish date
- Expiry date
- Target audience

---

# 29. Search

Implement global search.

Search across relevant entities:

- Students
- Teachers
- Classes
- Subjects
- Lessons
- Assignments
- Materials

Use PostgreSQL search initially.

Keep the search abstraction extensible so Elasticsearch/OpenSearch can be introduced later if required.

---

# 30. File Management

Design file handling separately from academic entities.

Files may include:

- PDFs
- Videos
- Images
- Documents
- Assignment submissions

Do not store large files directly in PostgreSQL.

Use object storage abstraction.

Initial implementation can use local storage for development.

Production should support:

- AWS S3
- Cloudflare R2
- Azure Blob Storage

Create a storage service interface so the provider can be changed without modifying business logic.

---

# 31. API Design

Create a versioned REST API.

Example:

```text
/api/v1/auth
/api/v1/students
/api/v1/teachers
/api/v1/classes
/api/v1/subjects
/api/v1/assignments
/api/v1/assessments
/api/v1/grades
/api/v1/attendance
```

Use:

- DTO validation
- Zod where appropriate on frontend
- NestJS ValidationPipe
- Consistent response formats
- Pagination
- Filtering
- Sorting
- Error handling

Example:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120
  }
}
```

---

# 32. Frontend Architecture

Organize by feature/domain rather than creating one huge components directory.

Example:

```text
src/
├── app/
├── components/
│   ├── ui/
│   └── shared/
│
├── features/
│   ├── auth/
│   ├── dashboard/
│   ├── students/
│   ├── teachers/
│   ├── classes/
│   ├── subjects/
│   ├── assignments/
│   ├── assessments/
│   ├── grades/
│   ├── attendance/
│   └── notifications/
│
├── layouts/
├── hooks/
├── lib/
├── services/
├── types/
└── routes/
```

Use TanStack Query for server state.

Do not duplicate server data in global state unnecessarily.

Use local component state for UI state.

---

# 33. Design System

Use:

**React 19 + Tailwind CSS v4 + shadcn/ui**

The visual style should be:

**Modern · Calm · Premium · Academic · Professional**

Avoid:

- Generic dashboard templates
- Excessive gradients
- Neon colors
- Huge shadows
- Excessive rounded cards
- Gamification overload
- Visually noisy interfaces

Use generous whitespace.

---

# 34. Color System

Base:

```text
Background: #FAFAF8
Foreground: #171717
Muted: #737373
Border: #E5E5E5
```

Use one primary accent.

Suggested:

```text
Primary: #4F46E5
```

Semantic:

```text
Success: #16A34A
Warning: #CA8A04
Destructive: #DC2626
```

Implement colors through CSS variables/design tokens rather than hardcoding values throughout components.

Support dark mode architecturally.

---

# 35. Typography

Use:

**Geist** or **Inter**

Hierarchy should be clear.

Avoid excessive font weights.

Use typography to establish information hierarchy instead of cards everywhere.

---

# 36. UI Components

Build reusable components using shadcn/ui:

- Button
- Input
- Select
- Combobox
- Dialog
- Drawer
- Dropdown
- Tabs
- Tooltip
- Popover
- Calendar
- Date picker
- Table
- Card
- Badge
- Progress
- Toast
- Alert
- Skeleton
- Breadcrumb
- Command menu

Extend shadcn components rather than reinventing basic UI primitives.

---

# 37. Navigation

Desktop:

Persistent sidebar.

Mobile:

Bottom navigation for primary actions + drawer for secondary navigation.

Navigation should change based on role.

Student:

```text
Home
My Classes
Assignments
Grades
More
```

Teacher:

```text
Home
Classes
Assignments
Gradebook
More
```

Admin:

```text
Overview
Users
Academics
Reports
Settings
```

---

# 38. Motion

Use Framer Motion selectively.

Animations:

- Page transitions
- Sidebar transitions
- Modal transitions
- Accordion expansion
- Card hover
- Progress updates
- Toast notifications
- Drag/drop feedback

Keep animations between approximately:

`150–300ms`

Avoid animations that slow down workflows.

Support:

`prefers-reduced-motion`.

---

# 39. UX States

Every feature must have:

### Loading

Use skeletons.

### Empty

Provide useful explanations and a clear CTA.

### Error

Provide a human-readable message and retry action.

### Success

Provide immediate confirmation.

Do not show blank screens.

---

# 40. Responsive Requirements

Fully responsive:

```text
1440+
1280
1024
768
480
375
```

Mobile must not simply be a compressed desktop interface.

Redesign layouts appropriately for touch.

Minimum touch target:

`44px`

---

# 41. Accessibility

Follow WCAG-oriented practices.

Implement:

- Keyboard navigation
- Focus states
- Semantic HTML
- ARIA where required
- Proper labels
- Accessible dialogs
- Accessible tables
- Color contrast
- Reduced motion
- Screen reader compatibility

---

# 42. Audit Logging

Academic systems require traceability.

Create an `AuditLog` model.

Track important actions:

```text
Who
What
When
Entity
Entity ID
Before
After
IP / metadata where appropriate
```

Examples:

- Grade changed
- Student status changed
- Assignment deleted
- Teacher assigned
- Attendance modified

Do not log sensitive information unnecessarily.

---

# 43. Performance

Design for growth.

Use:

- Database indexes
- Pagination
- Efficient Prisma queries
- Redis caching where useful
- Background jobs
- Lazy-loaded routes
- Code splitting
- Optimized images
- Virtualized large lists where necessary

Avoid N+1 queries.

Do not fetch entire datasets when only a page is required.

---

# 44. Testing

Set up testing architecture from the beginning.

Backend:

- Unit tests
- Integration tests
- E2E tests

Frontend:

- Component tests
- Critical workflow tests

Critical workflows include:

### Student

Login → Dashboard → Subject → Lesson → Assignment → Submit

### Teacher

Login → Class → Assignment → Grade submission

### Admin

Login → Users → Student → Update academic assignment

---

# 45. Seed / Demo Environment

Create realistic seed data.

Use:

### School

Egyptian International School

### Academic Year

2026/2027

### Grades

Grade 7–12

### Subjects

- Mathematics
- English
- Physics
- Chemistry
- Biology
- Computer Science
- Business
- Economics

Create:

- Students
- Teachers
- Classes
- Enrollments
- Lessons
- Assignments
- Assessments
- Grades
- Attendance
- Announcements
- Notifications

The demo environment should make every portal feel populated.

---

# 46. Example Student Workflow

Implement this complete flow:

```text
Login
 ↓
Student Dashboard
 ↓
See "Physics Assignment Due Tomorrow"
 ↓
Open Physics
 ↓
Open Assignment
 ↓
Read Instructions
 ↓
Upload PDF
 ↓
Submit
 ↓
Assignment status becomes "Submitted"
 ↓
Teacher receives notification
 ↓
Teacher grades submission
 ↓
Student receives notification
 ↓
Student sees grade + feedback
```

This workflow must actually work.

---

# 47. Example Teacher Workflow

```text
Login
 ↓
Teacher Dashboard
 ↓
Open Grade 10A Physics
 ↓
Create Assignment
 ↓
Set title
 ↓
Description
 ↓
Due date
 ↓
Attach material
 ↓
Publish
 ↓
Students receive notification
 ↓
Students submit
 ↓
Teacher opens submissions
 ↓
Grades students
 ↓
Adds feedback
 ↓
Publishes grades
```

---

# 48. Example Admin Workflow

```text
Login
 ↓
Admin Dashboard
 ↓
Academic Management
 ↓
2026/2027
 ↓
Grade 10
 ↓
Class 10A
 ↓
Assign Physics teacher
 ↓
Assign students
 ↓
Assign subjects
```

All relationships should persist to PostgreSQL.

---

# 49. Security

Implement:

- Password hashing
- JWT/refresh-token security
- RBAC
- Tenant isolation
- Input validation
- Rate limiting
- Secure file uploads
- File type validation
- Authorization checks
- Protection against IDOR
- SQL injection protection through Prisma
- XSS-safe rendering
- CSRF strategy where applicable

Never trust client-provided:

- schoolId
- userId
- role
- permissions

Derive authorization context from the authenticated user.

---

# 50. Developer Experience

Create:

```text
.env.example
README.md
docker-compose.yml
```

Docker Compose should provide:

- PostgreSQL
- Redis

Document:

```text
Installation
Environment variables
Database setup
Migrations
Seeding
Running frontend
Running backend
Running tests
```

Create scripts for:

```text
dev
build
test
lint
format
db:migrate
db:seed
```

---

# 51. Implementation Strategy

Do NOT attempt to implement every feature at once.

Build incrementally.

## Phase 1 — Foundation

Implement:

- Monorepo/project structure
- Frontend
- NestJS backend
- PostgreSQL
- Prisma
- Redis
- Docker Compose
- Authentication
- RBAC
- Base design system
- Application layouts
- API architecture

---

## Phase 2 — Academic Core

Implement:

- Schools
- Academic years
- Grades
- Classes
- Subjects
- Students
- Teachers
- Enrollments
- Teaching assignments

---

## Phase 3 — Student Experience

Implement:

- Student dashboard
- My Classes
- Subject pages
- Lessons
- Materials
- Assignments
- Progress

---

## Phase 4 — Teacher Experience

Implement:

- Teacher dashboard
- Class management
- Lesson builder
- Material management
- Assignment creation
- Submission management
- Gradebook
- Feedback

---

## Phase 5 — Assessments

Implement:

- Quiz builder
- Questions
- Attempts
- Scoring
- Results
- Assessment analytics

---

## Phase 6 — Administration

Implement:

- Admin dashboard
- User management
- Academic management
- Teacher assignments
- Student assignments
- School configuration
- Analytics

---

## Phase 7 — Notifications & Background Jobs

Implement:

- Notification center
- Redis queues
- Assignment notifications
- Grade notifications
- Announcement notifications
- Scheduled reminders

---

## Phase 8 — Production Hardening

Implement:

- Error handling
- Logging
- Audit logs
- Security review
- Performance optimization
- Testing
- Accessibility
- Responsive polish
- Loading/empty/error states

---

# 52. Cursor Instructions

You are working inside an existing codebase.

Before implementing a feature:

1. Inspect the existing project structure.
2. Identify the current architecture.
3. Reuse existing abstractions.
4. Do not duplicate components.
5. Do not introduce a new library unless necessary.
6. Follow existing naming conventions.
7. Check related backend modules before changing database models.
8. Check existing frontend components before creating new ones.
9. Keep changes focused.
10. Do not rewrite unrelated code.

For every feature:

### First

Explain briefly:

- What will be changed
- Which files/modules are affected
- Any database changes
- Any API changes

### Then

Implement the feature.

### Finally

Verify:

- TypeScript
- Lint
- Tests
- Build
- Database migrations

Fix errors before moving to the next feature.

---

# 53. Important Engineering Rules

Do NOT:

- Hardcode users
- Hardcode academic data
- Put business logic inside React components
- Put business logic inside controllers
- Use Redis as the primary database
- Trust client-provided authorization data
- Duplicate API types unnecessarily
- Create giant components
- Create giant services
- Use `any`
- Ignore loading/error states
- Ignore mobile layouts
- Create fake interactions
- Use mock data where real persistence has already been implemented

When functionality is presented in the UI, it should either work or clearly be marked as not yet implemented.

---

# 54. Product Quality Bar

The final application should feel like a serious product that an Egyptian international school could realistically adopt.

It should feel:

**Fast**
**Modern**
**Calm**
**Reliable**
**Professional**
**Easy to learn**
**Easy to administer**

The UI should never feel like a generic admin template.

The architecture should be capable of growing from:

```text
1 school
100 students
```

to:

```text
multiple schools
thousands of students
hundreds of teachers
millions of academic records
```

without requiring a fundamental rewrite.

---

# 55. Start Here

Do not immediately generate the entire application.

Start by:

1. Inspecting the repository.
2. Creating a concise architecture plan.
3. Defining the database/domain model.
4. Defining frontend routes.
5. Defining API boundaries.
6. Defining RBAC.
7. Defining the monorepo structure.
8. Setting up Docker for PostgreSQL + Redis.
9. Implementing the foundation.
10. Running the project and verifying the setup.

After the foundation is stable, implement each phase incrementally.

**Prioritize correctness and architecture over the number of screens generated.**
