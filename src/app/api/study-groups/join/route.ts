import { NextRequest,NextResponse } from "next/server";
import { consumeApiRateLimit } from "@/lib/api-security";
import { createClient } from "@supabase/supabase-js";
export async function POST(request:NextRequest){
 try{
  const token=request.headers.get("authorization")?.replace(/^Bearer\s+/i,""),url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
  if(!token)return NextResponse.json({error:"Sign in to join a group."},{status:401});if(!url||!key)return NextResponse.json({error:"Server-side Supabase admin key is missing. Set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in the server environment."},{status:503});
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});const {data:{user},error:authError}=await client.auth.getUser(token);if(authError||!user)return NextResponse.json({error:"Session expired. Sign in again."},{status:401});const rate=await consumeApiRateLimit(user.id,"study-group-join",10,600);if(!rate.allowed)return NextResponse.json({error:"Too many join attempts. Please wait and try again."},{status:429});
  const body=await request.json(),code=typeof body.inviteCode==="string"?body.inviteCode.trim().toUpperCase():"";if(!/^[A-Z0-9]{8}$/.test(code))return NextResponse.json({error:"Enter a valid 8-character invite code."},{status:400});
  const {data:group,error:groupError}=await client.from("study_groups").select("id,name,invite_code").eq("invite_code",code).maybeSingle();if(groupError||!group)return NextResponse.json({error:"No study group found for that code."},{status:404});
  const {data:existing}=await client.from("study_group_members").select("group_id").eq("group_id",group.id).eq("user_id",user.id).maybeSingle();if(!existing){const {error}=await client.from("study_group_members").insert({group_id:group.id,user_id:user.id,role:"member"});if(error)throw error;}
  return NextResponse.json({group:{id:group.id,name:group.name}});
 }catch(e){console.error("Study group join failed:",e);return NextResponse.json({error:"Could not join the study group."},{status:500});}
}