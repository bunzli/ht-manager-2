-- CreateTable
CREATE TABLE "custom_chart" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "marketStudyId" INTEGER NOT NULL,
    "groupBy" TEXT NOT NULL,
    "filters" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "custom_chart_marketStudyId_fkey" FOREIGN KEY ("marketStudyId") REFERENCES "market_study" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "custom_chart_marketStudyId_idx" ON "custom_chart"("marketStudyId");
