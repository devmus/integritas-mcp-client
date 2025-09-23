// // src\lib\minio\uploadToMinio
// import {
//   S3Client,
//   PutObjectCommand,
//   GetObjectCommand,
// } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
// import { MINIO_URL } from "../../config/config.mjs";

// const s3 = new S3Client({
//   region: "us-east-1",
//   endpoint: MINIO_URL,
//   forcePathStyle: true,
//   credentials: {
//     accessKeyId: "minioadmin",
//     secretAccessKey: "minioadmin",
//   },
// });

// export async function uploadToMinio({
//   buffer,
//   key,
//   contentType,
//   bucket = "uploads",
// }) {
//   await s3.send(
//     new PutObjectCommand({
//       Bucket: bucket,
//       Key: key,
//       Body: buffer,
//       ContentType: contentType || "application/octet-stream",
//     })
//   );

//   // ✅ generate signed URL valid for 1 hour
//   const signedUrl = await getSignedUrl(
//     s3,
//     new GetObjectCommand({
//       Bucket: bucket,
//       Key: key,
//     }),
//     { expiresIn: 3600 }
//   );

//   return {
//     key,
//     signedUrl,
//   };
// }

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  MINIO_URL,
  MINIO_PUBLIC_URL,
  MINIO_USER,
  MINIO_PASS,
} from "../../config/config.mjs";

// S3 client for uploads (uses localhost)
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: MINIO_URL,
  forcePathStyle: true,
  credentials: {
    accessKeyId: MINIO_USER,
    secretAccessKey: MINIO_PASS,
  },
});

// S3 client for signed URLs (uses public domain, that gets rewritten by nginx to localhost)
const s3Public = new S3Client({
  region: "us-east-1",
  endpoint: MINIO_PUBLIC_URL,
  forcePathStyle: true,
  credentials: {
    accessKeyId: MINIO_USER,
    secretAccessKey: MINIO_PASS,
  },
});

export async function uploadToMinio({
  buffer,
  key,
  contentType,
  bucket = "uploads",
  publicFile = false,
}) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
  );

  // Generate signed URL using the public domain client with download parameter
  let s3signer = publicFile ? s3Public : s3;
  const signedUrl = await getSignedUrl(
    s3signer,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${key}"`,
    }),
    { expiresIn: 3600 }
  );

  // Replace root with /files so browser hits the right proxy path
  const publicUrl = signedUrl.replace(
    MINIO_PUBLIC_URL,
    `${MINIO_PUBLIC_URL}/files`
  );

  // Schedule file deletion after 1 hour (same as signed URL expiration)
  scheduleFileDeletion(bucket, key, 1);

  console.log("signedUrl", signedUrl);

  return {
    key,
    signedUrl: publicFile ? publicUrl : signedUrl,
  };
}

/**
 * Delete a file from MinIO
 * @param {string} bucket - The bucket name (e.g., "uploads", "proofs")
 * @param {string} key - The file key/name
 */
export async function deleteFromMinio(bucket, key) {
  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    console.log(`Deleted file '${key}' from bucket '${bucket}'`);
    return true;
  } catch (error) {
    console.error(
      `Failed to delete file '${key}' from bucket '${bucket}':`,
      error
    );
    return false;
  }
}

/**
 * Schedule a file to be deleted after a certain time
 * @param {string} bucket - The bucket name
 * @param {string} key - The file key/name
 * @param {number} delayHours - Hours to wait before deletion (default: 1)
 */
export const scheduleFileDeletion = (bucket, key, delayHours) => {
  const delayMs = delayHours * 60 * 60 * 1000; // Convert hours to milliseconds

  console.log(
    `Scheduled deletion of '${key}' from bucket '${bucket}' in ${delayHours} hour(s)`
  );

  setTimeout(async () => {
    await deleteFromMinio(bucket, key);
  }, delayMs);
};
