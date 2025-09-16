import type { ToolStep, ChatBlock } from "./types";

export function tryParseJSON<T = any>(s?: string): T | undefined {
  if (!s) return;
  try {
    return JSON.parse(s);
  } catch {
    return;
  }
}

const TOOL_LABELS: Record<string, string> = {
  stamp_hash: "Stamp Hash",
  validate_hash: "Validate Hash",
  get_stamp_status: "Check Stamp Status",
  resolve_proof: "Resolve Proof",
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

/** Extract pretty JSON from an MCP tool step result */
export function extractToolJson(step: ToolStep): string {
  const text = step?.result?.content?.[0]?.text;
  if (typeof text === "string" && text.trim().startsWith("{")) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      // fall through
    }
  }
  try {
    return JSON.stringify(step.result ?? {}, null, 2);
  } catch {
    return String(step.result ?? "");
  }
}

/** Build UI blocks from the server response */
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

  blocks.push({ kind: "heading", text: "Final response" });
  blocks.push({
    kind: "text",
    text: String(data.finalText ?? ""),
    fromLLM: true,
  });

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
