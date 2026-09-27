"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
  Edit3,
  Check,
  AlertTriangle,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
  CalendarEvent,
  CalendarEventType,
  createCalendarEvent,
  deleteCalendarEvent,
  getCalendarEvents,
  updateCalendarEvent,
} from "@/lib/calendar";
import {
  createAssignmentCalendarEvent,
  deleteAssignmentCalendarEvent,
  syncAssignmentCalendarEvent,
} from "@/lib/calendar-integrations";

type ViewMode = "week" | "month";

const EVENT_TYPES: {
  value: CalendarEventType;
  label: string;
}[] = [
  { value: "class", label: "Class" },
  { value: "lab", label: "Lab" },
  { value: "study", label: "Study" },
  { value: "assignment", label: "Assignment" },
  { value: "quiz", label: "Quiz" },
  { value: "exam", label: "Exam" },
  { value: "meeting", label: "Meeting" },
  { value: "office", label: "Office Hours" },
  { value: "break", label: "Break" },
  { value: "other", label: "Other" },
];

const TYPE_STYLES: Record<
  CalendarEventType,
  {
    bg: string;
    border: string;
    text: string;
  }
> = {
  class: {
    bg: "bg-violet-500/15",
    border: "border-violet-500/30",
    text: "text-violet-300",
  },
  lab: {
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/30",
    text: "text-cyan-300",
  },
  study: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-300",
  },
  assignment: {
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-300",
  },
  quiz: {
    bg: "bg-pink-500/15",
    border: "border-pink-500/30",
    text: "text-pink-300",
  },
  exam: {
    bg: "bg-rose-600/15",
    border: "border-rose-600/30",
    text: "text-rose-300",
  },
  meeting: {
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
    text: "text-purple-300",
  },
  office: {
    bg: "bg-fuchsia-500/15",
    border: "border-fuchsia-500/30",
    text: "text-fuchsia-300",
  },
  break: {
    bg: "bg-slate-500/15",
    border: "border-slate-500/30",
    text: "text-slate-300",
  },
  other: {
    bg: "bg-indigo-500/15",
    border: "border-indigo-500/30",
    text: "text-indigo-300",
  },
};

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfWeek(date: Date) {
  const result = startOfDay(date);
  const day = result.getDay();
  const difference = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + difference);
  return result;
}

function endOfWeek(date: Date) {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return endOfDay(result);
}

function startOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    1
  );
}

function endOfMonth(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );
}

function toInputDateTime(date: Date) {
  const local = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return local.toISOString().slice(0, 16);
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function getMonthDays(date: Date) {
  const first = startOfMonth(date);
  const last = endOfMonth(date);

  const gridStart = startOfWeek(first);
  const gridEnd = endOfWeek(last);

  const days: Date[] = [];
  const current = new Date(gridStart);

  while (current <= gridEnd) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function getWeekDays(date: Date) {
  const start = startOfWeek(date);

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function emptyForm() {
  const start = new Date();
  start.setMinutes(0);
  start.setHours(start.getHours() + 1);

  const end = new Date(start);
  end.setHours(end.getHours() + 1);

  return {
    title: "",
    description: "",
    start_at: toInputDateTime(start),
    end_at: toInputDateTime(end),
    event_type: "other" as CalendarEventType,
    location: "",
    multitask: false,
    enabled: true,
  };
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] =
    useState<ViewMode>("week");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] =
    useState<CalendarEvent | null>(null);

  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<CalendarEventType | "all">("all");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState(emptyForm());

  const rangeStart =
    viewMode === "week"
      ? startOfWeek(currentDate)
      : startOfWeek(startOfMonth(currentDate));

  const rangeEnd =
    viewMode === "week"
      ? endOfWeek(currentDate)
      : endOfWeek(endOfMonth(currentDate));

  async function loadEvents(showSpinner = false) {
    try {
      if (showSpinner) {
        setRefreshing(true);
      }

      const data = await getCalendarEvents(
        rangeStart.toISOString(),
        rangeEnd.toISOString()
      );

      setEvents(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load calendar."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const rangeStartKey =
  rangeStart.toISOString();

const rangeEndKey =
  rangeEnd.toISOString();

useEffect(() => {
  let cancelled = false;

  async function loadCalendarEvents() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getCalendarEvents(
          rangeStartKey,
          rangeEndKey
        );

      if (!cancelled) {
        setEvents(data);
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load calendar events."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  loadCalendarEvents();

  return () => {
    cancelled = true;
  };
}, [rangeStartKey, rangeEndKey]);

  function goToday() {
    setCurrentDate(new Date());
  }

  function goPrevious() {
    setCurrentDate((previous) => {
      const next = new Date(previous);

      if (viewMode === "week") {
        next.setDate(next.getDate() - 7);
      } else {
        next.setMonth(next.getMonth() - 1);
      }

      return next;
    });
  }

  function goNext() {
    setCurrentDate((previous) => {
      const next = new Date(previous);

      if (viewMode === "week") {
        next.setDate(next.getDate() + 7);
      } else {
        next.setMonth(next.getMonth() + 1);
      }

      return next;
    });
  }

  function openCreateModal() {
    setEditingEvent(null);
    setSelectedEvent(null);
    setForm(emptyForm());
    setError("");
    setShowModal(true);
  }

  function openEditModal(event: CalendarEvent) {
    setEditingEvent(event);
    setSelectedEvent(null);

    setForm({
      title: event.title,
      description: event.description || "",
      start_at: toInputDateTime(
        new Date(event.start_at)
      ),
      end_at: toInputDateTime(
        new Date(event.end_at)
      ),
      event_type: event.event_type,
      location: event.location || "",
      multitask: event.multitask,
      enabled: event.enabled,
    });

    setError("");
    setShowModal(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Please enter an event title.");
      return;
    }

    try {
      if (editingEvent) {
        const result = await updateCalendarEvent(
          editingEvent.id,
          {
            title: form.title,
            description: form.description,
            start_at: new Date(
              form.start_at
            ).toISOString(),
            end_at: new Date(
              form.end_at
            ).toISOString(),
            event_type: form.event_type,
            location: form.location,
            multitask: form.multitask,
            enabled: form.enabled,
          }
        );

        setSuccess(
          result.disabled
            ? "Event updated but disabled because it conflicts with another event."
            : "Event updated successfully."
        );
      } else {
        const result = await createCalendarEvent({
          title: form.title,
          description: form.description,
          start_at: new Date(
            form.start_at
          ).toISOString(),
          end_at: new Date(
            form.end_at
          ).toISOString(),
          event_type: form.event_type,
          location: form.location,
          multitask: form.multitask,
          enabled: form.enabled,
        });

        setSuccess(
          result.disabled
            ? "Event created but disabled because of a conflict."
            : "Event created successfully."
        );
      }

      setShowModal(false);
      await loadEvents();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save event."
      );
    }
  }

  async function handleDelete(event: CalendarEvent) {
    const confirmed = window.confirm(
      `Delete "${event.title}"?`
    );

    if (!confirmed) return;

    try {
      await deleteCalendarEvent(event.id);

      setSelectedEvent(null);

      setSuccess("Event deleted.");

      await loadEvents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete event."
      );
    }
  }

  async function toggleEnabled(event: CalendarEvent) {
    try {
      await updateCalendarEvent(event.id, {
        enabled: !event.enabled,
      });

      await loadEvents();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update event."
      );
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSearch =
        !search.trim() ||
        event.title
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        event.description
          ?.toLowerCase()
          .includes(search.toLowerCase()) ||
        event.location
          ?.toLowerCase()
          .includes(search.toLowerCase());

      const matchesFilter =
        activeFilter === "all" ||
        event.event_type === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [events, search, activeFilter]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};

    filteredEvents.forEach((event) => {
      const key = dateKey(new Date(event.start_at));

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push(event);
    });

    Object.values(map).forEach((dayEvents) => {
      dayEvents.sort(
        (a, b) =>
          new Date(a.start_at).getTime() -
          new Date(b.start_at).getTime()
      );
    });

    return map;
  }, [filteredEvents]);

  const displayTitle =
    viewMode === "week"
      ? `${currentDate.toLocaleDateString([], {
          month: "long",
        })} ${currentDate.getFullYear()}`
      : currentDate.toLocaleDateString([], {
          month: "long",
          year: "numeric",
        });

  return (
    <AppShell
      title="Calendar"
      description="Keep your classes, deadlines, study sessions, and important events in one place."
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/10">
                <CalendarDays className="h-5 w-5 text-violet-300" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold text-white">
                  Calendar
                </h1>

                <p className="text-sm text-white/45">
                  Your academic schedule and study plan.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
          >
            <Plus className="h-4 w-4" />
            Add event
          </button>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-center justify-between rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>

            <button
              onClick={() => setError("")}
              className="text-red-200/60 hover:text-red-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              {success}
            </div>

            <button
              onClick={() => setSuccess("")}
              className="text-emerald-200/60 hover:text-emerald-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Toolbar */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={goToday}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/[0.08]"
              >
                Today
              </button>

              <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.03]">
                <button
                  onClick={goPrevious}
                  className="p-2 text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  onClick={goNext}
                  className="p-2 text-white/50 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <span className="ml-1 text-sm font-medium text-white/80">
                {displayTitle}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search events..."
                  className="w-full rounded-lg border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/40 sm:w-52"
                />
              </div>

              <select
                value={activeFilter}
                onChange={(event) =>
                  setActiveFilter(
                    event.target.value as
                      | CalendarEventType
                      | "all"
                  )
                }
                className="rounded-lg border border-white/10 bg-[#120d20] px-3 py-2 text-sm text-white/70 outline-none"
              >
                <option value="all">
                  All types
                </option>

                {EVENT_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => loadEvents(true)}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-2 text-white/50 transition hover:bg-white/[0.08] hover:text-white"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing
                      ? "animate-spin"
                      : ""
                  }`}
                />
              </button>

              <div className="flex rounded-lg border border-white/10 bg-white/[0.03] p-1">
                <button
                  onClick={() =>
                    setViewMode("week")
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "week"
                      ? "bg-violet-500/20 text-violet-200"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  Week
                </button>

                <button
                  onClick={() =>
                    setViewMode("month")
                  }
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "month"
                      ? "bg-violet-500/20 text-violet-200"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  Month
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.025]">
            <div className="text-sm text-white/40">
              Loading calendar...
            </div>
          </div>
        ) : viewMode === "week" ? (
          <WeekCalendar
            days={getWeekDays(currentDate)}
            eventsByDay={eventsByDay}
            onSelect={setSelectedEvent}
          />
        ) : (
          <MonthCalendar
            currentDate={currentDate}
            days={getMonthDays(currentDate)}
            eventsByDay={eventsByDay}
            onSelect={setSelectedEvent}
          />
        )}

        {/* Event detail */}
        {selectedEvent && (
          <EventDetails
            event={selectedEvent}
            onClose={() =>
              setSelectedEvent(null)
            }
            onEdit={() =>
              openEditModal(selectedEvent)
            }
            onDelete={() =>
              handleDelete(selectedEvent)
            }
            onToggle={() =>
              toggleEnabled(selectedEvent)
            }
          />
        )}

        {/* Modal */}
        {showModal && (
          <EventModal
            form={form}
            setForm={setForm}
            editing={!!editingEvent}
            onClose={() => setShowModal(false)}
            onSubmit={handleSubmit}
            error={error}
          />
        )}
      </div>
    </AppShell>
  );
}

/* -------------------------------------------------------------------------- */
/* WEEK CALENDAR                                                              */
/* -------------------------------------------------------------------------- */

function WeekCalendar({
  days,
  eventsByDay,
  onSelect,
}: {
  days: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="grid grid-cols-7 border-b border-white/10">
        {days.map((day) => {
          const today = sameDay(day, new Date());

          return (
            <div
              key={day.toISOString()}
              className="border-r border-white/10 px-3 py-3 text-center last:border-r-0"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                {day.toLocaleDateString([], {
                  weekday: "short",
                })}
              </p>

              <div
                className={`mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  today
                    ? "bg-violet-600 text-white"
                    : "text-white/70"
                }`}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid min-h-[560px] grid-cols-7">
        {days.map((day) => {
          const dayEvents =
            eventsByDay[dateKey(day)] || [];

          return (
            <div
              key={day.toISOString()}
              className="border-r border-white/10 p-2 last:border-r-0"
            >
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <CalendarEventCard
                    key={event.id}
                    event={event}
                    onClick={() => onSelect(event)}
                  />
                ))}

                {dayEvents.length === 0 && (
                  <p className="pt-4 text-center text-[11px] text-white/15">
                    No events
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MONTH CALENDAR                                                             */
/* -------------------------------------------------------------------------- */

function MonthCalendar({
  currentDate,
  days,
  eventsByDay,
  onSelect,
}: {
  currentDate: Date;
  days: Date[];
  eventsByDay: Record<string, CalendarEvent[]>;
  onSelect: (event: CalendarEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]">
      <div className="grid grid-cols-7 border-b border-white/10">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
          (day) => (
            <div
              key={day}
              className="px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-white/30"
            >
              {day}
            </div>
          )
        )}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const outside =
            day.getMonth() !== currentDate.getMonth();

          const today = sameDay(day, new Date());

          const dayEvents =
            eventsByDay[dateKey(day)] || [];

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[130px] border-b border-r border-white/10 p-2 ${
                outside ? "opacity-30" : ""
              }`}
            >
              <div className="mb-2 flex justify-end">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    today
                      ? "bg-violet-600 font-semibold text-white"
                      : "text-white/50"
                  }`}
                >
                  {day.getDate()}
                </span>
              </div>

              <div className="space-y-1">
                {dayEvents
                  .slice(0, 4)
                  .map((event) => (
                    <button
                      key={event.id}
                      onClick={() => onSelect(event)}
                      className={`w-full truncate rounded-md border px-2 py-1 text-left text-[10px] transition hover:brightness-125 ${
                        TYPE_STYLES[event.event_type].bg
                      } ${
                        TYPE_STYLES[event.event_type].border
                      } ${
                        TYPE_STYLES[event.event_type].text
                      } ${
                        !event.enabled
                          ? "opacity-40"
                          : ""
                      }`}
                    >
                      <span className="font-semibold">
                        {formatTime(event.start_at)}
                      </span>{" "}
                      {event.title}
                    </button>
                  ))}

                {dayEvents.length > 4 && (
                  <p className="px-1 text-[10px] text-white/30">
                    +{dayEvents.length - 4} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EVENT CARD                                                                 */
/* -------------------------------------------------------------------------- */

function CalendarEventCard({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  const style =
    TYPE_STYLES[event.event_type];

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:brightness-125 ${style.bg} ${style.border} ${
        !event.enabled ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`truncate text-xs font-semibold ${style.text}`}
          >
            {event.title}
          </p>

          <p className="mt-1 text-[10px] text-white/35">
            {formatTime(event.start_at)} –{" "}
            {formatTime(event.end_at)}
          </p>
        </div>

        {event.multitask && (
          <span
            title="Multitasking enabled"
            className="rounded-md bg-white/5 p-1 text-white/35"
          >
            <MoreHorizontal className="h-3 w-3" />
          </span>
        )}
      </div>

      {event.location && (
        <div className="mt-2 flex items-center gap-1 text-[10px] text-white/30">
          <MapPin className="h-3 w-3" />
          <span className="truncate">
            {event.location}
          </span>
        </div>
      )}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* EVENT DETAILS                                                              */
/* -------------------------------------------------------------------------- */

function EventDetails({
  event,
  onClose,
  onEdit,
  onDelete,
  onToggle,
}: {
  event: CalendarEvent;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const style =
    TYPE_STYLES[event.event_type];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl border ${style.bg} ${style.border}`}
          >
            <CalendarDays
              className={`h-5 w-5 ${style.text}`}
            />
          </div>

          <div>
            <p
              className={`text-[10px] font-semibold uppercase tracking-wider ${style.text}`}
            >
              {event.event_type}
            </p>

            <h3 className="mt-1 text-lg font-semibold text-white">
              {event.title}
            </h3>
          </div>
        </div>

        <button
          onClick={onClose}
          className="rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailItem
          icon={<Clock3 className="h-4 w-4" />}
          label="Time"
          value={`${formatDate(
            event.start_at
          )} • ${formatTime(
            event.start_at
          )} – ${formatTime(event.end_at)}`}
        />

        <DetailItem
          icon={<MapPin className="h-4 w-4" />}
          label="Location"
          value={event.location || "Not specified"}
        />

        <DetailItem
          icon={<Check className="h-4 w-4" />}
          label="Status"
          value={
            event.enabled
              ? "Active"
              : "Disabled"
          }
        />

        <DetailItem
          icon={<MoreHorizontal className="h-4 w-4" />}
          label="Multitasking"
          value={
            event.multitask
              ? "Allowed"
              : "Not allowed"
          }
        />
      </div>

      {event.description && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/10 p-4">
          <p className="text-xs font-semibold text-white/60">
            Description
          </p>

          <p className="mt-2 text-sm leading-6 text-white/45">
            {event.description}
          </p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Edit
        </button>

        <button
          onClick={onToggle}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          <Check className="h-3.5 w-3.5" />
          {event.enabled
            ? "Disable"
            : "Enable"}
        </button>

        <button
          onClick={onDelete}
          className="inline-flex items-center gap-2 rounded-lg border border-red-400/10 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 p-3">
      <div className="flex items-center gap-2 text-white/25">
        {icon}
        <span className="text-[10px] uppercase tracking-wider">
          {label}
        </span>
      </div>

      <p className="mt-2 text-xs text-white/65">
        {value}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EVENT MODAL                                                                */
/* -------------------------------------------------------------------------- */

function EventModal({
  form,
  setForm,
  editing,
  onClose,
  onSubmit,
  error,
}: {
  form: ReturnType<typeof emptyForm>;
  setForm: React.Dispatch<
    React.SetStateAction<ReturnType<typeof emptyForm>>
  >;
  editing: boolean;
  onClose: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void;
  error: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#100b1a] shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {editing
                ? "Edit event"
                : "Add event"}
            </h2>

            <p className="mt-1 text-xs text-white/35">
              Create an event for your academic schedule.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/30 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 p-5"
        >
          {error && (
            <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">
              {error}
            </div>
          )}

          <Field label="Title">
            <input
              required
              value={form.title}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              placeholder="Physics Lecture"
              className="input"
            />
          </Field>

          <Field label="Description">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  description:
                    event.target.value,
                }))
              }
              placeholder="Optional details..."
              rows={3}
              className="input resize-none"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start">
              <input
                required
                type="datetime-local"
                value={form.start_at}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    start_at:
                      event.target.value,
                  }))
                }
                className="input"
              />
            </Field>

            <Field label="End">
              <input
                required
                type="datetime-local"
                value={form.end_at}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    end_at:
                      event.target.value,
                  }))
                }
                className="input"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <select
                value={form.event_type}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    event_type:
                      event.target.value as CalendarEventType,
                  }))
                }
                className="input"
              >
                {EVENT_TYPES.map((type) => (
                  <option
                    key={type.value}
                    value={type.value}
                  >
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Location">
              <input
                value={form.location}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    location:
                      event.target.value,
                  }))
                }
                placeholder="Room 203"
                className="input"
              />
            </Field>
          </div>

          <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.025] p-4">
            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Event enabled
                </p>

                <p className="mt-1 text-xs text-white/30">
                  Disabled events stay on your calendar but won&apos;t block other events.
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    enabled:
                      event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-violet-600"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-white/80">
                  Allow multitasking
                </p>

                <p className="mt-1 text-xs text-white/30">
                  Allow this event to overlap other events.
                </p>
              </div>

              <input
                type="checkbox"
                checked={form.multitask}
                onChange={(event) =>
                  setForm((previous) => ({
                    ...previous,
                    multitask:
                      event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-violet-600"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/50 transition hover:bg-white/5 hover:text-white"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              {editing
                ? "Save changes"
                : "Create event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-white/55">
        {label}
      </span>

      {children}
    </label>
  );
}