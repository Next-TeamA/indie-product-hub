import useSWR from "swr";
import {
  getPersona,
  importVoice,
  buildPersona,
  type Persona,
  type PersonaResponse,
} from "@/lib/api/persona";

export function usePersona(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<PersonaResponse>(
    projectId ? `persona/${projectId}` : null,
    () => getPersona(projectId!),
    { revalidateOnFocus: false },
  );
  return {
    persona: data?.persona ?? null,
    error,
    isLoading,
    mutate,
  };
}

export function usePersonaActions(projectId: string) {
  return {
    import: (platform: "x" | "threads", count = 50) =>
      importVoice(projectId, { platform, count }),
    build: async (): Promise<Persona> => {
      const r = await buildPersona(projectId);
      return r.persona;
    },
  };
}
