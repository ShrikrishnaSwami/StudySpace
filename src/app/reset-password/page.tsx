"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen, Eye, EyeOff, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let alive = true;
    void supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!alive) return;
      setHasSession(Boolean(user) && !error);
      setChecking(false);
    });
    return () => { alive = false; };
  }, []);

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (password.length < 8) { setError("Use at least 8 characters."); return; }
    if (password !== confirmPassword) { setError("The passwords do not match."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess("Your password has been reset. Taking you to your dashboard…");
      window.setTimeout(() => router.replace("/dashboard"), 1200);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not reset your password. Request a new reset link.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="relative flex min-h-screen items-center justify-center px-5 py-12 text-white">
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"><div className="absolute left-1/4 top-10 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl"/><div className="absolute bottom-10 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl"/></div>
    <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.035] p-7 shadow-2xl shadow-purple-950/30 backdrop-blur-xl sm:p-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600"><BookOpen size={21}/></span><span className="text-lg font-bold">StudySpace</span></Link>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Account recovery</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Set a new password</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">Choose a strong password you haven’t used for this account before.</p>
      {checking ? <p className="mt-6 text-sm text-zinc-400">Verifying your reset link…</p> : !hasSession ? <div className="mt-6 space-y-4"><p role="alert" className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-200">This reset link is invalid or has expired. Request a new one from the sign-in page.</p><Link href="/login" className="block rounded-xl bg-purple-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-purple-500">Back to sign in</Link></div> : <form onSubmit={savePassword} className="mt-6 space-y-4">
        <div><label htmlFor="reset-password" className="mb-2 block text-sm font-medium text-zinc-300">New password</label><div className="relative"><Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"/><input id="reset-password" required minLength={8} maxLength={128} autoComplete="new-password" type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-12 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-purple-500/70"/><button type="button" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(v=>!v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></div>
        <div><label htmlFor="confirm-reset-password" className="mb-2 block text-sm font-medium text-zinc-300">Confirm password</label><input id="confirm-reset-password" required minLength={8} autoComplete="new-password" type={showPassword?"text":"password"} value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Repeat your password" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-purple-500/70"/></div>
        {error&&<p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}{success&&<p role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">{success}</p>}
        <button type="submit" disabled={busy||!password||!confirmPassword} className="w-full rounded-xl bg-purple-600 py-3.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-60">{busy?"Saving password…":"Reset password"}</button>
      </form>}
    </div>
  </main>;
}
