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
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  Trash2,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
  Plus,
  BookMarked,
  NotebookPen,
  ClipboardList,
  BrainCircuit,
  CalendarDays,
  Layers,
  Grip,
  ExternalLink,
} from "lucide-react";

import Link from "next/link";
import AppShell from "@/components/AppShell";
import ViewportPortal from "@/components/ViewportPortal";
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

type WorkspaceKind = "chat" | "history" | "tools" | "courses" | "course" | "notes" | "assignments" | "quizzes" | "flashcards" | "calendar";
type WorkspaceWindow = { id: string; kind: WorkspaceKind; title: string; x: number; y: number; width: number; height: number; courseId?: string; parentId?: string };
type StudyNode = { id: string; kind: Exclude<WorkspaceKind, "history" | "tools" | "course">; title: string; x: number; y: number; parentId: string | null; courseId?: string };

type SpeechRecognitionAlternativeLike = { transcript: string };
type SpeechRecognitionResultLike = ArrayLike<SpeechRecognitionAlternativeLike>;
type SpeechRecognitionEventLike = { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionErrorEventLike = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
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

function isStudyNode(value: unknown): value is StudyNode {
  if (!value || typeof value !== "object") return false;
  const node = value as Record<string, unknown>;
  const validKinds = ["chat", "notes", "courses", "assignments", "quizzes", "flashcards", "calendar"];
  return typeof node.id === "string"
    && typeof node.title === "string"
    && typeof node.kind === "string"
    && validKinds.includes(node.kind)
    && typeof node.x === "number" && Number.isFinite(node.x) && node.x >= 0 && node.x <= 100
    && typeof node.y === "number" && Number.isFinite(node.y) && node.y >= 0 && node.y <= 100
    && (node.parentId === null || typeof node.parentId === "string")
    && (node.courseId === undefined || typeof node.courseId === "string");
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
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceRepliesRef = useRef(false);

  const [workspaceWindows, setWorkspaceWindows] = useState<WorkspaceWindow[]>([]);
  const [focusedWindowId, setFocusedWindowId] = useState<string | null>(null);
  const [nodesHydrated, setNodesHydrated] = useState(false);
  const [selectedNodeKind, setSelectedNodeKind] = useState<StudyNode["kind"]>("notes");
  const [workspaceScale, setWorkspaceScale] = useState(100);
  const [studyNodes, setStudyNodes] = useState<StudyNode[]>([]);
  const [studyNodesHydrated, setStudyNodesHydrated] = useState(false);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const canvasRef = useRef<HTMLElement>(null);
  const nodeDragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);

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
    const speechWindow = window as Window & { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
    const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
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
    const speechWindow = window as Window & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const SpeechRecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
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
      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript || "")
          .join(" ");
        setInput(transcript);
      };
      recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
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

      setInput("");

      setMessages((current) =>
        current.filter(
          (message) =>
            message.conversation_id !==
            conversation.id
        )
      );

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

  function openWorkspace(kind: WorkspaceKind, title: string, courseId?: string, parentId?: string, placementIndex = 0) {
    const id = crypto.randomUUID();
    const parent = parentId ? workspaceWindows.find(item => item.id === parentId) : undefined;
    const offset = (workspaceWindows.length + placementIndex) % 7;
    const next: WorkspaceWindow = {
      id, kind, title, courseId, parentId,
      x: Math.max(18, Math.min(window.innerWidth - 540, (parent?.x ?? 90) + 46 + offset * 42)),
      y: Math.max(82, Math.min(window.innerHeight - 520, (parent?.y ?? 100) + 54 + offset * 34)),
      width: Math.round((kind === "chat" ? 500 : kind === "history" ? 390 : 420) * workspaceScale / 100),
      height: Math.round((kind === "chat" ? 560 : 480) * workspaceScale / 100),
    };
    setWorkspaceWindows(current => current.length >= 18 ? current : [...current, next]);
    setFocusedWindowId(id);
    return id;
  }

  function closeWorkspace(id: string) {
    setWorkspaceWindows(current => current.filter(item => item.id !== id).map(item => item.parentId === id ? { ...item, parentId: undefined } : item));
    setFocusedWindowId(current => current === id ? null : current);
  }

  function createChildNode(parent: StudyNode) {
    if (studyNodes.length >= 24) return;
    const kind = selectedNodeKind;
    const item = studyWorkspaceItems.find(entry => entry.kind === kind);
    const siblings = studyNodes.filter(node => node.parentId === parent.id).length;
    const minX = typeof window !== "undefined" && window.innerWidth <= 700 ? 20 : 8;
    const next: StudyNode = {
      id: crypto.randomUUID(),
      kind,
      title: item?.title || "New study node",
      x: Math.max(minX, Math.min(100 - minX, parent.x + (siblings % 2 === 0 ? 13 : -13))),
      y: Math.max(12, Math.min(82, parent.y + 13 + Math.floor(siblings / 2) * 8)),
      parentId: parent.id,
      courseId: parent.courseId,
    };
    setStudyNodes(current => [...current, next]);
  }

  function addRootStudyNode(kind: StudyNode["kind"], title: string, courseId?: string) {
    if (studyNodes.length >= 24) return;
    const roots = studyNodes.filter(node => !node.parentId).length;
    const angle = roots * 2.399963229728653 - Math.PI / 2;
    const minX = typeof window !== "undefined" && window.innerWidth <= 700 ? 20 : 8;
    const node: StudyNode = {
      id: crypto.randomUUID(),
      kind,
      title,
      courseId,
      x: Math.max(minX, Math.min(100 - minX, 50 + Math.cos(angle) * 32)),
      y: Math.max(15, Math.min(78, 48 + Math.sin(angle) * 22)),
      parentId: null,
    };
    setStudyNodes(current => [...current, node]);
  }

  function addBrainNode() {
    const item = studyWorkspaceItems.find(entry => entry.kind === selectedNodeKind);
    addRootStudyNode(selectedNodeKind, item?.title || "Study node");
  }

  function resizeAllWorkspaces(nextScale: number) {
    const bounded = Math.max(65, Math.min(130, nextScale));
    setWorkspaceScale(bounded);
    setWorkspaceWindows(current => current.map(workspace => {
      const baseWidth = workspace.kind === "chat" ? 500 : workspace.kind === "history" ? 390 : 420;
      const baseHeight = workspace.kind === "chat" ? 560 : 480;
      return { ...workspace, width: Math.round(baseWidth * bounded / 100), height: Math.round(baseHeight * bounded / 100) };
    }));
  }

  function openStudyNode(node: StudyNode) {
    if (node.kind === "chat") {
      setSelectedCourseId(node.courseId || "");
      void createConversation(node.courseId || "").then(conversation => {
        if (conversation) {
          const id = openWorkspace("chat", node.title, node.courseId, node.parentId || undefined);
          setFocusedWindowId(id);
        }
      });
      return;
    }
    if (node.kind === "courses" && node.courseId) {
      const course = courses.find(item => item.id === node.courseId);
      openWorkspace("course", course?.code ? `${course.code} · ${course.name}` : node.title, node.courseId, node.parentId || undefined);
      return;
    }
    openWorkspace(node.kind, node.title, node.courseId, node.parentId || undefined);
  }

  function startNodeDrag(event: ReactPointerEvent, id: string) {
    if ((event.target as HTMLElement).closest("button, a, select")) return;
    const canvas = canvasRef.current;
    const node = studyNodes.find(item => item.id === id);
    if (!canvas || !node) return;
    const rect = canvas.getBoundingClientRect();
    nodeDragState.current = {
      id,
      offsetX: event.clientX - rect.left - (node.x / 100) * rect.width,
      offsetY: event.clientY - rect.top - (node.y / 100) * rect.height,
    };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function deleteStudyNode(id: string) {
    setStudyNodes(current => {
      const removed = new Set([id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const node of current) {
          if (node.parentId && removed.has(node.parentId) && !removed.has(node.id)) {
            removed.add(node.id);
            changed = true;
          }
        }
      }
      return current.filter(node => !removed.has(node.id));
    });
  }

  function startWindowDrag(event: ReactPointerEvent, id: string) {
    if ((event.target as HTMLElement).closest("button")) return;
    const item = workspaceWindows.find(entry => entry.id === id);
    if (!item) return;
    dragState.current = { id, offsetX: event.clientX - item.x, offsetY: event.clientY - item.y };
    setFocusedWindowId(id);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const drag = nodeDragState.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) return;
      const rect = canvas.getBoundingClientRect();
      setStudyNodes(current => current.map(node => node.id === drag.id ? {
        ...node,
        x: Math.max(5, Math.min(95, ((event.clientX - rect.left - drag.offsetX) / rect.width) * 100)),
        y: Math.max(8, Math.min(92, ((event.clientY - rect.top - drag.offsetY) / rect.height) * 100)),
      } : node));
    };
    const end = () => { nodeDragState.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    return () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", end); };
  }, []);

  useEffect(() => {
    let active = true;
    const loadStudyWorkspace = async () => {
      let localNodes: StudyNode[] = [];
      try {
        const saved = localStorage.getItem("studyspace-ai-brain-nodes-v1");
        if (saved) {
          const parsed: unknown = JSON.parse(saved);
          if (Array.isArray(parsed)) localNodes = parsed.filter(isStudyNode).slice(0, 24);
        }
      } catch { /* Ignore malformed local canvas data and try the account copy. */ }

      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) {
          if (active) setStudyNodes(localNodes);
          return;
        }

        const { data, error } = await supabase
          .from("ai_study_workspaces")
          .select("nodes")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;

        if (data && Array.isArray(data.nodes)) {
          if (active) setStudyNodes(data.nodes.filter(isStudyNode).slice(0, 24));
        } else {
          if (active) setStudyNodes(localNodes);
          if (localNodes.length) {
            const { error: migrationError } = await supabase.from("ai_study_workspaces").upsert({
              user_id: user.id,
              nodes: localNodes,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            if (migrationError) throw migrationError;
          }
        }
      } catch (loadError) {
        console.error("Could not load the account AI canvas; using this browser's saved copy.", loadError);
        if (active) setStudyNodes(localNodes);
      } finally {
        if (active) setStudyNodesHydrated(true);
      }
    };
    void loadStudyWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!studyNodesHydrated) return;
    try { localStorage.setItem("studyspace-ai-brain-nodes-v1", JSON.stringify(studyNodes)); }
    catch { /* The canvas remains usable when storage is unavailable. */ }

    let active = true;
    const saveTimer = window.setTimeout(() => {
      void (async () => {
        try {
          const { data: { user }, error: authError } = await supabase.auth.getUser();
          if (authError || !user || !active) return;
          const { error } = await supabase.from("ai_study_workspaces").upsert({
            user_id: user.id,
            nodes: studyNodes,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
          if (error) console.error("Could not sync the AI study canvas:", error.message);
        } catch (saveError) {
          console.error("Could not sync the AI study canvas.", saveError);
        }
      })();
    }, 650);
    return () => { active = false; window.clearTimeout(saveTimer); };
  }, [studyNodes, studyNodesHydrated]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("studyspace-ai-workspace-nodes-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as WorkspaceWindow[];
        if (Array.isArray(parsed)) {
          setWorkspaceWindows(parsed.filter(item =>
            item && typeof item.id === "string" &&
            ["chat", "history", "tools", "courses"].includes(item.kind) &&
            typeof item.title === "string" && Number.isFinite(item.x) && Number.isFinite(item.y)
          ).slice(0, 18));
        }
      }
    } catch { /* A malformed or unavailable local workspace is safely ignored. */ }
    setNodesHydrated(true);
  }, []);

  useEffect(() => {
    if (!nodesHydrated) return;
    try {
      localStorage.setItem("studyspace-ai-workspace-nodes-v1", JSON.stringify(workspaceWindows));
    } catch { /* The workspace remains usable if browser storage is unavailable. */ }
  }, [workspaceWindows, nodesHydrated]);

  useEffect(() => {
    setNoteDrafts(current => {
      const restored = { ...current };
      for (const workspace of workspaceWindows) {
        if (workspace.kind !== "notes" || restored[workspace.id] !== undefined) continue;
        try {
          const saved = localStorage.getItem(`studyspace-ai-note-${workspace.courseId || "general"}`);
          if (saved !== null) restored[workspace.id] = saved;
        } catch { /* Local storage may be unavailable in private browsing. */ }
      }
      return restored;
    });
  }, [workspaceWindows]);

  async function handleNeuralAction(action: "new-chat" | "history") {
    if (action === "new-chat") {
      openWorkspace("chat", "New chat");
      const conversation = await createConversation();
      if (!conversation) return;
      window.setTimeout(() => textareaRef.current?.focus(), 100);
      return;
    }
    if (workspaceWindows.some(item => item.kind === action)) {
      const existing = workspaceWindows.find(item => item.kind === action);
      if (existing) { setFocusedWindowId(existing.id); return; }
    }
    openWorkspace(action, "Conversation history");
  }

  const studyWorkspaceItems: { kind: StudyNode["kind"]; title: string; description: string; icon: typeof BookOpen; href?: string }[] = [
    { kind: "courses", title: "My courses", description: "Open a course branch and its study spaces.", icon: BookMarked },
    { kind: "notes", title: "Notes", description: "Create a personal notes workspace.", icon: NotebookPen },
    { kind: "assignments", title: "Assignments", description: "Review and work through your assignments.", icon: ClipboardList, href: "/assignments" },
    { kind: "quizzes", title: "Quizzes", description: "Practise and review your quizzes.", icon: BrainCircuit, href: "/quizzes" },
    { kind: "flashcards", title: "Flashcards", description: "Build active-recall study sessions.", icon: Layers, href: "/flashcards" },
    { kind: "calendar", title: "Calendar", description: "Keep deadlines and study sessions in view.", icon: CalendarDays, href: "/calendar" },
  ];

  /* =======================================================
     STARTER PROMPT
  ======================================================= */

  /* =======================================================
     LOADING
  ======================================================= */

  /* =======================================================
     MAIN UI
  ======================================================= */


  if (loading) return <AppShell><main className="flex min-h-[calc(100dvh-68px)] items-center justify-center bg-[#171612]"><div className="text-center"><div className="mx-auto h-10 w-10 animate-pulse rounded-full border border-[#b9a783]/45 shadow-[0_0_35px_rgba(185,167,131,.2)]"/><p className="mt-4 text-[9px] tracking-[.24em] text-[#b9a783]/70">INITIALIZING INTELLIGENCE</p></div></main></AppShell>;

  const historyPanel = <div className="min-h-0 flex-1 overflow-y-auto p-5">
    <div className="mb-4 flex items-center justify-between border-b border-[#b9a783]/15 pb-3"><div><p className="text-[9px] tracking-[.22em] text-[#b9a783]/65">ARCHIVE</p><h2 className="mt-1 text-lg font-light text-stone-100">Conversation history</h2></div><span className="text-[10px] text-stone-500">{conversations.length} saved</span></div>
    {conversations.length===0?<p className="py-12 text-center text-xs text-stone-500">Your conversations will appear here.</p>:conversations.map((item)=><div key={item.id} className="group flex items-center border-b border-white/[0.05] hover:bg-white/[0.03]"><button type="button" onClick={()=>{void selectConversation(item);openWorkspace("chat","AI Tutor");}} className="min-w-0 flex-1 px-3 py-3 text-left"><span className="block truncate text-xs text-stone-200">{item.title||"Untitled conversation"}</span><span className="mt-1 block text-[9px] text-stone-600">{formatConversationDate(item.updated_at)}</span></button><button type="button" onClick={()=>setDeleteTarget(item.id)} aria-label="Delete conversation" className="mr-2 p-2 text-stone-600 opacity-0 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-3.5 w-3.5"/></button></div>)}
  </div>;

  return <AppShell>
    <main ref={canvasRef} className="ss-neural-tutor ss-jarvis-screen relative isolate flex h-[calc(100dvh-68px)] min-h-[560px] items-center justify-center overflow-hidden bg-[#171612] text-stone-200">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(185,167,131,.13),transparent_38%),linear-gradient(180deg,#171612,#14130f)]"/>
      <div className="ss-jarvis-stage absolute inset-0 z-[1]">
        <div className="ss-jarvis-core-wrap">
          <button type="button" onClick={addBrainNode} disabled={studyNodes.length >= 24} aria-label={`Add a ${selectedNodeKind} node to the brain`} title="Click to add the selected node" className={["ss-jarvis-core group pointer-events-auto cursor-pointer border-0 bg-transparent p-0",sending||voiceListening?"is-thinking":"",studyNodes.length >= 24 ? "cursor-not-allowed opacity-70" : ""].join(" ")}>
            <div className="ss-jarvis-orbit ss-jarvis-orbit-one"/>
            <div className="ss-jarvis-orbit ss-jarvis-orbit-two"/>
            <div className="ss-jarvis-orbit ss-jarvis-orbit-three"/>
            <div className="ss-jarvis-core-glow"/>
            <div className="ss-jarvis-scan"/>
            <div className="ss-jarvis-core-center"><Sparkles className="h-10 w-10"/></div>
            <span className="ss-jarvis-core-label">STUDYSPACE</span>
            <span className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] tracking-[.16em] text-[#b9a783]/70 opacity-0 transition group-hover:opacity-100">CLICK TO ADD NODE</span>
          </button>
        </div>
        <NeuralIntelligence active={sending} listening={voiceListening} controlsOnly showControls activeAction={workspaceWindows.some(item=>item.kind==="chat")?"new-chat":workspaceWindows.some(item=>item.kind==="history")?"history":undefined} onAction={handleNeuralAction}/>
      </div>
      <div className="absolute left-4 top-4 z-[90] flex flex-wrap items-center gap-3 border border-[#b9a783]/20 bg-[#1b1914]/85 px-3 py-2.5 shadow-xl backdrop-blur-xl sm:left-7 sm:top-6">
        <label className="flex items-center gap-2 text-[9px] tracking-[.14em] text-[#b9a783]/70">ADD NODE
          <select value={selectedNodeKind} onChange={event=>setSelectedNodeKind(event.target.value as StudyNode["kind"])} className="max-w-[130px] border border-[#b9a783]/25 bg-[#171612] px-2 py-1.5 text-[10px] tracking-normal text-stone-200 outline-none">
            <option value="notes">Notes</option><option value="courses">Courses</option><option value="assignments">Assignments</option><option value="quizzes">Quizzes</option><option value="flashcards">Flashcards</option><option value="calendar">Calendar</option><option value="chat">AI chat</option>
          </select>
        </label>
        <span className="h-5 w-px bg-white/10"/>
        <label className="flex items-center gap-2 text-[9px] tracking-[.12em] text-[#b9a783]/70">WINDOW SIZE
          <input aria-label="Resize all open node windows" type="range" min="65" max="130" step="5" value={workspaceScale} onChange={event=>resizeAllWorkspaces(Number(event.target.value))} className="w-20 accent-[#b9a783]"/>
          <span className="w-8 text-right text-[9px] text-stone-400">{workspaceScale}%</span>
        </label>
      </div>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible">
        {studyNodes.map(node => {
          const parent = node.parentId ? studyNodes.find(item => item.id === node.parentId) : null;
          return <line key={node.id} x1={parent ? `${parent.x}%` : "50%"} y1={parent ? `${parent.y}%` : "48%"} x2={`${node.x}%`} y2={`${node.y}%`} stroke="rgba(185,167,131,.56)" strokeWidth="1.5" strokeDasharray="4 7" />;
        })}
        {studyNodes.map(node => <circle key={node.id} cx={`${node.x}%`} cy={`${node.y}%`} r="3" fill="#c7b58f" />)}
      </svg>
      <div className="pointer-events-none absolute inset-0 z-[25]">
        {studyNodes.map(node => {
          const item = studyWorkspaceItems.find(entry => entry.kind === node.kind);
          const Icon = item?.icon || Sparkles;
          return <div key={node.id} onPointerDown={event => startNodeDrag(event, node.id)} style={{ left: `${node.x}%`, top: `${node.y}%`, transform: "translate(-50%,-50%)" }} className="ss-brain-study-node pointer-events-auto absolute flex min-w-[148px] max-w-[190px] touch-none items-center gap-2 border border-[#b9a783]/35 bg-[#211f19]/95 px-3 py-2.5 shadow-[0_12px_35px_rgba(0,0,0,.4)] backdrop-blur-xl">
            <span className="grid h-8 w-8 shrink-0 place-items-center border border-[#b9a783]/25 bg-[#b9a783]/[0.08] text-[#d4c3a0]"><Icon className="h-4 w-4"/></span>
            <div className="min-w-0 flex-1"><button type="button" onClick={() => openStudyNode(node)} className="block w-full truncate text-left text-[10px] font-medium text-stone-100 hover:text-[#e4d3b0]">{node.title}</button><span className="block text-[8px] tracking-[.12em] text-[#b9a783]/55">{node.parentId ? "CONNECTED BRANCH" : "BRAIN NODE"}</span></div>
            <button type="button" onClick={() => createChildNode(node)} title="Create a connected child node" aria-label={`Create a node from ${node.title}`} className="grid h-7 w-7 shrink-0 place-items-center text-[#c7b58f]/70 hover:bg-[#b9a783]/10 hover:text-[#e5d3ad]"><Plus className="h-3.5 w-3.5"/></button>
            <button type="button" onClick={() => deleteStudyNode(node.id)} title="Delete node" aria-label={`Delete ${node.title} node`} className="grid h-7 w-7 shrink-0 place-items-center text-stone-600 hover:bg-red-400/10 hover:text-red-300"><X className="h-3.5 w-3.5"/></button>
          </div>;
        })}
      </div>
      <div className="pointer-events-none absolute bottom-7 left-1/2 z-[3] -translate-x-1/2 text-center"><p className="text-[9px] tracking-[.18em] text-stone-500">{voiceListening?"VOICE INPUT ACTIVE":sending?"PROCESSING REQUEST":"SELECT A NODE OR CLICK THE BRAIN"}</p></div>

      {workspaceWindows.map((workspace, index) => <section
        key={workspace.id}
        role="dialog"
        aria-label={workspace.title}
        onPointerDown={() => setFocusedWindowId(workspace.id)}
        className="ss-jarvis-window absolute z-30 flex flex-col overflow-hidden border border-[#b9a783]/30 bg-[#201e18]/96 shadow-[0_30px_100px_rgba(0,0,0,.62)] backdrop-blur-2xl"
        style={{ left: workspace.x, top: workspace.y, width: `min(${workspace.width}px,calc(100vw - 24px))`, height: `min(${workspace.height}px,calc(100dvh - 92px))`, zIndex: focusedWindowId === workspace.id ? 80 : 30 + index }}
      >
        <header onPointerDown={event => startWindowDrag(event, workspace.id)} className="ss-jarvis-window-head flex shrink-0 cursor-grab touch-none items-center justify-between border-b border-[#b9a783]/20 px-4 py-3 active:cursor-grabbing">
          <div className="flex min-w-0 items-center gap-2"><Grip className="h-3.5 w-3.5 shrink-0 text-[#b9a783]/65"/><div className="min-w-0"><p className="text-[8px] tracking-[.2em] text-[#b9a783]/65">STUDYSPACE / WORKSPACE</p><h2 className="truncate text-sm font-light text-stone-100">{workspace.title}</h2></div></div>
          <div className="ml-2 flex shrink-0 items-center gap-1">
            <button type="button" onClick={() => closeWorkspace(workspace.id)} aria-label={`Close ${workspace.title}`} className="grid h-8 w-8 shrink-0 place-items-center text-stone-400 transition hover:bg-white/10 hover:text-white"><X className="h-4 w-4"/></button>
          </div>
        </header>

        {workspace.kind === "history" && historyPanel}
        {workspace.kind === "courses" && <div className="min-h-0 flex-1 overflow-y-auto p-4"><p className="mb-3 text-xs text-stone-400">Choose one of your courses to create a dedicated branch.</p>{courses.length === 0 ? <p className="py-10 text-center text-xs text-stone-500">Your courses will appear here once you add them.</p> : <div className="space-y-2">{courses.map(course=><button key={course.id} type="button" onClick={() => { addRootStudyNode("courses", course.code ? `${course.code} · Study space` : course.name, course.id); closeWorkspace(workspace.id); }} className="flex w-full items-center justify-between border border-white/[0.08] bg-white/[0.025] p-3 text-left hover:border-[#b9a783]/40"><span><span className="block text-xs text-stone-200">{course.code || course.name}</span><span className="mt-1 block text-[10px] text-stone-500">{course.code ? course.name : course.professor || "Course workspace"}</span></span><Plus className="h-4 w-4 text-[#b9a783]"/></button>)}</div>}</div>}
        {workspace.kind === "course" && <div className="min-h-0 flex-1 overflow-y-auto p-4"><p className="text-xs text-stone-400">Your course branch keeps its related study spaces together.</p><div className="mt-4 grid grid-cols-2 gap-2">{[{kind:"notes" as const,title:"Course notes",icon:NotebookPen},{kind:"assignments" as const,title:"Assignments",icon:ClipboardList},{kind:"quizzes" as const,title:"Quizzes",icon:BrainCircuit},{kind:"flashcards" as const,title:"Flashcards",icon:Layers},{kind:"calendar" as const,title:"Calendar",icon:CalendarDays},{kind:"chat" as const,title:"Ask AI Tutor",icon:Sparkles}].map(({kind,title,icon:Icon})=><button key={kind} type="button" onClick={()=>{if(kind==="chat"){setSelectedCourseId(workspace.courseId||"");void createConversation(workspace.courseId||"");}openWorkspace(kind,title,workspace.courseId);}} className="border border-white/[0.08] bg-white/[0.025] p-3 text-left hover:border-[#b9a783]/40"><Icon className="h-4 w-4 text-[#b9a783]"/><span className="mt-2 block text-xs text-stone-200">{title}</span></button>)}</div><Link href="/courses" className="mt-5 inline-flex items-center gap-2 text-[10px] text-[#c7b58f] hover:text-stone-100">Open full course manager <ExternalLink className="h-3 w-3"/></Link></div>}
        {workspace.kind === "notes" && <div className="flex min-h-0 flex-1 flex-col p-4"><p className="mb-3 text-[10px] text-stone-500">A scratchpad branch for ideas, lecture notes, and revision points. This draft stays in this open workspace.</p><textarea value={noteDrafts[workspace.id] || ""} onChange={event=>{const value=event.target.value;setNoteDrafts(current=>({...current,[workspace.id]:value}));try{localStorage.setItem(`studyspace-ai-note-${workspace.courseId || "general"}`,value);}catch{}}} placeholder="Start writing your notes…" className="min-h-0 flex-1 resize-none border border-[#b9a783]/20 bg-black/20 p-3 text-xs leading-6 text-stone-200 outline-none placeholder:text-stone-600 focus:border-[#b9a783]/50"/></div>}
        {["assignments","quizzes","flashcards","calendar"].includes(workspace.kind) && <iframe title={workspace.title} src={workspace.kind === "assignments" ? "/assignments" : workspace.kind === "quizzes" ? "/quizzes" : workspace.kind === "flashcards" ? "/flashcards" : "/calendar"} className="min-h-0 w-full flex-1 border-0 bg-[#171612]" loading="lazy" />}
        {workspace.kind === "chat" && <>
          {error&&<div role="alert" className="mx-4 mt-3 border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-200">{error}</div>}
          <div ref={chatLogRef} className="ss-jarvis-chatlog min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {conversationMessages.length===0?<div className="flex min-h-full flex-col items-center justify-center py-8 text-center"><div className="mb-4 grid h-14 w-14 place-items-center rounded-full border border-[#b9a783]/25 bg-[#b9a783]/[0.06] text-[#c7b58f]"><Sparkles className="h-5 w-5"/></div><h3 className="text-lg font-light text-stone-100">Ready when you are.</h3><p className="mt-2 max-w-xs text-xs leading-5 text-stone-500">Ask a question, unpack a difficult idea, or practise until it clicks.</p></div>:<div className="space-y-5">{conversationMessages.map(message=>{const mine=message.role==="user";return <article key={message.id} className={["flex gap-3",mine?"justify-end":"justify-start"].join(" ")}>{!mine&&<div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#b9a783]/20 text-[#c7b58f]"><Sparkles className="h-3.5 w-3.5"/></div>}<div className={["min-w-0 max-w-[88%]",mine?"text-right":""].join(" ")}><div className={["whitespace-pre-wrap break-words border text-xs leading-6",mine?"border-[#b9a783]/25 bg-[#b9a783]/10 px-3 py-2.5 text-[#e7dcc8]":"border-white/[0.07] bg-black/20 px-3 py-2.5 text-stone-200"].join(" ")}>{message.content}</div><div className="mt-1 flex items-center gap-2 text-[9px] text-stone-600"><span>{mine?"You":"StudySpace AI"}</span><span>·</span><span>{formatMessageTime(message.created_at)}</span>{!mine&&<span className="ml-1 inline-flex gap-1"><button type="button" aria-label="Helpful answer" disabled={Boolean(feedbackSaving[message.id])} onClick={()=>void rateAnswer(message,1)} className="p-1 text-stone-600 hover:text-emerald-300"><ThumbsUp className="h-3 w-3"/></button><button type="button" aria-label="Unhelpful answer" disabled={Boolean(feedbackSaving[message.id])} onClick={()=>void rateAnswer(message,-1)} className="p-1 text-stone-600 hover:text-rose-300"><ThumbsDown className="h-3 w-3"/></button>{feedbackStatus[message.id]&&<span>{feedbackStatus[message.id]}</span>}</span>}</div></div>{mine&&<div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-stone-400"><User className="h-3 w-3"/></div>}</article>})}{sending&&<p className="pl-10 text-[10px] text-[#b9a783]/70">Processing your request…</p>}</div>}
          </div>
          <div className="shrink-0 border-t border-[#b9a783]/15 bg-black/15 p-3"><form onSubmit={sendMessage} className="border border-[#b9a783]/20 bg-[#14130f]/75 p-2"><textarea ref={textareaRef} aria-label="Message your AI tutor" maxLength={12000} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void sendMessage();}}} placeholder="Ask your tutor anything…" rows={2} className="max-h-36 min-h-[54px] w-full resize-y bg-transparent px-2 py-2 text-xs leading-6 text-stone-100 outline-none placeholder:text-stone-600"/><div className="flex items-center justify-between px-1 pt-1"><div className="flex items-center gap-1"><button type="button" onClick={toggleVoiceInput} disabled={!voiceSupported||sending} aria-label="Voice input" className="p-2 text-stone-500 hover:text-stone-200"><Mic className="h-4 w-4"/></button><button type="button" onClick={()=>setVoiceReplies(v=>!v)} aria-label="Toggle spoken replies" className="p-2 text-stone-500 hover:text-stone-200">{voiceReplies?<Volume2 className="h-4 w-4"/>:<VolumeX className="h-4 w-4"/>}</button>{voiceStatus!=="READY"&&<span className="text-[8px] text-[#b9a783]/65">{voiceStatus}</span>}</div><button type="submit" disabled={!input.trim()||sending} aria-label="Send message" className="grid h-9 w-9 place-items-center bg-[#b9a783] text-[#211e18] hover:bg-[#d0bd98] disabled:opacity-35"><ArrowUp className="h-4 w-4"/></button></div></form><p className="mt-2 text-center text-[8px] text-stone-600">Enter to send · Shift + Enter for a new line</p></div>
        </>}
      </section>)}
      {deleteTarget&&<ViewportPortal><div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="jarvis-delete-title" className="w-full max-w-sm border border-white/10 bg-[#24221b] p-5 shadow-2xl"><h3 id="jarvis-delete-title" className="text-sm font-semibold text-stone-100">Delete conversation?</h3><p className="mt-2 text-xs text-stone-400">This permanently removes the conversation and its messages.</p><div className="mt-5 flex gap-2"><button type="button" onClick={()=>setDeleteTarget(null)} className="flex-1 border border-white/10 px-4 py-2.5 text-xs text-stone-300">Cancel</button><button type="button" onClick={()=>void deleteConversation(deleteTarget)} className="flex-1 bg-red-400/15 px-4 py-2.5 text-xs text-red-200">Delete</button></div></div></div></ViewportPortal>}
    </main>
  </AppShell>;
}
