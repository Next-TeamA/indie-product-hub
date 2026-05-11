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
    create: async (data: EventCreateInput) => {
      return createEvent(projectId, data);
    },
    update: async (eventId: string, data: Partial<EventCreateInput>) => {
      return updateEvent(projectId, eventId, data);
    },
    remove: async (eventId: string) => {
      return deleteEvent(projectId, eventId);
    },
  };
}
