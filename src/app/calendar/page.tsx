"use client";

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  findConflicts,
  getCalendarEvents,
  getEventColor,
  updateCalendarEvent,
  type CalendarEvent,
  type CalendarEventType,
} from "@/lib/calendar";

type ViewMode = "week" | "month";

type FormState = {
  title: string;
  subtitle: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  eventType: CalendarEventType;
  location: string;
  notes: string;
  multitask: boolean;
};

const HOUR_HEIGHT = 72;

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

const emptyForm: FormState = {
  title: "",
  subtitle: "",
  description: "",
  date: "",
  startTime: "09:00",
  endTime: "10:00",
  eventType: "other",
  location: "",
  notes: "",
  multitask: false,
};

/* -------------------------------------------------------------------------- */
/* DATE HELPERS                                                               */
/* -------------------------------------------------------------------------- */

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);

  return result;
}

function startOfMonth(date: Date) {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);

  return result;
}

function endOfMonth(date: Date) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + 1);
  result.setDate(0);
  result.setHours(23, 59, 59, 999);

  return result;
}

function addDays(date: Date, amount: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);

  return result;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0"
  );
  const day = String(date.getDate()).padStart(
    2,
    "0"
  );

  return `${year}-${month}-${day}`;
}

function formatTimeInput(date: Date) {
  return `${String(date.getHours()).padStart(
    2,
    "0"
  )}:${String(date.getMinutes()).padStart(
    2,
    "0"
  )}`;
}

function combineDateTime(
  date: string,
  time: string
) {
  return new Date(`${date}T${time}:00`);
}

function formatTime(dateString: string) {
  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatHour(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);

  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function eventTypeLabel(
  type: CalendarEventType
) {
  return (
    EVENT_TYPES.find(
      (item) => item.value === type
    )?.label || "Other"
  );
}

function getWeekDays(date: Date) {
  const start = startOfWeek(date);

  return Array.from({ length: 7 }, (_, index) =>
    addDays(start, index)
  );
}

function getMonthGrid(date: Date) {
  const monthStart = startOfMonth(date);
  const firstDay = monthStart.getDay();

  const mondayOffset =
    firstDay === 0 ? 6 : firstDay - 1;

  const gridStart = addDays(
    monthStart,
    -mondayOffset
  );

  return Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index)
  );
}

function toFormState(
  event: CalendarEvent
): FormState {
  const start = new Date(event.start_at);
  const end = new Date(event.end_at);

  return {
    title: event.title,
    subtitle: event.subtitle || "",
    description: event.description || "",
    date: formatDateInput(start),
    startTime: formatTimeInput(start),
    endTime: formatTimeInput(end),
    eventType: event.event_type,
    location: event.location || "",
    notes: event.notes || "",
    multitask: event.multitask,
  };
}

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default function CalendarPage() {
  const [view, setView] =
    useState<ViewMode>("week");

  const [currentDate, setCurrentDate] =
    useState(new Date());

  const [events, setEvents] = useState<
    CalendarEvent[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState<
      CalendarEventType | "all"
    >("all");

  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

  const [editingEvent, setEditingEvent] =
    useState<CalendarEvent | null>(null);

  const [showModal, setShowModal] =
    useState(false);

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const [saving, setSaving] =
    useState(false);

  const [conflictMessage, setConflictMessage] =
    useState("");

  const today = useMemo(
    () => new Date(),
    []
  );

  const rangeStart = useMemo(() => {
    if (view === "week") {
      return startOfWeek(currentDate);
    }

    return startOfMonth(currentDate);
  }, [currentDate, view]);

  const rangeEnd = useMemo(() => {
    if (view === "week") {
      return addDays(rangeStart, 7);
    }

    return addDays(
      endOfMonth(currentDate),
      1
    );
  }, [currentDate, rangeStart, view]);

  const rangeStartKey =
    rangeStart.toISOString();

  const rangeEndKey =
    rangeEnd.toISOString();

  const weekDays = useMemo(
    () => getWeekDays(currentDate),
    [currentDate]
  );

  const monthDays = useMemo(
    () => getMonthGrid(currentDate),
    [currentDate]
  );

  const filteredEvents = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !query ||
        event.title
          .toLowerCase()
          .includes(query) ||
        event.subtitle
          ?.toLowerCase()
          .includes(query) ||
        event.description
          ?.toLowerCase()
          .includes(query) ||
        event.location
          ?.toLowerCase()
          .includes(query);

      const matchesType =
        typeFilter === "all" ||
        event.event_type === typeFilter;

      return (
        matchesSearch &&
        matchesType
      );
    });
  }, [events, search, typeFilter]);

  /* ------------------------------------------------------------------------ */
  /* LOAD EVENTS                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    let cancelled = false;

    async function load() {
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
              : "Failed to load calendar."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [rangeStartKey, rangeEndKey]);

  /* ------------------------------------------------------------------------ */
  /* NAVIGATION                                                               */
  /* ------------------------------------------------------------------------ */

  function goToday() {
    setCurrentDate(new Date());
  }

  function goPrevious() {
    setCurrentDate((current) => {
      const next = new Date(current);

      if (view === "week") {
        next.setDate(
          next.getDate() - 7
        );
      } else {
        next.setMonth(
          next.getMonth() - 1
        );
      }

      return next;
    });
  }

  function goNext() {
    setCurrentDate((current) => {
      const next = new Date(current);

      if (view === "week") {
        next.setDate(
          next.getDate() + 7
        );
      } else {
        next.setMonth(
          next.getMonth() + 1
        );
      }

      return next;
    });
  }

  /* ------------------------------------------------------------------------ */
  /* MODAL                                                                    */
  /* ------------------------------------------------------------------------ */

  function openCreateModal(
    date?: Date,
    hour?: number
  ) {
    const targetDate =
      date || currentDate;

    const startHour = hour ?? 9;
    const endHour = Math.min(
      startHour + 1,
      23
    );

    setEditingEvent(null);
    setSelectedEvent(null);
    setConflictMessage("");

    setForm({
      ...emptyForm,
      date: formatDateInput(
        targetDate
      ),
      startTime: `${String(
        startHour
      ).padStart(2, "0")}:00`,
      endTime: `${String(
        endHour
      ).padStart(2, "0")}:00`,
    });

    setShowModal(true);
  }

  function openEditModal(
    event: CalendarEvent
  ) {
    setSelectedEvent(null);
    setEditingEvent(event);
    setForm(toFormState(event));
    setConflictMessage("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingEvent(null);
    setConflictMessage("");
  }

  /* ------------------------------------------------------------------------ */
  /* SAVE                                                                     */
  /* ------------------------------------------------------------------------ */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.title.trim()) {
      setConflictMessage(
        "Please enter an event title."
      );
      return;
    }

    const start = combineDateTime(
      form.date,
      form.startTime
    );

    const end = combineDateTime(
      form.date,
      form.endTime
    );

    if (end <= start) {
      setConflictMessage(
        "The end time must be after the start time."
      );
      return;
    }

    try {
      setSaving(true);
      setConflictMessage("");

      if (editingEvent) {
        const conflicts =
          await findConflicts(
            start.toISOString(),
            end.toISOString(),
            editingEvent.id
          );

        if (
          conflicts.length > 0 &&
          !form.multitask
        ) {
          setConflictMessage(
            `This event overlaps ${
              conflicts.length
            } other event${
              conflicts.length === 1
                ? ""
                : "s"
            }. It will be disabled automatically.`
          );
        }

        const result =
          await updateCalendarEvent(
            editingEvent.id,
            {
              title: form.title,
              subtitle: form.subtitle,
              description:
                form.description,
              start_at:
                start.toISOString(),
              end_at:
                end.toISOString(),
              event_type:
                form.eventType,
              location:
                form.location,
              notes: form.notes,
              multitask:
                form.multitask,
            }
          );

        setEvents((current) =>
          current.map((item) =>
            item.id ===
            result.event.id
              ? result.event
              : item
          )
        );
      } else {
        const result =
          await createCalendarEvent({
            title: form.title,
            subtitle: form.subtitle,
            description:
              form.description,
            start_at:
              start.toISOString(),
            end_at:
              end.toISOString(),
            event_type:
              form.eventType,
            location:
              form.location,
            notes: form.notes,
            multitask:
              form.multitask,
          });

        setEvents((current) =>
          [
            ...current,
            result.event,
          ].sort(
            (a, b) =>
              new Date(
                a.start_at
              ).getTime() -
              new Date(
                b.start_at
              ).getTime()
          )
        );

        if (result.disabled) {
          setConflictMessage(
            "Event created but disabled because it conflicts with another event."
          );
        }
      }

      setShowModal(false);
      setEditingEvent(null);
    } catch (err) {
      setConflictMessage(
        err instanceof Error
          ? err.message
          : "Failed to save event."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* DELETE                                                                   */
  /* ------------------------------------------------------------------------ */

  async function handleDelete(
    event: CalendarEvent
  ) {
    const confirmed =
      window.confirm(
        `Delete "${event.title}" from your calendar?`
      );

    if (!confirmed) return;

    try {
      await deleteCalendarEvent(
        event.id
      );

      setEvents((current) =>
        current.filter(
          (item) =>
            item.id !== event.id
        )
      );

      setSelectedEvent(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete event."
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* ENABLE/DISABLE                                                           */
  /* ------------------------------------------------------------------------ */

  async function toggleEnabled(
    event: CalendarEvent
  ) {
    try {
      const result =
        await updateCalendarEvent(
          event.id,
          {
            enabled:
              !event.enabled,
          }
        );

      setEvents((current) =>
        current.map((item) =>
          item.id ===
          result.event.id
            ? result.event
            : item
        )
      );

      setSelectedEvent(
        result.event
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update event."
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* TITLE                                                                    */
  /* ------------------------------------------------------------------------ */

  const headerTitle = useMemo(() => {
    if (view === "month") {
      return new Intl.DateTimeFormat(
        "en-CA",
        {
          month: "long",
          year: "numeric",
        }
      ).format(currentDate);
    }

    const first = weekDays[0];
    const last = weekDays[6];

    const firstMonth =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          month: "short",
        }
      ).format(first);

    const lastMonth =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          month: "short",
        }
      ).format(last);

    if (
      first.getMonth() ===
      last.getMonth()
    ) {
      return `${firstMonth} ${first.getFullYear()}`;
    }

    return `${firstMonth} ${first.getFullYear()} – ${lastMonth} ${last.getFullYear()}`;
  }, [currentDate, view, weekDays]);

  return (
    <AppShell>
      <div className="min-h-screen pb-8">
        {/* HEADER */}
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
              <CalendarDays size={16} />

              <span>Schedule</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-white">
              Calendar
            </h1>

            <p className="mt-1 text-sm text-white/40">
              Your entire academic schedule,
              all in one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/[0.08] hover:text-white"
            >
              Today
            </button>

            <button
              onClick={() =>
                openCreateModal()
              }
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500"
            >
              <Plus size={17} />

              Add Event
            </button>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="mb-4 rounded-2xl border border-white/10 bg-[#0d0917] p-3 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrevious}
                className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5 text-white/45 transition hover:bg-white/[0.08] hover:text-white"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={goNext}
                className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5 text-white/45 transition hover:bg-white/[0.08] hover:text-white"
              >
                <ChevronRight size={18} />
              </button>

              <div className="ml-2 min-w-[150px] text-base font-semibold text-white">
                {headerTitle}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* SEARCH */}
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
                />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search..."
                  className="w-44 rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-500/50"
                />
              </div>

              {/* FILTER */}
              <div className="relative">
                <Filter
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
                />

                <select
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(
                      e.target.value as
                        | CalendarEventType
                        | "all"
                    )
                  }
                  className="appearance-none rounded-xl border border-white/10 bg-black/20 py-2.5 pl-9 pr-8 text-sm text-white outline-none focus:border-violet-500/50"
                >
                  <option value="all">
                    All types
                  </option>

                  {EVENT_TYPES.map(
                    (type) => (
                      <option
                        key={
                          type.value
                        }
                        value={
                          type.value
                        }
                      >
                        {type.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* REFRESH */}
              <button
                onClick={async () => {
                  try {
                    setRefreshing(true);

                    const data =
                      await getCalendarEvents(
                        rangeStartKey,
                        rangeEndKey
                      );

                    setEvents(data);
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Failed to refresh."
                    );
                  } finally {
                    setRefreshing(
                      false
                    );
                  }
                }}
                disabled={refreshing}
                className="rounded-xl border border-white/10 bg-white/[0.035] p-2.5 text-white/45 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing
                      ? "animate-spin"
                      : ""
                  }
                />
              </button>

              {/* VIEW SWITCH */}
              <div className="flex rounded-xl border border-white/10 bg-black/20 p-1">
                <button
                  onClick={() =>
                    setView("week")
                  }
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    view === "week"
                      ? "bg-violet-600 text-white"
                      : "text-white/35 hover:text-white"
                  }`}
                >
                  Week
                </button>

                <button
                  onClick={() =>
                    setView("month")
                  }
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    view === "month"
                      ? "bg-violet-600 text-white"
                      : "text-white/35 hover:text-white"
                  }`}
                >
                  Month
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <span>{error}</span>

            <button
              onClick={() =>
                setError("")
              }
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* CALENDAR */}
        {view === "week" ? (
          <WeekCalendar
            days={weekDays}
            events={filteredEvents}
            loading={loading}
            today={today}
            onEventClick={
              setSelectedEvent
            }
            onCreate={
              openCreateModal
            }
          />
        ) : (
          <MonthCalendar
            days={monthDays}
            currentMonth={
              currentDate
            }
            events={
              filteredEvents
            }
            loading={loading}
            today={today}
            onEventClick={
              setSelectedEvent
            }
            onCreate={
              openCreateModal
            }
          />
        )}

        {/* DETAILS */}
        {selectedEvent && (
          <EventDetails
            event={selectedEvent}
            onClose={() =>
              setSelectedEvent(
                null
              )
            }
            onEdit={() =>
              openEditModal(
                selectedEvent
              )
            }
            onDelete={() =>
              handleDelete(
                selectedEvent
              )
            }
            onToggle={() =>
              toggleEnabled(
                selectedEvent
              )
            }
          />
        )}

        {/* MODAL */}
        {showModal && (
          <EventModal
            form={form}
            setForm={setForm}
            editing={editingEvent}
            saving={saving}
            conflictMessage={
              conflictMessage
            }
            onClose={closeModal}
            onSubmit={
              handleSubmit
            }
          />
        )}
      </div>
    </AppShell>
  );
}

/* ========================================================================== */
/* WEEK CALENDAR                                                              */
/* ========================================================================== */

function WeekCalendar({
  days,
  events,
  loading,
  today,
  onEventClick,
  onCreate,
}: {
  days: Date[];
  events: CalendarEvent[];
  loading: boolean;
  today: Date;
  onEventClick: (
    event: CalendarEvent
  ) => void;
  onCreate: (
    date?: Date,
    hour?: number
  ) => void;
}) {
  const hours = Array.from(
    { length: 24 },
    (_, i) => i
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0813] shadow-2xl shadow-black/20">
      {/* OUTER CALENDAR SCROLLER */}
      <div className="calendar-scroll relative max-h-[calc(100vh-270px)] min-h-[600px] overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-40 grid min-w-[920px] grid-cols-[76px_repeat(7,minmax(120px,1fr))] border-b border-white/10 bg-[#0e0a18]/95 backdrop-blur-xl">
          <div className="sticky left-0 z-50 border-r border-white/10 bg-[#0e0a18]/95" />

          {days.map((day) => {
            const isToday =
              sameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={`border-r border-white/10 px-2 py-3 text-center last:border-r-0 ${
                  isToday
                    ? "bg-violet-500/[0.045]"
                    : ""
                }`}
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">
                  {new Intl.DateTimeFormat(
                    "en-CA",
                    {
                      weekday: "short",
                    }
                  ).format(day)}
                </div>

                <div
                  className={`mx-auto mt-1.5 flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40"
                      : "text-white/65"
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* BODY */}
        <div className="min-w-[920px]">
          <div
            className="grid grid-cols-[76px_repeat(7,minmax(120px,1fr))]"
            style={{
              height:
                24 * HOUR_HEIGHT,
            }}
          >
            {/* TIME COLUMN */}
            <div className="sticky left-0 z-30 border-r border-white/10 bg-[#0b0813]">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex justify-end pr-3"
                  style={{
                    top:
                      hour *
                        HOUR_HEIGHT -
                      8,
                  }}
                >
                  <span className="whitespace-nowrap text-[10px] font-medium text-white/25">
                    {formatHour(hour)}
                  </span>
                </div>
              ))}
            </div>

            {/* DAYS */}
            {days.map((day) => {
              const dayEvents =
                getEventsForDay(
                  events,
                  day
                );

              return (
                <div
                  key={day.toISOString()}
                  className={`relative border-r border-white/[0.07] last:border-r-0 ${
                    sameDay(
                      day,
                      today
                    )
                      ? "bg-violet-500/[0.012]"
                      : ""
                  }`}
                >
                  {/* HOURLY GRID */}
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      onClick={() =>
                        onCreate(
                          day,
                          hour
                        )
                      }
                      className="absolute left-0 right-0 border-t border-white/[0.055] transition hover:bg-violet-500/[0.025]"
                      style={{
                        top:
                          hour *
                          HOUR_HEIGHT,
                        height:
                          HOUR_HEIGHT,
                      }}
                    />
                  ))}

                  {/* HALF HOUR */}
                  {hours.map((hour) => (
                    <div
                      key={`half-${hour}`}
                      className="pointer-events-none absolute left-0 right-0 border-t border-white/[0.018]"
                      style={{
                        top:
                          hour *
                            HOUR_HEIGHT +
                          HOUR_HEIGHT /
                            2,
                      }}
                    />
                  ))}

                  {/* CURRENT TIME */}
                  {sameDay(
                    day,
                    today
                  ) && (
                    <CurrentTimeLine />
                  )}

                  {/* EVENTS */}
                  {layoutDayEvents(
                    dayEvents
                  ).map((item) => {
                    const position =
                      getEventPosition(
                        item.event,
                        day
                      );

                    const color =
                      getEventColor(
                        item.event
                          .event_type,
                        item.event.color
                      );

                    return (
                      <button
                        key={
                          item.event.id
                        }
                        onClick={(e) => {
                          e.stopPropagation();

                          onEventClick(
                            item.event
                          );
                        }}
                        className={`absolute z-10 overflow-hidden rounded-xl border text-left shadow-lg transition hover:z-30 hover:scale-[1.005] hover:brightness-110 ${
                          item.event
                            .enabled
                            ? ""
                            : "opacity-40"
                        }`}
                        style={{
                          top:
                            position.top +
                            2,
                          height:
                            Math.max(
                              position.height -
                                4,
                              32
                            ),
                          left: `calc(${item.column} * ${
                            100 /
                            item.columns
                          }% + 4px)`,
                          width: `calc(${
                            100 /
                            item.columns
                          }% - 8px)`,
                          backgroundColor: `${color}18`,
                          borderColor: `${color}55`,
                          boxShadow: `0 8px 24px ${color}12`,
                        }}
                      >
                        <div className="flex h-full min-w-0 flex-col px-2.5 py-2">
                          <div className="flex min-w-0 items-start gap-1.5">
                            <div
                              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor:
                                  color,
                              }}
                            />

                            <span className="truncate text-[11px] font-semibold text-white/85">
                              {
                                item
                                  .event
                                  .title
                              }
                            </span>
                          </div>

                          {position.height >=
                            55 && (
                            <span className="mt-1 truncate pl-3 text-[9px] text-white/45">
                              {formatTime(
                                item
                                  .event
                                  .start_at
                              )}{" "}
                              –{" "}
                              {formatTime(
                                item
                                  .event
                                  .end_at
                              )}
                            </span>
                          )}

                          {position.height >=
                            78 &&
                            item.event
                              .location && (
                              <span className="mt-1 flex min-w-0 items-center gap-1 pl-3 text-[9px] text-white/35">
                                <MapPin
                                  size={
                                    9
                                  }
                                />

                                <span className="truncate">
                                  {
                                    item
                                      .event
                                      .location
                                  }
                                </span>
                              </span>
                            )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#0b0813]/70 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151020] px-4 py-3 text-sm text-white/55 shadow-xl">
              <RefreshCw
                size={16}
                className="animate-spin"
              />

              Loading calendar...
            </div>
          </div>
        )}
      </div>

      {/* SCROLL HINT */}
      <div className="border-t border-white/[0.06] bg-black/10 px-4 py-2 text-center text-[10px] text-white/20">
        Scroll vertically to move through the day
        · horizontally on smaller screens
      </div>
    </div>
  );
}

/* ========================================================================== */
/* MONTH CALENDAR                                                             */
/* ========================================================================== */

function MonthCalendar({
  days,
  currentMonth,
  events,
  loading,
  today,
  onEventClick,
  onCreate,
}: {
  days: Date[];
  currentMonth: Date;
  events: CalendarEvent[];
  loading: boolean;
  today: Date;
  onEventClick: (
    event: CalendarEvent
  ) => void;
  onCreate: (
    date?: Date,
    hour?: number
  ) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b0813] shadow-2xl shadow-black/20">
      <div className="grid grid-cols-7 border-b border-white/10 bg-[#0e0a18]">
        {[
          "Mon",
          "Tue",
          "Wed",
          "Thu",
          "Fri",
          "Sat",
          "Sun",
        ].map((day) => (
          <div
            key={day}
            className="border-r border-white/10 px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isCurrentMonth =
            day.getMonth() ===
            currentMonth.getMonth();

          const isToday = sameDay(
            day,
            today
          );

          const dayEvents =
            getEventsForDay(
              events,
              day
            );

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[150px] border-b border-r border-white/[0.07] p-2.5 transition hover:bg-white/[0.015] ${
                !isCurrentMonth
                  ? "bg-black/10"
                  : ""
              }`}
            >
              <button
                onClick={() =>
                  onCreate(day)
                }
                className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                  isToday
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/30"
                    : isCurrentMonth
                    ? "text-white/60 hover:bg-white/10"
                    : "text-white/20"
                }`}
              >
                {day.getDate()}
              </button>

              <div className="space-y-1">
                {dayEvents
                  .slice(0, 4)
                  .map((event) => {
                    const color =
                      getEventColor(
                        event.event_type,
                        event.color
                      );

                    return (
                      <button
                        key={event.id}
                        onClick={() =>
                          onEventClick(
                            event
                          )
                        }
                        className={`flex w-full items-center gap-1.5 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition hover:brightness-125 ${
                          event.enabled
                            ? ""
                            : "opacity-40"
                        }`}
                        style={{
                          backgroundColor: `${color}14`,
                          borderColor: `${color}35`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              color,
                          }}
                        />

                        <span className="truncate text-[10px] text-white/65">
                          {
                            event.title
                          }
                        </span>
                      </button>
                    );
                  })}

                {dayEvents.length >
                  4 && (
                  <div className="px-2 pt-1 text-[10px] text-white/25">
                    +
                    {dayEvents.length -
                      4}{" "}
                    more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b0813]/70 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151020] px-4 py-3 text-sm text-white/55">
            <RefreshCw
              size={16}
              className="animate-spin"
            />

            Loading calendar...
          </div>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* CURRENT TIME                                                               */
/* ========================================================================== */

function CurrentTimeLine() {
  const [minutes, setMinutes] = useState(() => {
    const now = new Date();

    return (
      now.getHours() * 60 +
      now.getMinutes() +
      now.getSeconds() / 60
    );
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    const interval = window.setInterval(() => {
      const now = new Date();

      const currentMinutes =
        now.getHours() * 60 +
        now.getMinutes() +
        now.getSeconds() / 60;

      setMinutes(currentMinutes);
    }, 30000);

    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, []);

  // Don't render the moving line during SSR.
  if (!mounted) {
    return null;
  }

  // Round to avoid floating-point differences.
  const top = Math.round(
    (minutes / 60) * HOUR_HEIGHT * 100
  ) / 100;

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-30 flex items-center"
      style={{
        top: `${top}px`,
      }}
    >
      <div className="h-2 w-2 shrink-0 -translate-x-1/2 rounded-full bg-red-400 shadow-lg shadow-red-500/30" />

      <div className="h-px flex-1 bg-red-400/70" />
    </div>
  );
}

/* ========================================================================== */
/* EVENT DETAILS                                                              */
/* ========================================================================== */

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
  const color = getEventColor(
    event.event_type,
    event.color
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#110d1b] shadow-2xl">
        <div
          className="h-1.5"
          style={{
            backgroundColor: color,
          }}
        />

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className="mb-2 inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color,
                  borderColor: `${color}55`,
                  backgroundColor: `${color}12`,
                }}
              >
                {eventTypeLabel(
                  event.event_type
                )}
              </div>

              <h2 className="text-xl font-bold text-white">
                {event.title}
              </h2>

              {event.subtitle && (
                <p className="mt-1 text-sm text-white/40">
                  {event.subtitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 space-y-3">
            <DetailRow
              icon={
                <CalendarDays
                  size={16}
                />
              }
              label="Schedule"
              value={`${new Intl.DateTimeFormat(
                "en-CA",
                {
                  weekday:
                    "long",
                  month:
                    "long",
                  day: "numeric",
                  year:
                    "numeric",
                }
              ).format(
                new Date(
                  event.start_at
                )
              )} · ${formatTime(
                event.start_at
              )} – ${formatTime(
                event.end_at
              )}`}
            />

            {event.location && (
              <DetailRow
                icon={
                  <MapPin size={16} />
                }
                label="Location"
                value={
                  event.location
                }
              />
            )}

            {event.description && (
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                  Description
                </div>

                <p className="text-sm leading-6 text-white/60">
                  {
                    event.description
                  }
                </p>
              </div>
            )}

            {event.notes && (
              <div className="rounded-xl border border-white/8 bg-white/[0.025] p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/25">
                  Notes
                </div>

                <p className="text-sm leading-6 text-white/60">
                  {event.notes}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-white/65 transition hover:bg-white/[0.08] hover:text-white"
            >
              <Edit3 size={15} />
              Edit
            </button>

            <button
              onClick={onToggle}
              className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm text-white/60 transition hover:bg-white/[0.08] hover:text-white"
            >
              {event.enabled
                ? "Disable"
                : "Enable"}
            </button>

            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-2.5 text-sm text-red-300 transition hover:bg-red-500/15"
            >
              <Trash2 size={15} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3">
      <div className="mt-0.5 text-white/30">
        {icon}
      </div>

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider text-white/25">
          {label}
        </div>

        <div className="mt-1 text-sm text-white/65">
          {value}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* EVENT MODAL                                                                */
/* ========================================================================== */

function EventModal({
  form,
  setForm,
  editing,
  saving,
  conflictMessage,
  onClose,
  onSubmit,
}: {
  form: FormState;
  setForm: Dispatch<
    SetStateAction<FormState>
  >;
  editing: CalendarEvent | null;
  saving: boolean;
  conflictMessage: string;
  onClose: () => void;
  onSubmit: (
    event: FormEvent<HTMLFormElement>
  ) => void;
}) {
  function update(
    key: keyof FormState,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#110d1b] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">
              {editing
                ? "Edit Event"
                : "Create Event"}
            </h2>

            <p className="mt-0.5 text-xs text-white/35">
              Add something to your schedule.
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/30 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 p-5"
        >
          {conflictMessage && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm leading-5 text-amber-300">
              {conflictMessage}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Title
            </label>

            <input
              value={form.title}
              onChange={(e) =>
                update(
                  "title",
                  e.target.value
                )
              }
              placeholder="e.g. Physics Lecture"
              className="input"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Subtitle
            </label>

            <input
              value={form.subtitle}
              onChange={(e) =>
                update(
                  "subtitle",
                  e.target.value
                )
              }
              placeholder="Optional short description"
              className="input"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                Date
              </label>

              <input
                type="date"
                value={form.date}
                onChange={(e) =>
                  update(
                    "date",
                    e.target.value
                  )
                }
                className="input"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                Event type
              </label>

              <select
                value={
                  form.eventType
                }
                onChange={(e) =>
                  update(
                    "eventType",
                    e.target
                      .value as CalendarEventType
                  )
                }
                className="input"
              >
                {EVENT_TYPES.map(
                  (type) => (
                    <option
                      key={
                        type.value
                      }
                      value={
                        type.value
                      }
                    >
                      {type.label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                Start time
              </label>

              <input
                type="time"
                value={
                  form.startTime
                }
                onChange={(e) =>
                  update(
                    "startTime",
                    e.target.value
                  )
                }
                className="input"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/55">
                End time
              </label>

              <input
                type="time"
                value={
                  form.endTime
                }
                onChange={(e) =>
                  update(
                    "endTime",
                    e.target.value
                  )
                }
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Location
            </label>

            <input
              value={
                form.location
              }
              onChange={(e) =>
                update(
                  "location",
                  e.target.value
                )
              }
              placeholder="e.g. STE A001"
              className="input"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Description
            </label>

            <textarea
              value={
                form.description
              }
              onChange={(e) =>
                update(
                  "description",
                  e.target.value
                )
              }
              rows={3}
              placeholder="What is this event about?"
              className="input resize-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/55">
              Notes
            </label>

            <textarea
              value={form.notes}
              onChange={(e) =>
                update(
                  "notes",
                  e.target.value
                )
              }
              rows={2}
              placeholder="Anything else..."
              className="input resize-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/[0.025] p-3">
            <input
              type="checkbox"
              checked={
                form.multitask
              }
              onChange={(e) =>
                update(
                  "multitask",
                  e.target.checked
                )
              }
              className="h-4 w-4 accent-violet-600"
            />

            <div>
              <div className="text-sm font-medium text-white/75">
                Allow multitasking
              </div>

              <div className="mt-0.5 text-xs text-white/35">
                Allow this event to
                overlap another event.
              </div>
            </div>
          </label>

          <div className="flex justify-end gap-2 border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/55 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {saving && (
                <RefreshCw
                  size={15}
                  className="animate-spin"
                />
              )}

              {editing
                ? "Save Changes"
                : "Create Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* EVENT POSITIONING                                                          */
/* ========================================================================== */

function getEventPosition(
  event: CalendarEvent,
  day: Date
) {
  const start = new Date(
    event.start_at
  );

  const end = new Date(
    event.end_at
  );

  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const visibleStart =
    start < dayStart
      ? dayStart
      : start;

  const visibleEnd =
    end > dayEnd
      ? dayEnd
      : end;

  const startMinutes =
    visibleStart.getHours() * 60 +
    visibleStart.getMinutes();

  const endMinutes =
    visibleEnd.getHours() * 60 +
    visibleEnd.getMinutes();

  const top =
    (startMinutes / 60) *
    HOUR_HEIGHT;

  let height =
    ((endMinutes -
      startMinutes) /
      60) *
    HOUR_HEIGHT;

  if (height <= 0) {
    height = 30;
  }

  return {
    top,
    height,
  };
}

/* ========================================================================== */
/* EVENT GROUPING                                                             */
/* ========================================================================== */

function getEventsForDay(
  events: CalendarEvent[],
  day: Date
) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  return events
    .filter((event) => {
      const start = new Date(
        event.start_at
      );

      const end = new Date(
        event.end_at
      );

      return (
        start <= dayEnd &&
        end >= dayStart
      );
    })
    .sort(
      (a, b) =>
        new Date(
          a.start_at
        ).getTime() -
        new Date(
          b.start_at
        ).getTime()
    );
}

function layoutDayEvents(
  events: CalendarEvent[]
) {
  const sorted = [...events].sort(
    (a, b) =>
      new Date(
        a.start_at
      ).getTime() -
      new Date(
        b.start_at
      ).getTime()
  );

  const result: {
    event: CalendarEvent;
    column: number;
    columns: number;
  }[] = [];

  const columns: CalendarEvent[][] =
    [];

  for (const event of sorted) {
    const start = new Date(
      event.start_at
    ).getTime();

    let placed = false;

    for (
      let column = 0;
      column < columns.length;
      column++
    ) {
      const last =
        columns[column][
          columns[column].length - 1
        ];

      if (
        last &&
        start >=
          new Date(
            last.end_at
          ).getTime()
      ) {
        columns[column].push(
          event
        );

        result.push({
          event,
          column,
          columns: 1,
        });

        placed = true;

        break;
      }
    }

    if (!placed) {
      columns.push([event]);

      result.push({
        event,
        column:
          columns.length - 1,
        columns: 1,
      });
    }
  }

  for (const item of result) {
    const itemStart =
      new Date(
        item.event.start_at
      ).getTime();

    const itemEnd =
      new Date(
        item.event.end_at
      ).getTime();

    const overlapping =
      sorted.filter(
        (other) => {
          const otherStart =
            new Date(
              other.start_at
            ).getTime();

          const otherEnd =
            new Date(
              other.end_at
            ).getTime();

          return (
            itemStart <
              otherEnd &&
            otherStart <
              itemEnd
          );
        }
      );

    item.columns = Math.max(
      overlapping.length,
      1
    );

    item.column = Math.max(
      overlapping.findIndex(
        (other) =>
          other.id ===
          item.event.id
      ),
      0
    );
  }

  return result;
}