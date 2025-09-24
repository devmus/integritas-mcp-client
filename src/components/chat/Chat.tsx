// src/components/chat/Chat.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage, ChatBlock } from "./types";
import { MessageBubble } from "./MessageBubble";
import {
  buildBlocksFromApiResponse,
  fetchJsonOrPrettyError,
  useSessionToken,
  extractLinksFromHostOrSteps, // <-- add import
} from "./helpers";
import { hashFileSha3_256 } from "@/lib/hashFile";

type LLMProvider = "anthropic" | "openai" | "openrouter" | "mock";
type LLMChoice = { provider: LLMProvider; model?: string };

const PROVIDERS: { label: string; value: LLMProvider }[] = [
  { label: "OpenAI", value: "openai" },
  { label: "Anthropic", value: "anthropic" },
  { label: "OpenRouter", value: "openrouter" },
  { label: "Mock", value: "mock" },
];

// Mirror server allowlist
const MODELS: Record<LLMProvider, { label: string; value: string }[]> = {
  openai: [
    { label: "gpt-4o-mini", value: "gpt-4o-mini" },
    { label: "gpt-4.1-mini", value: "gpt-4.1-mini" },
  ],
  anthropic: [
    {
      label: "claude-3-5-sonnet-20240620",
      value: "claude-3-5-sonnet-20240620",
    },
    { label: "claude-3-5-haiku-20241022", value: "claude-3-5-haiku-20241022" },
  ],
  openrouter: [
    {
      label: "deepseek/deepseek-chat-v3.1 (free)",
      value: "deepseek/deepseek-chat-v3.1:free",
    },
    { label: "gemma-2-9b-it (free)", value: "google/gemma-2-9b-it:free" },
    { label: "gpt-4o-mini (OR)", value: "openai/gpt-4o-mini" },
  ],
  mock: [{ label: "mock", value: "mock" }],
};

export function Chat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [llm, setLlm] = useState<LLMChoice>({
    provider: "openrouter",
    model: MODELS.openrouter[0].value,
  });
  const [mode, setMode] = useState<"ask" | "stamp" | "verify">("stamp");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionToken = useSessionToken();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------- helpers ----------

  function toHostMessages(ui: UIMessage[], lastUserText?: string) {
    const hostMsgs = ui.map((m) => ({
      role: m.role,
      content: typeof m.text === "string" ? m.text : "", // host expects `content`
    }));
    if (lastUserText) hostMsgs.push({ role: "user", content: lastUserText });
    return hostMsgs.slice(-10);
  }

  function makeHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
    if (apiKey) headers["x-api-key"] = apiKey;
    return headers;
  }

  async function callHostChat(body: unknown) {
    return fetchJsonOrPrettyError("/mcp/api/chat", {
      method: "POST",
      headers: makeHeaders(),
      body: JSON.stringify(body),
    });
  }

  function pushUser(text: string) {
    setMessages((prev) => [...prev, { role: "user", text }]);
  }

  function pushAssistantFromHost(data: any) {
    const blocks: ChatBlock[] = buildBlocksFromApiResponse(data);
    const links = extractLinksFromHostOrSteps(data); // <-- NEW

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        text: typeof data.finalText === "string" ? data.finalText : "",
        links, // <-- clickable buttons under the bubble
        // blocks,
      },
    ]);
  }

  function pushAssistantError(message: string) {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: `⚠️ ${message}` },
    ]);
  }

  async function uploadFileToServer(
    f: File
  ): Promise<{ url: string; filename: string }> {
    const fd = new FormData();
    fd.append("file", f);
    const resp = await fetch("/mcp/api/upload", { method: "POST", body: fd });
    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
    const data = await resp.json();
    return { url: data.signedUrl as string, filename: data.filename as string };
  }

  // ---------- flows ----------

  async function sendAsk() {
    const userText = input.trim() || "What can you do?";
    pushUser(userText);
    setInput("");

    const body = { messages: toHostMessages(messages, userText), llm };
    const data = await callHostChat(body);
    pushAssistantFromHost(data);
  }

  async function sendVerify() {
    if (!file) throw new Error("Select a proof file (.json) first.");
    const { url, filename } = await uploadFileToServer(file);

    const userText = `${
      input ? input + " — " : ""
    }Verify this proof file: ${filename}`;
    pushUser(userText);
    setInput("");
    setFile(null);

    const toolArgs = {
      verify_data: { req: { file_url: url, api_key: apiKey } },
    };
    const body = {
      messages: toHostMessages(messages, userText),
      toolArgs,
      llm,
    };

    const data = await callHostChat(body);
    pushAssistantFromHost(data);
  }

  async function sendStamp() {
    if (!file) throw new Error("Choose a file to stamp first.");
    const hash = await hashFileSha3_256(file);

    const userText = `${input ? input + " — " : ""}Stamp this hash: ${hash}`;
    pushUser(userText);
    setInput("");
    setFile(null);

    const toolArgs = {
      stamp_data: { req: { file_hash: hash, api_key: apiKey } },
    } as const;
    const body = {
      messages: toHostMessages(messages, userText),
      toolArgs,
      llm,
    };

    const data = await callHostChat(body);
    pushAssistantFromHost(data);
  }

  async function handleSend() {
    setIsSending(true);
    try {
      if (mode === "ask") await sendAsk();
      else if (mode === "verify") await sendVerify();
      else await sendStamp();
    } catch (e: any) {
      pushAssistantError(e?.message || "Unexpected error.");
    } finally {
      setIsSending(false);
    }
  }

  // ---------- UI ----------

  return (
    <div className="flex flex-col h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      {/* LLM selector */}
      <div className="flex items-center gap-2 p-4">
        <select
          value={llm.provider}
          onChange={(e) => {
            const provider = e.target.value as LLMProvider;
            const firstModel = MODELS[provider][0]?.value;
            setLlm({ provider, model: firstModel });
          }}
          className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
          title="Choose LLM provider"
        >
          {PROVIDERS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>

        <select
          value={llm.model}
          onChange={(e) =>
            setLlm((prev) => ({ ...prev, model: e.target.value }))
          }
          className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
          title="Choose model"
          disabled={!llm.provider}
        >
          {(MODELS[llm.provider] ?? []).map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowApiKeyInput((v) => !v)}
          className="ml-auto p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500"
          title="Toggle API Key Input"
        >
          API Key
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t p-4">
        {showApiKeyInput && (
          <div className="mb-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API Key…"
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        )}

        <div className="flex items-center gap-2 mb-2">
          <label className="px-3 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 cursor-pointer">
            <input
              type="file"
              className="hidden"
              accept={mode === "verify" ? "application/json,.json" : undefined}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? `Selected: ${file.name}` : "Choose file"}
          </label>
          {file && (
            <button
              onClick={() => setFile(null)}
              className="px-2 py-2 text-sm bg-gray-200 dark:bg-gray-600 rounded-lg"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-lg overflow-hidden border">
            <button
              className={`px-3 py-2 ${
                mode === "ask"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700"
              }`}
              onClick={() => setMode("ask")}
            >
              Ask
            </button>
            <button
              className={`px-3 py-2 ${
                mode === "stamp"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700"
              }`}
              onClick={() => setMode("stamp")}
            >
              Stamp
            </button>
            <button
              className={`px-3 py-2 ${
                mode === "verify"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 dark:bg-gray-700"
              }`}
              onClick={() => setMode("verify")}
            >
              Verify
            </button>
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isSending && handleSend()}
            placeholder={
              mode === "ask"
                ? "Ask about Integritas or the server…"
                : "Optionally add a note…"
            }
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />

          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60"
          >
            {isSending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;
