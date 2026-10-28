"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  Bell, Check, Download, Eye, Gauge, Lock, LogOut, Mail, Save, Shield, Trash2, User, RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type Preferences = {
  emailNotifications: boolean;
  assignmentReminders: boolean;
  quizReminders: boolean;
};
const DEFAULTS: Preferences = { emailNotifications: true, assignmentReminders: true, quizReminders: true };

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
  const [aiUsage, setAiUsage] = useState<{feature:string;limit:number;used:number;remaining:number}[]>([]);
  const [usageError, setUsageError] = useState("");
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

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
          emailNotifications: typeof saved?.emailNotifications === "boolean" ? saved.emailNotifications : DEFAULTS.emailNotifications,
          assignmentReminders: typeof saved?.assignmentReminders === "boolean" ? saved.assignmentReminders : DEFAULTS.assignmentReminders,
          quizReminders: typeof saved?.quizReminders === "boolean" ? saved.quizReminders : DEFAULTS.quizReminders,
        };
        setPreferences(next);
      } catch (error) {
        if (alive) setPageError(error instanceof Error ? error.message : "Could not load your settings.");
      } finally { if (alive) setLoading(false); }
    }
    void load();
    return () => { alive = false; };
  }, [router]);

  async function loadAiUsage() {
    setLoadingUsage(true); setUsageError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sign in again to view AI usage.");
      const response = await fetch("/api/usage", { headers: { Authorization: "Bearer " + session.access_token }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not load AI usage.");
      setAiUsage(payload.usage || []);
    } catch (error) {
      setUsageError(error instanceof Error ? error.message : "Could not load AI usage.");
    } finally { setLoadingUsage(false); }
  }

  async function exportData() {
    setExporting(true); setExportMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sign in again to export your data.");
      const response = await fetch("/api/export", { headers: { Authorization: "Bearer " + session.access_token }, cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not export your data.");
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = "studyspace-data-export.json"; link.click();
      window.URL.revokeObjectURL(url);
      setExportMessage("Your export was downloaded. Keep it somewhere private because it contains your academic data.");
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Could not export your data.");
    } finally { setExporting(false); }
  }

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
      if (error) throw error;(preferences.theme);
      setPreferencesMessage("Preferences saved to your account.");
    } catch (error) {
      setPreferencesMessage(error instanceof Error ? error.message : "Could not save preferences.");
    } finally { setSavingPreferences(false); }
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
            <div><label htmlFor="new-email" className="mb-2 block text-xs font-medium text-white/55">Change email</label><input id="new-email" type="email" autoComplete="email" maxLength={254} value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="new-address@example.com" className="h-11 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-400/40"/></div>
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

        <Section icon={Gauge} title="AI usage" description="View your rolling 24-hour generation limits.">
          <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-white/50">Limits help protect availability and keep AI usage predictable.</p><button type="button" onClick={()=>void loadAiUsage()} disabled={loadingUsage} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/70 disabled:opacity-50"><RefreshCw size={14}/>{loadingUsage?"Refreshing…":"Refresh usage"}</button></div>
          {usageError&&<p role="alert" className="text-xs text-red-300">{usageError}</p>}
          {aiUsage.length===0&&!loadingUsage&&!usageError&&<button type="button" onClick={()=>void loadAiUsage()} className="rounded-xl border border-violet-400/20 px-4 py-2.5 text-sm text-violet-200">Load AI usage</button>}
          <div className="grid gap-3 sm:grid-cols-2">{aiUsage.map(item=><div key={item.feature} className="rounded-xl border border-white/[0.08] p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium capitalize text-white">{item.feature==="tutor"?"AI Tutor":item.feature==="quiz"?"Quiz generation":item.feature==="flashcards"?"Flashcard generation":item.feature==="homework"?"Homework analysis":item.feature==="syllabus"?"Syllabus importer":"Study recommendations"}</p><p className="text-xs tabular-nums text-white/45">{item.used}/{item.limit}</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-500" style={{width:Math.min(100,item.used/Math.max(1,item.limit)*100)+"%"}}/></div><p className="mt-2 text-[11px] text-white/40">{item.remaining} requests remaining in the last 24 hours</p></div>)}</div>
        </Section>

        <Section icon={Download} title="Your data" description="Download a copy of the academic records associated with your account.">
          <div className="flex flex-wrap items-center justify-between gap-4"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">Export StudySpace data</p><p className="mt-1 text-xs leading-5 text-white/40">Downloads a JSON file with your accessible courses, assignments, quizzes, grades, study records, notes, and other available workspace data. This is an export, not a backup restore.</p></div><button type="button" onClick={()=>void exportData()} disabled={exporting} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.05] disabled:opacity-50"><Download size={15}/>{exporting?"Preparing…":"Export data"}</button></div>
          {exportMessage&&<p role="status" className="text-xs text-white/55">{exportMessage}</p>}
        </Section>

        <Section icon={Shield} title="Account security" description="Actions that affect your entire StudySpace account.">
          <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm font-medium text-white">Sign out on this device</p><p className="mt-1 text-xs text-white/40">End your current session.</p></div><button type="button" onClick={async()=>{const {error}=await supabase.auth.signOut({scope:"local"});if(error)setSecurityMessage(error.message);else router.replace("/login");}} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.05]"><LogOut size={15}/>Sign out</button></div>
          <div className="border-t border-red-400/10 pt-5"><div className="flex items-start gap-3"><div className="rounded-xl bg-red-500/10 p-2 text-red-300"><Trash2 size={17}/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-white">Delete account</p><p className="mt-1 text-xs leading-5 text-white/40">Permanently remove your StudySpace account, associated database records, and uploaded homework files. This cannot be undone.</p></div></div>
            {!showDeleteConfirm?<button type="button" onClick={()=>setShowDeleteConfirm(true)} className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.07] px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/[0.12]">Delete my account…</button>:<div className="mt-4 space-y-3 rounded-xl border border-red-400/20 bg-red-500/[0.04] p-4"><p className="text-sm text-red-200">Type <strong>DELETE</strong> to confirm permanent account deletion.</p><input maxLength={40} autoComplete="off" spellCheck={false} value={deletePhrase} onChange={e=>setDeletePhrase(e.target.value)} aria-label="Type DELETE to confirm" placeholder="Type DELETE" className="h-11 w-full rounded-xl border border-red-400/20 bg-black/20 px-4 text-sm text-white outline-none"/><div className="flex flex-wrap gap-2"><button type="button" onClick={()=>{setShowDeleteConfirm(false);setDeletePhrase("");}} disabled={deletingAccount} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/70">Cancel</button><button type="button" onClick={deleteAccount} disabled={deletePhrase!=="DELETE"||deletingAccount} className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40">{deletingAccount?"Deleting account…":"Permanently delete account"}</button></div></div>}
          </div>
        </Section>
      </>}
    </div>
  </AppShell>;
}
