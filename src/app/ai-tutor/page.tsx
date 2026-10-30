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
  Check,
  ChevronDown,
  Clock3,
  Menu,
  Mic,
  Volume2,
  VolumeX,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import NeuralIntelligence from "@/components/NeuralIntelligence";
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
  contextSources?: string[];
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
  {
    icon: Sparkles,
    title: "Make a practice quiz",
    description:
      "Test my understanding with questions and answers.",
    prompt:
      "Create a short practice quiz from the course material available to you. Ask one question at a time, wait for my answer, then explain the result.",
  },
  {
    icon: BookOpen,
    title: "Create flashcards",
    description:
      "Turn key ideas into active-recall cards.",
    prompt:
      "Help me create a set of concise active-recall flashcards from the course material available to you. Show one card at a time and let me try to answer before revealing the explanation.",
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

  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceReplies, setVoiceReplies] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("READY");
  const recognitionRef = useRef<any>(null);
  const voiceRepliesRef = useRef(false);

  const [showCourses, setShowCourses] =
    useState(false);

  const [showHistory, setShowHistory] =
    useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);

  const [error, setError] =
    useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<string | null>(null);

  const [messageFeedback, setMessageFeedback] =
    useState<Record<string, -1 | 1>>({});
  const [feedbackSaving, setFeedbackSaving] = useState<Record<string, boolean>>({});
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, string>>({});

  const chatLogRef =
    useRef<HTMLDivElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  /* =======================================================
     DERIVED STATE
  ======================================================= */

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
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(Boolean(SpeechRecognitionCtor));
    return () => {
      recognitionRef.current?.stop?.();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    voiceRepliesRef.current = voiceReplies;
  }, [voiceReplies]);

  function toggleVoiceInput() {
    if (voiceListening) {
      recognitionRef.current?.stop?.();
      setVoiceListening(false);
      setVoiceStatus("READY");
      return;
    }
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setError("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = navigator.language || "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onstart = () => { setVoiceListening(true); setVoiceStatus("LISTENING"); setError(""); };
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results as ArrayLike<any>)
          .map((result: any) => result[0]?.transcript || "")
          .join(" ");
        setInput(transcript);
      };
      recognition.onerror = (event: any) => {
        setVoiceListening(false);
        setVoiceStatus("READY");
        if (event.error !== "aborted" && event.error !== "no-speech") {
          setError(event.error === "not-allowed" ? "Microphone access was blocked. Allow microphone access in your browser." : "Voice input stopped. You can try again.");
        }
      };
      recognition.onend = () => { setVoiceListening(false); setVoiceStatus("READY"); };
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setVoiceListening(false);
      setVoiceStatus("READY");
      setError("Could not start voice input. Check your microphone permissions.");
    }
  }


  /* =======================================================
     SCROLL TO BOTTOM
  ======================================================= */

  useEffect(() => {
    const chatLog = chatLogRef.current;
    if (!chatLog) return;
    chatLog.scrollTo({ top: chatLog.scrollHeight, behavior: "smooth" });
  }, [conversationMessages, sending]);

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

        // Keep the neural workspace unobstructed on entry. Conversations
        // are opened deliberately from the History control.
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
    setShowToolsPanel(false);

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

      setShowHistory(false);
      setShowToolsPanel(false);

      setInput("");

      setMessages((current) =>
        current.filter(
          (message) =>
            message.conversation_id !==
            conversation.id
        )
      );

      setShowHistory(false);

      window.setTimeout(() => textareaRef.current?.focus(), 80);

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

    let assistantMessageId: string | null = null;
    let streamCompleted = false;
    const requestController = new AbortController();
    let requestTimeout: number | undefined;

    try {
      setSending(true);

      setShowHistory(false);
      setVoiceStatus("THINKING");
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

      requestTimeout = window.setTimeout(() => requestController.abort(), 75000);
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

            signal: requestController.signal,
            body: JSON.stringify({
              message: text,
              conversationId,
              courseId:
                selectedCourseId ||
                null,
            }),
          }
        );

      if (!response.ok) {
        const failure = await response.json().catch(() => ({}));
        throw new Error(failure.error || "AI Tutor failed.");
      }
      if (!response.body) throw new Error("The AI Tutor response stream was unavailable. Please try again.");

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      };
      assistantMessageId = assistantMessage.id;
      setMessages((current) => [...current, assistantMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      let answer = "";

      const processLine = (line: string) => {
        if (!line.trim()) return;
        const event = JSON.parse(line) as { type: string; text?: string; error?: string; sources?: unknown };
        if (event.type === "sources" && Array.isArray(event.sources)) {
          const sources = event.sources
            .filter((source): source is string => typeof source === "string")
            .map((source) => source.trim().slice(0, 160))
            .filter(Boolean)
            .slice(0, 5);
          setMessages((current) => current.map((item) =>
            item.id === assistantMessage.id ? { ...item, contextSources: sources } : item
          ));
        } else if (event.type === "chunk" && event.text) {
          answer += event.text;
          setMessages((current) => current.map((item) =>
            item.id === assistantMessage.id ? { ...item, content: answer } : item
          ));
        } else if (event.type === "error") {
          throw new Error(event.error || "The AI Tutor could not complete that response.");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });
        const lines = pending.split("\n");
        pending = lines.pop() || "";
        for (const line of lines) processLine(line);
      }
      pending += decoder.decode();
      if (pending.trim()) processLine(pending);
      if (!answer.trim()) throw new Error("The AI Tutor returned an empty response. Please try again.");
      streamCompleted = true;

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
          content: answer,
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

      if (voiceRepliesRef.current && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.rate = 1.02;
        utterance.pitch = 0.92;
        utterance.onstart = () => setVoiceStatus("SPEAKING");
        utterance.onend = () => setVoiceStatus("READY");
        utterance.onerror = () => setVoiceStatus("READY");
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      // Do not leave a misleading half-answer in the transcript if the stream
      // failed. Keep a completed answer visible if only saving it failed.
      if (assistantMessageId && !streamCompleted) {
        setMessages((current) => current.filter((item) => item.id !== assistantMessageId));
      }
      setError(
        requestController.signal.aborted
          ? "This response took too long. Please try again; the AI service may be busy."
          : err instanceof Error
            ? err.message
            : "Something went wrong."
      );
    } finally {
      if (requestTimeout !== undefined) window.clearTimeout(requestTimeout);
      setSending(false);
      setVoiceStatus("READY");

      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }

  /* =======================================================
     AI ANSWER FEEDBACK
  ======================================================= */

  async function rateAnswer(message: Message, rating: -1 | 1) {
    // Use the conversation attached to this answer, not whichever conversation
    // happens to be selected in UI state while React updates.
    if (message.role !== "assistant" || !message.conversation_id || feedbackSaving[message.id]) return;

    const previous = messageFeedback[message.id];
    setFeedbackSaving((current) => ({ ...current, [message.id]: true }));
    setFeedbackStatus((current) => ({ ...current, [message.id]: "" }));
    setMessageFeedback((current) => ({ ...current, [message.id]: rating }));

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("Please sign in again to save feedback.");

      const { error: feedbackError } = await supabase
        .from("ai_tutor_feedback")
        .upsert({
          user_id: user.id,
          conversation_id: message.conversation_id,
          message_key: message.id,
          rating,
          reason: "general",
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,message_key" });

      if (feedbackError) throw feedbackError;
      setFeedbackStatus((current) => ({ ...current, [message.id]: "Feedback saved" }));
    } catch (feedbackError) {
      setMessageFeedback((current) => {
        const next = { ...current };
        if (previous === undefined) delete next[message.id];
        else next[message.id] = previous;
        return next;
      });
      setFeedbackStatus((current) => ({
        ...current,
        [message.id]: feedbackError instanceof Error
          ? feedbackError.message.slice(0, 180)
          : "Could not save feedback. Please try again.",
      }));
    } finally {
      setFeedbackSaving((current) => ({ ...current, [message.id]: false }));
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


  if (loading) {
    return <AppShell><div className="flex min-h-[calc(100vh-68px)] items-center justify-center bg-[#171612]"><div className="text-center"><Sparkles className="mx-auto h-6 w-6 animate-pulse text-[#c7b58f]" /><p className="mt-4 text-sm text-stone-200">Preparing your tutor</p><p className="mt-1 text-xs text-stone-500">Loading your conversations…</p></div></div></AppShell>;
  }

  const conversationList = (
    <>
      <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-4">
        <div><p className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Your workspace</p><p className="mt-1 text-sm font-medium text-stone-200">Conversations</p></div>
        <span className="rounded-full border border-white/[0.08] px-2 py-1 text-[10px] text-stone-500">{conversations.length}</span>
      </div>
      <div className="p-3"><button type="button" onClick={() => { void createConversation(); setShowHistory(false); }} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#b9a783] text-xs font-semibold text-[#211e18] hover:bg-[#d0bd98]"><Plus className="h-4 w-4" />New conversation</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {conversations.length === 0 ? <p className="px-4 py-10 text-center text-xs text-stone-500">Your conversations will appear here.</p> : conversations.map((conversation) => {
          const active = selectedConversationId === conversation.id;
          return <div key={conversation.id} className={["group mb-1 flex items-center rounded-lg border transition", active ? "border-[#b9a783]/25 bg-[#b9a783]/[0.09]" : "border-transparent hover:border-white/[0.07] hover:bg-white/[0.035]"].join(" ")}>
            <button type="button" onClick={() => { void selectConversation(conversation); setShowHistory(false); }} className="min-w-0 flex-1 px-3 py-3 text-left"><span className={["block truncate text-xs font-medium", active ? "text-[#e4d4b5]" : "text-stone-300"].join(" ")}>{conversation.title || "Untitled conversation"}</span><span className="mt-1 block text-[10px] text-stone-600">{formatConversationDate(conversation.updated_at)}</span></button>
            <button type="button" onClick={() => setDeleteTarget(conversation.id)} aria-label="Delete conversation" className="mr-1 rounded-md p-2 text-stone-600 opacity-0 hover:bg-red-400/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>;
        })}
      </div>
      <div className="border-t border-white/[0.07] px-4 py-3 text-[10px] text-stone-600">Your learning history is private to you.</div>
    </>
  );

  return (
    <AppShell>
      <div className="ss-ai-tutor-v2 flex h-[calc(100dvh-68px)] min-h-[560px] overflow-hidden bg-[#171612] text-stone-200">
        <aside className="hidden w-[260px] shrink-0 flex-col border-r border-white/[0.07] bg-[#1b1a15] lg:flex">{conversationList}</aside>
        {showHistory && <div className="fixed inset-0 z-[100] flex lg:hidden"><button type="button" aria-label="Close history" onClick={() => setShowHistory(false)} className="absolute inset-0 bg-black/65" /><aside className="relative z-10 flex h-full w-[min(330px,88vw)] flex-col border-r border-white/10 bg-[#1b1a15] shadow-2xl"><div className="flex justify-end border-b border-white/[0.07] p-2"><button type="button" onClick={() => setShowHistory(false)} aria-label="Close history" className="p-2 text-stone-400"><X className="h-4 w-4" /></button></div>{conversationList}</aside></div>}

        <section className="relative flex min-w-0 flex-1 flex-col">
          <header className="relative z-20 flex min-h-[64px] shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-[#191812] px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setShowHistory(true)} aria-label="Open history" className="rounded-lg border border-white/[0.09] p-2 text-stone-400 lg:hidden"><Menu className="h-4 w-4" /></button>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#b9a783]/25 bg-[#b9a783]/[0.08] text-[#c7b58f]"><Sparkles className="h-4 w-4" /></div>
              <div className="min-w-0"><h1 className="truncate text-sm font-semibold text-stone-100">AI Tutor</h1><p className="truncate text-[10px] text-stone-500">{selectedCourse ? "Course context · " + (selectedCourse.code || selectedCourse.name) : "Your personal study assistant"}</p></div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="relative">
                <button type="button" onClick={() => setShowCourses((value) => !value)} aria-expanded={showCourses} className="flex max-w-[190px] items-center gap-2 rounded-lg border border-white/[0.09] px-3 py-2 text-[11px] text-stone-300 hover:border-[#b9a783]/35"><BookOpen className="h-3.5 w-3.5 shrink-0 text-[#b9a783]" /><span className="truncate">{selectedCourse ? (selectedCourse.code || selectedCourse.name) : "General tutor"}</span><ChevronDown className="h-3 w-3 shrink-0 text-stone-500" /></button>
                {showCourses && <div className="absolute right-0 top-full z-[80] mt-2 max-h-[min(65vh,420px)] w-72 overflow-y-auto rounded-xl border border-white/10 bg-[#24221b] p-2 shadow-2xl">
                  <button type="button" onClick={() => { void changeCourse(""); setShowCourses(false); }} className={["w-full rounded-lg px-3 py-2.5 text-left text-xs hover:bg-white/[0.05]", !selectedCourseId ? "bg-[#b9a783]/10 text-[#e2d1af]" : "text-stone-300"].join(" ")}>General tutor</button>
                  {courses.map((course) => <button key={course.id} type="button" onClick={() => { void changeCourse(course.id); setShowCourses(false); }} className={["mt-1 w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.05]", selectedCourseId === course.id ? "bg-[#b9a783]/10" : ""].join(" ")}><span className="block text-xs text-stone-200">{course.code || course.name}</span><span className="mt-1 block truncate text-[10px] text-stone-500">{course.name}{course.professor ? " · " + course.professor : ""}</span></button>)}
                </div>}
              </div>
              <button type="button" onClick={() => { setShowToolsPanel((value) => !value); setShowCourses(false); }} aria-expanded={showToolsPanel} className="hidden items-center gap-2 rounded-lg border border-white/[0.09] px-3 py-2 text-[11px] text-stone-400 hover:border-[#b9a783]/35 hover:text-stone-200 sm:flex"><Sparkles className="h-3.5 w-3.5" />Study tools</button>
              <button type="button" onClick={() => void createConversation()} aria-label="New conversation" className="rounded-lg border border-white/[0.09] p-2 text-stone-400 hover:border-[#b9a783]/35 hover:text-[#dfcba7]"><Plus className="h-4 w-4" /></button>
            </div>
          </header>

          {showToolsPanel && <div className="absolute right-4 top-[72px] z-[70] w-[min(380px,calc(100%-32px))] rounded-xl border border-[#b9a783]/25 bg-[#24221b] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold text-stone-100">Study tools</p><p className="mt-1 text-[10px] text-stone-500">Choose what you want to work on.</p></div><button type="button" onClick={() => setShowToolsPanel(false)} aria-label="Close study tools" className="p-1.5 text-stone-500"><X className="h-4 w-4" /></button></div>
            <div className="grid grid-cols-2 gap-2">{starterPrompts.map(({ icon: Icon, title, description, prompt }) => <button key={title} type="button" onClick={() => { handleStarterPrompt(prompt); setShowToolsPanel(false); }} className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-3 text-left hover:border-[#b9a783]/35 hover:bg-[#b9a783]/[0.06]"><Icon className="h-4 w-4 text-[#c7b58f]" /><span className="mt-2 block text-[11px] font-medium text-stone-200">{title}</span><span className="mt-1 block text-[10px] leading-4 text-stone-500">{description}</span></button>)}</div>
          </div>}

          {error && <div role="alert" className="mx-4 mt-3 flex items-start justify-between gap-3 rounded-lg border border-red-400/20 bg-red-400/[0.06] px-3 py-2.5 text-xs text-red-200 sm:mx-6"><span>{error}</span><button type="button" onClick={() => setError("")} aria-label="Dismiss error"><X className="h-3.5 w-3.5" /></button></div>}

          <div ref={chatLogRef} className="ss-ai2-scroll min-h-0 flex-1 overflow-y-auto">
            {conversationMessages.length === 0 ? <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center px-5 py-8 text-center sm:px-8">
              <div className="relative mb-1 h-[220px] w-full max-w-[420px] sm:h-[270px]"><NeuralIntelligence active={sending} listening={voiceListening} showControls={false} /><div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#171612] to-transparent" /></div>
              <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.2em] text-[#b9a783]/75"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />{voiceListening ? "Listening" : sending ? "Working on your question" : voiceStatus === "SPEAKING" ? "Speaking" : "StudySpace intelligence"}</div>
              <h2 className="mt-4 text-3xl font-medium tracking-[-0.045em] text-stone-100 sm:text-4xl">What are you working on?</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-stone-400">Ask a question, unpack a difficult idea, or practise until it clicks.</p>
              {selectedCourse && <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#b9a783]/20 bg-[#b9a783]/[0.06] px-3 py-1.5 text-[10px] text-[#d7c39e]"><BookOpen className="h-3 w-3" />Using {selectedCourse.code || selectedCourse.name}</div>}
              <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{starterPrompts.map(({ icon: Icon, title, description, prompt }) => <button key={title} type="button" onClick={() => handleStarterPrompt(prompt)} className="group rounded-xl border border-white/[0.08] bg-[#201f19]/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#b9a783]/35 hover:bg-[#26231b]"><div className="flex items-center justify-between"><Icon className="h-4 w-4 text-[#b9a783]" /><span className="text-[10px] text-stone-600 group-hover:text-[#c7b58f]">↗</span></div><span className="mt-3 block text-xs font-medium text-stone-200">{title}</span><span className="mt-1 block text-[10px] leading-4 text-stone-500">{description}</span></button>)}</div>
            </div> : <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-10">
              {conversationMessages.map((message) => {
                const isUser = message.role === "user";
                return <article key={message.id} className={["mb-7 flex gap-3", isUser ? "justify-end" : "justify-start"].join(" ")}>
                  {!isUser && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#b9a783]/20 bg-[#b9a783]/[0.07] text-[#c7b58f]"><Sparkles className="h-3.5 w-3.5" /></div>}
                  <div className={["min-w-0 max-w-[88%] sm:max-w-[82%]", isUser ? "text-right" : ""].join(" ")}>
                    <div className={["whitespace-pre-wrap break-words text-sm leading-7", isUser ? "rounded-2xl rounded-br-md bg-[#b9a783] px-4 py-3 text-[#211e18]" : "rounded-xl border border-white/[0.07] bg-[#211f19] px-4 py-3.5 text-stone-200"].join(" ")}>{message.content}</div>
                    <div className={["mt-1.5 flex items-center gap-2 text-[10px] text-stone-600", isUser ? "justify-end" : ""].join(" ")}><span>{isUser ? "You" : "StudySpace AI"}</span><span>·</span><span>{formatMessageTime(message.created_at)}</span>
                      {!isUser && <span className="ml-1 inline-flex items-center gap-1"><button type="button" aria-label="This answer was helpful" aria-pressed={messageFeedback[message.id] === 1} disabled={Boolean(feedbackSaving[message.id])} onClick={() => void rateAnswer(message, 1)} className={messageFeedback[message.id] === 1 ? "rounded p-1 text-emerald-300" : "rounded p-1 text-stone-600 hover:text-emerald-300"}><ThumbsUp className="h-3 w-3" /></button><button type="button" aria-label="This answer was not helpful" aria-pressed={messageFeedback[message.id] === -1} disabled={Boolean(feedbackSaving[message.id])} onClick={() => void rateAnswer(message, -1)} className={messageFeedback[message.id] === -1 ? "rounded p-1 text-rose-300" : "rounded p-1 text-stone-600 hover:text-rose-300"}><ThumbsDown className="h-3 w-3" /></button>{feedbackSaving[message.id] && <span>Saving…</span>}{feedbackStatus[message.id] && <span role="status">{feedbackStatus[message.id]}</span>}</span>}
                    </div>
                  </div>
                  {isUser && <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-stone-400"><User className="h-3.5 w-3.5" /></div>}
                </article>;
              })}
              {sending && conversationMessages[conversationMessages.length - 1]?.role === "user" && <div className="mb-6 flex items-center gap-2 pl-11 text-xs text-stone-500"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c7b58f]" />Thinking through your question…</div>}
            </div>}
          </div>

          <div className="shrink-0 border-t border-white/[0.07] bg-[#1b1a15] px-3 py-3 sm:px-6 sm:py-4">
            <form onSubmit={sendMessage} className="mx-auto w-full max-w-3xl">
              <div className="rounded-xl border border-white/[0.11] bg-[#24221b] p-2 focus-within:border-[#b9a783]/45">
                <textarea ref={textareaRef} aria-label="Message your AI tutor" maxLength={12000} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={selectedCourse ? "Ask about " + selectedCourse.name + "…" : "Ask your tutor anything…"} rows={2} className="max-h-36 min-h-[54px] w-full resize-y bg-transparent px-2 py-2 text-sm leading-6 text-stone-100 outline-none placeholder:text-stone-600" />
                <div className="flex items-center justify-between gap-2 px-1 pt-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <button type="button" onClick={toggleVoiceInput} disabled={!voiceSupported || sending} aria-label={voiceListening ? "Stop voice input" : "Start voice input"} title={voiceSupported ? (voiceListening ? "Stop listening" : "Speak to StudySpace") : "Voice input is unavailable in this browser"} className={voiceListening ? "rounded-lg bg-amber-300/10 p-2 text-amber-200" : "rounded-lg p-2 text-stone-500 hover:bg-white/[0.05] hover:text-stone-200"}><Mic className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setVoiceReplies((value) => !value)} aria-pressed={voiceReplies} aria-label={voiceReplies ? "Turn off spoken replies" : "Turn on spoken replies"} title={voiceReplies ? "Spoken replies on" : "Enable spoken replies"} className={voiceReplies ? "rounded-lg bg-[#b9a783]/10 p-2 text-[#dfcba7]" : "rounded-lg p-2 text-stone-500 hover:bg-white/[0.05] hover:text-stone-200"}>{voiceReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}</button>
                    {voiceStatus !== "READY" && <span role="status" className="hidden text-[9px] text-[#c7b58f]/75 sm:inline">{voiceStatus}</span>}
                    {selectedCourse && <span className="ml-1 hidden max-w-[180px] truncate rounded-md border border-white/[0.07] px-2 py-1 text-[10px] text-stone-500 sm:inline">{selectedCourse.code || selectedCourse.name}</span>}
                  </div>
                  <button type="submit" disabled={!input.trim() || sending} aria-label="Send message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#b9a783] text-[#211e18] hover:bg-[#d0bd98] disabled:cursor-not-allowed disabled:bg-white/[0.07] disabled:text-stone-600"><ArrowUp className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between px-1 text-[9px] text-stone-600"><span>AI can make mistakes. Verify important information.</span><span className="hidden sm:inline">Enter to send · Shift + Enter for a new line</span></div>
            </form>
          </div>
        </section>

        {deleteTarget && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="delete-conversation-title" className="w-full max-w-sm rounded-xl border border-white/10 bg-[#24221b] p-5 shadow-2xl"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-400/10 text-red-300"><Trash2 className="h-4 w-4" /></div><h3 id="delete-conversation-title" className="mt-4 text-sm font-semibold text-stone-100">Delete conversation?</h3><p className="mt-2 text-xs leading-5 text-stone-400">This permanently removes the conversation and its messages.</p><div className="mt-5 flex gap-2"><button type="button" onClick={() => setDeleteTarget(null)} className="flex-1 rounded-lg border border-white/10 px-4 py-2.5 text-xs text-stone-300 hover:bg-white/[0.05]">Cancel</button><button type="button" onClick={() => void deleteConversation(deleteTarget)} className="flex-1 rounded-lg bg-red-400/15 px-4 py-2.5 text-xs font-semibold text-red-200 hover:bg-red-400/25">Delete</button></div></div></div>}
      </div>
    </AppShell>
  );
}
