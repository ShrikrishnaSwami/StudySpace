"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { BookOpen, ExternalLink, FileText, Link2, Loader2, Plus, Search, Sparkles, Trash2, UploadCloud } from "lucide-react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Course = { id: string; code: string | null; name: string };
type Note = { id: string; course_id: string; title: string; content: string; created_at: string; unit_name?: string; category?: string; source_file_name?: string | null };
type Resource = { id: string; course_id: string; title: string; url: string | null; description: string | null; unit_name?: string; category?: string };

const inputClass = "w-full rounded-xl border border-white/10 bg-white/[0.035] p-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/40";
const selectClass = "w-full rounded-xl border border-white/10 bg-[#100d1c] p-3 text-sm text-white outline-none focus:border-violet-400/40";

export default function NotesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [courseFilter, setCourseFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [unitName, setUnitName] = useState("General");
  const [category, setCategory] = useState("Lecture notes");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [resourceTitle, setResourceTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [resourceUnit, setResourceUnit] = useState("General");
  const [resourceCategory, setResourceCategory] = useState("Resource");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadUnit, setUploadUnit] = useState("General");
  const [uploadCategory, setUploadCategory] = useState("Lecture notes");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    const [c, n, r] = await Promise.all([
      supabase.from("courses").select("id,code,name").order("name"),
      supabase.from("course_notes").select("*").order("updated_at", { ascending: false }),
      supabase.from("course_resources").select("*").order("created_at", { ascending: false }),
    ]);
    if (c.error || n.error || r.error) setError(c.error?.message || n.error?.message || r.error?.message || "Could not load notes.");
    setCourses((c.data || []) as Course[]);
    setNotes((n.data || []) as Note[]);
    setResources((r.data || []) as Resource[]);
    if (!courseId && c.data?.[0]) setCourseId(c.data[0].id);
  }

  useEffect(() => { void load(); }, []);

  const units = useMemo(() => Array.from(new Set([
    ...notes.map(n => n.unit_name || "General"),
    ...resources.map(r => r.unit_name || "General"),
  ])).sort((a, b) => a.localeCompare(b)), [notes, resources]);

  const categories = useMemo(() => Array.from(new Set([
    ...notes.map(n => n.category || "Lecture notes"),
    ...resources.map(r => r.category || "Resource"),
  ])).sort((a, b) => a.localeCompare(b)), [notes, resources]);

  const ns = useMemo(() => notes.filter(n =>
    (courseFilter === "all" || n.course_id === courseFilter) &&
    (unitFilter === "all" || (n.unit_name || "General") === unitFilter) &&
    (categoryFilter === "all" || (n.category || "Lecture notes") === categoryFilter) &&
    (!search || (n.title + " " + n.content + " " + (n.category || "")).toLowerCase().includes(search.toLowerCase()))
  ), [notes, courseFilter, unitFilter, categoryFilter, search]);

  const rs = useMemo(() => resources.filter(r =>
    (courseFilter === "all" || r.course_id === courseFilter) &&
    (unitFilter === "all" || (r.unit_name || "General") === unitFilter) &&
    (categoryFilter === "all" || (r.category || "Resource") === categoryFilter) &&
    (!search || (r.title + " " + (r.description || "") + " " + (r.category || "")).toLowerCase().includes(search.toLowerCase()))
  ), [resources, courseFilter, unitFilter, categoryFilter, search]);

  function courseName(id: string) {
    const c = courses.find(x => x.id === id);
    return c ? (c.code ? c.code + " · " : "") + c.name : "Course";
  }

  async function saveNote(e: FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    if (!courseId || !title.trim() || !content.trim()) { setError("Choose a course and enter a title and note."); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in again.");
      const { error } = await supabase.from("course_notes").insert({
        user_id: user.id, course_id: courseId, title: title.trim(), content: content.trim(),
        unit_name: unitName.trim() || "General", category,
      });
      if (error) throw error;
      setTitle(""); setContent(""); setNotice("Note saved to your course library."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save note."); }
    finally { setSaving(false); }
  }

  async function createFromUpload(e: FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    if (!courseId || !uploadFile) { setError("Choose a course and a PDF or image."); return; }
    if (uploadFile.size > 4 * 1024 * 1024) { setError("Choose a file smaller than 4 MB."); return; }
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Sign in again.");
      const body = new FormData();
      body.set("file", uploadFile);
      body.set("courseId", courseId);
      body.set("unitName", uploadUnit.trim() || "General");
      body.set("category", uploadCategory);
      const response = await fetch("/api/ai/notes", { method: "POST", headers: { Authorization: "Bearer " + session.access_token }, body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not convert the file to notes.");
      setNotice("Converted “" + uploadFile.name + "” into saved notes.");
      setUploadFile(null);
      const picker = document.getElementById("notes-source-file") as HTMLInputElement | null;
      if (picker) picker.value = "";
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not convert the file."); }
    finally { setUploading(false); }
  }

  async function saveResource(e: FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Enter a valid HTTPS or HTTP link.");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in again.");
      setSaving(true);
      const { error } = await supabase.from("course_resources").insert({
        user_id: user.id, course_id: courseId, title: resourceTitle.trim(), url: parsed.toString(),
        resource_type: "link", description: description.trim() || null,
        unit_name: resourceUnit.trim() || "General", category: resourceCategory,
      });
      if (error) throw error;
      setResourceTitle(""); setUrl(""); setDescription(""); setNotice("Resource saved to your library."); await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Enter a valid link."); }
    finally { setSaving(false); }
  }

  async function remove(table: "course_notes" | "course_resources", id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setError(error.message);
    else if (table === "course_notes") setNotes(x => x.filter(n => n.id !== id));
    else setResources(x => x.filter(r => r.id !== id));
  }

  return <AppShell title="Notes & resources" description="Turn lecture files into revision notes and organize everything by course, unit, and category.">
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_190px_190px_190px]">
        <div className="relative"><Search size={17} className="absolute left-3 top-3.5 text-white/35"/><input type="search" aria-label="Search notes and resources" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search your library…" className={inputClass+" pl-10"}/></div>
        <select value={courseFilter} onChange={e=>setCourseFilter(e.target.value)} className={selectClass}><option value="all">All courses</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code ? c.code+" · " : ""}{c.name}</option>)}</select>
        <select value={unitFilter} onChange={e=>setUnitFilter(e.target.value)} className={selectClass}><option value="all">All units</option>{units.map(u=><option key={u} value={u}>{u}</option>)}</select>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className={selectClass}><option value="all">All categories</option>{categories.map(category=><option key={category} value={category}>{category}</option>)}</select>
      </div>
      {error && <p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p>}
      <div className="grid gap-5 xl:grid-cols-3">
        <form onSubmit={createFromUpload} className="space-y-3 rounded-2xl border border-violet-400/20 bg-violet-500/[0.045] p-5">
          <div className="flex items-center gap-3"><Sparkles className="text-violet-300"/><div><h2 className="font-semibold">Convert a file into notes</h2><p className="text-xs text-white/45">Upload lecture PDFs or photos of handwritten/printed notes.</p></div></div>
          <select required value={courseId} onChange={e=>setCourseId(e.target.value)} className={selectClass}><option value="">Choose course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.code ? c.code+" · " : ""}{c.name}</option>)}</select>
          <input id="notes-source-file" required type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp" onChange={e=>setUploadFile(e.target.files?.[0]||null)} className="w-full text-sm text-white/65 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-500/20 file:px-3 file:py-2 file:text-violet-100"/>
          <p className="text-xs text-white/35">PDF, PNG, JPG, or WEBP · 12 MB maximum. AI extracts key concepts, definitions, examples, and a concise revision outline.</p>
          <input maxLength={100} value={uploadUnit} onChange={e=>setUploadUnit(e.target.value)} placeholder="Unit / chapter (e.g. Unit 1)" className={inputClass}/>
          <select value={uploadCategory} onChange={e=>setUploadCategory(e.target.value)} className={selectClass}>{["Lecture notes","Exam revision","Lab notes","Reading summary","Formula sheet","Other"].map(x=><option key={x}>{x}</option>)}</select>
          <button disabled={uploading||!courses.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 p-3 text-sm font-semibold disabled:opacity-50">{uploading?<Loader2 size={17} className="animate-spin"/>:<UploadCloud size={17}/>} {uploading?"Extracting and saving…":"Upload & create notes"}</button>
        </form>
        <form onSubmit={saveNote} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3"><FileText className="text-violet-300"/><div><h2 className="font-semibold">Write a note</h2><p className="text-xs text-white/45">Save your own summaries and study notes.</p></div></div>
          <select required value={courseId} onChange={e=>setCourseId(e.target.value)} className={selectClass}><option value="">Choose course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Note title" className={inputClass}/>
          <input maxLength={100} value={unitName} onChange={e=>setUnitName(e.target.value)} placeholder="Unit / chapter" className={inputClass}/>
          <select value={category} onChange={e=>setCategory(e.target.value)} className={selectClass}>{["Lecture notes","Exam revision","Lab notes","Reading summary","Formula sheet","Other"].map(x=><option key={x}>{x}</option>)}</select>
          <textarea required rows={5} maxLength={30000} value={content} onChange={e=>setContent(e.target.value)} placeholder="Write your notes…" className={inputClass}/>
          <button disabled={saving||!courses.length} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium disabled:opacity-50"><Plus size={16}/>Save note</button>
        </form>
        <form onSubmit={saveResource} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-3"><Link2 className="text-fuchsia-300"/><div><h2 className="font-semibold">Add a resource</h2><p className="text-xs text-white/45">Save lecture links, articles, and references.</p></div></div>
          <select required value={courseId} onChange={e=>setCourseId(e.target.value)} className={selectClass}><option value="">Choose course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <input required maxLength={180} value={resourceTitle} onChange={e=>setResourceTitle(e.target.value)} placeholder="Resource title" className={inputClass}/>
          <input required type="url" maxLength={2048} value={url} onChange={e=>setUrl(e.target.value)} placeholder="https://…" className={inputClass}/>
          <input maxLength={1000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Description (optional)" className={inputClass}/>
          <input maxLength={100} value={resourceUnit} onChange={e=>setResourceUnit(e.target.value)} placeholder="Unit / chapter" className={inputClass}/>
          <select value={resourceCategory} onChange={e=>setResourceCategory(e.target.value)} className={selectClass}>{["Resource","Lecture slides","Reading","Video","Practice","Reference","Other"].map(x=><option key={x}>{x}</option>)}</select>
          <button disabled={saving||!courses.length} className="flex items-center gap-2 rounded-xl border border-violet-400/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-200 disabled:opacity-50"><Plus size={16}/>Save resource</button>
        </form>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold"><BookOpen size={18} className="text-violet-300"/>Your notes ({ns.length})</h2>
          {ns.length ? ns.map(n=><article key={n.id} className="mb-3 rounded-xl border border-white/[0.08] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs text-violet-300">{courseName(n.course_id)} · {n.unit_name||"General"}</p><div className="mt-1 flex flex-wrap items-center gap-2"><h3 className="font-medium">{n.title}</h3><span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-white/45">{n.category||"Lecture notes"}</span></div>{n.source_file_name&&<p className="mt-1 text-xs text-white/35">Extracted from {n.source_file_name}</p>}<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/65">{n.content}</p></div><button type="button" onClick={()=>void remove("course_notes",n.id)} aria-label="Delete note" className="text-white/35 hover:text-red-200"><Trash2 size={15}/></button></div></article>) : <p className="text-sm text-white/40">No notes match these filters.</p>}
        </section>
        <section className="rounded-2xl border border-white/10 bg-white/[0.025] p-5"><h2 className="mb-4 flex items-center gap-2 font-semibold"><Link2 size={18} className="text-fuchsia-300"/>Saved resources ({rs.length})</h2>
          {rs.length ? rs.map(r=><article key={r.id} className="mb-3 flex justify-between gap-3 rounded-xl border border-white/[0.08] p-4"><div className="min-w-0"><p className="text-xs text-fuchsia-300">{courseName(r.course_id)} · {r.unit_name||"General"}</p><div className="mt-1 flex flex-wrap items-center gap-2"><h3 className="font-medium">{r.title}</h3><span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-white/45">{r.category||"Resource"}</span></div>{r.description&&<p className="mt-1 text-sm text-white/55">{r.description}</p>}{r.url&&<a href={r.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 break-all text-sm text-violet-300">{r.url}<ExternalLink size={13}/></a>}</div><button type="button" onClick={()=>void remove("course_resources",r.id)} aria-label="Delete resource" className="text-white/35 hover:text-red-200"><Trash2 size={15}/></button></article>) : <p className="text-sm text-white/40">No resources match these filters.</p>}
        </section>
      </div>
    </div>
  </AppShell>;
}
