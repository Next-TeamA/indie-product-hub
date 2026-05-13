import useSWR from "swr";
import { listAlerts, markAlertRead, markAllAlertsRead, type Alert } from "@/lib/api/alerts";

export function useAlerts() {
  const { data, error, isLoading, mutate } = useSWR<Alert[]>(
    "alerts",
    () => listAlerts(),
    { revalidateOnFocus: false, refreshInterval: 30000 }
  );

  const unreadCount = (data ?? []).filter(a => !a.is_read).length;

  return {
    alerts: data ?? [],
    unreadCount,
    error,
    isLoading,
    mutate,
    markRead: async (id: string) => { await markAlertRead(id); mutate(); },
    markAllRead: async () => { await markAllAlertsRead(); mutate(); },
  };
}
