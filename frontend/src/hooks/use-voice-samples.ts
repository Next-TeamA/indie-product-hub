import useSWR from "swr";
import {
  listVoiceSamples,
  deleteVoiceSample,
  type VoiceSample,
} from "@/lib/api/voice-samples";

export function useVoiceSamples(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<VoiceSample[]>(
    projectId ? `voice-samples/${projectId}` : null,
    () => listVoiceSamples(projectId!),
    { revalidateOnFocus: false },
  );
  return {
    samples: data ?? [],
    error,
    isLoading,
    mutate,
  };
}

export function useVoiceSampleActions(projectId: string) {
  return {
    remove: (sampleId: string) => deleteVoiceSample(projectId, sampleId),
  };
}
