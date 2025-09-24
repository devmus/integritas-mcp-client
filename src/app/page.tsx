"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Send,
  Settings,
  Paperclip,
  Trash2,
  Download,
  Image as ImageIcon,
  Sparkles,
  ChevronDown,
  FileText,
  X,
} from "lucide-react";

// Types
type Role = "user" | "assistant";

type Message = {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState("balanced");
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Simple simulated response for demo purposes
  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);
    setIsTyping(true);

    // Simulate network + streaming
    await new Promise((r) => setTimeout(r, 700));

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content:
        mode === "creative"
          ? "Here's a creative take: Imagine your idea as a tiny seed that grows into a forest of possibilities."
          : mode === "precise"
            ? "Answer: The result is 42. Supporting details are provided in steps 1–3 above."
            : "I understand. Here's a balanced response with clarity and context to guide you forward.",
      createdAt: Date.now(),
    };

    // Fake stream typing
    const chunks = assistantMessage.content.match(/.{1,8}/g) ?? [];
    let current = "";
    for (const ch of chunks) {
      current += ch;
      setMessages((prev) => {
        const base = prev.filter((m) => m.id !== assistantMessage.id);
        return [...base, { ...assistantMessage, content: current }];
      });
      await new Promise((r) => setTimeout(r, 50));
    }

    setIsTyping(false);
    setIsSending(false);
    setFiles([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const prettyTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const empty = messages.length === 0 && !isTyping;

  const modeLabel = useMemo(() => {
    if (mode === "creative") return "Creative";
    if (mode === "precise") return "Precise";
    return "Balanced";
  }, [mode]);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const list = Array.from(newFiles).slice(0, 6); // limit
    setFiles((prev) => {
      const names = new Set(prev.map((f) => f.name + f.size));
      const merged = [...prev];
      for (const f of list) if (!names.has(f.name + f.size)) merged.push(f);
      return merged;
    });
  };

  const removeFile = (name: string, size: number) => {
    setFiles((prev) =>
      prev.filter((f) => !(f.name === name && f.size === size))
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur supports-backdrop-blur:bg-background/60">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src="https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=200&auto=format&fit=crop"
                  alt="Integritas AI"
                />
                <AvatarFallback>OA</AvatarFallback>
              </Avatar>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="font-semibold tracking-tight">
                    Integritas AI
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    beta
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Data integrity assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    New Chat <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setMessages([])}>
                    Clear conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="mr-2 size-4" /> Export transcript
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FileText className="mr-2 size-4" /> View changelog
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" aria-label="Settings">
                    <Settings className="size-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-96 max-w-[90vw] px-6">
                  <SheetHeader>
                    <SheetTitle>Settings</SheetTitle>
                    <SheetDescription>
                      Tune your assistant to fit your workflow.
                    </SheetDescription>
                  </SheetHeader>

                  <div className="mt-6 space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Response style
                      </label>
                      <Select value={mode} onValueChange={setMode}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="creative">Creative</SelectItem>
                          <SelectItem value="balanced">Balanced</SelectItem>
                          <SelectItem value="precise">Precise</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose how detailed or imaginative responses should be.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Model</label>
                      <Select defaultValue="orchestrator-v1">
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choose model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="orchestrator-v1">
                            Orchestrator v1
                          </SelectItem>
                          <SelectItem value="orchestrator-lite">
                            Orchestrator Lite
                          </SelectItem>
                          <SelectItem value="orchestrator-research">
                            Orchestrator Research
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        System prompt
                      </label>
                      <Textarea
                        rows={5}
                        placeholder="You are Integritas, a thoughtful and concise assistant."
                        defaultValue="You are Integritas, a thoughtful and concise assistant. Answer clearly and provide helpful follow-ups."
                      />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="mx-auto max-w-4xl px-4 sm:px-6 pb-[calc(theme(spacing.24)+env(safe-area-inset-bottom))] pt-4 sm:pt-6">
          <Card className="border-muted/60">
            {/* Conversation area */}
            <div className="h-[calc(100vh-9rem)] sm:h-[calc(100vh-10rem)] flex flex-col">
              <ScrollArea className="flex-1 px-3 sm:px-6">
                <div className="mx-auto max-w-3xl py-6 space-y-6">
                  {/* Empty state */}
                  <AnimatePresence initial={false}>
                    {empty && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-xl border bg-card text-card-foreground p-8 sm:p-10 text-center"
                      >
                        <div className="mx-auto w-12 h-12 rounded-full grid place-items-center bg-secondary/70 mb-4">
                          <Bot className="size-6" />
                        </div>
                        <h2 className="text-lg font-semibold tracking-tight">
                          Welcome to Integritas AI
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Ask anything, attach files or images, and select a
                          response style. Press Enter to send, Shift+Enter for a
                          new line.
                        </p>
                        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                          {[
                            "Stamp this file",
                            "Verify this proof file",
                            "Explain Integritas",
                          ].map((s, i) => (
                            <Button
                              key={i}
                              variant="secondary"
                              className="justify-start"
                              onClick={() => setInput(s)}
                            >
                              <Sparkles className="mr-2 size-4" /> {s}
                            </Button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Messages */}
                  <AnimatePresence initial={false}>
                    {messages.map((m) => (
                      <motion.div
                        key={m.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="flex gap-3 sm:gap-4"
                      >
                        {m.role === "assistant" ? (
                          <Avatar className="mt-1 h-8 w-8">
                            <AvatarImage
                              src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop"
                              alt="Assistant"
                            />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                        ) : (
                          <Avatar className="mt-1 h-8 w-8">
                            <AvatarImage
                              src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop"
                              alt="You"
                            />
                            <AvatarFallback>YOU</AvatarFallback>
                          </Avatar>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              {m.role === "assistant" ? "Assistant" : "You"} ·{" "}
                              {prettyTime(m.createdAt)}
                            </span>
                          </div>
                          <div
                            className={
                              m.role === "assistant"
                                ? "mt-2 rounded-2xl rounded-tl-sm bg-secondary px-4 py-3"
                                : "mt-2 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3"
                            }
                          >
                            <p className="text-sm leading-6 whitespace-pre-wrap">
                              {m.content}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}

                    {isTyping && (
                      <motion.div
                        key="typing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex gap-3 sm:gap-4"
                      >
                        <Avatar className="mt-1 h-8 w-8">
                          <AvatarImage
                            src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=200&auto=format&fit=crop"
                            alt="Assistant"
                          />
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="mt-2 inline-flex items-center gap-1 rounded-2xl rounded-tl-sm bg-secondary px-3 py-2">
                            <span className="sr-only">Assistant is typing</span>
                            <span className="size-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:-0.2s]"></span>
                            <span className="size-2 rounded-full bg-foreground/60 animate-bounce [animation-delay:-0.1s]"></span>
                            <span className="size-2 rounded-full bg-foreground/60 animate-bounce"></span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={endRef} />
                </div>
              </ScrollArea>

              {/* Composer */}
              <div className="border-t bg-background/60 backdrop-blur supports-backdrop-blur:bg-background/40">
                <div className="mx-auto max-w-3xl px-3 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      {/* Top row: mode + actions */}
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="gap-1">
                            <Sparkles className="size-3" /> {modeLabel}
                          </Badge>
                          <Select value={mode} onValueChange={setMode}>
                            <SelectTrigger className="h-8 w-[150px]">
                              <SelectValue placeholder="Mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="creative">Creative</SelectItem>
                              <SelectItem value="balanced">Balanced</SelectItem>
                              <SelectItem value="precise">Precise</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            multiple
                            onChange={(e) => handleFiles(e.target.files)}
                            accept="image/*,.pdf,.txt,.md,.csv,.json"
                          />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                aria-label="Attach files"
                              >
                                <Paperclip className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Attach files</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMessages([])}
                                aria-label="Clear"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Clear chat</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Files row */}
                      {files.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-2">
                          {files.map((f) => (
                            <Badge
                              key={f.name + f.size}
                              variant="secondary"
                              className="gap-1"
                            >
                              <ImageIcon className="size-3" />
                              <span className="max-w-[160px] truncate">
                                {f.name}
                              </span>
                              <button
                                type="button"
                                className="ml-1 rounded hover:bg-foreground/10"
                                onClick={() => removeFile(f.name, f.size)}
                                aria-label={`Remove ${f.name}`}
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Textarea */}
                      <div className="relative">
                        <Textarea
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={onKeyDown}
                          rows={3}
                          placeholder="Write your message..."
                          className="resize-none pr-12"
                          disabled={isSending}
                        />
                        <div className="absolute right-2 bottom-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                className="h-8 w-8"
                                onClick={sendMessage}
                                disabled={
                                  isSending || input.trim().length === 0
                                }
                                aria-label="Send message"
                              >
                                <Send className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Send (Enter)</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Composer hint */}
                      <p className="mt-2 text-xs text-muted-foreground">
                        Press Enter to send • Shift+Enter for a new line
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </main>
      </div>
    </TooltipProvider>
  );
}
