// src\app\api\upload\route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { uploadToMinio } from "@/lib/minio/uploadToMinio.mjs";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeName = file.name.replace(/[^\w.\-]/g, "_");
    const key = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { signedUrl, key: objectKey } = await uploadToMinio({
      buffer,
      key,
      contentType: file.type || "application/octet-stream",
      bucket: "aiuploads",
    });

    console.log("signedUrl", signedUrl);

    // Return presigned GET and the object key
    return NextResponse.json({
      key: objectKey,
      signedUrl,
      filename: safeName,
      contentType: file.type || "application/octet-stream",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
