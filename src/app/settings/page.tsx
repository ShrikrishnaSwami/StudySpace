"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Bell, Check, Eye, Laptop, Lock, LogOut, Mail, Moon, Save, Shield, Sun, Trash2, User, RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Theme = "dark" | "light" | "system";
type Preferences = {
  theme: Theme;
  emailNotifications: boolean;
  assignmentReminders: boolean;
  quizReminders: boolean;
};
const DEFAULTS: Preferences = { theme: "dark", emailNotifications: true, assignmentReminders: true, quizReminders: true };
const isTheme = (value: unknown): value is Theme => value === "dark" || value === "light" || value === "system";

function Section({ icon: Icon, title, description, children }: {
  icon: typeof User; title: string; description: string; children: ReactNode;
}) {
  return <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.025]">
    <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-5 sm:px-6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/10 text-violet-300"><Icon size={18}/></div>
      <div><h2 className="text-sm font-semibold text-white">{title}</h2><p className="mt-0.5 text-xs text-white/35">{description}</p></div>
    </div>
    <div className="space-y-5 p-5 sm:p-6">{children}</div>
  </section>;
}

function Toggle({ title, description, value, onChange }: {
  title: string; description: string; value: boolean; onChange: (value: boolean) => void;
}) {
  return <div className="flex items-center gap-4">
    <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{title}</p><p className="mt-1 text-xs leading-5 text-white/40">{description}</p></div>
    <button type="button" aria-label={title} aria-pressed={value} onClick={() => onChange(!value)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-violet-600" : "bg-white/15"}`}>
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${value ? "left-6" : "left-1"}`}/>
    </button>
  </div>;
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [preferencesMessage, setPreferencesMessage] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");
  const [pageError, setPageError] = useState("");

  const applyTheme = useCallback((theme: Theme) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("studyspace-theme", theme);
      const resolved = theme === "system" ? (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : theme;
      document.documentElement.dataset.theme = resolved;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!user) { router.replace("/login"); return; }
        if (!alive) return;
        setName(typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : "");
        setEmail(user.email || "");
        const saved = user.user_metadata?.studyspace_settings;
        const next: Preferences = {
          theme: isTheme(saved?.theme) ? saved.theme : DEFAULTS.theme,
          emailNotifications: typeof saved?.emailNotifications === "boolean" ? saved.emailNotifications : DEFAULTS.emailNotifications,
          assignmentReminders: typeof saved?.assignmentReminders === "boolean" ? saved.assignmentReminders : DEFAULTS.assignmentReminders,
          quizReminders: typeof saved?.quizReminders === "boolean" ? saved.quizReminders : DEFAULTS.quizReminders,
        };
        setPreferences(next);
        applyTheme(next.theme);
      } catch (error) {
        if (alive) setPageError(error instanceof Error ? error.message : "Could not load your settings.");
      } finally { if (alive) setLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, [router, applyTheme]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) { setProfileMessage("Please enter your name."); return; }
    setSavingProfile(true); setProfileMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: cleanName } });
      if (error) throw error;
      setName(cleanName); setProfileMessage("Profile saved successfully.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Could not save your profile.");
    } finally { setSavingProfile(false); }
  }

  async function requestEmailChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = newEmail.trim().toLowerCase();
    if (!nextEmail || nextEmail === email.toLowerCase()) { setEmailMessage("Enter a different email address."); return; }
    setSavingProfile(true); setEmailMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ email: nextEmail });
      if (error) throw error;
      setEmailMessage("Email change requested. Check your inbox to confirm it; your current email stays active until confirmation.");
      setNewEmail("");
    } catch (error) {
      setEmailMessage(error instanceof Error ? error.message : "Could not request an email change.");
    } finally { setSavingProfile(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordError(""); setPasswordMessage("");
    if (newPassword.length < 8) { setPasswordError("Use at least 8 characters for your new password."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("The passwords do not match."); return; }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword(""); setConfirmPassword(""); setPasswordMessage("Password changed successfully.");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Could not change your password.");
    } finally { setChangingPassword(false); }
  }

  async function savePreferences() {
    setSavingPreferences(true); setPreferencesMessage("");
    try {
      const { error } = await supabase.auth.updateUser({ data: { studyspace_settings: preferences } });
      if (error) throw error;
      applyTheme(preferences.theme);
      setPreferencesMessage("Preferences saved to your account.");
    } catch (error) {
      setPreferencesMessage(error instanceof Error ? error.message : "Could not save preferences.");
    } finally { setSavingPreferences(false); }
  }

  function chooseTheme(theme: Theme) {
    setPreferences(current => ({ ...current, theme }));
    applyTheme(theme);
    setPreferencesMessage("Theme preview applied. Save preferences to sync it to your account.");
  }

  async function signOutEverywhere() {
    if (!window.confirm("Sign out of StudySpace on this device and all other devices?")) return;
    setSigningOut(true); setSecurityMessage("");
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) { setSecurityMessage(error.message); setSigningOut(false); return; }
    router.replace("/login");
  }

  async function deleteAccount() {
    if (deletePhrase !== "DELETE") return;
    setDeletingAccount(true); setPageError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Your session expired. Sign in again.");
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deletePhrase }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not delete your account.");
      await supabase.auth.signOut();
      router.replace("/login?account_deleted=1");
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Could not delete your account.");
      setDeletingAccount(false);
    }
  }

  return <AppShell title="Settings" description="Manage your StudySpace account and preferences.">
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-5 sm:px-6 sm:py-7">
      <header>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300/70">Preferences</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Settings</h1>
        <p className="mt-2 text-sm leading-6 text-white/45">Your account, security, appearance and saved preferences.</p>
        {email && <p className="mt-3 text-xs text-white/35">Signed in as <span className="text-white/60">{email}</span></p>}
      </header>
      {pageError && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{pageError}</div>}
      {loading ? <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-8 text-sm text-white/50"><RefreshCw size={16} className="mr-2 inline animate-spin"/>Loading your saved settings…</div> : <>
        <Section icon={User} title="Profile" description="Update the name shown across your workspace.">
          <form onSubmit={saveProfile} className="space-y-4">
            <div><label htmlFor="profile-name" className="mb-2 block text-xs font-medium text-white/55">Full name</label><input id="profile-name" autoComplete="name" maxLength={100} required value={name} onChange={e=>{setName(e.target.value);setProfileMessage("");}} placeholder="Your name" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/40"/></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4"><p aria-live="polite" className={`text-xs ${profileMessage.includes("successfully") ? "text-emerald-300" : "text-red-300"}`}>{profileMessage}</p><button type="submit" disabled={savingProfile} className="inline-flex h-10 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"><Save size={15}/>{savingProfile?"Saving…":"Save profile"}</button></div>
          </form>
          <form onSubmit={requestEmailChange} className="space-y-3 border-t border-white/[0.06] pt-5">
            <div><label htmlFor="account-email" className="mb-2 block text-xs font-medium text-white/55">Current email</label><div id="account-email" className="flex h-11 items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4"><Mail size={15} className="text-white/30"/><span className="truncate text-sm text-white/55">{email}</span></div></div>
            <div><label htmlFor="new-email" className="mb-2 block text-xs font-medium text-white/55">Change email</label><input id="new-email" type="email" autoComplete="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="new-address@example.com" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/40"/></div>
            <p aria-live="polite" className="text-xs text-white/45">{emailMessage}</p><div className="flex justify-end"><button type="submit" disabled={savingProfile||!newEmail.trim()} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/[0.05] disabled:opacity-50">Request email change</button></div>
          </form>
        </Section>

        <Section icon={Lock} title="Password" description="Change the password for your email/password account.">
          <form onSubmit={changePassword} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="new-password" className="mb-2 block text-xs font-medium text-white/55">New password</label><div className="relative"><input id="new-password" type={showPassword?"text":"password"} autoComplete="new-password" minLength={8} required value={newPassword} onChange={e=>setNewPassword(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 pr-11 text-sm text-white outline-none focus:border-violet-400/40" placeholder="At least 8 characters"/><button type="button" aria-label={showPassword?"Hide passwords":"Show passwords"} onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"><Eye size={16}/></button></div></div>
              <div><label htmlFor="confirm-password" className="mb-2 block text-xs font-medium text-white/55">Confirm password</label><input id="confirm-password" type={showPassword?"text":"password"} autoComplete="new-password" required value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none focus:border-violet-400/40" placeholder="Repeat new password"/></div>
            </div>
            {passwordError&&<p role="alert" className="text-sm text-red-300">{passwordError}</p>}{passwordMessage&&<p role="status" className="flex items-center gap-2 text-sm text-emerald-300"><Check size={15}/>{passwordMessage}</p>}
            <div className="flex justify-end border-t border-white/[0.06] pt-4"><button type="submit" disabled={changingPassword||!newPassword||!confirmPassword} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50">{changingPassword?"Updating…":"Update password"}</button></div>
          </form>
          <div className="border-t border-white/[0.06] pt-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-white">Sign out all devices</p><p className="mt-1 text-xs text-white/40">Revoke other active sessions and sign out here too.</p></div><button type="button" onClick={signOutEverywhere} disabled={signingOut} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.05] disabled:opacity-50"><LogOut size={15}/>{signingOut?"Signing out…":"Sign out everywhere"}</button></div>{securityMessage&&<p role="alert" className="mt-3 text-xs text-red-300">{securityMessage}</p>}</div>
        </Section>

        <Section icon={Bell} title="Notifications" description="Save your reminder preferences for your StudySpace account.">
          <Toggle title="Email notifications" description="Your preference for future email updates. Automated email reminders are not currently sent." value={preferences.emailNotifications} onChange={v=>setPreferences(p=>({...p,emailNotifications:v}))}/>
          <div className="border-t border-white/[0.06] pt-5"><Toggle title="Assignment reminders" description="Show in-app reminders for due-soon and overdue assignments. Checks run when you open or refresh the dashboard." value={preferences.assignmentReminders} onChange={v=>setPreferences(p=>({...p,assignmentReminders:v}))}/></div>
          <div className="border-t border-white/[0.06] pt-5"><Toggle title="Quiz reminders" description="Show in-app reminders for quiz events on your calendar starting within 24 hours." value={preferences.quizReminders} onChange={v=>setPreferences(p=>({...p,quizReminders:v}))}/></div>
        </Section>

        <Section icon={Laptop} title="Appearance" description="Choose the visual theme for your workspace.">
          <div className="grid gap-3 sm:grid-cols-3">
            {([{value:"dark",title:"Dark",description:"The original purple-black StudySpace look.",icon:Moon},{value:"light",title:"Light",description:"A brighter workspace.",icon:Sun},{value:"system",title:"System",description:"Follow your device appearance.",icon:Laptop}] as const).map(option=>{const Icon=option.icon;const active=preferences.theme===option.value;return <button key={option.value} type="button" aria-pressed={active} onClick={()=>chooseTheme(option.value)} className={`rounded-2xl border p-4 text-left transition ${active?"border-violet-400/40 bg-violet-500/10":"border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"}`}><Icon size={19} className={active?"text-violet-300":"text-white/45"}/><p className="mt-3 text-sm font-medium text-white">{option.title}</p><p className="mt-1 text-xs leading-5 text-white/40">{option.description}</p>{active&&<p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-violet-300">Selected</p>}</button>})}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4"><p aria-live="polite" className="text-xs text-emerald-300">{preferencesMessage}</p><button type="button" onClick={savePreferences} disabled={savingPreferences} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"><Save size={15}/>{savingPreferences?"Saving…":"Save preferences"}</button></div>
        </Section>

        <Section icon={Shield} title="Account security" description="Actions that affect your entire StudySpace account.">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-white">Sign out on this device</p><p className="mt-1 text-xs text-white/40">End your current session.</p></div><button type="button" onClick={async()=>{const {error}=await supabase.auth.signOut({scope:"local"});if(error)setSecurityMessage(error.message);else router.replace("/login");}} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.05]"><LogOut size={15}/>Sign out</button></div>
          <div className="border-t border-red-400/10 pt-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-red-500/10 p-2 text-red-300"><Trash2 size={17}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Delete account</p><p className="mt-1 text-xs leading-5 text-white/40">Permanently remove your StudySpace account, associated database records, and uploaded homework files. This cannot be undone.</p></div></div>
            {!showDeleteConfirm?<button type="button" onClick={()=>setShowDeleteConfirm(true)} className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/[0.12]">Delete my account…</button>:<div className="mt-4 space-y-3 rounded-xl border border-red-400/20 bg-red-500/[0.04] p-4"><p className="text-sm text-red-200">Type <strong>DELETE</strong> to confirm permanent account deletion.</p><input value={deletePhrase} onChange={e=>setDeletePhrase(e.target.value)} aria-label="Type DELETE to confirm" placeholder="Type DELETE" className="h-11 w-full rounded-xl border border-red-400/20 bg-black/20 px-4 text-sm text-white outline-none"/><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setShowDeleteConfirm(false);setDeletePhrase("");}} disabled={deletingAccount} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70">Cancel</button><button type="button" onClick={deleteAccount} disabled={deletePhrase!=="DELETE"||deletingAccount} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">{deletingAccount?"Deleting account…":"Permanently delete account"}</button></div></div>}
          </div>
        </Section>
      </>}
    </div>
  </AppShell>;
}
