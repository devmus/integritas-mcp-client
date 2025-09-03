"use client";

import { useState, useEffect, useRef } from "react";

export function Chat() {
  const [messages, setMessages] = useState<{
    role: "user" | "assistant";
    content: string;
    proof?: any;
    isError?: boolean;
  }>([]);
  const [input, setInput] = useState("");
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    if (token) {
      setSessionToken(token);
    } else {
      const newToken = Math.random().toString(36).substring(2);
      localStorage.setItem("sessionToken", newToken);
      setSessionToken(newToken);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleDownloadProof = (proof: any) => {
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

  const sendMessage = async () => {
    if (!input.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user" as const, content: input },
    ];
    setMessages(newMessages);
    setInput("");

    // Take the last 10 messages to send to the API
    const messagesToSend = newMessages.slice(-10);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_CHAT_API_URL || "/api/chat";

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      };

      if (apiKey) {
        headers["x-api-key"] = apiKey;
      }

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ messages: messagesToSend }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      let assistantMessage = "";
      if (data.tool_steps && data.tool_steps.length > 0) {
        // Assuming tool_steps is an array of objects with thought/result properties
        assistantMessage += data.tool_steps
          .map(
            (step: any) =>
              `> ${step.thought || "Thinking..."}\n✅ ${step.result || "Done."}`
          )
          .join("\n\n");
        assistantMessage += "\n\n";
      }
      assistantMessage += `**Final Response:**\n${data.finalText}`;

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: assistantMessage },
      ]);
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred.";
      if (error.message) {
        errorMessage = error.message;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage, isError: true },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-[80vh] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700"
                } ${msg.isError ? "text-red-500" : ""}`}
              >
                <pre className="whitespace-pre-wrap font-sans">
                  {msg.content}
                </pre>
              </div>
              {msg.proof && (
                <button
                  onClick={() => handleDownloadProof(msg.proof)}
                  className="mt-2 px-3 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                >
                  Download Proof
                </button>
              )}
            </div>
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
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 focus:outline-none"
            title="Toggle API Key Input"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 7h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m-6 0H7a2 2 0 01-2-2V9a2 2 0 012-2h2m0-4h2a2 2 0 012 2v2H9V7a2 2 0 012-2zm0 8a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
