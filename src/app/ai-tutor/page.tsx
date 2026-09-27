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
  Bot,
  BookOpen,
  ChevronDown,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

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

const starterPrompts = [
  {
    title: "Explain a concept",
    prompt:
      "Explain a difficult concept from my course in simple terms.",
  },
  {
    title: "Study plan",
    prompt:
      "Help me make a study plan for my upcoming work.",
  },
  {
    title: "Practice questions",
    prompt:
      "Give me practice questions on the topic I am studying.",
  },
  {
    title: "Homework help",
    prompt:
      "Help me understand this homework problem step by step.",
  },
];

export default function AITutorPage() {
  const [courses, setCourses] =
    useState<Course[]>([]);

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [selectedConversationId, setSelectedConversationId] =
    useState<string | null>(null);

  const [selectedCourseId, setSelectedCourseId] =
    useState<string>("");

  const [input, setInput] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [sending, setSending] =
    useState(false);

  const [showCourses, setShowCourses] =
    useState(false);

  const [error, setError] =
    useState("");

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [conversationMessages.length]);

  const loadMessages = useCallback(async (
    conversationId: string
  ) => {
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
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        setSelectedConversationId(
          loadedConversations[0].id
        );

        setSelectedCourseId(
          loadedConversations[0]
            .course_id || ""
        );

        await loadMessages(
          loadedConversations[0].id
        );
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
    const timeoutId = window.setTimeout(() => {
      void loadInitialData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadInitialData]);

  async function selectConversation(
    conversation: Conversation
  ) {
    setSelectedConversationId(
      conversation.id
    );

    setSelectedCourseId(
      conversation.course_id || ""
    );

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

  async function createConversation(
    courseId = selectedCourseId
  ) {
    try {
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

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

      const title =
        course?.code
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

  async function ensureConversation() {
    if (selectedConversationId) {
      return selectedConversationId;
    }

    const conversation =
      await createConversation();

    return conversation?.id || null;
  }

  async function sendMessage(
    event?: FormEvent
  ) {
    event?.preventDefault();

    const text =
      input.trim();

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
      } = await supabase.auth.getUser();

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

      const history =
        [
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
      } = await supabase.auth.getSession();

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
              Authorization: `Bearer ${accessToken}`,
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

      await supabase
        .from(
          "ai_tutor_conversations"
        )
        .update({
          updated_at:
            new Date().toISOString(),
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
                        new Date().toISOString(),
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
    }
  }

  async function deleteConversation(
    conversationId: string
  ) {
    const conversation =
      conversations.find(
        (item) =>
          item.id ===
          conversationId
      );

    if (!conversation) {
      return;
    }

    const confirmed =
      window.confirm(
        `Delete "${conversation.title}"?`
      );

    if (!confirmed) {
      return;
    }

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

  function handleStarterPrompt(
    prompt: string
  ) {
    setInput(prompt);
  }

  return (
    <AppShell>
      <div className="flex h-[calc(100vh-2rem)] min-h-[650px] overflow-hidden rounded-2xl border border-white/10 bg-[#0b0813] shadow-2xl">
        {/* Conversations sidebar */}

        <aside className="hidden w-[270px] shrink-0 flex-col border-r border-white/8 bg-[#0e0a18] lg:flex">
          <div className="border-b border-white/8 p-4">
            <button
              onClick={() =>
                createConversation()
              }
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
            >
              <Plus size={16} />
              New conversation
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length ===
              0 && (
              <div className="px-3 py-10 text-center">
                <MessageSquare
                  size={22}
                  className="mx-auto text-white/15"
                />

                <p className="mt-3 text-xs text-white/25">
                  No conversations yet.
                </p>
              </div>
            )}

            {conversations.map(
              (conversation) => (
                <div
                  key={
                    conversation.id
                  }
                  className={`group mb-1 flex items-center rounded-xl transition ${
                    selectedConversationId ===
                    conversation.id
                      ? "bg-violet-500/10"
                      : "hover:bg-white/[0.035]"
                  }`}
                >
                  <button
                    onClick={() =>
                      selectConversation(
                        conversation
                      )
                    }
                    className="min-w-0 flex-1 px-3 py-3 text-left"
                  >
                    <div className="truncate text-sm text-white/70">
                      {
                        conversation.title
                      }
                    </div>

                    <div className="mt-1 text-[10px] text-white/25">
                      {new Intl.DateTimeFormat(
                        "en-CA",
                        {
                          month:
                            "short",
                          day: "numeric",
                        }
                      ).format(
                        new Date(
                          conversation.updated_at
                        )
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      deleteConversation(
                        conversation.id
                      )
                    }
                    className="mr-2 rounded-lg p-1.5 text-white/15 opacity-0 transition hover:bg-red-500/10 hover:text-red-300 group-hover:opacity-100"
                  >
                    <Trash2
                      size={14}
                    />
                  </button>
                </div>
              )
            )}
          </div>
        </aside>

        {/* Main tutor */}

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600/15 text-violet-300">
                <Sparkles
                  size={18}
                />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-white">
                  AI Tutor
                </h1>

                <p className="truncate text-[11px] text-white/30">
                  Gemini-powered study assistant
                </p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() =>
                  setShowCourses(
                    (value) =>
                      !value
                  )
                }
                className="flex max-w-[220px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-xs text-white/55 transition hover:bg-white/[0.07] hover:text-white"
              >
                <BookOpen
                  size={14}
                  className="shrink-0 text-violet-300"
                />

                <span className="truncate">
                  {selectedCourse
                    ? `${selectedCourse.code || ""} ${selectedCourse.name}`
                    : "General"}
                </span>

                <ChevronDown
                  size={13}
                  className="shrink-0"
                />
              </button>

              {showCourses && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#151020] p-1 shadow-2xl">
                  <button
                    onClick={() =>
                      changeCourse("")
                    }
                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs text-white/55 hover:bg-white/5 hover:text-white"
                  >
                    General Tutor
                  </button>

                  {courses.map(
                    (course) => (
                      <button
                        key={
                          course.id
                        }
                        onClick={() =>
                          changeCourse(
                            course.id
                          )
                        }
                        className={`w-full rounded-lg px-3 py-2.5 text-left text-xs transition hover:bg-white/5 ${
                          selectedCourseId ===
                          course.id
                            ? "bg-violet-500/10 text-violet-300"
                            : "text-white/55 hover:text-white"
                        }`}
                      >
                        <div>
                          {
                            course.code
                          }{" "}
                          {
                            course.name
                          }
                        </div>

                        {course.professor && (
                          <div className="mt-0.5 text-[10px] text-white/25">
                            {
                              course.professor
                            }
                          </div>
                        )}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          </header>

          {error && (
            <div className="mx-4 mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-300 sm:mx-6">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-white/30">
                  <Sparkles
                    size={16}
                    className="animate-pulse"
                  />
                  Loading AI Tutor...
                </div>
              </div>
            ) : conversationMessages.length ===
              0 ? (
              <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center px-5 py-10">
                <div className="mb-8 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600/10 text-violet-300">
                    <Bot
                      size={30}
                    />
                  </div>

                  <h2 className="mt-5 text-2xl font-bold text-white">
                    What are you learning?
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/35">
                    Ask me to explain concepts,
                    work through problems,
                    create study plans, or
                    help you prepare for an exam.
                  </p>

                  {selectedCourse && (
                    <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-violet-500/15 bg-violet-500/5 px-3 py-1.5 text-xs text-violet-300/70">
                      <BookOpen
                        size={12}
                      />
                      Context:{" "}
                      {
                        selectedCourse.code
                      }{" "}
                      {
                        selectedCourse.name
                      }
                    </div>
                  )}
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {starterPrompts.map(
                    (item) => (
                      <button
                        key={
                          item.title
                        }
                        onClick={() =>
                          handleStarterPrompt(
                            item.prompt
                          )
                        }
                        className="rounded-xl border border-white/8 bg-white/[0.025] p-4 text-left transition hover:border-violet-500/20 hover:bg-violet-500/[0.035]"
                      >
                        <div className="text-sm font-medium text-white/65">
                          {
                            item.title
                          }
                        </div>

                        <div className="mt-1 text-xs leading-5 text-white/25">
                          {
                            item.prompt
                          }
                        </div>
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                {conversationMessages.map(
                  (message) => (
                    <div
                      key={
                        message.id
                      }
                      className={`mb-7 flex gap-3 ${
                        message.role ===
                        "user"
                          ? "justify-end"
                          : ""
                      }`}
                    >
                      {message.role ===
                        "assistant" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 text-violet-300">
                          <Sparkles
                            size={15}
                          />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          message.role ===
                          "user"
                            ? "bg-violet-600 text-white"
                            : "border border-white/8 bg-white/[0.025] text-white/70"
                        }`}
                      >
                        <div className="whitespace-pre-wrap text-sm leading-7">
                          {
                            message.content
                          }
                        </div>
                      </div>

                      {message.role ===
                        "user" && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-white/35">
                          <User
                            size={15}
                          />
                        </div>
                      )}
                    </div>
                  )
                )}

                {sending && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600/15 text-violet-300">
                      <Sparkles
                        size={15}
                        className="animate-pulse"
                      />
                    </div>

                    <div className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:-0.3s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30 [animation-delay:-0.15s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/30" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/8 bg-[#0b0813] p-3 sm:p-4">
            <form
              onSubmit={sendMessage}
              className="mx-auto max-w-3xl"
            >
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.025] p-2 transition focus-within:border-violet-500/30">
                <textarea
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

                      sendMessage();
                    }
                  }}
                  placeholder={
                    selectedCourse
                      ? `Ask about ${selectedCourse.name}...`
                      : "Ask your tutor anything..."
                  }
                  rows={1}
                  className="max-h-40 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/20"
                />

                <button
                  type="submit"
                  disabled={
                    !input.trim() ||
                    sending
                  }
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Send
                    size={16}
                  />
                </button>
              </div>

              <div className="mt-2 text-center text-[10px] text-white/15">
                StudySpace AI can make
                mistakes. Verify important
                academic information.
              </div>
            </form>
          </div>
        </main>
      </div>
    </AppShell>
  );
}