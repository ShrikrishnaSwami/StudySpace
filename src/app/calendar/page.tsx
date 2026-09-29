"use client";

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Filter,
  List,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  Check,
  AlertTriangle,
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

const HOUR_HEIGHT = 68;

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

function startOfWeek(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);

  const day = result.getDay();
  result.setDate(
    result.getDate() + (day === 0 ? -6 : 1 - day)
  );

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
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatTimeInput(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

function combineDateTime(date: string, time: string) {
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

function eventTypeLabel(type: CalendarEventType) {
  return (
    EVENT_TYPES.find((item) => item.value === type)?.label ||
    "Other"
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
  const day = monthStart.getDay();

  const mondayOffset = day === 0 ? 6 : day - 1;
  const gridStart = addDays(monthStart, -mondayOffset);

  return Array.from({ length: 42 }, (_, index) =>
    addDays(gridStart, index)
  );
}

function getEventsForDay(
  events: CalendarEvent[],
  day: Date
) {
  return events
    .filter((event) =>
      sameDay(new Date(event.start_at), day)
    )
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() -
        new Date(b.start_at).getTime()
    );
}

function toFormState(event: CalendarEvent): FormState {
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

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] =
    useState<CalendarEventType | "all">("all");

  const [error, setError] = useState("");
  const [selectedEvent, setSelectedEvent] =
    useState<CalendarEvent | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] =
    useState<CalendarEvent | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<CalendarEvent | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [conflictMessage, setConflictMessage] =
    useState("");

  const [form, setForm] =
    useState<FormState>(emptyForm);

  const today = useMemo(() => new Date(), []);

  const rangeStart = useMemo(
    () =>
      view === "week"
        ? startOfWeek(currentDate)
        : startOfMonth(currentDate),
    [currentDate, view]
  );

  const rangeEnd = useMemo(
    () =>
      view === "week"
        ? addDays(rangeStart, 7)
        : addDays(endOfMonth(currentDate), 1),
    [rangeStart, currentDate, view]
  );

  const weekDays = useMemo(
    () => getWeekDays(currentDate),
    [currentDate]
  );

  const monthDays = useMemo(
    () => getMonthGrid(currentDate),
    [currentDate]
  );

  const filteredEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return events.filter((event) => {
      const matchesSearch =
        !query ||
        event.title.toLowerCase().includes(query) ||
        event.subtitle?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query);

      const matchesType =
        typeFilter === "all" ||
        event.event_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [events, search, typeFilter]);

  const stats = useMemo(() => {
    const enabled = filteredEvents.filter(
      (event) => event.enabled
    );

    const todayEvents = enabled.filter((event) =>
      sameDay(new Date(event.start_at), today)
    );

    const exams = enabled.filter(
      (event) => event.event_type === "exam"
    );

    return {
      total: filteredEvents.length,
      today: todayEvents.length,
      exams: exams.length,
    };
  }, [filteredEvents, today]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await getCalendarEvents(
          rangeStart.toISOString(),
          rangeEnd.toISOString()
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

    void load();

    return () => {
      cancelled = true;
    };
  }, [rangeStart, rangeEnd]);

  function goToday() {
    setCurrentDate(new Date());
  }

  function goPrevious() {
    setCurrentDate((current) => {
      const next = new Date(current);

      if (view === "week") {
        next.setDate(next.getDate() - 7);
      } else {
        next.setMonth(next.getMonth() - 1);
      }

      return next;
    });
  }

  function goNext() {
    setCurrentDate((current) => {
      const next = new Date(current);

      if (view === "week") {
        next.setDate(next.getDate() + 7);
      } else {
        next.setMonth(next.getMonth() + 1);
      }

      return next;
    });
  }

  function openCreateModal(
    date?: Date,
    hour?: number
  ) {
    const targetDate = date || currentDate;
    const startHour = hour ?? 9;

    setEditingEvent(null);
    setSelectedEvent(null);
    setConflictMessage("");

    setForm({
      ...emptyForm,
      date: formatDateInput(targetDate),
      startTime: `${String(startHour).padStart(2, "0")}:00`,
      endTime: `${String(
        Math.min(startHour + 1, 23)
      ).padStart(2, "0")}:00`,
    });

    setShowModal(true);
  }

  function openEditModal(event: CalendarEvent) {
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

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!form.title.trim()) {
      setConflictMessage("Please enter an event title.");
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

      const conflicts = await findConflicts(
        start.toISOString(),
        end.toISOString(),
        editingEvent?.id
      );

      if (conflicts.length > 0 && !form.multitask) {
        setConflictMessage(
          `This overlaps ${conflicts.length} other ${
            conflicts.length === 1 ? "event" : "events"
          }. The event will be disabled automatically.`
        );
      }

      if (editingEvent) {
        const result = await updateCalendarEvent(
          editingEvent.id,
          {
            title: form.title.trim(),
            subtitle: form.subtitle,
            description: form.description,
            start_at: start.toISOString(),
            end_at: end.toISOString(),
            event_type: form.eventType,
            location: form.location,
            notes: form.notes,
            multitask: form.multitask,
          }
        );

        setEvents((current) =>
          current.map((item) =>
            item.id === result.event.id
              ? result.event
              : item
          )
        );
      } else {
        const result = await createCalendarEvent({
          title: form.title.trim(),
          subtitle: form.subtitle,
          description: form.description,
          start_at: start.toISOString(),
          end_at: end.toISOString(),
          event_type: form.eventType,
          location: form.location,
          notes: form.notes,
          multitask: form.multitask,
        });

        setEvents((current) =>
          [...current, result.event].sort(
            (a, b) =>
              new Date(a.start_at).getTime() -
              new Date(b.start_at).getTime()
          )
        );
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

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      await deleteCalendarEvent(deleteTarget.id);

      setEvents((current) =>
        current.filter(
          (item) => item.id !== deleteTarget.id
        )
      );

      setSelectedEvent(null);
      setDeleteTarget(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete event."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function toggleEnabled(event: CalendarEvent) {
    try {
      const result = await updateCalendarEvent(
        event.id,
        {
          enabled: !event.enabled,
        }
      );

      setEvents((current) =>
        current.map((item) =>
          item.id === result.event.id
            ? result.event
            : item
        )
      );

      setSelectedEvent(result.event);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update event."
      );
    }
  }

  async function refresh() {
    try {
      setRefreshing(true);
      setError("");

      const data = await getCalendarEvents(
        rangeStart.toISOString(),
        rangeEnd.toISOString()
      );

      setEvents(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to refresh calendar."
      );
    } finally {
      setRefreshing(false);
    }
  }

  const headerTitle = useMemo(() => {
    if (view === "month") {
      return new Intl.DateTimeFormat("en-CA", {
        month: "long",
        year: "numeric",
      }).format(currentDate);
    }

    const first = weekDays[0];
    const last = weekDays[6];

    const firstMonth = new Intl.DateTimeFormat("en-CA", {
      month: "short",
    }).format(first);

    const lastMonth = new Intl.DateTimeFormat("en-CA", {
      month: "short",
    }).format(last);

    if (first.getMonth() === last.getMonth()) {
      return `${firstMonth} ${first.getFullYear()}`;
    }

    return `${firstMonth} ${first.getFullYear()} – ${lastMonth} ${last.getFullYear()}`;
  }, [currentDate, view, weekDays]);

  return (
    <AppShell
      title="Calendar"
      description="Your academic schedule, organized around you."
    >
      <div className="mx-auto max-w-[1500px] space-y-5 pb-8">
        {/* Header */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/15 bg-violet-500/[0.07] px-3 py-1.5 text-xs font-medium text-violet-300">
                <CalendarDays size={14} />
                Academic planner
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Calendar
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/35 sm:text-base">
                Keep classes, study sessions, deadlines and exams
                visible without letting your schedule become clutter.
              </p>
            </div>

            <button
              onClick={() => openCreateModal()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500 active:scale-[0.98]"
            >
              <Plus size={17} />
              Add event
            </button>
          </div>
        </section>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <MiniStat
            label="This view"
            value={stats.total}
            icon={<List size={15} />}
          />

          <MiniStat
            label="Today"
            value={stats.today}
            icon={<Clock3 size={15} />}
          />

          <MiniStat
            label="Exams"
            value={stats.exams}
            icon={<AlertTriangle size={15} />}
          />
        </div>

        {/* Toolbar */}
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goPrevious}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                onClick={goNext}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 text-white/40 transition hover:bg-white/[0.06] hover:text-white"
              >
                <ChevronRight size={18} />
              </button>

              <button
                onClick={goToday}
                className="ml-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3.5 py-2.5 text-sm font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
              >
                Today
              </button>

              <div className="ml-2 hidden text-sm font-semibold text-white sm:block">
                {headerTitle}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1 sm:flex-none">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search events..."
                  className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/20 pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-500/40 sm:w-44"
                />
              </div>

              <div className="relative">
                <Filter
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
                />

                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(
                      event.target.value as
                        | CalendarEventType
                        | "all"
                    )
                  }
                  className="h-10 appearance-none rounded-xl border border-white/[0.07] bg-black/20 pl-9 pr-8 text-xs text-white/55 outline-none focus:border-violet-500/40"
                >
                  <option value="all">All types</option>

                  {EVENT_TYPES.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                    >
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={refresh}
                disabled={refreshing}
                className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-2.5 text-white/35 transition hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
                aria-label="Refresh calendar"
              >
                <RefreshCw
                  size={16}
                  className={
                    refreshing ? "animate-spin" : ""
                  }
                />
              </button>

              <div className="flex rounded-xl border border-white/[0.07] bg-black/20 p-1">
                <ViewButton
                  active={view === "week"}
                  onClick={() => setView("week")}
                >
                  Week
                </ViewButton>

                <ViewButton
                  active={view === "month"}
                  onClick={() => setView("month")}
                >
                  Month
                </ViewButton>
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-white/[0.05] pt-3 sm:hidden">
            <p className="text-center text-xs font-medium text-white/35">
              {headerTitle}
            </p>
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3.5 text-sm text-red-300">
            <AlertTriangle
              size={16}
              className="mt-0.5 shrink-0"
            />

            <span>{error}</span>

            <button
              onClick={() => setError("")}
              className="ml-auto text-red-300/50 hover:text-red-300"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Calendar */}
        {view === "week" ? (
          <WeekCalendar
            days={weekDays}
            events={filteredEvents}
            loading={loading}
            today={today}
            onEventClick={setSelectedEvent}
            onCreate={openCreateModal}
          />
        ) : (
          <MonthCalendar
            days={monthDays}
            currentMonth={currentDate}
            events={filteredEvents}
            loading={loading}
            today={today}
            onEventClick={setSelectedEvent}
            onCreate={openCreateModal}
          />
        )}
      </div>

      {selectedEvent && (
        <EventDetails
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => openEditModal(selectedEvent)}
          onDelete={() => setDeleteTarget(selectedEvent)}
          onToggle={() => toggleEnabled(selectedEvent)}
        />
      )}

      {showModal && (
        <EventModal
          form={form}
          setForm={setForm}
          editing={editingEvent}
          saving={saving}
          conflictMessage={conflictMessage}
          onClose={closeModal}
          onSubmit={handleSubmit}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          event={deleteTarget}
          deleting={deleting}
          onCancel={() =>
            !deleting && setDeleteTarget(null)
          }
          onConfirm={confirmDelete}
        />
      )}
    </AppShell>
  );
}

function MiniStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] px-4 py-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-lg font-semibold text-white">
          {value}
        </p>
        <p className="truncate text-[10px] text-white/25 sm:text-xs">
          {label}
        </p>
      </div>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-violet-600 text-white"
          : "text-white/30 hover:text-white/70"
      }`}
    >
      {children}
    </button>
  );
}

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
  onEventClick: (event: CalendarEvent) => void;
  onCreate: (date?: Date, hour?: number) => void;
}) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0813]">
      <div className="overflow-auto">
        <div className="min-w-[900px]">
          {/* Day headers */}
          <div className="sticky top-0 z-30 grid grid-cols-[70px_repeat(7,minmax(120px,1fr))] border-b border-white/[0.07] bg-[#0e0a18]/95 backdrop-blur-xl">
            <div className="border-r border-white/[0.07]" />

            {days.map((day) => {
              const isToday = sameDay(day, today);

              return (
                <div
                  key={day.toISOString()}
                  className={`border-r border-white/[0.06] px-2 py-3 text-center last:border-r-0 ${
                    isToday
                      ? "bg-violet-500/[0.05]"
                      : ""
                  }`}
                >
                  <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25">
                    {new Intl.DateTimeFormat("en-CA", {
                      weekday: "short",
                    }).format(day)}
                  </p>

                  <div
                    className={`mx-auto mt-1.5 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                      isToday
                        ? "bg-violet-600 text-white"
                        : "text-white/55"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Timeline */}
          <div
            className="grid grid-cols-[70px_repeat(7,minmax(120px,1fr))]"
            style={{
              height: `${24 * HOUR_HEIGHT}px`,
            }}
          >
            <div className="relative border-r border-white/[0.07]">
              {hours.map((hour) => (
                <div
                  key={hour}
                  className="absolute right-2 text-[9px] text-white/20"
                  style={{
                    top: `${hour * HOUR_HEIGHT - 7}px`,
                  }}
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {days.map((day) => {
              const dayEvents = getEventsForDay(
                events,
                day
              );

              return (
                <div
                  key={day.toISOString()}
                  className={`relative border-r border-white/[0.05] last:border-r-0 ${
                    sameDay(day, today)
                      ? "bg-violet-500/[0.012]"
                      : ""
                  }`}
                >
                  {/* Grid */}
                  {hours.map((hour) => (
                    <button
                      key={hour}
                      onClick={() =>
                        onCreate(day, hour)
                      }
                      className="absolute left-0 right-0 border-b border-white/[0.045] transition hover:bg-violet-500/[0.035]"
                      style={{
                        top: `${hour * HOUR_HEIGHT}px`,
                        height: `${HOUR_HEIGHT}px`,
                      }}
                      aria-label={`Create event on ${formatDateInput(
                        day
                      )} at ${formatHour(hour)}`}
                    />
                  ))}

                  {/* Events */}
                  {dayEvents.map((event) => {
                    const start = new Date(
                      event.start_at
                    );
                    const end = new Date(
                      event.end_at
                    );

                    const startMinutes =
                      start.getHours() * 60 +
                      start.getMinutes();

                    const duration = Math.max(
                      20,
                      (end.getTime() -
                        start.getTime()) /
                        60000
                    );

                    const top =
                      (startMinutes / 60) *
                      HOUR_HEIGHT;

                    const height =
                      (duration / 60) *
                      HOUR_HEIGHT;

                    const color = getEventColor(
                      event.event_type,
                      event.color
                    );

                    return (
                      <button
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                        className={`absolute left-1 right-1 z-10 overflow-hidden rounded-xl border text-left transition hover:brightness-125 ${
                          event.enabled
                            ? ""
                            : "opacity-35 grayscale"
                        }`}
                        style={{
                          top,
                          height: Math.max(height, 28),
                          backgroundColor: `${color}18`,
                          borderColor: `${color}55`,
                        }}
                      >
                        <div className="flex h-full flex-col px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: color,
                              }}
                            />

                            <span className="truncate text-[10px] font-semibold text-white/85">
                              {event.title}
                            </span>
                          </div>

                          {height >= 45 && (
                            <span className="mt-0.5 pl-3 text-[8px] text-white/35">
                              {formatTime(
                                event.start_at
                              )}{" "}
                              –{" "}
                              {formatTime(
                                event.end_at
                              )}
                            </span>
                          )}

                          {height >= 75 &&
                            event.location && (
                              <span className="mt-1 flex min-w-0 items-center gap-1 pl-3 text-[8px] text-white/30">
                                <MapPin size={8} />
                                <span className="truncate">
                                  {event.location}
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
      </div>

      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0b0813]/75 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#151020] px-4 py-3 text-sm text-white/50">
            <RefreshCw
              size={15}
              className="animate-spin"
            />
            Loading calendar...
          </div>
        </div>
      )}

      <div className="border-t border-white/[0.06] px-4 py-2 text-center text-[10px] text-white/20">
        Click an empty time slot to create an event
      </div>
    </div>
  );
}

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
  onEventClick: (event: CalendarEvent) => void;
  onCreate: (date?: Date, hour?: number) => void;
}) {
  const weekdays = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0813]">
      <div className="grid grid-cols-7 border-b border-white/[0.07] bg-[#0e0a18]">
        {weekdays.map((day) => (
          <div
            key={day}
            className="border-r border-white/[0.05] px-2 py-3 text-center text-[9px] font-semibold uppercase tracking-[0.15em] text-white/25 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isToday = sameDay(day, today);
          const isCurrentMonth =
            day.getMonth() === currentMonth.getMonth();

          const dayEvents = getEventsForDay(
            events,
            day
          );

          return (
            <div
              key={day.toISOString()}
              className={`min-h-[135px] border-b border-r border-white/[0.05] p-2 transition hover:bg-white/[0.015] sm:min-h-[155px] ${
                !isCurrentMonth
                  ? "bg-black/10"
                  : ""
              }`}
            >
              <button
                onClick={() => onCreate(day)}
                className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition ${
                  isToday
                    ? "bg-violet-600 text-white"
                    : isCurrentMonth
                      ? "text-white/50 hover:bg-white/10 hover:text-white"
                      : "text-white/15"
                }`}
              >
                {day.getDate()}
              </button>

              <div className="space-y-1">
                {dayEvents
                  .slice(0, 4)
                  .map((event) => {
                    const color = getEventColor(
                      event.event_type,
                      event.color
                    );

                    return (
                      <button
                        key={event.id}
                        onClick={() =>
                          onEventClick(event)
                        }
                        className={`flex w-full items-center gap-1.5 overflow-hidden rounded-lg border px-2 py-1.5 text-left transition hover:brightness-125 ${
                          event.enabled
                            ? ""
                            : "opacity-35"
                        }`}
                        style={{
                          backgroundColor: `${color}14`,
                          borderColor: `${color}35`,
                        }}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{
                            backgroundColor: color,
                          }}
                        />

                        <span className="truncate text-[9px] text-white/60">
                          {event.title}
                        </span>
                      </button>
                    );
                  })}

                {dayEvents.length > 4 && (
                  <p className="px-2 pt-1 text-[9px] text-white/20">
                    +{dayEvents.length - 4} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b0813]/75 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#151020] px-4 py-3 text-sm text-white/50">
            <RefreshCw
              size={15}
              className="animate-spin"
            />
            Loading calendar...
          </div>
        </div>
      )}
    </div>
  );
}

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-md sm:items-center">
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#100b1b] shadow-2xl shadow-black/60">
        <div
          className="h-1"
          style={{ backgroundColor: color }}
        />

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span
                className="inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  color,
                  borderColor: `${color}55`,
                  backgroundColor: `${color}12`,
                }}
              >
                {eventTypeLabel(event.event_type)}
              </span>

              <h2 className="mt-3 text-xl font-semibold text-white">
                {event.title}
              </h2>

              {event.subtitle && (
                <p className="mt-1 text-sm text-white/35">
                  {event.subtitle}
                </p>
              )}
            </div>

            <button
              onClick={onClose}
              className="rounded-xl p-2 text-white/25 transition hover:bg-white/[0.05] hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 space-y-2">
            <DetailRow
              icon={<CalendarDays size={16} />}
              label="When"
              value={`${new Intl.DateTimeFormat(
                "en-CA",
                {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                }
              ).format(new Date(event.start_at))} · ${formatTime(
                event.start_at
              )} – ${formatTime(event.end_at)}`}
            />

            {event.location && (
              <DetailRow
                icon={<MapPin size={16} />}
                label="Location"
                value={event.location}
              />
            )}

            {event.description && (
              <DetailText
                label="Description"
                value={event.description}
              />
            )}

            {event.notes && (
              <DetailText
                label="Notes"
                value={event.notes}
              />
            )}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.025] py-3 text-xs font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
            >
              <Edit3 size={14} />
              Edit
            </button>

            <button
              onClick={onToggle}
              className="rounded-xl border border-white/[0.08] bg-white/[0.025] py-3 text-xs font-medium text-white/55 transition hover:bg-white/[0.06] hover:text-white"
            >
              {event.enabled ? "Disable" : "Enable"}
            </button>

            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/15 bg-red-500/[0.07] py-3 text-xs font-medium text-red-300 transition hover:bg-red-500/10"
            >
              <Trash2 size={14} />
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
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="mt-0.5 text-white/25">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-wider text-white/20">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-white/55">
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailText({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-white/20">
        {label}
      </p>

      <p className="mt-1.5 text-xs leading-5 text-white/45">
        {value}
      </p>
    </div>
  );
}

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
  setForm: React.Dispatch<
    React.SetStateAction<FormState>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <button
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close"
      />

      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#100b1b] shadow-2xl shadow-black/60">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/[0.07] bg-[#100b1b]/95 px-6 py-5 backdrop-blur-xl">
          <div>
            <p className="text-xs font-medium text-violet-300">
              {editing ? "Update schedule" : "New schedule item"}
            </p>

            <h2 className="mt-1 text-lg font-semibold text-white">
              {editing ? "Edit event" : "Create event"}
            </h2>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl p-2 text-white/25 hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
          >
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-5 p-6"
        >
          {conflictMessage && (
            <div className="flex gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.07] p-4 text-xs leading-5 text-amber-300">
              <AlertTriangle
                size={16}
                className="mt-0.5 shrink-0"
              />
              {conflictMessage}
            </div>
          )}

          <div>
            <FieldLabel>Title</FieldLabel>

            <input
              value={form.title}
              onChange={(event) =>
                update("title", event.target.value)
              }
              placeholder="e.g. Physics Lecture"
              className="calendar-input"
              autoFocus
            />
          </div>

          <div>
            <FieldLabel>Subtitle</FieldLabel>

            <input
              value={form.subtitle}
              onChange={(event) =>
                update("subtitle", event.target.value)
              }
              placeholder="Optional short description"
              className="calendar-input"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <FieldLabel>Date</FieldLabel>

              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  update("date", event.target.value)
                }
                className="calendar-input"
              />
            </div>

            <div>
              <FieldLabel>Starts</FieldLabel>

              <input
                type="time"
                value={form.startTime}
                onChange={(event) =>
                  update(
                    "startTime",
                    event.target.value
                  )
                }
                className="calendar-input"
              />
            </div>

            <div>
              <FieldLabel>Ends</FieldLabel>

              <input
                type="time"
                value={form.endTime}
                onChange={(event) =>
                  update(
                    "endTime",
                    event.target.value
                  )
                }
                className="calendar-input"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Event type</FieldLabel>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {EVENT_TYPES.map((type) => {
                const active =
                  form.eventType === type.value;

                return (
                  <button
                    type="button"
                    key={type.value}
                    onClick={() =>
                      update(
                        "eventType",
                        type.value
                      )
                    }
                    className={`rounded-xl border px-3 py-2.5 text-xs transition ${
                      active
                        ? "border-violet-500/30 bg-violet-500/10 text-violet-300"
                        : "border-white/[0.07] bg-white/[0.02] text-white/30 hover:bg-white/[0.05] hover:text-white/60"
                    }`}
                  >
                    {type.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <FieldLabel>Location</FieldLabel>

            <div className="relative">
              <MapPin
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/20"
              />

              <input
                value={form.location}
                onChange={(event) =>
                  update(
                    "location",
                    event.target.value
                  )
                }
                placeholder="Room, building, online..."
                className="calendar-input pl-9"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Description</FieldLabel>

            <textarea
              value={form.description}
              onChange={(event) =>
                update(
                  "description",
                  event.target.value
                )
              }
              placeholder="Anything you want to remember..."
              rows={3}
              className="calendar-input resize-none"
            />
          </div>

          <div>
            <FieldLabel>Notes</FieldLabel>

            <textarea
              value={form.notes}
              onChange={(event) =>
                update("notes", event.target.value)
              }
              placeholder="Optional notes"
              rows={2}
              className="calendar-input resize-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
            <input
              type="checkbox"
              checked={form.multitask}
              onChange={(event) =>
                update(
                  "multitask",
                  event.target.checked
                )
              }
              className="h-4 w-4 accent-violet-600"
            />

            <div>
              <p className="text-xs font-medium text-white/60">
                Allow overlapping events
              </p>

              <p className="mt-0.5 text-[10px] text-white/25">
                Useful when you intentionally have two schedule items
                at the same time.
              </p>
            </div>
          </label>

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-medium text-white/45 hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={15} />
                  {editing ? "Save changes" : "Create event"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FieldLabel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <label className="mb-2 block text-xs font-medium text-white/45">
      {children}
    </label>
  );
}

function DeleteModal({
  event,
  deleting,
  onCancel,
  onConfirm,
}: {
  event: CalendarEvent;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <button
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
        aria-label="Close"
      />

      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#100b1b] p-6 shadow-2xl shadow-black/60">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
          <Trash2 size={19} />
        </div>

        <h2 className="mt-5 text-lg font-semibold text-white">
          Delete this event?
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/35">
          <span className="font-medium text-white/70">
            {event.title}
          </span>{" "}
          will be removed from your calendar.
        </p>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-white/[0.08] px-5 py-3 text-sm font-medium text-white/45 hover:bg-white/[0.05] hover:text-white disabled:opacity-30"
          >
            Keep event
          </button>

          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-500/90 px-5 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
          >
            {deleting && (
              <RefreshCw
                size={14}
                className="animate-spin"
              />
            )}

            {deleting ? "Deleting..." : "Delete event"}
          </button>
        </div>
      </div>
    </div>
  );
}