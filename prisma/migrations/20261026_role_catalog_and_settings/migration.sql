ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'PROFESSOR';

CREATE TABLE "CatalogCourse" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "department" TEXT NOT NULL,
  "credits" INTEGER NOT NULL,
  "instructor" TEXT NOT NULL DEFAULT 'Staff Faculty',
  "expectedWeeklyHours" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
  "description" TEXT,
  "syllabusOverview" TEXT,
  "colorKey" TEXT NOT NULL DEFAULT 'stem',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CatalogCourse_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CatalogCourse_code_key" ON "CatalogCourse"("code");

ALTER TABLE "Subject" ADD COLUMN "catalogCourseId" TEXT;
CREATE INDEX "Subject_catalogCourseId_idx" ON "Subject"("catalogCourseId");
CREATE UNIQUE INDEX "Subject_userId_catalogCourseId_key" ON "Subject"("userId", "catalogCourseId");
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_catalogCourseId_fkey"
  FOREIGN KEY ("catalogCourseId") REFERENCES "CatalogCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "InstitutionalSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "termName" TEXT NOT NULL DEFAULT 'Fall Semester 2026',
  "academicYear" TEXT NOT NULL DEFAULT '2026-2027',
  "startDate" TEXT NOT NULL DEFAULT '2026-08-24',
  "endDate" TEXT NOT NULL DEFAULT '2026-12-18',
  "censusDate" TEXT NOT NULL DEFAULT '2026-09-08',
  "withdrawalDeadline" TEXT NOT NULL DEFAULT '2026-10-16',
  "readingStart" TEXT NOT NULL DEFAULT '2026-12-07',
  "readingEnd" TEXT NOT NULL DEFAULT '2026-12-09',
  "finalsStart" TEXT NOT NULL DEFAULT '2026-12-10',
  "finalsEnd" TEXT NOT NULL DEFAULT '2026-12-18',
  "defaultDailyStudyCap" DOUBLE PRECISION NOT NULL DEFAULT 6.0,
  "defaultSessionMinutes" INTEGER NOT NULL DEFAULT 50,
  "overloadThreshold" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" TEXT,
  CONSTRAINT "InstitutionalSettings_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Task" ADD COLUMN "acceptanceReopenedUntil" TIMESTAMP(3);
