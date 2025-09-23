// src\components\chat\Chat.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage, ChatBlock } from "./types";
import { MessageBubble } from "./MessageBubble";
import {
  buildBlocksFromApiResponse,
  fetchJsonOrPrettyError,
  useSessionToken,
} from "./helpers";
import { hashFileSha3_256 } from "@/lib/hashFile";

export function Chat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Modes: ask, stamp, verify (verify is proof-file only)
  const [mode, setMode] = useState<"ask" | "stamp" | "verify">("stamp");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionToken = useSessionToken();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleDownloadProof = (proof: object) => {
    const blob = new Blob([JSON.stringify(proof, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "proof.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  async function uploadFileToServer(
    f: File
  ): Promise<{ url: string; filename: string }> {
    const fd = new FormData();
    fd.append("file", f);
    const resp = await fetch("/mcp/api/upload", { method: "POST", body: fd });
    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
    const data = await resp.json();
    return {
      url: data.signedUrl as string, // server must return a fetchable URL for the MCP server
      filename: data.filename as string,
    };
  }

  async function sendAsk() {
    console.log("ASKING");
    const userText = input.trim() || "What can you do?";
    const next = [...messages, { role: "user" as const, content: userText }];
    setMessages(next);
    setInput("");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
    if (apiKey) headers["x-api-key"] = apiKey;

    const data = await fetchJsonOrPrettyError("/mcp/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: next.slice(-10) }),
    });
    const blocks: ChatBlock[] = buildBlocksFromApiResponse(data);
    setMessages((prev) => [...prev, { role: "assistant", blocks }]);
  }

  async function sendVerify() {
    console.log("VERIFYING");

    // Verify now requires a PROOF FILE (JSON) — upload, then call tool with file_url
    if (!file) throw new Error("Select a proof file (.json) first.");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
    if (apiKey) headers["x-api-key"] = apiKey;

    // 1) Upload proof to your backend to get a fetchable URL
    const { url, filename } = await uploadFileToServer(file);

    // 2) Visible user text
    const shownText = `${
      input ? input + " — " : ""
    }Verify this proof file: ${filename}`;

    // 3) Correct tool + arg shape expected by host/server
    const toolArgs = {
      verify_data: {
        req: { file_url: url, api_key: apiKey },
      },
    };

    const next = [...messages, { role: "user" as const, content: shownText }];
    setMessages(next);
    setInput("");
    setFile(null);

    const data = await fetchJsonOrPrettyError("/mcp/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: next.slice(-10), toolArgs }),
    });
    const blocks: ChatBlock[] = buildBlocksFromApiResponse(data);
    setMessages((prev) => [...prev, { role: "assistant", blocks }]);
  }

  ///////////////////////////////////////////////////////////////
  // OPTION A: HASH FILE HERE IN FRONTEND FOR STAMP
  const sendMessage = async () => {
    console.log("STAMPING");
    if (!file) return;

    setIsSending(true);
    try {
      const hash = await hashFileSha3_256(file);

      const toolArgs = {
        stamp_data: {
          req: { file_hash: hash, api_key: apiKey },
        },
      } as const;

      const shownText = `${input ? input + " — " : ""}Stamp this hash: ${hash}`;
      const next = [...messages, { role: "user" as const, content: shownText }];
      setMessages(next);
      setInput("");
      setFile(null);

      const apiUrl = "/mcp/api/chat";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
      if (apiKey) headers["x-api-key"] = apiKey;

      const data = await fetchJsonOrPrettyError(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: next.slice(-10), toolArgs }),
      });
      const blocks: ChatBlock[] = buildBlocksFromApiResponse(data);
      setMessages((prev) => [...prev, { role: "assistant", blocks }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: e?.message || "Unexpected error.",
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };
  // OPTION A END
  ////////////////////////////////////////////////////////////////

  const handleSend = async () => {
    setIsSending(true);
    try {
      if (mode === "ask") await sendAsk();
      else if (mode === "verify") await sendVerify();
      else await sendMessage();
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: e?.message || "Unexpected error.",
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {messages.map((m, i) => (
            <MessageBubble
              key={i}
              msg={m}
              onDownloadProof={handleDownloadProof}
            />
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
              placeholder="Enter your API Key..."
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
          <button
            onClick={() => setShowApiKeyInput((v) => !v)}
            className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none"
            title="Toggle API Key Input"
          >
            API Key
          </button>

          <div className="flex items-center gap-2 mb-2">
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
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isSending && handleSend()}
            placeholder={
              mode === "ask"
                ? "Ask about Integritas or the server…"
                : mode === "verify"
                ? "Optionally add a note…"
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
