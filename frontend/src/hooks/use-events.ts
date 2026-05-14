import useSWR from "swr";
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type CalendarEvent,
  type EventCreateInput,
} from "@/lib/api/events";

export function useEvents(projectId: string, month?: string) {
  const key = month
    ? `projects/${projectId}/events?month=${month}`
    : `projects/${projectId}/events`;

  const { data, error, isLoading, mutate } = useSWR<CalendarEvent[]>(
    key,
    () => listEvents(projectId, month),
    { revalidateOnFocus: false }
  );
  return { events: data ?? [], error, isLoading, mutate };
}

export function useEventActions(projectId: string) {
  return {
    create: (data: EventCreateInput) => createEvent(projectId, data),
    update: (eventId: string, data: Partial<EventCreateInput>) => updateEvent(projectId, eventId, data),
    remove: (eventId: string) => deleteEvent(projectId, eventId),
  };
}
