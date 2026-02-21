-- CreateTable
CREATE TABLE "isps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "ipv4" TEXT NOT NULL,
    "ipv6" TEXT,
    "diskOfferedGb" INTEGER NOT NULL,
    "techName" TEXT NOT NULL,
    "techEmail" TEXT NOT NULL,
    "techWhatsapp" TEXT NOT NULL,
    "ispToken" TEXT NOT NULL,
    "minioAccessKey" TEXT NOT NULL DEFAULT '',
    "minioSecretKey" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "weight" INTEGER NOT NULL DEFAULT 100,
    "healthStatus" TEXT NOT NULL DEFAULT 'unknown',
    "diskUsedGb" DOUBLE PRECISION,
    "diskTotalGb" DOUBLE PRECISION,
    "bandwidthOutTodayGb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "isps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "isps_slug_key" ON "isps"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "isps_ispToken_key" ON "isps"("ispToken");
