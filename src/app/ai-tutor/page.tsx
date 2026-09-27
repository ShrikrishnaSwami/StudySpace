"use client";

import {
  ArrowUp,
  BookOpen,
  Calculator,
  Code2,
  Lightbulb,
  Paperclip,
  Sparkles,
  Upload,
} from "lucide-react";
import { useState } from "react";
import AppShell from "@/components/AppShell";

const suggestions = [
  {
    icon: Lightbulb,
    title: "Explain a concept",
    text: "Explain this like I'm learning it for the first time.",
  },
  {
    icon: Calculator,
    title: "Solve a problem",
    text: "Walk me through this problem step by step.",
  },
  {
    icon: BookOpen,
    title: "Study a topic",
    text: "Help me understand the most important ideas.",
  },
  {
    icon: Code2,
    title: "Debug my code",
    text: "Find the issue and explain how to fix it.",
  },
];

export default function AiTutorPage() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);

  function sendMessage() {
    const trimmed = message.trim();

    if (!trimmed) return;

    setMessages((current) => [
      ...current,
      {
        role: "user",
        text: trimmed,
      },
      {
        role: "assistant",
        text: "I'm currently in demo mode. Once AI is connected, I'll be able to analyze your question and guide you through it step by step.",
      },
    ]);

    setMessage("");
  }

  function applySuggestion(text: string) {
    setMessage(text);
  }

  return (
    <AppShell
      title="AI Tutor"
      description="Your personal study assistant"
    >
      <div className="mx-auto flex max-w-6xl flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
            <Sparkles size={13} />
            AI-powered learning
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            What are you working on?
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/40">
            Ask questions, understand difficult concepts, work through
            problems, or turn your course material into something easier
            to learn.
          </p>
        </div>

        {/* Chat */}
        <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/20">
          {/* Chat header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                <Sparkles size={18} />
              </div>

              <div>
                <p className="text-sm font-semibold">StudySpace Tutor</p>
                <p className="text-xs text-emerald-400">
                  ● Ready to help
                </p>
              </div>
            </div>

            <button className="rounded-lg px-3 py-2 text-xs text-white/35 transition hover:bg-white/[0.04] hover:text-white/60">
              New chat
            </button>
          </div>

          {/* Messages */}
          <div className="min-h-[360px] p-5 sm:p-8">
            {messages.length === 0 ? (
              <div className="flex min-h-[320px] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 ring-1 ring-violet-400/10">
                  <Sparkles
                    size={28}
                    className="text-violet-400"
                  />
                </div>

                <h2 className="text-xl font-semibold">
                  Your AI study partner
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-white/35">
                  Start with a question or choose one of the shortcuts
                  below.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((item, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      item.role === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        item.role === "user"
                          ? "bg-violet-600 text-white"
                          : "border border-white/[0.07] bg-white/[0.04] text-white/70"
                      }`}
                    >
                      {item.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="border-t border-white/[0.06] px-5 py-5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/25">
              Try asking
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {suggestions.map((suggestion) => {
                const Icon = suggestion.icon;

                return (
                  <button
                    key={suggestion.title}
                    onClick={() => applySuggestion(suggestion.text)}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-left transition hover:border-violet-400/20 hover:bg-violet-500/[0.06]"
                  >
                    <Icon
                      size={16}
                      className="mb-2 text-violet-400"
                    />

                    <p className="text-xs font-semibold text-white/80">
                      {suggestion.title}
                    </p>

                    <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/30">
                      {suggestion.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Input */}
          <div className="border-t border-white/[0.06] p-4">
            <div className="rounded-2xl border border-white/[0.09] bg-black/20 p-2 transition focus-within:border-violet-400/30 focus-within:ring-2 focus-within:ring-violet-500/10">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask anything about what you're studying..."
                rows={2}
                className="w-full resize-none bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/25"
              />

              <div className="flex items-center justify-between px-1 pt-1">
                <div className="flex items-center gap-1">
                  <button className="rounded-lg p-2 text-white/30 transition hover:bg-white/[0.05] hover:text-white/70">
                    <Paperclip size={17} />
                  </button>

                  <button className="rounded-lg p-2 text-white/30 transition hover:bg-white/[0.05] hover:text-white/70">
                    <Upload size={17} />
                  </button>

                  <span className="ml-2 hidden text-[10px] text-white/20 sm:block">
                    Shift + Enter for a new line
                  </span>
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!message.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom note */}
        <div className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-white/20">
          <Sparkles size={12} />
          StudySpace AI is currently running in demo mode.
        </div>
      </div>
    </AppShell>
  );
}