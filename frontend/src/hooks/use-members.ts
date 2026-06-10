import useSWR from "swr";
import {
  listMembers,
  listMyInvitations,
  type MembersResponse,
  type MyInvitation,
} from "@/lib/api/members";

export function useMembers(projectId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<MembersResponse>(
    projectId ? `members/${projectId}` : null,
    () => listMembers(projectId!),
    { revalidateOnFocus: false },
  );
  return { data, error, isLoading, mutate };
}

export function useMyInvitations() {
  const { data, error, isLoading, mutate } = useSWR<MyInvitation[]>(
    "invitations/me",
    listMyInvitations,
    { revalidateOnFocus: true },
  );
  return { invitations: data ?? [], error, isLoading, mutate };
}
