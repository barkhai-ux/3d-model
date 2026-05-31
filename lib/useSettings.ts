"use client";

import { useCallback, useEffect, useState } from "react";

export interface Settings {
  geminiKey: string;
  openaiKey: string;
  ollamaHost: string;
}

const KEY = "cad-settings-v1";

export const DEFAULT_SETTINGS: Settings = {
  geminiKey: "",
  openaiKey: "",
  ollamaHost: "http://localhost:11434",
};

/** Persists API keys and the Ollama host in this browser's localStorage. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings, loaded]);

  const update = useCallback(
    (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })),
    []
  );

  return { settings, update, loaded };
}
