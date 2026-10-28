import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateAIResponse } from "@/lib/gemini";
import { consumeAiQuota } from "@/lib/api-security";
export async function POST(request:NextRequest){
 try{
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return NextResponse.json({error:"Sign in to generate flashcards."},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return NextResponse.json({error:"Supabase server configuration is missing."},{status:500});
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+token}}});const {data:{user},error}=await client.auth.getUser(token);if(error||!user)return NextResponse.json({error:"Your session expired. Sign in again."},{status:401});
  if(Number(request.headers.get("content-length")||0)>16384)return NextResponse.json({error:"Request is too large."},{status:413});
  const body=await request.json(),topic=typeof body.topic==="string"?body.topic.trim().slice(0,240):"",count=Math.min(20,Math.max(5,Number(body.count)||10)),courseId=typeof body.courseId==="string"?body.courseId.trim():"";if(!topic)return NextResponse.json({error:"Enter a topic."},{status:400});
  let courseName="";
  let courseNotes="";
  if(courseId){
   const {data:courseRow,error:courseError}=await client.from("courses").select("id,code,name,description").eq("id",courseId).eq("user_id",user.id).maybeSingle();
   if(courseError)throw courseError;
   if(!courseRow)return NextResponse.json({error:"Selected course was not found."},{status:404});
   courseName=String(courseRow.code?courseRow.code+" — "+courseRow.name:courseRow.name);
   const {data:notes,error:notesError}=await client.from("course_notes").select("title,content,unit_name,category").eq("course_id",courseId).order("updated_at",{ascending:false}).limit(20);
   if(notesError)throw notesError;
   courseNotes=(notes||[]).map((n)=>"["+String(n.unit_name||"General")+" · "+String(n.category||"Lecture notes")+"] "+String(n.title||"Note")+"\n"+String(n.content||"").slice(0,1800)).join("\n\n").slice(0,18000);
  }
  let courseResources="";
  if(courseId){
   const {data:resources,error:resourceError}=await client.from("course_resources").select("title,description,unit_name,category").eq("course_id",courseId).order("created_at",{ascending:false}).limit(20);
   if(resourceError)throw resourceError;
   courseResources=(resources||[]).map(r=>"["+String(r.unit_name||"General")+" · "+String(r.category||"Resource")+"] "+String(r.title||"Resource")+" — "+String(r.description||"")).join("\\n").slice(0,6000);
  }
  const quota=await consumeAiQuota(token,"flashcards");if(!quota.allowed)return NextResponse.json({error:quota.scope==="rate"?"Too many AI requests. Please wait a few minutes and try again.":quota.scope==="global"?"StudySpace AI has reached its shared beta capacity. Please try again later.":"You have reached today’s flashcard-generation limit. Try again after the rolling 24-hour window.",usage:quota},{status:429});
  const prompt="Create exactly "+count+" useful study flashcards about: "+topic+". "+(courseName?"Course context: "+courseName+". ":"")+(courseNotes?"Use these saved course notes as the primary source. Do not invent course-specific facts unsupported by them:\\n"+courseNotes:"No saved notes were found for this course; use standard subject knowledge and avoid inventing course-specific lecture details.")+(courseResources?"\\nUse these saved resource titles and descriptions as additional context only; do not claim to have read linked pages:\\n"+courseResources:"")+"\\nReturn ONLY valid JSON shaped as {\\"cards\\":[{\\"front\\":\\"question\\",\\"back\\":\\"answer\\"}]}. Use concise student-friendly language, factual answers, no markdown fences.";
  const raw=await generateAIResponse({systemInstruction:"You are a careful academic study assistant. Return valid JSON only.",prompt,task:"flashcards"});const clean=raw.replace(/^\s*\x60\x60\x60(?:json)?/i,"").replace(/\x60\x60\x60\s*$/,"").trim();const parsed=JSON.parse(clean) as {cards?:{front?:string;back?:string}[]};
  const cards=(parsed.cards||[]).filter(c=>typeof c.front==="string"&&typeof c.back==="string"&&c.front.trim()&&c.back.trim()).slice(0,count).map(c=>({front:c.front!.trim().slice(0,1500),back:c.back!.trim().slice(0,3000)}));if(cards.length<3)throw new Error("The AI response did not contain enough valid cards.");return NextResponse.json({cards});
 }catch(e){console.error("Flashcard generation request failed.");return NextResponse.json({error:e instanceof Error?e.message:"Flashcard generation failed."},{status:500});}
}