"use client";

import {
  Bell,
  Check,
  ChevronRight,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Save,
  Shield,
  Sun,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type SettingToggleProps = {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
};

function SettingToggle({
  title,
  description,
  enabled,
  onChange,
}: SettingToggleProps) {
  return (
    <div className="flex items-center gap-5 px-5 py-5 sm:px-6">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-1 text-xs leading-5 text-white/35">
          {description}
        </p>
      </div>

      <button
        type="button"
        aria-label={`${title}: ${enabled ? "on" : "off"}`}
        aria-pressed={enabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled ? "bg-violet-600" : "bg-white/[0.1]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof User;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-white/[0.06] px-5 py-5 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/10 text-violet-300">
          <Icon size={18} />
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-white/30">{description}</p>
        </div>
      </div>
    </div>
  );
}

function ThemeOption({
  icon: Icon,
  title,
  description,
  active = false,
  disabled = false,
}: {
  icon: typeof Moon;
  title: string;
  description: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`relative rounded-2xl border p-4 text-left transition ${
        active
          ? "border-violet-400/30 bg-violet-500/[0.08]"
          : "border-white/[0.07] bg-white/[0.02]"
      } ${
        disabled
          ? "cursor-not-allowed opacity-30"
          : "hover:border-white/[0.12] hover:bg-white/[0.04]"
      }`}
    >
      {active && (
        <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-violet-300">
          <Check size={12} />
        </div>
      )}

      <Icon
        size={19}
        className={active ? "text-violet-300" : "text-white/35"}
      />

      <p className="mt-4 text-sm font-medium text-white">{title}</p>

      <p className="mt-1 text-xs text-white/30">{description}</p>

      {disabled && (
        <span className="mt-3 inline-block rounded-full bg-white/[0.05] px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-white/30">
          Coming soon
        </span>
      )}
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [assignmentReminders, setAssignmentReminders] = useState(true);
  const [quizReminders, setQuizReminders] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      setName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");
    }

    loadProfile();
  }, [router]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileMessage("");

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: name,
      },
    });

    if (error) {
      setProfileMessage(error.message);
      setSavingProfile(false);
      return;
    }

    setProfileMessage("Profile updated successfully.");
    setSavingProfile(false);
  }

  async function changePassword() {
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The passwords do not match.");
      return;
    }

    setChangingPassword(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordError(error.message);
      setChangingPassword(false);
      return;
    }

    setNewPassword("");
    setConfirmPassword("");

    setPasswordMessage(
      "Your password has been changed successfully."
    );

    setChangingPassword(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <AppShell
      title="Settings"
      description="Manage your StudySpace account"
    >
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-9">
        {/* Header */}
        <div className="mb-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300/70">
                Preferences
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Settings
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
                Manage your profile, security, notifications, and
                StudySpace preferences.
              </p>
            </div>

            <div className="hidden rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 sm:block">
              <p className="text-[10px] uppercase tracking-wider text-white/25">
                Account
              </p>
              <p className="mt-1 max-w-[220px] truncate text-xs text-white/55">
                {email || "Loading..."}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* Main settings */}
          <div className="space-y-5">
            {/* Profile */}
            <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
              <SectionHeader
                icon={User}
                title="Profile"
                description="Your personal account information"
              />

              <div className="space-y-5 p-5 sm:p-6">
                <div>
                  <label className="mb-2 block text-xs font-medium text-white/50">
                    Full name
                  </label>

                  <input
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setProfileMessage("");
                    }}
                    placeholder="Your name"
                    className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-400/30 focus:bg-black/30 focus:ring-2 focus:ring-violet-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-white/50">
                    Email address
                  </label>

                  <div className="flex min-h-11 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4">
                    <Mail size={16} className="shrink-0 text-white/25" />

                    <span className="min-w-0 flex-1 truncate text-sm text-white/45">
                      {email || "Loading..."}
                    </span>

                    <span className="hidden rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-medium uppercase tracking-wide text-emerald-300 sm:inline-block">
                      Account email
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-h-5">
                    {profileMessage && (
                      <p
                        className={`text-xs ${
                          profileMessage.includes("successfully")
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {profileMessage}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={15} />
                    {savingProfile ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            </section>

            {/* Password */}
            <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
              <SectionHeader
                icon={Lock}
                title="Password"
                description="Update your account password"
              />

              <div className="space-y-5 p-5 sm:p-6">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-medium text-white/50">
                      New password
                    </label>

                    <input
                      type="password"
                      value={newPassword}
                      onChange={(event) => {
                        setNewPassword(event.target.value);
                        setPasswordError("");
                        setPasswordMessage("");
                      }}
                      placeholder="Enter a new password"
                      className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-400/30 focus:bg-black/30 focus:ring-2 focus:ring-violet-500/10"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium text-white/50">
                      Confirm password
                    </label>

                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setPasswordError("");
                        setPasswordMessage("");
                      }}
                      placeholder="Confirm your new password"
                      className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-400/30 focus:bg-black/30 focus:ring-2 focus:ring-violet-500/10"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {passwordError && (
                    <div className="rounded-xl border border-red-400/10 bg-red-500/[0.05] px-4 py-3 text-xs text-red-300">
                      {passwordError}
                    </div>
                  )}

                  {passwordMessage && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-400/10 bg-emerald-500/[0.05] px-4 py-3 text-xs text-emerald-300">
                      <Check size={14} />
                      {passwordMessage}
                    </div>
                  )}
                </div>

                <div className="flex justify-end border-t border-white/[0.06] pt-5">
                  <button
                    type="button"
                    onClick={changePassword}
                    disabled={changingPassword}
                    className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {changingPassword
                      ? "Updating password..."
                      : "Change password"}
                  </button>
                </div>
              </div>
            </section>

            {/* Notifications */}
            <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
              <SectionHeader
                icon={Bell}
                title="Notifications"
                description="Choose what StudySpace can remind you about"
              />

              <div className="divide-y divide-white/[0.05]">
                <SettingToggle
                  title="Email notifications"
                  description="Receive important StudySpace updates by email."
                  enabled={emailNotifications}
                  onChange={setEmailNotifications}
                />

                <SettingToggle
                  title="Assignment reminders"
                  description="Get reminders about upcoming assignments."
                  enabled={assignmentReminders}
                  onChange={setAssignmentReminders}
                />

                <SettingToggle
                  title="Quiz reminders"
                  description="Get notified when quizzes are approaching."
                  enabled={quizReminders}
                  onChange={setQuizReminders}
                />
              </div>
            </section>

            {/* Appearance */}
            <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
              <SectionHeader
                icon={Monitor}
                title="Appearance"
                description="Customize how StudySpace looks"
              />

              <div className="grid gap-3 p-5 sm:grid-cols-3 sm:p-6">
                <ThemeOption
                  icon={Moon}
                  title="Dark"
                  description="The current StudySpace experience."
                  active
                />

                <ThemeOption
                  icon={Sun}
                  title="Light"
                  description="A lighter interface."
                  disabled
                />

                <ThemeOption
                  icon={Monitor}
                  title="System"
                  description="Follow your device preference."
                  disabled
                />
              </div>
            </section>

            {/* Security */}
            <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
              <SectionHeader
                icon={Shield}
                title="Security"
                description="Manage account security"
              />

              <div className="divide-y divide-white/[0.05]">
                <button
                  type="button"
                  className="flex w-full items-center gap-4 px-5 py-5 text-left transition hover:bg-white/[0.025] sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      Active sessions
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/30">
                      Review where your account is currently signed in.
                    </p>
                  </div>

                  <ChevronRight
                    size={17}
                    className="shrink-0 text-white/20"
                  />
                </button>

                <div className="flex items-center gap-4 px-5 py-5 sm:px-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">
                      Two-factor authentication
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/30">
                      Add another layer of protection to your account.
                    </p>
                  </div>

                  <span className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.035] px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-white/30">
                    Coming soon
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            {/* Account card */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
              <div className="relative overflow-hidden px-5 py-6">
                <div className="absolute -right-12 -top-16 h-36 w-36 rounded-full bg-violet-600/[0.12] blur-3xl" />

                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-indigo-500/10 text-lg font-semibold text-violet-200 ring-1 ring-violet-400/20">
                    {name?.trim()?.charAt(0)?.toUpperCase() || "S"}
                  </div>

                  <h3 className="mt-4 truncate text-sm font-semibold text-white">
                    {name || "StudySpace student"}
                  </h3>

                  <p className="mt-1 truncate text-xs text-white/35">
                    {email || "Loading..."}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/[0.06] px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/30">
                    Account status
                  </span>

                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    Active
                  </span>
                </div>
              </div>
            </div>

            {/* Sign out */}
            <div className="rounded-2xl border border-red-400/10 bg-red-500/[0.025] p-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/10 text-red-300">
                <LogOut size={16} />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-white">
                Sign out
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-white/30">
                Sign out of your StudySpace account on this device.
              </p>

              <button
                type="button"
                onClick={logout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/15 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/15"
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>

            {/* Danger zone */}
            <div className="rounded-2xl border border-red-500/10 bg-red-500/[0.015] p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-red-300/70">
                Danger zone
              </p>

              <h3 className="mt-3 text-sm font-semibold text-white">
                Delete account
              </h3>

              <p className="mt-1.5 text-xs leading-5 text-white/30">
                Account deletion is permanent and will be connected to
                Supabase once production account management is implemented.
              </p>

              <button
                type="button"
                disabled
                className="mt-4 w-full rounded-xl border border-red-400/10 px-4 py-2.5 text-xs font-medium text-red-300/30"
              >
                Delete account
              </button>
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}