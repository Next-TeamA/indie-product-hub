import useSWR from "swr";
import { listInteractions, type Interaction, type ReplyStatus } from "@/lib/api/interactions";

export function useInteractions(
  projectId: string | null,
  opts: { replyStatus?: ReplyStatus; limit?: number } = {},
) {
  const key = projectId
    ? `interactions/${projectId}/${opts.replyStatus ?? "all"}/${opts.limit ?? 30}`
    : null;
  const { data, error, isLoading, mutate } = useSWR<Interaction[]>(
    key,
    () => listInteractions(projectId!, opts),
    { revalidateOnFocus: false },
  );
  return { interactions: data ?? [], error, isLoading, mutate };
}
