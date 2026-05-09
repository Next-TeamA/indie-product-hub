import { apiFetch } from "./client";

// --- Types ---

export type CalendarEvent = {
  id: string;
  project_id: string;
  title: string;
  event_type: string;
  date: string;
  time: string | null;
  description: string | null;
  created_at: string;
};

export type EventCreateInput = {
  title: string;
  event_type: string;
  date: string;
  time?: string;
  description?: string;
};

// --- API ---

export async function listEvents(
  projectId: string,
  month?: string
): Promise<CalendarEvent[]> {
  const params = month ? { month } : undefined;
  return apiFetch<CalendarEvent[]>(`/api/projects/${projectId}/events`, { params });
}

export async function createEvent(
  projectId: string,
  data: EventCreateInput
): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/api/projects/${projectId}/events`, {
    method: "POST",
    body: data,
  });
}

export async function updateEvent(
  projectId: string,
  eventId: string,
  data: Partial<EventCreateInput>
): Promise<CalendarEvent> {
  return apiFetch<CalendarEvent>(`/api/projects/${projectId}/events/${eventId}`, {
    method: "PATCH",
    body: data,
  });
}

export async function deleteEvent(
  projectId: string,
  eventId: string
): Promise<void> {
  return apiFetch(`/api/projects/${projectId}/events/${eventId}`, {
    method: "DELETE",
  });
}
