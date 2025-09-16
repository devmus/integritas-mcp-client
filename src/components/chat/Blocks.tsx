"use client";
import type { ChatBlock } from "./types";

export function Blocks({ blocks }: { blocks: ChatBlock[] }) {
  return (
    <div className="w-full max-w-[780px] space-y-2">
      {blocks.map((b, idx) => {
        switch (b.kind) {
          case "heading":
            return (
              <div
                key={idx}
                className="uppercase tracking-wide text-red-600 dark:text-red-400 font-semibold mt-3"
              >
                {b.text}
              </div>
            );
          case "toolInfo":
            return (
              <div key={idx} className="text-gray-800 dark:text-gray-200">
                {b.text}
              </div>
            );
          case "toolJson":
            return (
              <pre
                key={idx}
                className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-3 rounded-lg overflow-auto text-sm"
              >
                {b.jsonText}
              </pre>
            );
          case "text":
            return (
              <div
                key={idx}
                className={
                  b.fromLLM ? "text-white" : "text-gray-800 dark:text-gray-200"
                }
              >
                {b.text}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
