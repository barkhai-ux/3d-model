"use client";

import { useEffect, useRef, useState } from "react";
import ModelPicker from "./ModelPicker";
import type { ProviderId } from "@/lib/types";
import type { StoredMessage } from "@/lib/useChats";
import type { Settings } from "@/lib/useSettings";

const SUGGESTIONS = [
  "draw a bookshelf",
  "create a laptop",
  "build a drone",
  "make a gaming chair",
  "design an L-bracket with gussets and mounting holes",
  "model a circular flange with a 6-hole bolt circle",
];

export default function Chat({
  messages,
  provider,
  model,
  settings,
  loading,
  hasModel,
  onSend,
  onModelChange,
  onSettings,
}: {
  messages: StoredMessage[];
  provider: ProviderId;
  model: string;
  settings: Settings;
  loading: boolean;
  hasModel: boolean;
  onSend: (prompt: string) => void;
  onModelChange: (provider: ProviderId, model: string) => void;
  onSettings: (patch: Partial<Settings>) => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function submit(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    setInput("");
    onSend(t);
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-800 px-5 py-3">
        <div className="mr-auto">
          <h1 className="text-base font-semibold text-zinc-100">CAD Master Builder</h1>
          <p className="text-xs text-zinc-500">Describe an object — refine it by chatting.</p>
        </div>
        <ModelPicker
          provider={provider}
          model={model}
          settings={settings}
          onChange={onModelChange}
          onSettings={onSettings}
        />
      </header>

      <div ref={scrollRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto px-5 py-5">
        {messages.length === 0 && !loading && (
          <div className="mt-8 text-center">
            <p className="text-sm text-zinc-400">Describe something to build:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-full border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const text = m.role === "assistant" ? m.display ?? m.content : m.content;
          return (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed " +
                  (m.role === "user"
                    ? "bg-indigo-600 text-white"
                    : m.error
                      ? "bg-red-950/60 text-red-200"
                      : "bg-zinc-800 text-zinc-100")
                }
              >
                {text}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-zinc-800 px-4 py-3 text-sm text-zinc-300">
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
              <span className="ml-1 text-zinc-400">
                {hasModel ? "Updating the model…" : "Engineering the assembly…"}
              </span>
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="border-t border-zinc-800 p-4"
      >
        <div className="flex items-end gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 focus-within:border-indigo-500">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(input);
              }
            }}
            rows={1}
            placeholder={
              hasModel ? "Refine it… e.g. 'make it taller, add glass doors'" : "Describe what to build…"
            }
            className="max-h-32 flex-1 resize-none bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
