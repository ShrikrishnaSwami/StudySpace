import Link from "next/link";

const sections = [
  ["1. Who operates StudySpace", "StudySpace is a beta student workspace. The project operator's formal legal name, service address, jurisdiction and privacy contact must be confirmed and published before broad public release. This draft should not be treated as a final statutory privacy notice until those details and the data flows below have been verified."],
  ["2. Information we process", "Depending on the features you use, StudySpace processes account information such as email address and profile name; courses and academic organization data; notes, assignments, quiz and flashcard content, calendars and study records; files and coursework you upload; AI prompts, selected course context and generated responses; and operational information such as request timestamps, feature usage, response durations, error outcomes, browser/device information and security events."],
  ["3. Why we use it", "We use information to create and authenticate accounts, provide the student workspace, save and return your work, generate requested AI assistance, enforce quotas and abuse controls, maintain security, troubleshoot failures, monitor service health and improve reliability."],
  ["4. AI processing", "When you use an AI feature, the relevant prompt, uploaded document and/or selected student context may be sent to the AI provider configured for that feature. StudySpace currently supports Google Gemini, Groq and OpenRouter integrations; the provider and model can differ by specialist and are selected by the server configuration. PDF and other multimodal file processing currently uses the Gemini path. Do not submit highly sensitive information or material you do not have permission to share. The operator must keep this notice synchronized with the exact active provider/model configuration, provider data-use settings, processing locations and retention terms."],
  ["5. Hosting and service providers", "StudySpace uses Supabase for authentication and application data, Vercel for application hosting and deployment, Google Gemini, Groq and/or OpenRouter for AI requests depending on feature configuration, and Cloudflare Turnstile for bot protection. Not every provider is necessarily used for every request; provider routing and privacy opt-ins control which integration may receive a given request. Providers process information as needed to deliver their services under their own terms. The operator must verify current subprocessors, service regions and any additional analytics or monitoring services before publication."],
  ["6. Browser storage and guest access", "StudySpace uses browser storage for authentication/session state. When you use guest access and later sign in to a registered account, the browser may retain a guest-session recovery token so that you can resume the previous guest workspace on the same device. Guest coursework remains associated with the anonymous Supabase identity; the recovery token is not an offline copy of your coursework. Anyone with access to your unlocked browser may be able to use an active session, so protect your device and sign out on shared computers."],
  ["7. Sharing", "We do not make student coursework public by default. Information is shared with service providers when needed to operate the service or fulfill an AI request, when you direct us to share it, or when disclosure is required to comply with law or protect rights and safety. The operator must verify any additional integrations, analytics, support tools and sharing arrangements before publication."],
  ["8. Retention and deletion", "Account and student data are retained while needed to provide the service and until account deletion or another applicable removal request, subject to security logs, legal requirements and backup retention. Exact deletion timelines, backup expiry, AI telemetry retention and provider-side retention periods must be confirmed and stated by the operator before broad public release. Do not assume deleting an account immediately removes every backup copy."],
  ["9. Your choices and requests", "Use the account controls available in StudySpace to manage your account. Requests to access, correct, export or delete personal information need a verified privacy contact and identity-check process; those details must be supplied by the operator before this notice is finalized."],
  ["10. Security and changes", "StudySpace uses access controls and technical safeguards designed to protect information, but no system can promise perfect security. This notice may change as the product and its providers change. The current version and effective date will be shown here."],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#09070f] px-5 py-16 text-zinc-100 sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link href="/signup" className="text-sm text-purple-300 hover:text-purple-200">← Back to account creation</Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">StudySpace · Beta</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-zinc-500">Effective date: October 31, 2026 · Beta draft</p>
        <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100/90">
          This notice describes the current product at a high level. The operator&apos;s formal identity and contact details, exact provider list, data regions and retention periods still require verification and legal review before broad public release.
        </div>
        <div className="mt-10 space-y-8">
          {sections.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="text-lg font-semibold">{heading}</h2>
              <p className="mt-3 leading-7 text-zinc-400">{body}</p>
            </section>
          ))}
        </div>
        <div className="mt-12 border-t border-white/10 pt-6 text-sm text-zinc-500">
          Also read the <Link href="/terms" className="text-purple-300 underline underline-offset-4">Terms of Service</Link>.
        </div>
      </article>
    </main>
  );
}
