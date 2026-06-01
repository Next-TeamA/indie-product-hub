import { apiFetch } from "./client";

export type VoiceSample = {
  id: string;
  source_platform: string;
  source_post_id: string | null;
  content: string;
  lang: string | null;
  engagement_score: number | null;
  used_for_training: boolean;
  created_at: string;
};

export async function listVoiceSamples(
  projectId: string,
  limit = 100,
): Promise<VoiceSample[]> {
  return apiFetch<VoiceSample[]>(
    `/api/projects/${projectId}/voice-samples`,
    { params: { limit: String(limit) } },
  );
}

export async function deleteVoiceSample(
  projectId: string,
  sampleId: string,
): Promise<void> {
  await apiFetch(
    `/api/projects/${projectId}/voice-samples/${sampleId}`,
    { method: "DELETE" },
  );
}
