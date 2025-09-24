// src/components/chat/MessageBubble.tsx
"use client";

import type { UIMessage, ChatLink } from "./types";
import { Blocks } from "./Blocks";

/**
 * Renders one chat message. Envelope-first:
 * - msg.text: human-readable summary (from server/host)
 * - msg.links: rendered as buttons
 * - msg.blocks: tool traces/JSON/etc (no duplication of msg.text)
 */
export function MessageBubble({ msg }: { msg: UIMessage }) {
  const isUser = msg.role === "user";
  const text = typeof msg.text === "string" ? msg.text : "";
  const links: ChatLink[] = Array.isArray(msg.links) ? msg.links : [];

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      {isUser ? (
        <div className="px-4 py-2 rounded-lg bg-blue-500 text-white">
          <pre className="whitespace-pre-wrap font-sans">{text}</pre>
        </div>
      ) : (
        <>
          {msg.blocks && <Blocks blocks={msg.blocks} />}

          {text && (
            <div className="mt-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700">
              <pre className="whitespace-pre-wrap font-sans">{text}</pre>
            </div>
          )}

          {!!links.length && (
            <div className="mt-2 flex flex-wrap gap-2">
              {links.map((l, i) => (
                <a
                  key={`${l.href}-${i}`}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-1 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                  title={l.rel || l.label || "Open link"}
                  aria-label={l.label || l.rel || "Open link"}
                >
                  {l.label || l.rel || "Open"}
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
