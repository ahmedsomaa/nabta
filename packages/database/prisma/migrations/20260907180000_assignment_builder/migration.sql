-- CreateEnum
CREATE TYPE "AssignmentSubmissionType" AS ENUM ('FILE', 'TEXT', 'LINK', 'MULTIPLE', 'NONE');

-- CreateEnum
CREATE TYPE "AssignmentResubmitPolicy" AS ENUM ('NEVER', 'ALWAYS', 'UNTIL_DUE');

-- AlterTable
ALTER TABLE "Assignment" ALTER COLUMN "dueAt" DROP NOT NULL;
ALTER TABLE "Assignment" ADD COLUMN "closeAt" TIMESTAMP(3);
ALTER TABLE "Assignment" ADD COLUMN "allowLate" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Assignment" ADD COLUMN "submissionType" "AssignmentSubmissionType" NOT NULL DEFAULT 'FILE';
ALTER TABLE "Assignment" ADD COLUMN "maxFiles" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Assignment" ADD COLUMN "allowedMimeTypes" TEXT[] NOT NULL DEFAULT ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]::TEXT[];
ALTER TABLE "Assignment" ADD COLUMN "resubmitPolicy" "AssignmentResubmitPolicy" NOT NULL DEFAULT 'NEVER';

-- AlterTable
ALTER TABLE "AssignmentFile" ALTER COLUMN "storageKey" DROP NOT NULL;
ALTER TABLE "AssignmentFile" ADD COLUMN "url" TEXT;

-- AlterTable
ALTER TABLE "AssignmentSubmission" ADD COLUMN "textResponse" TEXT;
ALTER TABLE "AssignmentSubmission" ADD COLUMN "linkUrl" TEXT;
