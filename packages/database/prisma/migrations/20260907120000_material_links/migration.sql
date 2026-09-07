-- AlterTable
ALTER TABLE "LearningMaterial" ADD COLUMN "url" TEXT;
ALTER TABLE "LearningMaterial" ALTER COLUMN "storageKey" DROP NOT NULL;
