"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  ArrowUp,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Course = {
  id: string;
  code: string | null;
  name: string;
  professor: string | null;
};

type Conversation = {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

/* =========================================================
   STARTER PROMPTS
========================================================= */

const starterPrompts = [
  {
    icon: BookOpen,
    title: "Explain something",
    description:
      "Break down a difficult concept in simple terms.",
    prompt:
      "Explain a difficult concept from my course in simple terms.",
  },
  {
    icon: Clock3,
    title: "Build a study plan",
    description:
      "Turn my upcoming work into a realistic plan.",
    prompt:
      "Help me make a study plan for my upcoming work.",
  },
  {
    icon: Sparkles,
    title: "Practice with me",
    description:
      "Generate questions and test what I know.",
    prompt:
      "Give me practice questions on the topic I am studying.",
  },
  {
    icon: MessageSquare,
    title: "Homework help",
    description:
      "Work through a problem with me step by step.",
    prompt:
      "Help me understand this homework problem step by step.",
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatConversationDate(
  dateString: string
) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const sameDay =
    date.getFullYear() ===
      now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString(
      "en-CA",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }

  return date.toLocaleDateString(
    "en-CA",
    {
      month: "short",
      day: "numeric",
    }
  );
}

function formatMessageTime(
  dateString: string
) {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString(
    "en-CA",
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function AITutorPage() {
  const [courses, setCourses] =
    useState<Course[]>([]);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<string | null>(null);

  const [selectedCourseId, setSelectedCourseId] =
    useState("");

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [showCourses, setShowCourses] =
    useState(false);

  const [showHistory, setShowHistory] =
    useState(false);

  const [error, setError] =
    useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<string | null>(null);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  /* =======================================================
     DERIVED STATE
  ======================================================= */

  const selectedConversation =
    conversations.find(
      (conversation) =>
        conversation.id ===
        selectedConversationId
    ) || null;

  const selectedCourse =
    courses.find(
      (course) =>
        course.id === selectedCourseId
    ) || null;

  const conversationMessages =
    useMemo(
      () =>
        messages.filter(
          (message) =>
            message.conversation_id ===
            selectedConversationId
        ),
      [
        messages,
        selectedConversationId,
      ]
    );

  /* =======================================================
     SCROLL TO BOTTOM
  ======================================================= */

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [
    conversationMessages.length,
    sending,
  ]);

  /* =======================================================
     LOAD MESSAGES
  ======================================================= */

  const loadMessages = useCallback(
    async (conversationId: string) => {
      const {
        data,
        error: messageError,
      } = await supabase
        .from("ai_tutor_messages")
        .select("*")
        .eq(
          "conversation_id",
          conversationId
        )
        .order("created_at", {
          ascending: true,
        });

      if (messageError) {
        throw new Error(
          messageError.message
        );
      }

      setMessages((current) => [
        ...current.filter(
          (message) =>
            message.conversation_id !==
            conversationId
        ),
        ...((data ||
          []) as Message[]),
      ]);
    },
    []
  );

  /* =======================================================
     LOAD INITIAL DATA
  ======================================================= */

  const loadInitialData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (!user) {
          return;
        }

        const [
          coursesResult,
          conversationsResult,
        ] = await Promise.all([
          supabase
            .from("courses")
            .select(
              "id, code, name, professor"
            )
            .eq("user_id", user.id)
            .eq("archived", false)
            .order("name"),

          supabase
            .from(
              "ai_tutor_conversations"
            )
            .select("*")
            .eq("user_id", user.id)
            .order("updated_at", {
              ascending: false,
            }),
        ]);

        if (coursesResult.error) {
          throw new Error(
            coursesResult.error.message
          );
        }

        if (
          conversationsResult.error
        ) {
          throw new Error(
            conversationsResult.error.message
          );
        }

        setCourses(
          (coursesResult.data ||
            []) as Course[]
        );

        const loadedConversations =
          (conversationsResult.data ||
            []) as Conversation[];

        setConversations(
          loadedConversations
        );

        if (
          loadedConversations.length >
          0
        ) {
          const first =
            loadedConversations[0];

          setSelectedConversationId(
            first.id
          );

          setSelectedCourseId(
            first.course_id || ""
          );

          await loadMessages(first.id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load AI Tutor."
        );
      } finally {
        setLoading(false);
      }
    }, [loadMessages]);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadInitialData();
      }, 0);

    return () =>
      window.clearTimeout(timeoutId);
  }, [loadInitialData]);

  /* =======================================================
     SELECT CONVERSATION
  ======================================================= */

  async function selectConversation(
    conversation: Conversation
  ) {
    setSelectedConversationId(
      conversation.id
    );

    setSelectedCourseId(
      conversation.course_id || ""
    );

    setShowHistory(false);
    setError("");

    try {
      await loadMessages(
        conversation.id
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load conversation."
      );
    }
  }

  /* =======================================================
     CREATE CONVERSATION
  ======================================================= */

  async function createConversation(
    courseId = selectedCourseId
  ) {
    try {
      setError("");

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Please sign in again."
        );
      }

      const course =
        courses.find(
          (item) =>
            item.id === courseId
        );

      const title = course?.code
        ? `${course.code} Tutor`
        : "New conversation";

      const {
        data,
        error: insertError,
      } = await supabase
        .from(
          "ai_tutor_conversations"
        )
        .insert({
          user_id: user.id,
          course_id:
            courseId || null,
          title,
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      const conversation =
        data as Conversation;

      setConversations(
        (current) => [
          conversation,
          ...current,
        ]
      );

      setSelectedConversationId(
        conversation.id
      );

      setSelectedCourseId(
        courseId
      );

      setMessages((current) =>
        current.filter(
          (message) =>
            message.conversation_id !==
            conversation.id
        )
      );

      setShowHistory(false);

      textareaRef.current?.focus();

      return conversation;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create conversation."
      );

      return null;
    }
  }

  /* =======================================================
     ENSURE CONVERSATION
  ======================================================= */

  async function ensureConversation() {
    if (selectedConversationId) {
      return selectedConversationId;
    }

    const conversation =
      await createConversation();

    return conversation?.id || null;
  }

  /* =======================================================
     SEND MESSAGE
  ======================================================= */

  async function sendMessage(
    event?: FormEvent
  ) {
    event?.preventDefault();

    const text = input.trim();

    if (!text || sending) {
      return;
    }

    try {
      setSending(true);
      setError("");

      const conversationId =
        await ensureConversation();

      if (!conversationId) {
        return;
      }

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Please sign in again."
        );
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id:
          conversationId,
        user_id: user.id,
        role: "user",
        content: text,
        created_at:
          new Date().toISOString(),
      };

      setMessages((current) => [
        ...current,
        userMessage,
      ]);

      setInput("");

      const {
        error: insertError,
      } = await supabase
        .from("ai_tutor_messages")
        .insert({
          conversation_id:
            conversationId,
          user_id: user.id,
          role: "user",
          content: text,
        });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }

      const history = [
        ...conversationMessages,
        userMessage,
      ]
        .slice(-20)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const {
        data: sessionData,
      } =
        await supabase.auth.getSession();

      const accessToken =
        sessionData.session
          ?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your session has expired."
        );
      }

      const response =
        await fetch(
          "/api/ai/tutor",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
              Authorization:
                `Bearer ${accessToken}`,
            },

            body: JSON.stringify({
              message: text,
              conversationId,
              courseId:
                selectedCourseId ||
                null,
              history,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "AI Tutor failed."
        );
      }

      const assistantMessage: Message =
        {
          id: crypto.randomUUID(),
          conversation_id:
            conversationId,
          user_id: user.id,
          role: "assistant",
          content: result.answer,
          created_at:
            new Date().toISOString(),
        };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      const {
        error:
          assistantInsertError,
      } = await supabase
        .from("ai_tutor_messages")
        .insert({
          conversation_id:
            conversationId,
          user_id: user.id,
          role: "assistant",
          content: result.answer,
        });

      if (assistantInsertError) {
        throw new Error(
          assistantInsertError.message
        );
      }

      const updatedAt =
        new Date().toISOString();

      await supabase
        .from(
          "ai_tutor_conversations"
        )
        .update({
          updated_at: updatedAt,
        })
        .eq(
          "id",
          conversationId
        );

      setConversations(
        (current) =>
          current
            .map(
              (conversation) =>
                conversation.id ===
                conversationId
                  ? {
                      ...conversation,
                      updated_at:
                        updatedAt,
                    }
                  : conversation
            )
            .sort(
              (a, b) =>
                new Date(
                  b.updated_at
                ).getTime() -
                new Date(
                  a.updated_at
                ).getTime()
            )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSending(false);

      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }

  /* =======================================================
     DELETE CONVERSATION
  ======================================================= */

  async function deleteConversation(
    conversationId: string
  ) {
    setDeleteTarget(null);

    try {
      const {
        error: deleteError,
      } = await supabase
        .from(
          "ai_tutor_conversations"
        )
        .delete()
        .eq(
          "id",
          conversationId
        );

      if (deleteError) {
        throw new Error(
          deleteError.message
        );
      }

      const remaining =
        conversations.filter(
          (item) =>
            item.id !==
            conversationId
        );

      setConversations(
        remaining
      );

      setMessages((current) =>
        current.filter(
          (message) =>
            message.conversation_id !==
            conversationId
        )
      );

      if (
        selectedConversationId ===
        conversationId
      ) {
        if (remaining.length > 0) {
          await selectConversation(
            remaining[0]
          );
        } else {
          setSelectedConversationId(
            null
          );

          setSelectedCourseId("");
        }
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete conversation."
      );
    }
  }

  /* =======================================================
     CHANGE COURSE
  ======================================================= */

  async function changeCourse(
    courseId: string
  ) {
    setSelectedCourseId(
      courseId
    );

    setShowCourses(false);

    if (selectedConversationId) {
      await supabase
        .from(
          "ai_tutor_conversations"
        )
        .update({
          course_id:
            courseId || null,
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          selectedConversationId
        );

      setConversations(
        (current) =>
          current.map(
            (conversation) =>
              conversation.id ===
              selectedConversationId
                ? {
                    ...conversation,
                    course_id:
                      courseId ||
                      null,
                  }
                : conversation
          )
      );
    }
  }

  /* =======================================================
     STARTER PROMPT
  ======================================================= */

  function handleStarterPrompt(
    prompt: string
  ) {
    setInput(prompt);

    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-[calc(100vh-68px)] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/[0.07]">
              <Sparkles className="h-5 w-5 animate-pulse text-violet-300" />
            </div>

            <p className="mt-4 text-sm font-medium text-white/60">
              Preparing your tutor
            </p>

            <p className="mt-1 text-xs text-white/25">
              Loading your conversations...
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-68px)] min-h-[650px] overflow-hidden bg-[#080611]">

        {/* =================================================
            DESKTOP CONVERSATION SIDEBAR
        ================================================= */}

        <aside className="hidden w-[285px] shrink-0 border-r border-white/[0.06] bg-[#0a0810] lg:flex lg:flex-col">

          {/* SIDEBAR HEADER */}

          <div className="border-b border-white/[0.06] p-4">

            <button
              type="button"
              onClick={() =>
                void createConversation()
              }
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-xs font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              New conversation
            </button>

            <div className="mt-4 flex items-center justify-between px-1">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
                Conversations
              </span>

              <span className="text-[10px] text-white/20">
                {conversations.length}
              </span>
            </div>
          </div>

          {/* CONVERSATIONS */}

          <div className="flex-1 overflow-y-auto p-2.5">

            {conversations.length ===
            0 ? (
              <div className="flex flex-col items-center px-5 py-16 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.035]">
                  <MessageSquare className="h-4 w-4 text-white/20" />
                </div>

                <p className="mt-3 text-xs font-medium text-white/45">
                  No conversations
                </p>

                <p className="mt-1 text-[10px] leading-5 text-white/20">
                  Start a conversation
                  and it will appear here.
                </p>
              </div>
            ) : (
              conversations.map(
                (conversation) => {
                  const active =
                    selectedConversationId ===
                    conversation.id;

                  return (
                    <div
                      key={
                        conversation.id
                      }
                      className={[
                        "group mb-1 flex items-center rounded-xl transition",
                        active
                          ? "bg-violet-500/[0.1]"
                          : "hover:bg-white/[0.035]",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void selectConversation(
                            conversation
                          )
                        }
                        className="min-w-0 flex-1 px-3 py-3 text-left"
                      >
                        <div className="flex items-center gap-2">
                          {active && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                          )}

                          <span
                            className={[
                              "truncate text-xs font-medium",
                              active
                                ? "text-white"
                                : "text-white/55",
                            ].join(" ")}
                          >
                            {
                              conversation.title
                            }
                          </span>
                        </div>

                        <div className="mt-1.5 pl-3.5 text-[10px] text-white/20">
                          {formatConversationDate(
                            conversation.updated_at
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setDeleteTarget(
                            conversation.id
                          )
                        }
                        className="mr-1.5 rounded-lg p-2 text-white/10 opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                }
              )
            )}
          </div>

          {/* SIDEBAR FOOTER */}

          <div className="border-t border-white/[0.06] p-4">
            <div className="flex items-center gap-2 text-[10px] text-white/20">
              <Sparkles className="h-3 w-3 text-violet-400/60" />

              <span>
                Powered by StudySpace AI
              </span>
            </div>
          </div>
        </aside>

        {/* =================================================
            MAIN CHAT
        ================================================= */}

        <main className="relative flex min-w-0 flex-1 flex-col">

          {/* =================================================
              CHAT HEADER
          ================================================= */}

          <header className="relative z-20 flex h-[68px] shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#080611]/90 px-4 backdrop-blur-xl sm:px-6">

            {/* MOBILE HISTORY */}

            <button
              type="button"
              onClick={() =>
                setShowHistory(
                  (value) => !value
                )
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-white/40 transition hover:bg-white/[0.05] hover:text-white lg:hidden"
              aria-label="Conversation history"
            >
              {showHistory ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>

            {/* AI IDENTITY */}

            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/[0.08]">
                <Sparkles className="h-4 w-4 text-violet-300" />

                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-[#080611] bg-emerald-400" />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-white">
                  AI Tutor
                </h1>

                <p className="truncate text-[10px] text-white/25">
                  {selectedCourse
                    ? `Helping with ${
                        selectedCourse.code ||
                        selectedCourse.name
                      }`
                    : "Your academic study assistant"}
                </p>
              </div>
            </div>

            {/* CENTER CONVERSATION NAME */}

            <div className="hidden min-w-0 flex-1 justify-center px-6 md:flex">
              {selectedConversation && (
                <div className="max-w-sm truncate text-center text-[11px] text-white/25">
                  {selectedConversation.title}
                </div>
              )}
            </div>

            {/* COURSE SELECTOR */}

            <div className="relative ml-auto">

              <button
                type="button"
                onClick={() =>
                  setShowCourses(
                    (value) =>
                      !value
                  )
                }
                className="flex max-w-[210px] items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2 text-[11px] font-medium text-white/50 transition hover:border-white/[0.12] hover:bg-white/[0.05] hover:text-white"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-violet-300" />

                <span className="truncate">
                  {selectedCourse
                    ? selectedCourse.code
                      ? selectedCourse.code
                      : selectedCourse.name
                    : "General tutor"}
                </span>

                <ChevronDown className="h-3 w-3 shrink-0 text-white/25" />
              </button>

              {showCourses && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-white/[0.09] bg-[#110d19] p-1.5 shadow-2xl shadow-black/60">

                  <div className="px-3 py-2">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
                      Tutor context
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      void changeCourse("")
                    }
                    className={[
                      "w-full rounded-xl px-3 py-2.5 text-left transition",
                      !selectedCourseId
                        ? "bg-violet-500/[0.1]"
                        : "hover:bg-white/[0.04]",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2">
                      {!selectedCourseId && (
                        <Check className="h-3.5 w-3.5 text-violet-300" />
                      )}

                      <span className="text-xs font-medium text-white/70">
                        General tutor
                      </span>
                    </div>

                    <p className="mt-1 pl-5 text-[10px] text-white/20">
                      Ask anything without
                      course-specific context.
                    </p>
                  </button>

                  {courses.map(
                    (course) => {
                      const active =
                        selectedCourseId ===
                        course.id;

                      return (
                        <button
                          key={
                            course.id
                          }
                          type="button"
                          onClick={() =>
                            void changeCourse(
                              course.id
                            )
                          }
                          className={[
                            "w-full rounded-xl px-3 py-2.5 text-left transition",
                            active
                              ? "bg-violet-500/[0.1]"
                              : "hover:bg-white/[0.04]",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-2">
                            {active && (
                              <Check className="h-3.5 w-3.5 text-violet-300" />
                            )}

                            <span className="text-xs font-medium text-white/70">
                              {course.code ||
                                course.name}
                            </span>
                          </div>

                          <p className="mt-1 truncate pl-5 text-[10px] text-white/20">
                            {course.name}
                            {course.professor
                              ? ` · ${course.professor}`
                              : ""}
                          </p>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </header>

          {/* =================================================
              MOBILE HISTORY DRAWER
          ================================================= */}

          {showHistory && (
            <div className="absolute inset-x-0 top-[68px] z-40 bottom-0 border-b border-white/[0.06] bg-[#0a0810] lg:hidden">

              <div className="border-b border-white/[0.06] p-4">
                <button
                  type="button"
                  onClick={() =>
                    void createConversation()
                  }
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-xs font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  New conversation
                </button>
              </div>

              <div className="overflow-y-auto p-2.5">
                {conversations.map(
                  (conversation) => {
                    const active =
                      selectedConversationId ===
                      conversation.id;

                    return (
                      <div
                        key={
                          conversation.id
                        }
                        className={[
                          "mb-1 flex items-center rounded-xl",
                          active
                            ? "bg-violet-500/[0.1]"
                            : "hover:bg-white/[0.035]",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void selectConversation(
                              conversation
                            )
                          }
                          className="min-w-0 flex-1 px-3 py-3 text-left"
                        >
                          <p className="truncate text-xs font-medium text-white/70">
                            {
                              conversation.title
                            }
                          </p>

                          <p className="mt-1 text-[10px] text-white/20">
                            {formatConversationDate(
                              conversation.updated_at
                            )}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setDeleteTarget(
                              conversation.id
                            )
                          }
                          className="mr-2 rounded-lg p-2 text-white/15 hover:text-red-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* =================================================
              ERROR
          ================================================= */}

          {error && (
            <div className="mx-4 mt-3 rounded-xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-xs text-red-300 sm:mx-6">
              {error}
            </div>
          )}

          {/* =================================================
              MESSAGES
          ================================================= */}

          <div className="flex-1 overflow-y-auto">

            {conversationMessages.length ===
            0 ? (
              /* =============================================
                 EMPTY / WELCOME
              ============================================= */

              <div className="flex min-h-full items-center justify-center px-5 py-12">

                <div className="w-full max-w-3xl">

                  <div className="text-center">

                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-[20px] border border-violet-400/10 bg-violet-500/[0.07] shadow-xl shadow-violet-950/10">
                      <Bot className="h-7 w-7 text-violet-300" />

                      <span className="absolute inset-[-5px] rounded-[24px] border border-violet-400/[0.04]" />
                    </div>

                    <div className="mt-6 flex items-center justify-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/25">
                        AI Tutor online
                      </span>
                    </div>

                    <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
                      What are you working on?
                    </h2>

                    <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/30">
                      Ask questions, understand
                      difficult concepts, practice
                      for exams, or get step-by-step
                      help with your coursework.
                    </p>

                    {selectedCourse && (
                      <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-violet-400/10 bg-violet-500/[0.06] px-3 py-1.5 text-[10px] font-medium text-violet-300/70">
                        <BookOpen className="h-3 w-3" />

                        Using context from{" "}
                        <span className="text-violet-200">
                          {selectedCourse.code ||
                            selectedCourse.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* STARTERS */}

                  <div className="mt-10 grid gap-3 sm:grid-cols-2">

                    {starterPrompts.map(
                      (item) => {
                        const Icon =
                          item.icon;

                        return (
                          <button
                            key={
                              item.title
                            }
                            type="button"
                            onClick={() =>
                              handleStarterPrompt(
                                item.prompt
                              )
                            }
                            className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition hover:border-violet-400/15 hover:bg-violet-500/[0.035]"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.035] text-white/35 transition group-hover:bg-violet-500/[0.1] group-hover:text-violet-300">
                                <Icon className="h-4 w-4" />
                              </div>

                              <div>
                                <p className="text-xs font-semibold text-white/70">
                                  {
                                    item.title
                                  }
                                </p>

                                <p className="mt-1 text-[11px] leading-5 text-white/25">
                                  {
                                    item.description
                                  }
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>

                  <p className="mt-6 text-center text-[10px] text-white/15">
                    Press Enter to send ·
                    Shift + Enter for a new
                    line
                  </p>
                </div>
              </div>
            ) : (
              /* =============================================
                 CHAT
              ============================================= */

              <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">

                {conversationMessages.map(
                  (message, index) => {
                    const isUser =
                      message.role ===
                      "user";

                    return (
                      <div
                        key={
                          message.id
                        }
                        className={[
                          "group mb-8 flex gap-3 sm:gap-4",
                          isUser
                            ? "justify-end"
                            : "",
                        ].join(" ")}
                      >

                        {!isUser && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/[0.08] text-violet-300">
                            <Sparkles className="h-3.5 w-3.5" />
                          </div>
                        )}

                        <div
                          className={[
                            "min-w-0",
                            isUser
                              ? "max-w-[82%]"
                              : "max-w-[90%]",
                          ].join(" ")}
                        >
                          <div
                            className={[
                              "text-sm leading-7",
                              isUser
                                ? "rounded-2xl rounded-br-md bg-violet-600 px-4 py-3 text-white shadow-lg shadow-violet-950/10"
                                : "text-white/70",
                            ].join(" ")}
                          >
                            <div className="whitespace-pre-wrap">
                              {
                                message.content
                              }
                            </div>
                          </div>

                          <div
                            className={[
                              "mt-1.5 flex items-center gap-2 text-[9px] text-white/15",
                              isUser
                                ? "justify-end"
                                : "",
                            ].join(" ")}
                          >
                            <span>
                              {isUser
                                ? "You"
                                : "StudySpace AI"}
                            </span>

                            <span>
                              ·
                            </span>

                            <span>
                              {formatMessageTime(
                                message.created_at
                              )}
                            </span>

                            {index ===
                              conversationMessages.length -
                                1 &&
                              !isUser &&
                              !sending && (
                                <span className="ml-1 opacity-0 transition group-hover:opacity-100">
                                  <Check className="h-3 w-3 text-emerald-400" />
                                </span>
                              )}
                          </div>
                        </div>

                        {isUser && (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-white/30">
                            <User className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                    );
                  }
                )}

                {/* TYPING */}

                {sending && (
                  <div className="flex gap-3 sm:gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/[0.08] text-violet-300">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    </div>

                    <div className="flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/25 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/25 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/25" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* =================================================
              COMPOSER
          ================================================= */}

          <div className="shrink-0 border-t border-white/[0.06] bg-[#080611]/95 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">

            <form
              onSubmit={sendMessage}
              className="mx-auto w-full max-w-4xl"
            >
              <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] transition focus-within:border-violet-400/20 focus-within:bg-white/[0.035]">

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) =>
                    setInput(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key ===
                        "Enter" &&
                      !event.shiftKey
                    ) {
                      event.preventDefault();

                      void sendMessage();
                    }
                  }}
                  placeholder={
                    selectedCourse
                      ? `Ask about ${selectedCourse.name}...`
                      : "Ask your tutor anything..."
                  }
                  rows={1}
                  className="max-h-40 min-h-[54px] w-full resize-none bg-transparent px-4 pb-12 pt-4 text-sm leading-6 text-white outline-none placeholder:text-white/20"
                />

                {/* COMPOSER FOOTER */}

                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between">

                  <div className="flex items-center gap-2">
                    {selectedCourse && (
                      <span className="hidden items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[9px] text-white/25 sm:flex">
                        <BookOpen className="h-2.5 w-2.5 text-violet-300/70" />

                        {selectedCourse.code ||
                          selectedCourse.name}
                      </span>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={
                      !input.trim() ||
                      sending
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-white/[0.05] disabled:text-white/20"
                    aria-label="Send message"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between px-1 text-[9px] text-white/15">
                <span>
                  StudySpace AI may make mistakes.
                  Verify important information.
                </span>

                <span className="hidden sm:block">
                  Enter ↵
                </span>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* ===================================================
          DELETE CONFIRMATION
      =================================================== */}

      {deleteTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">

          <div className="w-full max-w-sm rounded-2xl border border-white/[0.09] bg-[#120e1a] p-5 shadow-2xl shadow-black/60">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
              <Trash2 className="h-4 w-4" />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-white">
              Delete conversation?
            </h3>

            <p className="mt-2 text-xs leading-5 text-white/35">
              This will permanently remove
              this conversation and its
              messages.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2.5 text-xs font-medium text-white/50 transition hover:bg-white/[0.05] hover:text-white"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void deleteConversation(
                    deleteTarget
                  )
                }
                className="flex-1 rounded-xl bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/15"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}