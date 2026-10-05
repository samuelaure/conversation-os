-- CreateEnum
CREATE TYPE "PersonSource" AS ENUM ('MANUAL_IMPORT', 'CSV_IMPORT', 'APIFY_IMPORT');

-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('INITIAL_CONTACT', 'FOLLOW_UP', 'RESEARCH_PITCH', 'RESEARCH_FOLLOW_UP', 'RESEARCH_CONFIRM', 'RESEARCH_INTERVIEW', 'ARTICLE_DELIVERY', 'RELATIONSHIP_TOUCH', 'INBOUND_RESPONSE', 'OTHER');

-- CreateEnum
CREATE TYPE "InteractionDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "InteractionStatus" AS ENUM ('PROPOSED', 'SENT', 'SENT_EDITED', 'RECEIVED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ResearchQuestionStatus" AS ENUM ('OPEN', 'COVERED', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "PersonStatus" ADD VALUE 'RESEARCH_ACCEPTED';

-- AlterTable
ALTER TABLE "persons" ADD COLUMN     "follow_up_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_contacted_at" TIMESTAMP(3),
ADD COLUMN     "last_responded_at" TIMESTAMP(3),
ADD COLUMN     "linkedin_connected_on" TIMESTAMP(3),
ADD COLUMN     "next_follow_up_at" TIMESTAMP(3),
ADD COLUMN     "niche_id" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "source" "PersonSource" NOT NULL DEFAULT 'MANUAL_IMPORT';

-- CreateTable
CREATE TABLE "niches" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "niches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "direction" "InteractionDirection" NOT NULL,
    "proposed_message" TEXT,
    "edited_message" TEXT,
    "final_message" TEXT,
    "status" "InteractionStatus" NOT NULL DEFAULT 'PROPOSED',
    "scheduled_for" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_plans" (
    "id" TEXT NOT NULL,
    "niche_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_questions" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "context" TEXT,
    "status" "ResearchQuestionStatus" NOT NULL DEFAULT 'OPEN',
    "quality_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "research_answers" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "quality" INTEGER NOT NULL DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "research_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "niches_slug_key" ON "niches"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "niches_name_key" ON "niches"("name");

-- CreateIndex
CREATE UNIQUE INDEX "research_plans_niche_id_key" ON "research_plans"("niche_id");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_niche_id_fkey" FOREIGN KEY ("niche_id") REFERENCES "niches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_plans" ADD CONSTRAINT "research_plans_niche_id_fkey" FOREIGN KEY ("niche_id") REFERENCES "niches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_questions" ADD CONSTRAINT "research_questions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "research_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "research_answers" ADD CONSTRAINT "research_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "research_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
