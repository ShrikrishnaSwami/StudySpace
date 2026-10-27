import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateAIResponse } from "@/lib/gemini";
export async function POST(request:NextRequest){
 try{
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return NextResponse.json({error:"Sign in to generate flashcards."},{status:401});
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return NextResponse.json({error:"Supabase server configuration is missing."},{status:500});
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+token}}});const {data:{user},error}=await client.auth.getUser(token);if(error||!user)return NextResponse.json({error:"Your session expired. Sign in again."},{status:401});
  const body=await request.json(),topic=typeof body.topic==="string"?body.topic.trim().slice(0,240):"",count=Math.min(20,Math.max(5,Number(body.count)||10)),course=typeof body.courseName==="string"?body.courseName.slice(0,160):"";if(!topic)return NextResponse.json({error:"Enter a topic."},{status:400});
  const prompt="Create exactly "+count+" useful study flashcards about: "+topic+". "+(course?"Course context: "+course+". ":"")+"Return ONLY valid JSON shaped as {\"cards\":[{\"front\":\"question\",\"back\":\"answer\"}]}. Use concise student-friendly language, factual answers, no markdown fences.";
  const raw=await generateAIResponse({systemInstruction:"You are a careful academic study assistant. Return valid JSON only.",prompt});const clean=raw.replace(/^\s*\x60\x60\x60(?:json)?/i,"").replace(/\x60\x60\x60\s*$/,"").trim();const parsed=JSON.parse(clean) as {cards?:{front?:string;back?:string}[]};
  const cards=(parsed.cards||[]).filter(c=>typeof c.front==="string"&&typeof c.back==="string"&&c.front.trim()&&c.back.trim()).slice(0,count).map(c=>({front:c.front!.trim().slice(0,1500),back:c.back!.trim().slice(0,3000)}));if(cards.length<3)throw new Error("The AI response did not contain enough valid cards.");return NextResponse.json({cards});
 }catch(e){console.error("Flashcard generation failed:",e);return NextResponse.json({error:e instanceof Error?e.message:"Flashcard generation failed."},{status:500});}
}