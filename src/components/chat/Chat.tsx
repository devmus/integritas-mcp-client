// "use client";

// import { useEffect, useRef, useState } from "react";
// import type { UIMessage, ToolStep, ChatBlock } from "./types";
// import { MessageBubble } from "./MessageBubble";
// import { buildBlocksFromApiResponse, useSessionToken } from "./helpers";

// export function Chat() {
//   const [messages, setMessages] = useState<UIMessage[]>([]);
//   const [input, setInput] = useState("");
//   const [apiKey, setApiKey] = useState("");
//   const [showApiKeyInput, setShowApiKeyInput] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);
//   const sessionToken = useSessionToken();

//   useEffect(() => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   }, [messages]);

//   const handleDownloadProof = (proof: object) => {
//     const blob = new Blob([JSON.stringify(proof, null, 2)], {
//       type: "application/json",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "proof.json";
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   const sendMessage = async () => {
//     if (!input.trim()) return;

//     const next = [...messages, { role: "user" as const, content: input }];
//     setMessages(next);
//     setInput("");

//     const messagesToSend = next.slice(-10);

//     try {
//       const apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || "/api/chat";

//       const headers: HeadersInit = {
//         "Content-Type": "application/json",
//       };
//       if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
//       if (apiKey) headers["x-api-key"] = apiKey;

//       const resp = await fetch(apiUrl, {
//         method: "POST",
//         headers,
//         body: JSON.stringify({ messages: messagesToSend }),
//       });

//       if (!resp.ok) {
//         const errorText = await resp.text();
//         throw new Error(`API Error: ${resp.status} - ${errorText}`);
//       }

//       const data = await resp.json();
//       const blocks: ChatBlock[] = buildBlocksFromApiResponse(data);

//       setMessages((prev) => [...prev, { role: "assistant", blocks }]);
//     } catch (err: unknown) {
//       const msg = err instanceof Error ? err.message : "Unexpected error.";
//       setMessages((prev) => [
//         ...prev,
//         { role: "assistant", content: msg, isError: true },
//       ]);
//     }
//   };

//   return (
//     <div className="flex flex-col h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
//       <div className="flex-1 overflow-y-auto p-6">
//         <div className="space-y-4">
//           {messages.map((m, i) => (
//             <MessageBubble
//               key={i}
//               msg={m}
//               onDownloadProof={handleDownloadProof}
//             />
//           ))}
//           <div ref={messagesEndRef} />
//         </div>
//       </div>

//       <div className="border-t p-4">
//         {showApiKeyInput && (
//           <div className="mb-2">
//             <input
//               type="password"
//               value={apiKey}
//               onChange={(e) => setApiKey(e.target.value)}
//               placeholder="Enter your API Key..."
//               className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
//             />
//           </div>
//         )}

//         <div className="flex items-center space-x-2">
//           <button
//             onClick={() => setShowApiKeyInput((v) => !v)}
//             className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none"
//             title="Toggle API Key Input"
//           >
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="h-6 w-6"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M15 7h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-6 0H7a2 2 0 01-2-2V9a2 2 0 012-2h2m0-4h2a2 2 0 012 2v2H9V7a2 2 0 012-2zm0 8a2 2 0 11-4 0 2 2 0 014 0z"
//               />
//             </svg>
//           </button>

//           <input
//             type="text"
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyDown={(e) => e.key === "Enter" && sendMessage()}
//             placeholder="Type your message..."
//             className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
//           />

//           <button
//             onClick={sendMessage}
//             className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             Send
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Chat;

"use client";

import { useEffect, useRef, useState } from "react";
import type { UIMessage, ChatBlock } from "./types";
import { MessageBubble } from "./MessageBubble";
import { buildBlocksFromApiResponse, useSessionToken } from "./helpers";

export function Chat() {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);

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

  // async function uploadFileToServer(f: File): Promise<string> {
  //   const fd = new FormData();
  //   fd.append("file", f);
  //   const resp = await fetch("/api/upload", { method: "POST", body: fd });
  //   if (!resp.ok) {
  //     const err = await resp.text();
  //     throw new Error(`Upload failed: ${resp.status} ${err}`);
  //   }
  //   const { path } = (await resp.json()) as { path: string };
  //   return path; // absolute server-side path that MCP can read
  // }

  async function uploadFileToServer(
    f: File
  ): Promise<{ url: string; filename: string }> {
    const fd = new FormData();
    fd.append("file", f);
    const resp = await fetch("/api/upload", { method: "POST", body: fd });
    if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
    const data = await resp.json();
    return { url: data.signedUrl as string, filename: data.filename as string };
  }

  const sendMessage = async () => {
    if (!input.trim() || !file) return;

    setIsSending(true);
    try {
      const { url, filename } = await uploadFileToServer(file);

      // show only filename to the user
      const shownText = `${
        input ? input + " — " : ""
      }Stamp this file: ${filename}`;

      // IMPORTANT: wrap under req
      const toolArgs = {
        stamp_data: {
          req: { file_url: url },
        },
      };

      const next = [...messages, { role: "user" as const, content: shownText }];
      setMessages(next);
      setInput("");
      setFile(null);

      const apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || "/api/chat";
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (sessionToken) headers["Authorization"] = `Bearer ${sessionToken}`;
      if (apiKey) headers["x-api-key"] = apiKey;

      const resp = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({
          messages: next.slice(-10),
          toolArgs, // <— new
        }),
      });

      if (!resp.ok)
        throw new Error(`API Error: ${resp.status} - ${await resp.text()}`);
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

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isSending && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />

          <button
            onClick={sendMessage}
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
