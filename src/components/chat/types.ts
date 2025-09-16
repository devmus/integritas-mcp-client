export type ChatBlock =
  | { kind: "heading"; text: string } // frontend section header (red)
  | { kind: "toolInfo"; text: string } // frontend explanatory sentence (neutral)
  | { kind: "toolJson"; jsonText: string } // tool output payload (neutral monospace)
  | { kind: "text"; text: string; fromLLM?: boolean }; // general text; if fromLLM -> white

export interface ToolStep {
  name?: string;
  args?: Record<string, unknown>;
  result?: any;
  uid?: string;
  tx_id?: string;
}

export type UIMessage = {
  role: "user" | "assistant";
  content?: string; // user messages
  blocks?: ChatBlock[]; // assistant structured content
  proof?: object;
  isError?: boolean;
};
