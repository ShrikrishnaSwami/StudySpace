"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import StudySpaceMark from "@/components/StudySpaceMark";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserRound,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("account_deleted") === "1") {
      setNotice("Your StudySpace account has been deleted.");
    }
  }, []);

  async function handleGuestLogin() {
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInAnonymously({
        options: { data: { full_name: "Guest Student", account_type: "guest" } },
      });
      if (error) {
        throw new Error(error.message.includes("Anonymous sign-ins are disabled")
          ? "Guest access is not enabled in Supabase yet. Enable Anonymous Sign-Ins in Supabase Authentication settings and try again."
          : error.message);
      }
      router.push("/dashboard");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start guest access.");
      setLoading(false);
    }
  }

  async function handleForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResetSent(false);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the password reset email.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const adminCheck = await fetch("/api/admin/check", {
          headers: { Authorization: "Bearer " + session.access_token },
          cache: "no-store",
        });
        router.push(adminCheck.ok ? "/admin" : "/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not sign in.");
      setLoading(false);
    }
  }

  return (
    <main className=" flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-10 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-purple-950/30 backdrop-blur-xl md:grid-cols-2">

        {/* Left side */}
        <div className="hidden flex-col justify-between border-r border-white/10 bg-gradient-to-br from-purple-950/40 via-transparent to-transparent p-10 md:flex">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <StudySpaceMark size={48} />

              <span className="text-xl font-bold tracking-tight">
                StudySpace
              </span>
            </div>

            <div className="mt-20">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-purple-300">
                Your academic command center
              </p>

              <h1 className="max-w-md text-4xl font-bold leading-tight">
                Study smarter.
                <br />
                Stay organized.
                <br />
                <span className="text-purple-400">Go further.</span>
              </h1>

              <p className="mt-6 max-w-md leading-7 text-zinc-400">
                Keep your courses, assignments, quizzes, calendar and study
                tools together in one focused workspace.
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-600">
            Built for students who want more from their study time.
          </p>
        </div>

        {/* Login form */}
        <div className="p-8 sm:p-12">
          <div className="mx-auto max-w-md">

            <div className="mb-10">
              <p className="mb-2 text-sm font-medium text-purple-400">
                Welcome back
              </p>

              <h2 className="text-3xl font-bold tracking-tight">
                Sign in to StudySpace
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Continue where you left off and get back to studying.
              </p>
              {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p>}
            </div>

            <div className="mb-6 space-y-3">
              <button type="button" onClick={handleGuestLogin} disabled={loading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-purple-400/20 bg-purple-500/[0.07] py-3.5 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/[0.13] disabled:opacity-60">
                <UserRound size={18} /> Continue as guest
              </button>
              <div className="flex items-center gap-3 py-1 text-[11px] uppercase tracking-wider text-white/25">
                <span className="h-px flex-1 bg-white/10" /> or use email <span className="h-px flex-1 bg-white/10" />
              </div>
            </div>

            {forgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <h3 className="text-lg font-semibold">Reset your password</h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">Enter your account email and we’ll send a secure reset link.</p>
                </div>
                <div>
                  <label htmlFor="reset-email" className="mb-2 block text-sm font-medium text-zinc-300">Email</label>
                  <div className="relative">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input id="reset-email" type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-purple-500/70"/>
                  </div>
                </div>
                {error && <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}
                {resetSent && <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">If an account exists for that address, a password reset email has been sent. Check your inbox.</div>}
                <button type="submit" disabled={loading||!email.trim()} className="w-full rounded-xl bg-purple-600 py-3.5 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-60">{loading?"Sending link…":"Send reset link"}</button>
                <button type="button" onClick={()=>{setForgotPassword(false);setResetSent(false);setError("");}} className="w-full rounded-xl border border-white/10 py-3 text-sm text-white/70 hover:bg-white/[0.04]">Back to sign in</button>
              </form>
            ) : (
            <form onSubmit={handleLogin} className="space-y-5">

              {/* Email */}
              <div>
                <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-zinc-300">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-zinc-300">
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" maxLength={128} required value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-zinc-300"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}

                {!loading && (
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>
              <div className="flex justify-end">
                <button type="button" onClick={()=>{setForgotPassword(true);setError("");setResetSent(false);}} className="text-xs font-medium text-purple-300 transition hover:text-purple-200">Forgot password?</button>
              </div>
            </form>
            )}

            <p className="mt-8 text-center text-sm text-zinc-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium text-purple-400 transition hover:text-purple-300"
              >
                Create one 
              </Link>
            </p>

          </div>
        </div>
      </div>
    </main>
  );  
}