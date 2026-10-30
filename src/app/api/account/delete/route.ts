import { NextRequest, NextResponse } from "next/server";
import { consumeApiRateLimit, readBoundedJson } from "@/lib/api-security";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Sign in to delete your account." }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    if (!url || !anonKey || !serviceKey) {
      return NextResponse.json({ error: "Account deletion is not configured on the server." }, { status: 503 });
    }

    const authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Your session is invalid. Sign in again." }, { status: 401 });
    const lastSignInAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0;
    if (!lastSignInAt || !Number.isFinite(lastSignInAt) || Date.now() - lastSignInAt > 15 * 60 * 1000) {
      return NextResponse.json(
        { error: "For security, sign in again before deleting your account." },
        { status: 403 },
      );
    }

    const userId = user.id;
    const rate = await consumeApiRateLimit(userId, "account-delete", 3, 3600, token);
    if (!rate.allowed) return NextResponse.json({ error: "Too many account deletion attempts. Please try again later." }, { status: 429 });


    let body: unknown;
    try {
      body = await readBoundedJson(request, 1024);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? "Confirmation request is too large." : "Confirmation is required." },
        { status: error instanceof Error && error.message === "REQUEST_TOO_LARGE" ? 413 : 400 },
      );
    }
    if (!body || typeof body !== "object" || Array.isArray(body) || (body as { confirmation?: unknown }).confirmation !== "DELETE") {
      return NextResponse.json({ error: 'Type "DELETE" to confirm account deletion.' }, { status: 400 });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    // Each private bucket stores user-owned files under <auth-user-id>/...
    // Paginate every directory without a depth cap. Any listing/removal failure
    // aborts account deletion so no partially cleaned account is silently removed.
    async function listAllUserFiles(bucketName: string): Promise<string[]> {
      const bucket = admin.storage.from(bucketName);
      const pendingPrefixes = [userId];
      const visitedPrefixes = new Set<string>();
      const files: string[] = [];
      const pageSize = 100;

      while (pendingPrefixes.length > 0) {
        const prefix = pendingPrefixes.pop()!;
        if (visitedPrefixes.has(prefix)) continue;
        visitedPrefixes.add(prefix);

        let offset = 0;
        while (true) {
          const { data, error } = await bucket.list(prefix, {
            limit: pageSize,
            offset,
            sortBy: { column: "name", order: "asc" },
          });
          if (error) throw new Error(bucketName + ": " + error.message);

          const entries = data || [];
          for (const item of entries) {
            const name = item.name;
            if (!name || name === "." || name === ".." || name.includes("/") || name.includes("\\\\")) {
              throw new Error(bucketName + ": storage returned an invalid path segment.");
            }
            const objectPath = prefix + "/" + name;
            if (item.id === null) pendingPrefixes.push(objectPath);
            else files.push(objectPath);
          }

          offset += entries.length;
          if (entries.length < pageSize) break;
        }
      }

      return files;
    }

    async function cleanBucket(bucketName: string): Promise<void> {
      const bucket = admin.storage.from(bucketName);
      const files = await listAllUserFiles(bucketName);

      // Supabase Storage remove accepts at most 1,000 paths per request.
      for (let i = 0; i < files.length; i += 1000) {
        const { error } = await bucket.remove(files.slice(i, i + 1000));
        if (error) throw new Error(bucketName + ": " + error.message);
      }

      // Verify cleanup with a fresh, fully paginated traversal before deletion.
      const remaining = await listAllUserFiles(bucketName);
      if (remaining.length > 0) {
        throw new Error(bucketName + ": " + remaining.length + " user-owned object(s) remain after cleanup.");
      }
    }

    try {
      for (const bucketName of ["homework", "assignment-files", "assignment-submissions"]) {
        await cleanBucket(bucketName);
      }
    } catch (cleanupError) {
      console.error("Account storage cleanup failed:", cleanupError);
      return NextResponse.json({ error: "Account was not deleted because uploaded files could not be safely cleaned up. Please try again or contact support." }, { status: 500 });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
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
