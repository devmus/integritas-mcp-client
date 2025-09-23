import dotenv from "dotenv";
dotenv.config();

export const NODE_ENV = process.env.NODE_ENV;
export const MINIO_URL = process.env.MINIO_URL;

export const MINIO_USER = process.env.MINIO_USER;
export const MINIO_PASS = process.env.MINIO_PASS;
export const MINIO_PUBLIC_URL = process.env.MINIO_PUBLIC_URL;
