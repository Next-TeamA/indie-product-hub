import { apiFetch } from "./client";

export type VoiceProfile = {
  tone?: string;
  vocabulary?: string;
  sentence_length?: string;
  [k: string]: unknown;
};

export type Persona = {
  id: string;
  project_id: string;
  voice_profile: VoiceProfile;
  topic_clusters: unknown[];
  opinion_corpus: unknown[];
  forbidden_phrases: string[];
  preferred_phrases: string[];
  ft_model_id: string | null;
  ft_training_status: "none" | "pending" | "training" | "ready" | "failed";
  last_updated_at: string;
  created_at: string;
};

export type PersonaResponse = { persona: Persona | null };

export type ImportVoiceInput = {
  platform: "x" | "threads";
  count?: number;
};

export type ImportVoiceResult = {
  imported: number;
  indexed: number;
  skipped?: number;
  [k: string]: unknown;
};

export async function getPersona(projectId: string): Promise<PersonaResponse> {
  return apiFetch<PersonaResponse>(`/api/projects/${projectId}/persona`);
}

export async function importVoice(
  projectId: string,
  input: ImportVoiceInput,
): Promise<ImportVoiceResult> {
  return apiFetch<ImportVoiceResult>(
    `/api/projects/${projectId}/persona/import-voice`,
    { method: "POST", body: { platform: input.platform, count: input.count ?? 50 } },
  );
}

export async function buildPersona(projectId: string): Promise<{ persona: Persona }> {
  return apiFetch<{ persona: Persona }>(
    `/api/projects/${projectId}/persona/build`,
    { method: "POST" },
  );
}
