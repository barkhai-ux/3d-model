"use client";

import { useCallback, useEffect, useState } from "react";
import type { CadSpec, ProviderId } from "./types";

export interface StoredMessage {
  role: "user" | "assistant";
  content: string; // user text, or assistant raw JSON (kept for refinement memory)
  display?: string; // friendly text shown for assistant turns
  spec?: CadSpec;
  error?: boolean;
}

export interface Chat {
  id: string;
  title: string;
  provider: ProviderId;
  model: string;
  messages: StoredMessage[];
  updatedAt: number;
}

const KEY = "cad-chats-v1";

function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function newChat(provider: ProviderId = "claude", model = "claude-opus-4-8"): Chat {
  return {
    id: uid(),
    title: "New chat",
    provider,
    model,
    messages: [],
    updatedAt: Date.now(),
  };
}

export function useChats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { chats: Chat[]; activeId: string };
        if (parsed.chats?.length) {
          setChats(parsed.chats);
          setActiveId(parsed.activeId || parsed.chats[0].id);
          setLoaded(true);
          return;
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
    const c = newChat();
    setChats([c]);
    setActiveId(c.id);
    setLoaded(true);
  }, []);

  // Persist on every change.
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ chats, activeId }));
    } catch {
      /* storage full / unavailable */
    }
  }, [chats, activeId, loaded]);

  const activeChat = chats.find((c) => c.id === activeId);

  const createChat = useCallback(() => {
    setChats((prev) => {
      const last = prev.find((c) => c.id === activeId) ?? prev[0];
      const c = newChat(last?.provider, last?.model);
      setActiveId(c.id);
      return [c, ...prev];
    });
  }, [activeId]);

  const selectChat = useCallback((id: string) => setActiveId(id), []);

  const importChat = useCallback(
    (title: string, messages: StoredMessage[]) => {
      setChats((prev) => {
        const last = prev.find((c) => c.id === activeId) ?? prev[0];
        const c: Chat = { ...newChat(last?.provider, last?.model), title, messages };
        setActiveId(c.id);
        return [c, ...prev];
      });
    },
    [activeId]
  );

  const deleteChat = useCallback(
    (id: string) => {
      setChats((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (next.length === 0) {
          const c = newChat();
          setActiveId(c.id);
          return [c];
        }
        if (id === activeId) setActiveId(next[0].id);
        return next;
      });
    },
    [activeId]
  );

  const updateChat = useCallback((id: string, patch: Partial<Chat>) => {
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c))
    );
  }, []);

  return {
    chats,
    activeChat,
    activeId,
    loaded,
    createChat,
    selectChat,
    deleteChat,
    updateChat,
    importChat,
  };
}
