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
  User,
  Sun,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [emailNotifications, setEmailNotifications] =
    useState(true);

  const [assignmentReminders, setAssignmentReminders] =
    useState(true);

  const [quizReminders, setQuizReminders] =
    useState(true);

  const [savingProfile, setSavingProfile] =
    useState(false);

  const [changingPassword, setChangingPassword] =
    useState(false);

  const [profileMessage, setProfileMessage] =
    useState("");

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

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
      setPasswordError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "The passwords do not match."
      );
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
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Settings
          </h1>

          <p className="mt-2 text-sm text-white/40">
            Manage your profile, security, and StudySpace
            preferences.
          </p>
        </div>

        {/* Profile */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          <div className="border-b border-white/[0.06] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <User size={18} />
              </div>

              <div>
                <h2 className="font-semibold">
                  Profile
                </h2>
                <p className="text-xs text-white/30">
                  Your personal account information
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/50">
                Full name
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/10"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white/50">
                Email address
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                <Mail
                  size={16}
                  className="text-white/25"
                />

                <span className="text-sm text-white/45">
                  {email}
                </span>

                <span className="ml-auto rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">
                  Account email
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <p
                className={`text-xs ${
                  profileMessage.includes("successfully")
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {profileMessage}
              </p>

              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
              >
                <Save size={15} />

                {savingProfile
                  ? "Saving..."
                  : "Save changes"}
              </button>
            </div>
          </div>
        </section>

        {/* Password */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          <div className="border-b border-white/[0.06] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Lock size={18} />
              </div>

              <div>
                <h2 className="font-semibold">
                  Password
                </h2>
                <p className="text-xs text-white/30">
                  Update your account password
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div>
              <label className="mb-2 block text-xs font-medium text-white/50">
                New password
              </label>

              <input
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                placeholder="Enter a new password"
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-white/50">
                Confirm new password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm your new password"
                className="w-full rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/20 focus:border-violet-400/30 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

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

            <button
              onClick={changePassword}
              disabled={changingPassword}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {changingPassword
                ? "Updating password..."
                : "Change password"}
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          <div className="border-b border-white/[0.06] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Bell size={18} />
              </div>

              <div>
                <h2 className="font-semibold">
                  Notifications
                </h2>
                <p className="text-xs text-white/30">
                  Choose what StudySpace can remind you about
                </p>
              </div>
            </div>
          </div>

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
        <section className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          <div className="border-b border-white/[0.06] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Monitor size={18} />
              </div>

              <div>
                <h2 className="font-semibold">
                  Appearance
                </h2>
                <p className="text-xs text-white/30">
                  Customize how StudySpace looks
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-6 sm:grid-cols-3">
            <ThemeOption
              icon={Moon}
              title="Dark"
              active
            />

            <ThemeOption
              icon={Sun}
              title="Light"
              disabled
            />

            <ThemeOption
              icon={Monitor}
              title="System"
              disabled
            />
          </div>
        </section>

        {/* Security */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
          <div className="border-b border-white/[0.06] px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                <Shield size={18} />
              </div>

              <div>
                <h2 className="font-semibold">
                  Security
                </h2>
                <p className="text-xs text-white/30">
                  Manage account security
                </p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-white/[0.05]">
            <button className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-white/[0.02]">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Active sessions
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Review where your account is currently signed in.
                </p>
              </div>

              <ChevronRight
                size={17}
                className="text-white/25"
              />
            </button>

            <button className="flex w-full items-center gap-4 px-6 py-5 text-left transition hover:bg-white/[0.02]">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Two-factor authentication
                </p>
                <p className="mt-1 text-xs text-white/30">
                  Add another layer of protection to your account.
                </p>
              </div>

              <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-[10px] text-white/30">
                Coming soon
              </span>
            </button>
          </div>
        </section>

        {/* Logout */}
        <section className="mb-6 rounded-2xl border border-red-400/10 bg-red-500/[0.025] p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold">
                Sign out
              </h2>

              <p className="mt-1 text-xs text-white/30">
                Sign out of your StudySpace account on this device.
              </p>
            </div>

            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/15"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </section>

        {/* Danger zone */}
        <section className="rounded-2xl border border-red-500/15 bg-red-500/[0.025] p-6">
          <h2 className="font-semibold text-red-300">
            Danger zone
          </h2>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-white/30">
            Account deletion is permanent. This option will be
            connected to Supabase account deletion once the
            production account-management system is implemented.
          </p>

          <button
            disabled
            className="mt-5 rounded-xl border border-red-400/10 px-4 py-2.5 text-sm font-medium text-red-300/40"
          >
            Delete account
          </button>
        </section>
      </div>
    </AppShell>
  );
}

function SettingToggle({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-5 px-6 py-5">
      <div className="flex-1">
        <p className="text-sm font-medium">
          {title}
        </p>

        <p className="mt-1 text-xs text-white/30">
          {description}
        </p>
      </div>

      <button
        onClick={() => onChange(!enabled)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled
            ? "bg-violet-600"
            : "bg-white/[0.08]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function ThemeOption({
  icon: Icon,
  title,
  active = false,
  disabled = false,
}: {
  icon: typeof Moon;
  title: string;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={`rounded-xl border p-4 text-left transition ${
        active
          ? "border-violet-400/30 bg-violet-500/10"
          : "border-white/[0.07] bg-white/[0.02]"
      } ${
        disabled
          ? "cursor-not-allowed opacity-30"
          : "hover:border-violet-400/20 hover:bg-white/[0.04]"
      }`}
    >
      <Icon
        size={18}
        className={
          active
            ? "text-violet-400"
            : "text-white/30"
        }
      />

      <p className="mt-3 text-sm font-medium">
        {title}
      </p>

      {active && (
        <p className="mt-1 text-[10px] text-violet-300">
          Active
        </p>
      )}
    </button>
  );
}