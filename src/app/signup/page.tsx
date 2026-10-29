"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    if (password.length < 8) {
      setError("Your password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name.trim().slice(0, 100),
          },
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/dashboard");
        return;
      }

      setSuccess("Account created successfully! You can now sign in.");

      setLoading(false);
    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while creating your account."
      );

      setLoading(false);
    }
  }

  return (
    <main className="bento-auth-page flex min-h-screen items-center justify-center px-6 py-12">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-10 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute bottom-10 right-1/4 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      </div>

      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-purple-950/30 backdrop-blur-xl md:grid-cols-2">
        {/* Left */}
        <div className="hidden flex-col justify-between border-r border-white/10 bg-gradient-to-br from-purple-950/40 via-transparent to-transparent p-10 md:flex">
          <div>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 shadow-lg shadow-purple-600/30">
                <BookOpen size={23} />
              </div>

              <span className="text-xl font-bold tracking-tight">
                StudySpace
              </span>
            </div>

            <div className="mt-20">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-purple-300">
                Built around you
              </p>

              <h1 className="max-w-md text-4xl font-bold leading-tight">
                One space for your
                <br />
                entire
                <br />
                <span className="text-purple-400">student life.</span>
              </h1>

              <p className="mt-6 max-w-md leading-7 text-zinc-400">
                Organize your academic life, track what matters and spend less
                time figuring out what to study next.
              </p>
            </div>
          </div>

          <p className="text-sm text-zinc-600">
            Your workspace. Your progress. Your StudySpace.
          </p>
        </div>

        {/* Signup */}
        <div className="p-8 sm:p-12">
          <div className="mx-auto max-w-md">
            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-purple-400">
                Get started
              </p>

              <h2 className="text-3xl font-bold tracking-tight">
                Create your account
              </h2>

              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Set up your StudySpace and start organizing your studies.
              </p>
            </div>

            <form onSubmit={handleSignup} className="space-y-5">
              {/* Name */}
              <div>
                <label htmlFor="signup-name" className="mb-2 block text-sm font-medium text-zinc-300">
                  Full name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    maxLength={100}
                    onChange={(e) => setName(e.target.value.slice(0, 100))}
                    placeholder="Your name"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-zinc-300">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={email}
                    maxLength={254}
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value.slice(0, 254))}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-white/10 bg-black/20 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/10"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-zinc-300">
                  Password
                </label>

                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input id="signup-password" type={showPassword ? "text" : "password"} required value={password} minLength={8} maxLength={128}
                    autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
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

              {/* Success */}
              {success && (
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                  {success}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account..." : "Create account"}

                {!loading && (
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-zinc-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-purple-400 transition hover:text-purple-300"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}