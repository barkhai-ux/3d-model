"use client";

import { useCallback, useEffect, useState } from "react";
import type { ModelsResponse, ProviderId, ProviderInfo } from "@/lib/types";
import type { Settings } from "@/lib/useSettings";

function providerHasKey(p: ProviderInfo, s: Settings): boolean {
  if (p.id === "gemini") return Boolean(s.geminiKey) || p.available;
  if (p.id === "openai") return Boolean(s.openaiKey) || p.available;
  return p.available; // claude always; ollama decided by the server probe
}

export default function ModelPicker({
  provider,
  model,
  settings,
  onChange,
  onSettings,
}: {
  provider: ProviderId;
  model: string;
  settings: Settings;
  onChange: (provider: ProviderId, model: string) => void;
  onSettings: (patch: Partial<Settings>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/models?ollamaHost=${encodeURIComponent(settings.ollamaHost)}`
      );
      const data: ModelsResponse = await res.json();
      setProviders(data.providers);
    } catch {
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [settings.ollamaHost]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const currentLabel =
    providers
      .flatMap((p) => p.models)
      .find((m) => m.id === model)?.label || model || "Choose model";

  function pick(p: ProviderId, m: string) {
    onChange(p, m);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-zinc-800"
        title="Choose model / configure providers"
      >
        <span className="truncate max-w-[12rem]">{currentLabel}</span>
        <span className="text-zinc-500">▾</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="scroll-thin max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
              <h2 className="text-sm font-semibold text-zinc-100">Choose a model</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={load}
                  className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800"
                >
                  {loading ? "…" : "↻ Refresh"}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-1 text-zinc-400 hover:text-zinc-100"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-5 p-5">
              {providers.map((p) => {
                const usable = providerHasKey(p, settings);
                return (
                  <section key={p.id}>
                    <div className="mb-2 flex items-center gap-2">
                      <h3 className="text-sm font-medium text-zinc-100">{p.label}</h3>
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] " +
                          (usable
                            ? "bg-emerald-900/50 text-emerald-300"
                            : "bg-zinc-800 text-zinc-400")
                        }
                      >
                        {usable ? "ready" : "needs setup"}
                      </span>
                    </div>

                    {/* Provider configuration: keys / host */}
                    {p.id === "gemini" && (
                      <KeyInput
                        placeholder="Gemini API key"
                        value={settings.geminiKey}
                        onChange={(v) => onSettings({ geminiKey: v })}
                      />
                    )}
                    {p.id === "openai" && (
                      <KeyInput
                        placeholder="OpenAI API key"
                        value={settings.openaiKey}
                        onChange={(v) => onSettings({ openaiKey: v })}
                      />
                    )}
                    {p.id === "ollama" && (
                      <div className="mb-2 flex gap-2">
                        <input
                          value={settings.ollamaHost}
                          onChange={(e) => onSettings({ ollamaHost: e.target.value })}
                          placeholder="http://localhost:11434"
                          className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          onClick={load}
                          className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                        >
                          Test
                        </button>
                      </div>
                    )}

                    {p.note && (
                      <p className="mb-2 text-[11px] text-amber-500/80">{p.note}</p>
                    )}

                    {/* Model list */}
                    <div className="flex flex-wrap gap-2">
                      {p.models.length === 0 && (
                        <span className="text-xs text-zinc-600">No models available.</span>
                      )}
                      {p.models.map((m) => {
                        const selected = provider === p.id && model === m.id;
                        return (
                          <button
                            key={m.id}
                            disabled={!usable}
                            onClick={() => pick(p.id, m.id)}
                            className={
                              "rounded-lg border px-3 py-1.5 text-xs transition " +
                              (selected
                                ? "border-indigo-500 bg-indigo-600/20 text-indigo-200"
                                : usable
                                  ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                                  : "border-zinc-800 text-zinc-600 cursor-not-allowed")
                            }
                          >
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                );
              })}

              {providers.length === 0 && !loading && (
                <p className="text-sm text-zinc-500">Couldn&apos;t load providers. Try Refresh.</p>
              )}
            </div>

            <div className="border-t border-zinc-800 px-5 py-3 text-[11px] text-zinc-600">
              Keys are stored only in this browser and sent with your requests.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function KeyInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="mb-2 flex gap-2">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
      />
      <button
        onClick={() => setShow((s) => !s)}
        className="rounded-md border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800"
      >
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
