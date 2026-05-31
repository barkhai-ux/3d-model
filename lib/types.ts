export type Vec3 = { x: number; y: number; z: number };

export type Primitive = "box" | "cylinder" | "sphere" | "cone" | "torus";

export interface GeometryItem {
  component: string;
  primitive: Primitive;
  size?: Vec3;
  radius?: number;
  height?: number;
  tube?: number;
  position: Vec3;
  rotation?: Vec3;
  color?: string;
}

export interface CadSpec {
  model_name: string;
  category: string;
  units: string;
  assemblies: unknown[];
  components: unknown[];
  fasteners: unknown[];
  materials: unknown[];
  constraints: unknown[];
  relationships: unknown[];
  manufacturing_notes: unknown[];
  geometry: GeometryItem[];
}

export interface GenerateResponse {
  spec?: CadSpec;
  raw?: string;
  error?: string;
}

// ---- Multi-provider chat ----

export type ProviderId = "claude" | "ollama" | "gemini" | "openai";

export interface ChatMessageWire {
  role: "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  provider: ProviderId;
  model: string;
  messages: ChatMessageWire[];
  apiKey?: string;
  ollamaHost?: string;
}

export interface ModelOption {
  id: string;
  label: string;
}

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  available: boolean;
  models: ModelOption[];
  note?: string;
}

export interface ModelsResponse {
  providers: ProviderInfo[];
}
