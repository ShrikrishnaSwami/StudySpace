"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  ArrowUp,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Menu,
  Mic,
  Volume2,
  VolumeX,
  MessageSquare,
  MoreHorizontal,
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
import DraggablePanel from "@/components/DraggablePanel";
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
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [chatPosition, setChatPosition] = useState({ x: 0, y: 0 });
  const chatDragRef = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  const [error, setError] =
    useState("");

  const [deleteTarget, setDeleteTarget] =
    useState<string | null>(null);

  const [messageFeedback, setMessageFeedback] =
    useState<Record<string, -1 | 1>>({});
  const [feedbackSaving, setFeedbackSaving] = useState<Record<string, boolean>>({});
  const [feedbackStatus, setFeedbackStatus] = useState<Record<string, string>>({});

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
          setShowChatPanel(true);
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

    setShowChatPanel(true);
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

    let assistantMessageId: string | null = null;
    let streamCompleted = false;
    const requestController = new AbortController();
    let requestTimeout: number | undefined;

    try {
      setSending(true);
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

  function startChatDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("button")) return;
    chatDragRef.current = { x: event.clientX, y: event.clientY, left: chatPosition.x, top: chatPosition.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveChatDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (!chatDragRef.current) return;
    setChatPosition({
      x: chatDragRef.current.left + event.clientX - chatDragRef.current.x,
      y: chatDragRef.current.top + event.clientY - chatDragRef.current.y,
    });
  }

  function stopChatDrag() {
    chatDragRef.current = null;
  }

  function handleStarterPrompt(
    prompt: string
  ) {
    setShowChatPanel(true);
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
      <div className={`ss-neural-tutor relative flex h-[calc(100vh-68px)] min-h-[650px] overflow-hidden bg-[#171612] ${conversationMessages.length ? "has-messages" : ""} ${showChatPanel ? "is-chat-open" : ""}`}>

        {/* =================================================
            DESKTOP CONVERSATION SIDEBAR
        ================================================= */}

        <aside className={`ss-neural-history absolute inset-y-0 left-0 z-50 w-[min(330px,88vw)] border-r border-cyan-200/[0.12] bg-[#030b1b]/[.98] ${showHistory ? "flex" : "hidden"}`}>

          {/* SIDEBAR HEADER */}

          <div className="border-b border-white/[0.06] p-4 relative">
            <button type="button" onClick={() => setShowHistory(false)} aria-label="Close past topics" className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center border border-cyan-200/15 bg-cyan-200/[0.05] text-cyan-100/70 hover:bg-cyan-200/10"><X className="h-4 w-4" /></button>

            <button
              type="button"
              onClick={() => {
                void createConversation();
                setShowHistory(false);
              }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-xs font-semibold text-white shadow-lg shadow-violet-950/20 transition hover:bg-violet-500"
            >
              <Plus className="h-4 w-4" />
              New conversation
            </button>

            <div className="mt-4 flex items-center justify-between px-1">
              <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/20">
                Past topics
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
                Your learning history · private to you
              </span>
            </div>
          </div>
        </aside>

        {/* =================================================
            MAIN CHAT
        ================================================= */}

        <main className="ss-neural-main relative flex min-w-0 flex-1 flex-col">
          <div className="ss-neural-backdrop"><NeuralIntelligence active={sending} listening={voiceListening} showControls onAction={(action) => { if (action === "new-chat") { void (async () => { const conversation = await createConversation(); if (conversation) setShowChatPanel(true); })(); } else if (action === "history") { setShowHistory(true); } else { setShowToolsPanel(true); } }} onPrompt={handleStarterPrompt} /></div>

          {showToolsPanel && <DraggablePanel title="Study instruments" onClose={() => setShowToolsPanel(false)} className="ss-neural-tools-panel">
            <p className="mb-4 text-xs leading-6 text-stone-400">Choose a direction and the neural workspace will open a prompt for you.</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Understand", "Explain a difficult concept from my course in simple terms."],
                ["Practice", "Give me practice questions on the topic I am studying."],
                ["Plan", "Help me make a study plan for my upcoming work."],
                ["Work through", "Help me understand this homework problem step by step."],
                ["Make a quiz", "Create a short practice quiz from my course material. Ask one question at a time."],
                ["Flashcards", "Help me create active-recall flashcards from my course material."]
              ].map(([label, prompt]) => <button key={label} type="button" onClick={() => { handleStarterPrompt(prompt); setShowToolsPanel(false); }} className="ss-neural-tool-choice">{label}<span>↗</span></button>)}
            </div>
          </DraggablePanel>}

          {/* =================================================
              CHAT HEADER
          ================================================= */}

          <header className="ss-neural-header relative z-20 flex h-[68px] shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#080611]/90 px-4 backdrop-blur-xl sm:px-6">

            {/* MOBILE HISTORY */}

            <button
              type="button"
              onClick={() =>
                setShowHistory(
                  (value) => !value
                )
              }
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-200/15 bg-cyan-200/[0.04] text-cyan-100/70 transition hover:bg-cyan-200/[0.1] hover:text-white"
              aria-label="Toggle past topics" title="Past topics"
            >
              {showHistory ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>

            {/* AI IDENTITY */}

            <div className="flex min-w-0 items-center gap-3">
              <div className="ss-neural-mini relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                <span className="ss-neural-mini-core" />

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

              <div className="ss-neural-welcome flex min-h-full items-center justify-center px-5 py-12">

                <div className="w-full max-w-3xl">

                  <div className="text-center">



                    <div className="mt-6 flex items-center justify-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/25">
                        {voiceListening ? "LISTENING · SPEAK NOW" : sending ? "PROCESSING YOUR REQUEST" : voiceStatus === "SPEAKING" ? "VOICE RESPONSE ACTIVE" : "STUDYSPACE INTELLIGENCE · ONLINE"}
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

                  <div className="ss-neural-hotspot-hint">SELECT A SIGNAL TO BEGIN · OR ASK YOUR OWN QUESTION</div>

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

              <div style={{ transform: `translate3d(${chatPosition.x}px, ${chatPosition.y}px, 0)` }} className="ss-neural-chatlog mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">

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

                            {!isUser && (
                              <span className="ml-2 inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  aria-label="This answer was helpful"
                                  aria-pressed={messageFeedback[message.id] === 1}
                                  title="Helpful"
                                  disabled={Boolean(feedbackSaving[message.id])}
                                  onClick={() => void rateAnswer(message, 1)}
                                  className={`rounded-md p-1 transition hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-50 ${messageFeedback[message.id] === 1 ? "text-emerald-300" : "text-white/25 hover:text-emerald-300"}`}
                                >
                                  <ThumbsUp className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="This answer was not helpful"
                                  aria-pressed={messageFeedback[message.id] === -1}
                                  title="Not helpful"
                                  disabled={Boolean(feedbackSaving[message.id])}
                                  onClick={() => void rateAnswer(message, -1)}
                                  className={`rounded-md p-1 transition hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-50 ${messageFeedback[message.id] === -1 ? "text-rose-300" : "text-white/25 hover:text-rose-300"}`}
                                >
                                  <ThumbsDown className="h-3 w-3" />
                                </button>
                                {feedbackSaving[message.id] && <span role="status" className="text-[10px] text-white/45">Saving…</span>}
                                {feedbackStatus[message.id] && <span role="status" className={`max-w-48 truncate text-[10px] ${feedbackStatus[message.id] === "Feedback saved" ? "text-emerald-300/80" : "text-rose-300/80"}`}>{feedbackStatus[message.id]}</span>}
                              </span>
                            )}

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

          <div style={{ transform: `translate3d(${chatPosition.x}px, ${chatPosition.y}px, 0)` }} className="ss-neural-composer shrink-0 border-t border-white/[0.06] bg-[#080611]/95 px-3 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
            <div className="ss-neural-composer-title" onPointerDown={startChatDrag} onPointerMove={moveChatDrag} onPointerUp={stopChatDrag} onPointerCancel={stopChatDrag}><span>LIVE CONVERSATION · DRAG TO MOVE</span><button type="button" onClick={() => setShowChatPanel(false)} aria-label="Close conversation window"><X className="h-3.5 w-3.5"/></button></div>

            <form
              onSubmit={sendMessage}
              className="mx-auto w-full max-w-4xl"
            >
              <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.025] transition focus-within:border-violet-400/20 focus-within:bg-white/[0.035]">

                <textarea ref={textareaRef} aria-label="Message your AI tutor" maxLength={12000} value={input} onChange={(event) =>
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
                    <button type="button" onClick={toggleVoiceInput} disabled={!voiceSupported || sending} aria-label={voiceListening ? "Stop voice input" : "Start voice input"} title={voiceSupported ? (voiceListening ? "Stop listening" : "Speak to StudySpace") : "Voice input works in supported browsers"} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-35 ${voiceListening ? "ss-voice-listening border-amber-300/50 bg-amber-300/15 text-amber-200" : "border-white/[0.06] bg-white/[0.025] text-white/40 hover:border-amber-200/30 hover:text-amber-100"}`}>
                      <Mic className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setVoiceReplies((value) => !value)} aria-pressed={voiceReplies} aria-label={voiceReplies ? "Turn off spoken replies" : "Turn on spoken replies"} title={voiceReplies ? "Spoken replies on" : "Enable spoken replies"} className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${voiceReplies ? "border-amber-200/35 bg-amber-200/10 text-amber-100" : "border-white/[0.06] bg-white/[0.025] text-white/35 hover:text-white/70"}`}>
                      {voiceReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                    {voiceStatus !== "READY" && <span role="status" className="hidden text-[9px] tracking-[0.16em] text-amber-100/60 sm:inline">{voiceStatus}</span>}
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