"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import AppShell from "@/components/AppShell";

export default function HomeworkUploaderPage() {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  function selectFile(selectedFile: File | undefined) {
    if (!selectedFile) return;

    setFile(selectedFile);
    setUploaded(false);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);

    selectFile(event.dataTransfer.files?.[0]);
  }

  function handleUpload() {
    if (!file) return;

    setUploaded(true);
  }

  function removeFile() {
    setFile(null);
    setUploaded(false);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <AppShell
      title="Homework"
      description="Turn your study material into something useful"
    >
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-300">
            <Sparkles size={13} />
            Smart homework workspace
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Upload your homework
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
            Upload a worksheet, assignment, notes, or study material.
            StudySpace can eventually analyze it and help you understand
            what you need to learn.
          </p>
        </div>

        {/* Upload area */}
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`rounded-3xl border-2 border-dashed p-6 transition sm:p-10 ${
            dragging
              ? "border-violet-400 bg-violet-500/[0.06]"
              : "border-white/[0.08] bg-white/[0.02]"
          }`}
        >
          {!file ? (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex min-h-[300px] w-full flex-col items-center justify-center rounded-2xl transition hover:bg-white/[0.02]"
            >
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
                <UploadCloud size={30} />
              </div>

              <h2 className="text-lg font-semibold">
                Drop your file here
              </h2>

              <p className="mt-2 text-sm text-white/35">
                or click to browse your computer
              </p>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {["PDF", "DOCX", "PNG", "JPG"].map((type) => (
                  <span
                    key={type}
                    className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/30"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </button>
          ) : (
            <div className="min-h-[300px]">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <FileText size={28} />
                </div>

                <h2 className="max-w-full truncate px-5 text-lg font-semibold">
                  {file.name}
                </h2>

                <p className="mt-2 text-sm text-white/35">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>

                <button
                  onClick={removeFile}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400"
                >
                  <X size={14} />
                  Remove file
                </button>

                {!uploaded ? (
                  <button
                    onClick={handleUpload}
                    className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold shadow-lg shadow-violet-600/20 transition hover:bg-violet-500"
                  >
                    Analyze homework
                    <Sparkles size={16} />
                  </button>
                ) : (
                  <div className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-400">
                    <CheckCircle2 size={17} />
                    Upload complete
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(event) =>
            selectFile(event.target.files?.[0])
          }
        />

        {/* What happens next */}
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-semibold">
            What StudySpace can eventually do
          </h2>

          <div className="grid gap-4 md:grid-cols-3">
            <Feature
              icon={<FileText size={18} />}
              title="Understand"
              text="Identify questions, topics, and important concepts in your material."
            />

            <Feature
              icon={<Sparkles size={18} />}
              title="Explain"
              text="Break difficult questions into clear, step-by-step explanations."
            />

            <Feature
              icon={<BookOpen size={18} />}
              title="Practice"
              text="Generate personalized practice questions based on what you uploaded."
            />
          </div>
        </div>

        {/* Future workflow */}
        <div className="mt-8 rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.07] to-fuchsia-500/[0.03] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
              <Sparkles size={18} />
            </div>

            <div>
              <h3 className="font-semibold">
                Your material could power your entire workspace
              </h3>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
                Once AI and storage are connected, an uploaded syllabus
                or assignment could automatically help populate your
                courses, deadlines, study topics, quizzes, and AI Tutor
                context.
              </p>

              <button className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300">
                Learn how it works
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
      <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
        {icon}
      </div>

      <h3 className="text-sm font-semibold">{title}</h3>

      <p className="mt-2 text-xs leading-5 text-white/35">
        {text}
      </p>
    </div>
  );
}