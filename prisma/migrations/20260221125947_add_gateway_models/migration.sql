-- AlterTable
ALTER TABLE "isps" ADD COLUMN     "lastHealthCheck" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "video_locations" (
    "videoId" TEXT NOT NULL,
    "ispId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "replicatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "video_locations_pkey" PRIMARY KEY ("videoId","ispId")
);

-- CreateTable
CREATE TABLE "replication_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "replication_config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "video_locations_videoId_idx" ON "video_locations"("videoId");

-- CreateIndex
CREATE INDEX "video_locations_ispId_idx" ON "video_locations"("ispId");

-- AddForeignKey
ALTER TABLE "video_locations" ADD CONSTRAINT "video_locations_ispId_fkey" FOREIGN KEY ("ispId") REFERENCES "isps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
