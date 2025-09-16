"use client";

import type { UIMessage } from "./types";
import { Blocks } from "./Blocks";

export function MessageBubble({
  msg,
  onDownloadProof,
}: {
  msg: UIMessage;
  onDownloadProof: (proof: object) => void;
}) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      {isUser ? (
        <div className="px-4 py-2 rounded-lg bg-blue-500 text-white">
          <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
        </div>
      ) : msg.blocks ? (
        <Blocks blocks={msg.blocks} />
      ) : (
        <div
          className={`px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 ${
            msg.isError ? "text-red-500" : ""
          }`}
        >
          <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
        </div>
      )}

      {msg.proof && (
        <button
          onClick={() => onDownloadProof(msg.proof!)}
          className="mt-2 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
        >
          Download Proof
        </button>
      )}
    </div>
  );
}
