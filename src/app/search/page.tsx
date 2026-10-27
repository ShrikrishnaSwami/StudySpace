"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Search, BookOpen, ClipboardList, CalendarDays, Brain, FileText, Loader2, ArrowUpRight } from "lucide-react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Result = { id:string; title:string; detail:string; type:string; href:string; date?:string|null };
const TYPES: Record<string,{label:string;icon:typeof Search}> = {
  course:{label:"Course",icon:BookOpen}, assignment:{label:"Assignment",icon:ClipboardList},
  quiz:{label:"Quiz",icon:Brain}, note:{label:"Grade item",icon:FileText},
  homework:{label:"Homework",icon:FileText}, event:{label:"Calendar event",icon:CalendarDays},
  deck:{label:"Flashcard deck",icon:Brain}, note_record:{label:"Course note",icon:FileText}, resource:{label:"Course resource",icon:FileText},
};

export default function SearchPage(){
 const [query,setQuery]=useState(""); const [results,setResults]=useState<Result[]>([]);
 const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [searched,setSearched]=useState(false);
 async function search(e:FormEvent){e.preventDefault();const q=query.trim().replace(/[,%()]/g," ").replace(/\s+/g," ");if(q.length<2){setError("Enter at least two characters.");return;}setBusy(true);setError("");setSearched(true);
  try{
   const tasks=await Promise.all([
    supabase.from("courses").select("id,name,code,description,created_at").or("name.ilike.%"+q+"%,code.ilike.%"+q+"%,description.ilike.%"+q+"%").limit(12),
    supabase.from("assignments").select("id,title,description,due_date,status").or("title.ilike.%"+q+"%,description.ilike.%"+q+"%").limit(12),
    supabase.from("quizzes").select("id,title,description,created_at").or("title.ilike.%"+q+"%,description.ilike.%"+q+"%").limit(12),
    supabase.from("grade_items").select("id,title,category,assessment_date").or("title.ilike.%"+q+"%,category.ilike.%"+q+"%").limit(12),
    supabase.from("homework").select("id,title,description,created_at").or("title.ilike.%"+q+"%,description.ilike.%"+q+"%").limit(12),
    supabase.from("calendar_events").select("id,title,subtitle,start_at").or("title.ilike.%"+q+"%,subtitle.ilike.%"+q+"%").limit(12),
    supabase.from("flashcard_decks").select("id,title,topic,created_at").or("title.ilike.%"+q+"%,topic.ilike.%"+q+"%").limit(12),
    supabase.from("course_notes").select("id,title,content,created_at").or("title.ilike.%"+q+"%,content.ilike.%"+q+"%").limit(12),
    supabase.from("course_resources").select("id,title,description,url,created_at").or("title.ilike.%"+q+"%,description.ilike.%"+q+"%").limit(12),
   ]);
   const errors=tasks.filter(x=>x.error&&x.error.code!=="PGRST205"&&x.error.code!=="42P01");
   if(errors.length)throw new Error(errors[0].error?.message||"Search failed.");
   const [c,a,z,g,h,ev,d,n,r]=tasks;
   const mapped:Result[]=[
    ...((c.data||[]) as any[]).map(x=>({id:x.id,title:x.name,detail:[x.code,x.description].filter(Boolean).join(" · "),type:"course",href:"/courses/"+x.id,date:x.created_at})),
    ...((a.data||[]) as any[]).map(x=>({id:x.id,title:x.title,detail:[x.status,x.description].filter(Boolean).join(" · "),type:"assignment",href:"/assignments/"+x.id,date:x.due_date})),
    ...((z.data||[]) as any[]).map(x=>({id:x.id,title:x.title,detail:x.description||"Quiz",type:"quiz",href:"/quizzes",date:x.created_at})),
    ...((g.data||[]) as any[]).map(x=>({id:x.id,title:x.title,detail:"Grade item · "+x.category,type:"note",href:"/grades",date:x.assessment_date})),
    ...((h.data||[]) as any[]).map(x=>({id:x.id,title:x.title,detail:x.description||"Homework upload",type:"homework",href:"/homework-uploader",date:x.created_at})),
    ...((ev.data||[]) as any[]).map(x=>({id:x.id,title:x.title,detail:x.subtitle||"Calendar event",type:"event",href:"/calendar",date:x.start_at})),
    ...((d.data||[]) as any[]).map(x=>({id:x.id,title:x.title,detail:x.topic||"Flashcard deck",type:"deck",href:"/flashcards",date:x.created_at})),
   ];
   setResults(mapped.slice(0,60));
  }catch(e){setError(e instanceof Error?e.message:"Search could not be completed.");setResults([]);}finally{setBusy(false);}
 }
 return <AppShell title="Search everything" description="Find your courses, tasks, quizzes, notes, and study materials."><div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6"><div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 to-white/[0.02] p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-[.2em] text-violet-300">Your workspace, connected</p><h1 className="mt-2 text-3xl font-semibold">Search everything</h1><p className="mt-2 text-sm text-white/45">Search real records from your StudySpace account.</p><form onSubmit={search} className="mt-6 flex gap-2"><div className="relative min-w-0 flex-1"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Try a course name, assignment, topic…" className="h-12 w-full rounded-xl border border-white/10 bg-black/20 pl-11 pr-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/40"/></div><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 font-semibold disabled:opacity-50">{busy?<Loader2 className="animate-spin" size={17}/>:<Search size={17}/>}<span className="hidden sm:inline">Search</span></button></form></div>
 {error&&<p role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
 {searched&&!busy&&<div className="flex items-center justify-between"><h2 className="font-semibold">Results</h2><span className="text-xs text-white/40">{results.length} found{results.length===60?" · showing first 60":""}</span></div>}
 {searched&&!busy&&results.length===0&&!error&&<div className="rounded-2xl border border-white/10 p-10 text-center"><Search size={30} className="mx-auto text-white/25"/><p className="mt-3 font-medium">No matches yet</p><p className="mt-1 text-sm text-white/40">Try a shorter search or add more content to your workspace.</p></div>}
 <div className="space-y-2">{results.map((r,i)=>{const meta=TYPES[r.type]||TYPES.course;const Icon=meta.icon;return <Link key={r.type+":"+r.id} href={r.href} className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-4 transition hover:border-violet-400/25 hover:bg-white/[0.04]"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Icon size={18}/></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{r.title}</p><span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/40">{meta.label}</span></div><p className="mt-1 truncate text-xs text-white/40">{r.detail||"StudySpace item"}</p></div><ArrowUpRight size={17} className="shrink-0 text-white/30"/></Link>})}</div></div></AppShell>;
}
