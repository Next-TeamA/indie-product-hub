"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, Clock, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

import { useTranslations } from "next-intl";
import { useEvents, useEventActions } from "@/hooks/use-events";
import type { CalendarEvent } from "@/lib/api/events";

const EASE_OUT = [0.0, 0.0, 0.2, 1.0] as const;
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

const EVENT_TYPES = [
  { value: "promotion",  label: "Promotion", color: "#EFFF00" },
  { value: "deployment", label: "Deploy",    color: "#6B7D8F" },
  { value: "marketing",  label: "Marketing", color: "#5FCC7D" },
  { value: "meeting",    label: "Meeting",   color: "#5A6B7B" },
  { value: "other",      label: "Other",     color: "#4A4A4A" },
] as const;

type EventType = typeof EVENT_TYPES[number]["value"];

function getTypeInfo(type: string) {
  return EVENT_TYPES.find(t => t.value === type) ?? EVENT_TYPES[4];
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function toMonthStr(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
}

const EMPTY_FORM = { title: "", type: "other" as EventType, time: "", description: "" };

export default function CalendarPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const t = useTranslations("calendar");
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [current, setCurrent] = useState(() => new Date(today.getFullYear(), today.getMonth()));
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth();
  const monthStr = toMonthStr(year, month);

  const { events: rawEvents, isLoading, mutate } = useEvents(projectId, monthStr);
  const { create, remove } = useEventActions(projectId);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const evt of rawEvents) {
      if (!map[evt.date]) map[evt.date] = [];
      map[evt.date].push(evt);
    }
    return map;
  }, [rawEvents]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedEvents = (eventsByDate[selectedDate] || [])
    .slice()
    .sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));

  const openModal = () => { setForm(EMPTY_FORM); setFormError(""); setIsModalOpen(true); };

  const addEvent = async () => {
    if (!form.title.trim()) { setFormError(t("eventTitle") + " required"); return; }
    setIsSaving(true);
    try {
      await create({
        title: form.title.trim(),
        event_type: form.type,
        date: selectedDate,
        time: form.time || undefined,
        description: form.description.trim() || undefined,
      });
      await mutate();
      setIsModalOpen(false);
    } catch { setFormError("Failed to create event"); }
    finally { setIsSaving(false); }
  };

  const deleteEvent = async (eventId: string) => {
    try { await remove(eventId); await mutate(); } catch {}
  };

  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className="flex flex-col gap-1.5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <button
            onClick={openModal}
            className="btn-primary flex items-center gap-2 text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* Calendar grid */}
          <div className="col-span-2 bg-card rounded-3xl p-5">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrent(new Date(year, month - 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-semibold text-sm">
                {current.toLocaleDateString("en-US", { year: "numeric", month: "long" })}
              </h2>
              <button
                onClick={() => setCurrent(new Date(year, month + 1))}
                className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((day, i) => (
                <div key={`h-${i}`} className="text-center text-[10px] text-muted-foreground/50 py-1">{day}</div>
              ))}
            </div>

            {/* Date cells */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((day, i) => {
                  const dateStr = day ? toDateStr(year, month, day) : "";
                  const dayEvents = dateStr ? eventsByDate[dateStr] || [] : [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;

                  return (
                    <div
                      key={i}
                      onClick={() => day && setSelectedDate(dateStr)}
                      className={[
                        "min-h-20 p-1.5 rounded-xl transition-colors",
                        !day ? "" : "cursor-pointer",
                        isSelected && day ? "bg-secondary" : day ? "hover:bg-secondary/50" : "",
                      ].join(" ")}
                    >
                      {day && (
                        <>
                          <span className={[
                            "text-xs inline-flex items-center justify-center w-6 h-6 rounded-lg",
                            isToday ? "bg-primary text-primary-foreground font-bold" :
                            isSelected ? "text-foreground font-semibold" :
                            "text-muted-foreground",
                          ].join(" ")}>
                            {day}
                          </span>
                          <div className="mt-1 flex flex-col gap-0.5">
                            {dayEvents.slice(0, 2).map(evt => {
                              const ti = getTypeInfo(evt.event_type);
                              return (
                                <div key={evt.id} className="flex items-center gap-1">
                                  <div className="w-1 h-1 rounded-full shrink-0" style={{ background: ti.color }} />
                                  <span className="text-[9px] text-muted-foreground truncate">{evt.title}</span>
                                </div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <span className="text-[9px] text-muted-foreground/50 pl-2">+{dayEvents.length - 2}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Day detail panel */}
          <div className="col-span-1 bg-card rounded-3xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold">{formatDateLabel(selectedDate)}</p>
              <button
                onClick={openModal}
                className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDate}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="flex-1"
              >
                {selectedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">{t("noEvents")}</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {selectedEvents.map(evt => {
                      const ti = getTypeInfo(evt.event_type);
                      return (
                        <div
                          key={evt.id}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/50 transition-colors group"
                        >
                          <div className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: ti.color }} />
                          <div className="flex-1 min-w-0">
                            {evt.time && (
                              <span className="text-[10px] text-muted-foreground tabular-nums">{evt.time}</span>
                            )}
                            <p className="text-xs font-medium">{evt.title}</p>
                            {evt.description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">{evt.description}</p>
                            )}
                          </div>
                          <button
                            onClick={() => deleteEvent(evt.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 rounded-lg flex items-center justify-center hover:bg-[rgba(217,123,120,0.15)] cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3 h-3" style={{ color: "#D97B78" }} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Add event modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">{t("addEvent")}</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-xl flex items-center justify-center hover:bg-secondary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">{t("eventTitle")}</label>
                  <input
                    type="text"
                    placeholder={t("eventTitlePlaceholder")}
                    value={form.title}
                    onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError(""); }}
                    onKeyDown={e => e.key === "Enter" && addEvent()}
                    autoFocus
                    className="input-base w-full"
                  />
                  {formError && <p className="text-xs mt-1" style={{ color: "#D97B78" }}>{formError}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{t("time")}</label>
                    <input
                      type="time"
                      value={form.time}
                      onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                      className="input-base w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{t("type")}</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(f => ({ ...f, type: e.target.value as EventType }))}
                      className="input-base w-full cursor-pointer"
                    >
                      {EVENT_TYPES.map(et => (
                        <option key={et.value} value={et.value}>{et.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">{t("notes")}</label>
                  <textarea
                    placeholder={t("notesPlaceholder")}
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                    className="input-base w-full h-auto py-2.5 resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary flex-1 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addEvent}
                    disabled={isSaving}
                    className="btn-primary flex-1 cursor-pointer disabled:opacity-40"
                  >
                    {isSaving ? "Adding..." : "Add Event"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
