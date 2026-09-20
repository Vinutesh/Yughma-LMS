ALTER TABLE "CertificateTemplate" ADD COLUMN "backgroundAssetId" TEXT;
ALTER TABLE "CertificateTemplate" ADD COLUMN "overlayLayout" JSONB;
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_backgroundAssetId_fkey" FOREIGN KEY ("backgroundAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
