// "use client";

// import { useState, useEffect, useRef } from "react";

// type ChatBlock =
//   | { kind: "heading"; text: string } // frontend section header (red)
//   | { kind: "toolInfo"; text: string } // frontend explanatory sentence (neutral)
//   | { kind: "toolJson"; jsonText: string } // tool output payload (neutral monospace)
//   | { kind: "text"; text: string; fromLLM?: boolean }; // general text; if fromLLM -> white

// interface ToolStep {
//   name?: string;
//   args?: Record<string, unknown>;
//   result?: any;
//   uid?: string;
//   tx_id?: string;
// }

// // upgrade your messages state to optionally hold blocks
// type UIMessage = {
//   role: "user" | "assistant";
//   content?: string; // keep for user messages
//   blocks?: ChatBlock[]; // assistant structured content
//   proof?: object;
//   isError?: boolean;
// };

// function tryParseJSON<T = any>(s?: string): T | undefined {
//   if (!s) return;
//   try {
//     return JSON.parse(s);
//   } catch {
//     return;
//   }
// }

// const TOOL_LABELS: Record<string, string> = {
//   stamp_hash: "Stamp Hash",
//   validate_hash: "Validate Hash",
//   get_stamp_status: "Check Stamp Status",
//   resolve_proof: "Resolve Proof",
//   health: "Health Check",
//   ready: "Readiness Check",
// };

// function humanizeToolName(name?: string) {
//   if (!name) return "Tool";
//   return (
//     TOOL_LABELS[name] ||
//     name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
//   );
// }

// // pull out JSON string from MCP tool result
// function extractToolJson(step: ToolStep): string {
//   const text = step?.result?.content?.[0]?.text;
//   if (typeof text === "string" && text.trim().startsWith("{")) {
//     try {
//       return JSON.stringify(JSON.parse(text), null, 2);
//     } catch {
//       // fall through
//     }
//   }
//   try {
//     return JSON.stringify(step.result ?? {}, null, 2);
//   } catch {
//     return String(step.result ?? "");
//   }
// }

// /** Get a pretty JSON string for a step's result.
//  *  Prefer result.content[0].text (often a JSON string), else stringify whole result. */
// function prettyStepResult(step: ToolStep): string {
//   const text = step?.result?.content?.find?.(
//     (c: any) => c?.type === "text"
//   )?.text;
//   // If text is JSON, pretty print; else use text; else pretty-print whole result
//   const parsed = tryParseJSON(text);
//   if (parsed) return JSON.stringify(parsed, null, 2);
//   if (typeof text === "string" && text.trim()) return text;
//   return JSON.stringify(step?.result ?? {}, null, 2);
// }

// export function Chat() {
//   const [messages, setMessages] = useState<UIMessage[]>([]);
//   const [input, setInput] = useState("");
//   const [sessionToken, setSessionToken] = useState<string | null>(null);
//   const [apiKey, setApiKey] = useState("");
//   const [showApiKeyInput, setShowApiKeyInput] = useState(false);
//   const messagesEndRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const token = localStorage.getItem("sessionToken");
//     if (token) {
//       setSessionToken(token);
//     } else {
//       const newToken = Math.random().toString(36).substring(2);
//       localStorage.setItem("sessionToken", newToken);
//       setSessionToken(newToken);
//     }
//   }, []);

//   const scrollToBottom = () => {
//     messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//   };

//   useEffect(() => {
//     scrollToBottom();
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

//     const newMessages = [
//       ...messages,
//       { role: "user" as const, content: input },
//     ];
//     setMessages(newMessages);
//     setInput("");

//     // Take the last 10 messages to send to the API
//     const messagesToSend = newMessages.slice(-10);

//     try {
//       const apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || "/api/chat";

//       const headers: HeadersInit = {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${sessionToken}`,
//       };

//       if (apiKey) {
//         headers["x-api-key"] = apiKey;
//       }

//       const response = await fetch(apiUrl, {
//         method: "POST",
//         headers: headers,
//         body: JSON.stringify({ messages: messagesToSend }),
//       });

//       if (!response.ok) {
//         const errorText = await response.text();
//         throw new Error(`API Error: ${response.status} - ${errorText}`);
//       }

//       const data = await response.json();

//       // build UI blocks
//       const blocks: ChatBlock[] = [];

//       if (Array.isArray(data.tool_steps) && data.tool_steps.length > 0) {
//         for (const step of data.tool_steps as ToolStep[]) {
//           const label = humanizeToolName(step.name);
//           const jsonText = extractToolJson(step);

//           // frontend section heading (red)
//           blocks.push({ kind: "heading", text: "Tool" });

//           // frontend explanatory sentence (neutral)
//           blocks.push({
//             kind: "toolInfo",
//             text: `I used a tool called ${label} via the Integritas API.`,
//           });

//           // raw tool payload (neutral monospace)
//           blocks.push({ kind: "toolJson", jsonText });
//         }
//       }

//       // final response heading (red)
//       blocks.push({ kind: "heading", text: "Final response" });

//       // LLM-generated text (white)
//       blocks.push({
//         kind: "text",
//         text: String(data.finalText ?? ""),
//         fromLLM: true,
//       });

//       setMessages((prev) => [...prev, { role: "assistant", blocks }]);
//     } catch (error: unknown) {
//       let errorMessage = "An unexpected error occurred.";
//       if (error instanceof Error) {
//         errorMessage = error.message;
//       }
//       setMessages((prev) => [
//         ...prev,
//         { role: "assistant", content: errorMessage, isError: true },
//       ]);
//     }
//   };

//   return (
//     <div className="flex flex-col h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
//       <div className="flex-1 overflow-y-auto p-6">
//         <div className="space-y-4">
//           {messages.map((msg, i) => (
//             <div
//               key={i}
//               className={`flex flex-col ${
//                 msg.role === "user" ? "items-end" : "items-start"
//               }`}
//             >
//               {msg.role === "user" ? (
//                 <div className="px-4 py-2 rounded-lg bg-blue-500 text-white">
//                   <pre className="whitespace-pre-wrap font-sans">
//                     {msg.content}
//                   </pre>
//                 </div>
//               ) : msg.blocks ? (
//                 <div className="w-full max-w-[780px] space-y-2">
//                   {msg.blocks.map((b, idx) => {
//                     switch (b.kind) {
//                       case "heading":
//                         return (
//                           <div
//                             key={idx}
//                             className="uppercase tracking-wide text-red-600 dark:text-red-400 font-semibold mt-3"
//                           >
//                             {b.text}
//                           </div>
//                         );
//                       case "toolInfo":
//                         return (
//                           <div
//                             key={idx}
//                             className="text-gray-800 dark:text-gray-200"
//                           >
//                             {b.text}
//                           </div>
//                         );
//                       case "toolJson":
//                         return (
//                           <pre
//                             key={idx}
//                             className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded-lg overflow-auto text-sm"
//                           >
//                             {b.jsonText}
//                           </pre>
//                         );
//                       case "text":
//                         return (
//                           <div
//                             key={idx}
//                             className={
//                               b.fromLLM
//                                 ? "text-white"
//                                 : "text-gray-800 dark:text-gray-200"
//                             }
//                           >
//                             {b.text}
//                           </div>
//                         );
//                       default:
//                         return null;
//                     }
//                   })}
//                 </div>
//               ) : (
//                 // fallback for legacy assistant messages with plain content
//                 <div
//                   className={`px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 ${
//                     msg.isError ? "text-red-500" : ""
//                   }`}
//                 >
//                   <pre className="whitespace-pre-wrap font-sans">
//                     {msg.content}
//                   </pre>
//                 </div>
//               )}
//             </div>
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
//             onClick={() => setShowApiKeyInput(!showApiKeyInput)}
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
//             onKeyPress={(e) => e.key === "Enter" && sendMessage()}
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
