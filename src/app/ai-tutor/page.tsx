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
  Mic,
  Volume2,
  VolumeX,
  Sparkles,
  Trash2,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
  Grip,
} from "lucide-react";

import AppShell from "@/components/AppShell";
import ViewportPortal from "@/components/ViewportPortal";
import NeuralIntelligence from "@/components/NeuralIntelligence";
import { supabase } from "@/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Conversation = {
  id: string;
  user_id: string;
  course_id: string | null;
  title: string;
  created_at: string;
  updated_at: string;
};

type WorkspaceKind = "chat" | "history";
type WorkspaceWindow = { id: string; kind: WorkspaceKind; title: string; x: number; y: number; width: number; height: number };

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
  const dragState = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const windowResizeState = useRef<{ id: string; startX: number; startY: number; width: number; height: number } | null>(null);

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

        const { data: conversationsData, error: conversationsError } = await supabase
          .from("ai_tutor_conversations")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (conversationsError) {
          throw new Error(conversationsError.message);
        }

        const loadedConversations =
          (conversationsData || []) as Conversation[];

        setConversations(
          loadedConversations
        );

        // Keep the neural workspace unobstructed on entry. Conversations
        // are opened deliberately from the History control.
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load StudySpace tutor."
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

      const title = "New conversation";

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
        throw new Error(failure.error || "StudySpace tutor failed.");
      }
      if (!response.body) throw new Error("The StudySpace tutor response stream was unavailable. Please try again.");

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
          throw new Error(event.error || "The StudySpace tutor could not complete that response.");
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
      if (!answer.trim()) throw new Error("The StudySpace tutor returned an empty response. Please try again.");
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
          ? "That took too long. Try again in a moment."
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

  function openWorkspace(kind: WorkspaceKind, title: string) {
    const id = crypto.randomUUID();
    const offset = workspaceWindows.length % 5;
    const baseWidth = kind === "chat" ? 560 : 420;
    const baseHeight = kind === "chat" ? 600 : 520;
    const width = Math.min(baseWidth, Math.max(280, window.innerWidth - 24));
    const height = Math.min(baseHeight, Math.max(220, window.innerHeight - 92));
    const next: WorkspaceWindow = {
      id, kind, title,
      x: Math.max(12, Math.min(window.innerWidth - width - 12, 72 + offset * 34)),
      y: Math.max(76, Math.min(window.innerHeight - height - 16, 88 + offset * 28)),
      width, height,
    };
    setWorkspaceWindows(current => current.length >= 18 ? current : [...current, next]);
    setFocusedWindowId(id);
    return id;
  }

  function closeWorkspace(id: string) {
    setWorkspaceWindows(current => current.filter(item => item.id !== id));
    setFocusedWindowId(current => current === id ? null : current);
  }

  function startWindowDrag(event: ReactPointerEvent, id: string) {
    if ((event.target as HTMLElement).closest("button")) return;
    const item = workspaceWindows.find(entry => entry.id === id);
    if (!item) return;
    dragState.current = { id, offsetX: event.clientX - item.x, offsetY: event.clientY - item.y };
    setFocusedWindowId(id);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function startWindowResize(event: ReactPointerEvent<HTMLButtonElement>, workspace: WorkspaceWindow) {
    event.preventDefault();
    event.stopPropagation();
    windowResizeState.current = {
      id: workspace.id, startX: event.clientX, startY: event.clientY,
      width: workspace.width, height: workspace.height,
    };
    setFocusedWindowId(workspace.id);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const resizing = windowResizeState.current;
      if (resizing) {
        const maxWidth = Math.max(280, window.innerWidth - 24);
        const maxHeight = Math.max(220, window.innerHeight - 92);
        const width = Math.max(280, Math.min(maxWidth, resizing.width + event.clientX - resizing.startX));
        const height = Math.max(220, Math.min(maxHeight, resizing.height + event.clientY - resizing.startY));
        setWorkspaceWindows(current => current.map(item => item.id === resizing.id ? { ...item, width, height } : item));
      }
      const dragging = dragState.current;
      if (dragging) {
        const maxX = Math.max(0, window.innerWidth - 280);
        const maxY = Math.max(0, window.innerHeight - 140);
        setWorkspaceWindows(current => current.map(item => item.id === dragging.id ? {
          ...item,
          x: Math.max(0, Math.min(maxX, event.clientX - dragging.offsetX)),
          y: Math.max(0, Math.min(maxY, event.clientY - dragging.offsetY)),
        } : item));
      }
    };
    const end = () => { dragState.current = null; windowResizeState.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("studyspace-ai-workspace-nodes-v1");
      if (saved) {
        const parsed = JSON.parse(saved) as WorkspaceWindow[];
        if (Array.isArray(parsed)) {
          setWorkspaceWindows(parsed.filter(item =>
            item && typeof item.id === "string" &&
            ["chat", "history"].includes(item.kind) &&
            typeof item.title === "string" &&
            Number.isFinite(item.x) && Number.isFinite(item.y) &&
            Number.isFinite(item.width) && item.width >= 280 &&
            Number.isFinite(item.height) && item.height >= 220
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

  async function handleNeuralAction(action: "new-chat" | "history") {
    if (action === "history") {
      const existing = workspaceWindows.find(item => item.kind === "history");
      if (existing) {
        setFocusedWindowId(existing.id);
        return;
      }
      openWorkspace("history", "Your past questions");
      return;
    }

    const chatWindowId = openWorkspace("chat", "New chat");
    const conversation = await createConversation();
    if (!conversation) {
      setFocusedWindowId(chatWindowId);
      return;
    }
    setFocusedWindowId(chatWindowId);
    window.setTimeout(() => textareaRef.current?.focus(), 100);
  }

  /* =======================================================
     STARTER PROMPT
  ======================================================= */

  /* =======================================================
     LOADING
  ======================================================= */

  /* =======================================================
     MAIN UI
  ======================================================= */


  if (loading) return <AppShell><main className="flex min-h-[calc(100dvh-68px)] items-center justify-center bg-[#171612]"><div className="text-center"><div className="mx-auto h-10 w-10 animate-pulse rounded-full border border-[#b9a783]/45 shadow-[0_0_35px_rgba(185,167,131,.2)]"/><p className="mt-4 text-[9px] tracking-[.24em] text-[#b9a783]/70">GETTING YOUR TUTOR READY</p></div></main></AppShell>;

  const historyPanel = <div className="min-h-0 flex-1 overflow-y-auto p-5">
    <div className="mb-4 flex items-center justify-between border-b border-[#b9a783]/15 pb-3"><div><p className="text-[9px] tracking-[.22em] text-[#b9a783]/65">ARCHIVE</p><h2 className="mt-1 text-lg font-light text-stone-100">Your past questions</h2></div><span className="text-[10px] text-stone-500">{conversations.length} saved</span></div>
    {conversations.length===0?<p className="py-12 text-center text-xs text-stone-500">Your previous chats will show up here.</p>:conversations.map((item)=><div key={item.id} className="group flex items-center border-b border-white/[0.05] hover:bg-white/[0.03]"><button type="button" onClick={()=>{void selectConversation(item);openWorkspace("chat","StudySpace tutor");}} className="min-w-0 flex-1 px-3 py-3 text-left"><span className="block truncate text-xs text-stone-200">{item.title||"New conversation"}</span><span className="mt-1 block text-[9px] text-stone-600">{formatConversationDate(item.updated_at)}</span></button><button type="button" onClick={()=>setDeleteTarget(item.id)} aria-label="Delete conversation" className="mr-2 p-2 text-stone-600 opacity-0 hover:text-red-300 group-hover:opacity-100 focus:opacity-100"><Trash2 className="h-3.5 w-3.5"/></button></div>)}
  </div>;

  return <AppShell>
    <main className="ss-neural-tutor ss-jarvis-screen relative isolate flex h-[calc(100dvh-68px)] min-h-[560px] items-center justify-center overflow-hidden bg-[#171612] text-stone-200">
      <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_50%_48%,rgba(185,167,131,.13),transparent_38%),linear-gradient(180deg,#171612,#14130f)]" />
      <div className="ss-jarvis-stage absolute inset-0 z-[1]">
        <div className="ss-jarvis-core-wrap">
          <div className={["ss-jarvis-core", sending || voiceListening ? "is-thinking" : ""].join(" ")}>
            <div className="ss-jarvis-orbit ss-jarvis-orbit-one" />
            <div className="ss-jarvis-orbit ss-jarvis-orbit-two" />
            <div className="ss-jarvis-orbit ss-jarvis-orbit-three" />
            <div className="ss-jarvis-core-glow" />
            <div className="ss-jarvis-scan" />
            <div className="ss-jarvis-core-center"><Sparkles className="h-10 w-10" /></div>
            <span className="ss-jarvis-core-label">STUDYSPACE</span>
          </div>
        </div>
        <NeuralIntelligence
          active={sending}
          listening={voiceListening}
          showControls
          activeAction={workspaceWindows.some(item => item.kind === "chat") ? "new-chat" : workspaceWindows.some(item => item.kind === "history") ? "history" : undefined}
          onAction={handleNeuralAction}
        />
      </div>
      <div className="pointer-events-none absolute bottom-7 left-1/2 z-[3] -translate-x-1/2 text-center">
        <p className="text-[9px] tracking-[.18em] text-stone-500">
          {voiceListening ? "VOICE INPUT ACTIVE" : sending ? "PROCESSING REQUEST" : "OPEN A CHAT OR PICK UP AN OLD ONE"}
        </p>
      </div>

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
        {workspace.kind === "chat" && <>
          {error&&<div role="alert" className="mx-4 mt-3 border border-red-400/20 bg-red-400/[0.06] px-3 py-2 text-xs text-red-200">{error}</div>}
          <div ref={chatLogRef} className="ss-jarvis-chatlog min-h-0 flex-1 overflow-y-auto px-4 py-5">
            {conversationMessages.length===0?<div className="flex min-h-full flex-col items-center justify-center py-8 text-center"><div className="mb-4 grid h-14 w-14 place-items-center rounded-full border border-[#b9a783]/25 bg-[#b9a783]/[0.06] text-[#c7b58f]"><Sparkles className="h-5 w-5"/></div><h3 className="text-lg font-light text-stone-100">What&apos;s got you stuck?</h3><p className="mt-2 max-w-xs text-xs leading-5 text-stone-500">Ask about a lecture, paste the code that&apos;s throwing an error, or ask the question you were saving for office hours. Even if it&apos;s 2 AM and it feels like a dumb question, ask it.</p></div>:<div className="space-y-5">{conversationMessages.map(message=>{const mine=message.role==="user";return <article key={message.id} className={["flex gap-3",mine?"justify-end":"justify-start"].join(" ")}>{!mine&&<div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#b9a783]/20 text-[#c7b58f]"><Sparkles className="h-3.5 w-3.5"/></div>}<div className={["min-w-0 max-w-[88%]",mine?"text-right":""].join(" ")}><div className={["whitespace-pre-wrap break-words border text-xs leading-6",mine?"border-[#b9a783]/25 bg-[#b9a783]/10 px-3 py-2.5 text-[#e7dcc8]":"border-white/[0.07] bg-black/20 px-3 py-2.5 text-stone-200"].join(" ")}>{message.content}</div><div className="mt-1 flex items-center gap-2 text-[9px] text-stone-600"><span>{mine?"You":"StudySpace AI"}</span><span>·</span><span>{formatMessageTime(message.created_at)}</span>{!mine&&<span className="ml-1 inline-flex gap-1"><button type="button" aria-label="Helpful answer" disabled={Boolean(feedbackSaving[message.id])} onClick={()=>void rateAnswer(message,1)} className="p-1 text-stone-600 hover:text-emerald-300"><ThumbsUp className="h-3 w-3"/></button><button type="button" aria-label="Unhelpful answer" disabled={Boolean(feedbackSaving[message.id])} onClick={()=>void rateAnswer(message,-1)} className="p-1 text-stone-600 hover:text-rose-300"><ThumbsDown className="h-3 w-3"/></button>{feedbackStatus[message.id]&&<span>{feedbackStatus[message.id]}</span>}</span>}</div></div>{mine&&<div className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-stone-400"><User className="h-3 w-3"/></div>}</article>})}{sending&&<p className="pl-10 text-[10px] text-[#b9a783]/70">Working through that…</p>}</div>}
          </div>
          <div className="shrink-0 border-t border-[#b9a783]/15 bg-black/15 p-3"><form onSubmit={sendMessage} className="border border-[#b9a783]/20 bg-[#14130f]/75 p-2"><textarea ref={textareaRef} aria-label="Message your AI tutor" maxLength={12000} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void sendMessage();}}} placeholder="e.g. Why does this Python code throw a KeyError?" rows={2} className="max-h-36 min-h-[54px] w-full resize-y bg-transparent px-2 py-2 text-xs leading-6 text-stone-100 outline-none placeholder:text-stone-600"/><div className="flex items-center justify-between px-1 pt-1"><div className="flex items-center gap-1"><button type="button" onClick={toggleVoiceInput} disabled={!voiceSupported||sending} aria-label="Voice input" className="p-2 text-stone-500 hover:text-stone-200"><Mic className="h-4 w-4"/></button><button type="button" onClick={()=>setVoiceReplies(v=>!v)} aria-label="Toggle spoken replies" className="p-2 text-stone-500 hover:text-stone-200">{voiceReplies?<Volume2 className="h-4 w-4"/>:<VolumeX className="h-4 w-4"/>}</button>{voiceStatus!=="READY"&&<span className="text-[8px] text-[#b9a783]/65">{voiceStatus}</span>}</div><button type="submit" disabled={!input.trim()||sending} aria-label="Send message" className="grid h-9 w-9 place-items-center bg-[#b9a783] text-[#211e18] hover:bg-[#d0bd98] disabled:opacity-35"><ArrowUp className="h-4 w-4"/></button></div></form><p className="mt-2 text-center text-[8px] text-stone-600">Enter to send · Shift + Enter for a new line</p></div>
        </>}
        <button
          type="button"
          aria-label={`Resize ${workspace.title} window`}
          title="Drag to resize"
          onPointerDown={event => startWindowResize(event, workspace)}
          className="absolute bottom-0 right-0 z-10 grid h-6 w-6 cursor-nwse-resize touch-none place-items-center text-[#c7b58f]/70 hover:text-[#ead9b8]"
        >
          <span className="h-3 w-3 border-b-2 border-r-2 border-current opacity-80" />
        </button>
      </section>)}
      {deleteTarget&&<ViewportPortal><div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="jarvis-delete-title" className="w-full max-w-sm border border-white/10 bg-[#24221b] p-5 shadow-2xl"><h3 id="jarvis-delete-title" className="text-sm font-semibold text-stone-100">Delete conversation?</h3><p className="mt-2 text-xs text-stone-400">This permanently removes the conversation and its messages.</p><div className="mt-5 flex gap-2"><button type="button" onClick={()=>setDeleteTarget(null)} className="flex-1 border border-white/10 px-4 py-2.5 text-xs text-stone-300">Cancel</button><button type="button" onClick={()=>void deleteConversation(deleteTarget)} className="flex-1 bg-red-400/15 px-4 py-2.5 text-xs text-red-200">Delete</button></div></div></div></ViewportPortal>}
    </main>
  </AppShell>;
}
