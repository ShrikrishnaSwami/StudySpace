import { NextRequest,NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic="force-dynamic";
const ADMIN_EMAIL=(process.env.STUDYSPACE_ADMIN_EMAIL||"apha9213@gmail.com").toLowerCase();
export async function GET(request:NextRequest){
 try{
  const token=request.headers.get("authorization")?.replace(/^Bearer\\s+/i,""),url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!token)return NextResponse.json({error:"Sign in required."},{status:401});if(!url||!key)return NextResponse.json({error:"Server-side Supabase admin configuration is missing."},{status:503});
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data:{user},error:authError}=await client.auth.getUser(token);
  if(authError||!user)return NextResponse.json({error:"Session invalid. Sign in again."},{status:401});if(!user.email||user.email.toLowerCase()!==ADMIN_EMAIL)return NextResponse.json({error:"Administrator access required."},{status:403});
  const [u,c,a,s,q,qa,ss]=await Promise.all([client.auth.admin.listUsers({page:1,perPage:1}),client.from("courses").select("id",{count:"exact",head:true}),client.from("assignments").select("id",{count:"exact",head:true}),client.from("assignment_submissions").select("id",{count:"exact",head:true}),client.from("quizzes").select("id",{count:"exact",head:true}),client.from("quiz_attempts").select("id",{count:"exact",head:true}),client.from("study_sessions").select("id",{count:"exact",head:true})]);
  if(u.error)throw u.error;const errors=[c,a,s,q,qa,ss].filter(x=>x.error);if(errors.length)throw new Error(errors.map(x=>x.error?.message).join("; "));
  return NextResponse.json({totalUsers:u.data?.total??u.data?.users?.length??0,courses:c.count??0,assignments:a.count??0,submissions:s.count??0,quizzes:q.count??0,quizAttempts:qa.count??0,studySessions:ss.count??0,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
 }catch(e){console.error("Admin stats failed:",e);return NextResponse.json({error:"Could not load admin statistics."},{status:500});}
}