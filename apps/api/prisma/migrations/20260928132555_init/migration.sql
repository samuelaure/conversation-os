-- CreateEnum
CREATE TYPE "PersonStatus" AS ENUM ('DISCOVERED', 'CONNECTION_REQUESTED', 'CONNECTED', 'INITIAL_MESSAGE_SENT', 'RESPONDED', 'RESEARCH_INVITED', 'RESEARCH_IN_PROGRESS', 'RESEARCH_COMPLETED', 'OPPORTUNITY_IDENTIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLIENT', 'NO_RESPONSE', 'PAUSED', 'NOT_A_FIT', 'REJECTED', 'DEFERRED', 'LOST');

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "linkedin_url" TEXT,
    "linkedin_id" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "website" TEXT,
    "location" TEXT,
    "description" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "linkedin_id" TEXT,
    "linkedin_url" TEXT NOT NULL,
    "public_identifier" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "headline" TEXT,
    "about" TEXT,
    "photo_url" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "location" TEXT,
    "city" TEXT,
    "country" TEXT,
    "country_code" TEXT,
    "job_title" TEXT,
    "company_id" TEXT,
    "layer" INTEGER NOT NULL DEFAULT 1,
    "status" "PersonStatus" NOT NULL DEFAULT 'CONNECTED',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_scraped_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_linkedin_url_key" ON "companies"("linkedin_url");

-- CreateIndex
CREATE UNIQUE INDEX "companies_linkedin_id_key" ON "companies"("linkedin_id");

-- CreateIndex
CREATE UNIQUE INDEX "persons_linkedin_id_key" ON "persons"("linkedin_id");

-- CreateIndex
CREATE UNIQUE INDEX "persons_linkedin_url_key" ON "persons"("linkedin_url");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
