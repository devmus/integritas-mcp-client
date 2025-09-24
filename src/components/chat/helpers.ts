// src/components/chat/helpers.ts
import type { ToolStep, ChatBlock } from "./types";

export type ChatLink = { rel?: string; href: string; label?: string };

export function tryParseJSON<T = any>(s?: string): T | undefined {
  if (!s) return;
  try {
    return JSON.parse(s);
  } catch {
    return;
  }
}

const TOOL_LABELS: Record<string, string> = {
  stamp_data: "Stamp Data",
  verify_data: "Verify Data",
  health: "Health Check",
  ready: "Readiness Check",
};

export function humanizeToolName(name?: string) {
  if (!name) return "Tool";
  return (
    TOOL_LABELS[name] ||
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

// envelope-first: prefer result.structuredContent, fall back to result
export function extractToolJson(step: ToolStep): string {
  const r: any = step?.result ?? {};
  const env = r?.structuredContent ?? r;

  try {
    return JSON.stringify(env, null, 2);
  } catch {
    try {
      return JSON.stringify(r, null, 2);
    } catch {
      return String(r ?? "");
    }
  }
}
/**
 * Extract clickable links from the host response.
 * Priority:
 *   1) step.result.structuredContent.links[]
 *   2) stamp:  structuredContent.data.proof_url
 *      verify: structuredContent.data.verification_url
 *   3) nested raw payloads:
 *        - stamp:  data.raw.data.proofFile.download_url
 *        - verify: data.raw.data.file.download_url
 *   4) JSON-encoded envelope inside result.content[0].text (fallback)
 */
export function extractLinksFromHostOrSteps(data: any): ChatLink[] {
  const out: ChatLink[] = [];

  // helper: add if href is a string
  const push = (href?: any, label?: string, rel?: string) => {
    if (typeof href === "string" && href) {
      out.push({ href, label, rel });
    }
  };

  const steps: ToolStep[] = Array.isArray(data?.tool_steps)
    ? data.tool_steps
    : [];

  for (const step of steps) {
    const name = (step as any)?.name as string | undefined;
    const r: any = step?.result ?? {};
    const sc: any = r?.structuredContent;

    // (1) envelope links first
    const links = sc?.links;
    if (Array.isArray(links)) {
      for (const l of links) {
        push(l?.href, l?.label, l?.rel);
      }
    }

    // (2) direct data URLs inside the envelope
    const d = sc?.data || {};
    if (name === "stamp_data") {
      push(d?.proof_url, "Download proof", "proof");
    } else if (name === "verify_data") {
      push(d?.verification_url, "View verification", "verification");
    }

    // (3) nested raw payloads
    const raw = d?.raw?.data || {};
    if (name === "stamp_data") {
      push(raw?.proofFile?.download_url, "Download proof", "proof");
    } else if (name === "verify_data") {
      push(raw?.file?.download_url, "View verification", "verification");
    }

    // (4) fallback: JSON string in content[0].text
    const text = r?.content?.[0]?.text;
    if (typeof text === "string" && text.trim().startsWith("{")) {
      try {
        const parsed = JSON.parse(text);
        const psc = parsed?.structuredContent;
        const pData = psc?.data || {};
        const pLinks = psc?.links;

        if (Array.isArray(pLinks)) {
          for (const l of pLinks) push(l?.href, l?.label, l?.rel);
        }
        if (name === "stamp_data") {
          push(pData?.proof_url, "Download proof", "proof");
          push(
            pData?.raw?.data?.proofFile?.download_url,
            "Download proof",
            "proof"
          );
        } else if (name === "verify_data") {
          push(pData?.verification_url, "View verification", "verification");
          push(
            pData?.raw?.data?.file?.download_url,
            "View verification",
            "verification"
          );
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  // also include top-level links if host provided them
  const top = Array.isArray(data?.links) ? data.links : [];
  for (const l of top) push(l?.href, l?.label, l?.rel);

  // de-dupe by href (keep first label)
  const uniq = new Map<string, ChatLink>();
  for (const l of out) {
    if (!uniq.has(l.href)) uniq.set(l.href, l);
  }
  return Array.from(uniq.values());
}

/**
 * Build UI blocks (tool info + JSON). Do NOT add a final text block here.
 */
export function buildBlocksFromApiResponse(data: any): ChatBlock[] {
  const blocks: ChatBlock[] = [];

  if (Array.isArray(data.tool_steps) && data.tool_steps.length > 0) {
    for (const step of data.tool_steps as ToolStep[]) {
      const label = humanizeToolName(step.name);
      const jsonText = extractToolJson(step);

      blocks.push({ kind: "heading", text: "Tool" });
      blocks.push({
        kind: "toolInfo",
        text: `I used a tool called ${label} via the Integritas API.`,
      });
      blocks.push({ kind: "toolJson", jsonText });
    }
  }

  return blocks;
}

/** Small hook: persist & read a session token */
export function useSessionToken(): string | null {
  const key = "sessionToken";
  let tok = typeof window !== "undefined" ? localStorage.getItem(key) : null;
  if (!tok && typeof window !== "undefined") {
    tok = Math.random().toString(36).slice(2);
    localStorage.setItem(key, tok);
  }
  return tok;
}

export async function fetchJsonOrPrettyError(url: string, init?: RequestInit) {
  const resp = await fetch(url, init);
  if (resp.ok) return resp.json();

  const status = resp.status;
  let body = "";
  try {
    body = await resp.text();
  } catch {}

  // strip HTML + clamp
  const short = body
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  const label =
    status === 504
      ? "Request timed out"
      : status === 502
      ? "Bad gateway"
      : status === 503
      ? "Service unavailable"
      : "API error";

  throw new Error(
    `${label} (HTTP ${status}).${short ? ` Details: ${short}` : ""}`
  );
}
