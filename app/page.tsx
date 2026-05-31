"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import * as THREE from "three";
import Chat from "@/components/Chat";
import Sidebar from "@/components/Sidebar";
import SpecPanel from "@/components/SpecPanel";
import MeshPanel, { type MeshView } from "@/components/MeshPanel";
import { useChats, type StoredMessage } from "@/lib/useChats";
import { useSettings } from "@/lib/useSettings";
import { loadMeshFile } from "@/lib/loadMesh";
import type { CadSpec, GenerateResponse, ProviderId } from "@/lib/types";

const ModelViewer = dynamic(() => import("@/components/ModelViewer"), { ssr: false });

export default function Home() {
  const {
    chats,
    activeChat,
    activeId,
    loaded,
    createChat,
    selectChat,
    deleteChat,
    updateChat,
    importChat,
  } = useChats();
  const { settings, update: updateSettings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [meshView, setMeshView] = useState<MeshView | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);

  // The viewer follows the latest model produced in the active chat.
  const latestSpec: CadSpec | null =
    [...(activeChat?.messages ?? [])].reverse().find((m) => m.role === "assistant" && m.spec)?.spec ??
    null;

  const hasModel = Boolean(latestSpec);

  function setModel(provider: ProviderId, model: string) {
    if (activeChat) updateChat(activeChat.id, { provider, model });
  }

  async function importMesh(file: File) {
    try {
      const loaded = await loadMeshFile(file);
      setMeshView({ name: file.name, ...loaded });
    } catch (err) {
      console.error("Mesh import failed", err);
      alert(`Could not load "${file.name}". It may be corrupt or an unsupported variant.`);
    }
  }

  function selectChatAndClearMesh(id: string) {
    setMeshView(null);
    selectChat(id);
  }

  function importSpec(spec: CadSpec, filename: string) {
    const title = spec.model_name || filename;
    importChat(title, [
      { role: "user", content: `Imported "${filename}"` },
      {
        role: "assistant",
        content: JSON.stringify(spec), // kept so the model can refine it
        display: `Imported **${title}** — ${spec.geometry?.length ?? 0} parts. Ask me to change anything.`,
        spec,
      },
    ]);
  }

  async function send(prompt: string) {
    if (!activeChat) return;
    setMeshView(null); // a new generation takes over the viewer
    const chatId = activeChat.id;
    const userMsg: StoredMessage = { role: "user", content: prompt };
    const history = [...activeChat.messages, userMsg];

    updateChat(chatId, {
      messages: history,
      title: activeChat.messages.length === 0 ? prompt.slice(0, 48) : activeChat.title,
    });
    setLoading(true);

    const apiKey =
      activeChat.provider === "gemini"
        ? settings.geminiKey
        : activeChat.provider === "openai"
          ? settings.openaiKey
          : undefined;

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeChat.provider,
          model: activeChat.model,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          apiKey,
          ollamaHost: settings.ollamaHost,
        }),
      });
      const data: GenerateResponse = await res.json();

      let assistant: StoredMessage;
      if (data.spec) {
        const n = data.spec.geometry?.length ?? 0;
        assistant = {
          role: "assistant",
          content: JSON.stringify(data.spec), // kept for refinement memory
          display: `Generated **${data.spec.model_name || "model"}** — ${
            data.spec.components?.length ?? 0
          } components, ${n} parts rendered.`,
          spec: data.spec,
        };
      } else {
        assistant = {
          role: "assistant",
          content: data.raw ?? "",
          display: `⚠️ ${data.error || "Something went wrong."}${
            data.raw ? `\n\n${data.raw.slice(0, 600)}` : ""
          }`,
          error: true,
        };
      }
      updateChat(chatId, { messages: [...history, assistant] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed.";
      updateChat(chatId, {
        messages: [...history, { role: "assistant", content: "", display: `⚠️ ${msg}`, error: true }],
      });
    } finally {
      setLoading(false);
    }
  }

  if (!loaded || !activeChat) {
    return <main className="flex h-screen w-screen items-center justify-center text-zinc-500">Loading…</main>;
  }

  return (
    <main className="flex h-screen w-screen overflow-hidden">
      <Sidebar
        chats={chats}
        activeId={activeId}
        onSelect={selectChatAndClearMesh}
        onNew={() => {
          setMeshView(null);
          createChat();
        }}
        onDelete={deleteChat}
        onImport={(spec, filename) => {
          setMeshView(null);
          importSpec(spec, filename);
        }}
        onImportMesh={importMesh}
      />

      <section className="flex w-full max-w-md flex-col border-r border-zinc-800 bg-zinc-950">
        <Chat
          key={activeChat.id}
          messages={activeChat.messages}
          provider={activeChat.provider}
          model={activeChat.model}
          settings={settings}
          loading={loading}
          hasModel={hasModel}
          onSend={send}
          onModelChange={setModel}
          onSettings={updateSettings}
        />
      </section>

      <section className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1">
          <ModelViewer
            geometry={meshView ? [] : latestSpec?.geometry ?? []}
            importedObject={meshView?.object ?? null}
            importedSize={meshView?.size ?? null}
            groupRef={groupRef}
          />
        </div>
        {meshView ? (
          <MeshPanel mesh={meshView} onClose={() => setMeshView(null)} />
        ) : (
          latestSpec && <SpecPanel spec={latestSpec} groupRef={groupRef} />
        )}
      </section>
    </main>
  );
}
