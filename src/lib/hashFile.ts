// hashFileSha3.ts
import { sha3_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export async function hashFileSha3_256(file: File): Promise<string> {
  // Try streaming first (best for large files)
  if (file.stream && typeof file.stream === "function") {
    const reader = file.stream().getReader();
    const h = sha3_256.create();
    try {
      // Read chunks from the stream
      // Chunk size is controlled by the browser; we just read what we get
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) h.update(value); // value is a Uint8Array chunk
      }
      return bytesToHex(h.digest()); // lowercase hex
    } finally {
      reader.releaseLock?.();
    }
  }

  // Fallback: whole-file (uses RAM ~ file size)
  const buf = new Uint8Array(await file.arrayBuffer());
  const digest = sha3_256(buf);
  return bytesToHex(digest);
}
