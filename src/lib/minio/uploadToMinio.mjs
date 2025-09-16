// src\lib\minio\uploadToMinio
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MINIO_URL } from "../../config/config.mjs";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: MINIO_URL,
  forcePathStyle: true,
  credentials: {
    accessKeyId: "minioadmin",
    secretAccessKey: "minioadmin",
  },
});

export async function uploadToMinio({
  buffer,
  key,
  contentType,
  bucket = "uploads",
}) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
  );

  // ✅ generate signed URL valid for 1 hour
  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: 3600 }
  );

  return {
    key,
    signedUrl,
  };
}
