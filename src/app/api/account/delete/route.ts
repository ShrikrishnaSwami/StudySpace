import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Account deletion is not configured on the server." }, { status: 503 });
    }

    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Your session is invalid. Sign in again." }, { status: 401 });

    let body: { confirmation?: string };
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Confirmation is required." }, { status: 400 }); }
    if (body.confirmation !== "DELETE") {
      return NextResponse.json({ error: 'Type "DELETE" to confirm account deletion.' }, { status: 400 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Homework uploads are stored under <auth-user-id>/<homework-id>/<filename>.
    // Remove only this user's files before deleting their auth account.
    const bucket = admin.storage.from("homework");
    const filesToRemove: string[] = [];
    async function collectFiles(prefix: string, depth: number): Promise<void> {
      if (depth > 3) return;
      const { data, error } = await bucket.list(prefix, { limit: 1000 });
      if (error) throw new Error("Could not safely clean up uploaded files: " + error.message);
      for (const item of data || []) {
        const path = prefix ? prefix + "/" + item.name : item.name;
        if (item.id === null) await collectFiles(path, depth + 1);
        else filesToRemove.push(path);
      }
    }

    try {
      await collectFiles(user.id, 0);
      for (let i = 0; i < filesToRemove.length; i += 100) {
        const { error } = await bucket.remove(filesToRemove.slice(i, i + 100));
        if (error) throw new Error(error.message);
      }
    } catch (cleanupError) {
      console.error("Account storage cleanup failed:", cleanupError);
      return NextResponse.json({ error: "Account was not deleted because uploaded files could not be safely cleaned up. Please try again or contact support." }, { status: 500 });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Account deletion failed:", deleteError);
      return NextResponse.json({ error: "Uploaded files were cleaned up, but the account could not be deleted. Please contact support." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion route failed:", error);
    return NextResponse.json({ error: "Could not delete your account." }, { status: 500 });
  }
}
