"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage, ChatBlock } from "./types";
import { MessageBubble } from "./MessageBubble";
import { buildBlocksFromApiResponse, useSessionToken } from "./helpers";
import { hashFileSha3_256 } from "@/lib/hashFile";

export function Chat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

  const [mode, setMode] = useState<"ask" | "stamp" | "verify">("stamp");
  const [verifyMode, setVerifyMode] = useState<"hash" | "proof">("hash");
  const [verifyHash, setVerifyHash] = useState("");

  function isHex64(s: string) {
    return /^[a-f0-9]{64}$/i.test(s.trim());
  }

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

  // async function uploadFileToServer(
  //   f: File
  // ): Promise<{ url: string; filename: string }> {
  //   const fd = new FormData();
  //   fd.append("file", f);
  //   const resp = await fetch("/mcp/api/upload", { method: "POST", body: fd });
  //   if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
  //   const data = await resp.json();
  //   return { url: data.signedUrl as string, filename: data.filename as string };
  // }

  async function sendAsk() {
    if (!input.trim()) setInput("What can you do?");
    const userText = input.trim() || "What can you do?";

    const next = [...messages, { role: "user" as const, content: userText }];
    setMessages(next);
    setInput("");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
    if (apiKey) headers["x-api-key"] = apiKey;

    const resp = await fetch("/mcp/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({ messages: next.slice(-10) }),
    });
    if (!resp.ok)
      throw new Error(`API Error: ${resp.status} - ${await resp.text()}`);
    const data = await resp.json();
    const blocks: ChatBlock[] = buildBlocksFromApiResponse(data);
    setMessages((prev) => [...prev, { role: "assistant", blocks }]);
  }

  async function sendVerify() {
    // Two flavors: hash or proof file
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
    if (apiKey) headers["x-api-key"] = apiKey;

    // Build the visible user text and optional toolArgs hints
    let shownText = "";
    let toolArgs: any = undefined;

    if (verifyMode === "hash") {
      if (!isHex64(verifyHash))
        throw new Error("Enter a 64-char hex hash to verify.");
      shownText = `${
        input ? input + " — " : ""
      }Verify this hash: ${verifyHash.toLowerCase()}`;

      // Optional hint to the host; it will force-add a verify tool if you applied the host patch
      toolArgs = { verify: { req: { hash: verifyHash.toLowerCase() } } };
    } else {
      if (!file) throw new Error("Select a proof file first.");
      // If you have an upload endpoint, use it; otherwise just send a natural language ask.
      // Example with an upload (uncomment if your /mcp/api/upload is wired):
      // const { url } = await uploadFileToServer(file);
      // shownText = `${input ? input + " — " : ""}Verify this proof file: ${file.name}`;
      // toolArgs = { resolve_proof: { req: { proof_url: url } } };

      // Fallback with no upload endpoint — let the LLM handle instructions
      shownText = `${
        input ? input + " — " : ""
      }Verify this proof file (I have selected it): ${file.name}`;
    }

    const next = [...messages, { role: "user" as const, content: shownText }];
    setMessages(next);
    setInput("");
    setFile(null);
    setVerifyHash("");

    const resp = await fetch("/mcp/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        messages: next.slice(-10),
        ...(toolArgs ? { toolArgs } : {}),
      }),
    });
    if (!resp.ok)
      throw new Error(`API Error: ${resp.status} - ${await resp.text()}`);
    const data = await resp.json();
    const blocks: ChatBlock[] = buildBlocksFromApiResponse(data);
    setMessages((prev) => [...prev, { role: "assistant", blocks }]);
  }

  ///////////////////////////////////////////////////////////////
  // OPTION A: HASH FILE HERE IN FROTNEND OR THIS PROJECTS BACKEND
  const sendMessage = async () => {
    // allow empty text if you want; keep the file requirement
    if (!file) return;

    setIsSending(true);
    try {
      // 1) Hash the selected file (from state)
      const hash = await hashFileSha3_256(file);

      // 2) Build tool args
      const toolArgs = {
        stamp_data: {
          req: { file_hash: hash },
        },
      } as const;

      // 3) What the user sees in the chat
      const shownText = `${input ? input + " — " : ""}Stamp this hash: ${hash}`;

      const next = [...messages, { role: "user" as const, content: shownText }];
      setMessages(next);
      setInput("");
      setFile(null);

      // 4) Call your chat API
      const apiUrl = "/mcp/api/chat";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
      if (apiKey) headers["x-api-key"] = apiKey;

      const resp = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: next.slice(-10),
          toolArgs,
        }),
      });

      if (!resp.ok) {
        throw new Error(`API Error: ${resp.status} - ${await resp.text()}`);
      }

      const data = await resp.json();
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
  //OPTION A END
  ////////////////////////////////////////////////////////////////

  ///////////////////////////////////////////////////////////////
  // OPTION B: UPLOAD FILE AND LET CORE API HASH IT
  // const sendMessage = async () => {
  //   if (!input.trim() || !file) return;

  //   setIsSending(true);
  //   try {
  //     const { url, filename } = await uploadFileToServer(file);

  //     // show only filename to the user
  //     const shownText = `${
  //       input ? input + " — " : ""
  //     }Stamp this file: ${filename}`;

  //     // IMPORTANT: wrap under req
  //     const toolArgs = {
  //       stamp_data: {
  //         req: { file_url: url },
  //       },
  //     };

  //     const next = [...messages, { role: "user" as const, content: shownText }];
  //     setMessages(next);
  //     setInput("");
  //     setFile(null);

  //     const apiUrl = "/mcp/api/chat";
  //     const headers: HeadersInit = { "Content-Type": "application/json" };
  //     if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
  //     if (apiKey) headers["x-api-key"] = apiKey;

  //     const resp = await fetch(apiUrl, {
  //       method: "POST",
  //       headers,
  //       body: JSON.stringify({
  //         messages: next.slice(-10),
  //         toolArgs, // <— new
  //       }),
  //     });

  //     if (!resp.ok)
  //       throw new Error(`API Error: ${resp.status} - ${await resp.text()}`);
  //     const data = await resp.json();
  //     const blocks: ChatBlock[] = buildBlocksFromApiResponse(data);
  //     setMessages((prev) => [...prev, { role: "assistant", blocks }]);
  //   } catch (e: any) {
  //     setMessages((prev) => [
  //       ...prev,
  //       {
  //         role: "assistant",
  //         content: e?.message || "Unexpected error.",
  //         isError: true,
  //       },
  //     ]);
  //   } finally {
  //     setIsSending(false);
  //   }
  // };
  //OPTION B END
  ////////////////////////////////////////////////////////////////

  const handleSend = async () => {
    setIsSending(true);
    try {
      if (mode === "ask") await sendAsk();
      else if (mode === "verify") await sendVerify();
      else await sendMessage(); // your existing Stamp Option A
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
            {/* icon omitted for brevity */}
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

            {mode === "verify" && (
              <div className="inline-flex rounded-lg overflow-hidden border ml-2">
                <button
                  className={`px-3 py-2 ${
                    verifyMode === "hash"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}
                  onClick={() => setVerifyMode("hash")}
                >
                  By hash
                </button>
                <button
                  className={`px-3 py-2 ${
                    verifyMode === "proof"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 dark:bg-gray-700"
                  }`}
                  onClick={() => setVerifyMode("proof")}
                >
                  Proof file
                </button>
              </div>
            )}
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isSending && handleSend()}
            placeholder={
              mode === "ask"
                ? "Ask about Integritas or the server…"
                : mode === "verify" && verifyMode === "hash"
                ? "Paste a 64-char hex hash to verify…"
                : "Optionally add a note…"
            }
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />

          {mode === "verify" && verifyMode === "hash" && (
            <input
              type="text"
              value={verifyHash}
              onChange={(e) => setVerifyHash(e.target.value)}
              placeholder="Hash to verify (64 hex)"
              className="w-72 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ml-2"
            />
          )}

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
