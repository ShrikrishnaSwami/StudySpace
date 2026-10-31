import Link from "next/link";

const sections = [
  ["1. About the beta", "StudySpace is a student workspace for organizing courses, notes, assignments, deadlines, quizzes, study plans and AI-assisted study tools. The service is provided as a beta and may change, be interrupted, or have features removed. Keep independent copies of important coursework and deadlines."],
  ["2. Eligibility and accounts", "You must be legally able to accept these terms. If you are below the age of majority where you live, obtain parent or guardian permission where required by law. You must provide accurate account information, protect your credentials and use only an account that belongs to you. You are responsible for activity under your account. Guest access is temporary, is tied to the browser/device session used to create it, and may be unavailable if its session credentials are lost or expire. Do not use another student's account."],
  ["3. Acceptable use", "You may not access another person's data, probe or disrupt the service, bypass usage limits, automate sign-ups, scrape private content, upload malware, abuse AI services, or use StudySpace in violation of law or another person's rights. We may limit, suspend or terminate access to protect students, the service or third parties."],
  ["4. Your content", "You retain the rights you hold in the material you create or upload. You confirm that you are allowed to submit that material. You grant StudySpace only the limited permission needed to host, store, process, display and return your content, provide requested features, create backups and protect the service. Content may be processed by the service providers needed to operate a feature, including an AI provider when you request AI assistance."],
  ["5. AI tools and automated feedback", "AI explanations, summaries, quiz questions, recommendations, note extraction and assignment feedback can be incorrect, incomplete, biased or out of date. AI assignment feedback is not an official grade and does not replace an instructor's assessment or course requirements. Review generated material before relying on it. Do not use AI output as the sole basis for academic, medical, legal, financial or safety-critical decisions."],
  ["6. Privacy and security", "The Privacy Policy explains the categories of information StudySpace processes, why it is processed, and the service providers involved. No internet service can guarantee absolute security. You should avoid uploading information you do not have permission to share and should keep independent copies of important work."],
  ["7. Availability and data", "StudySpace is supplied on an as-available beta basis. We do not promise uninterrupted access, a particular response time, permanent storage, or a specific backup recovery point. We will use reasonable operational safeguards, but you must not treat StudySpace as your only copy of important information."],
  ["8. Changes and ending access", "We may update these terms as the beta changes. The current version and effective date will be shown here. You may stop using the service. Account deletion and data removal are subject to the available account controls, operational backups and legal obligations."],
  ["9. Contact and legal review", "StudySpace is currently a beta project. The legal operator name, formal service address, privacy/support contact and governing-law details must be confirmed and published by the operator before these terms are treated as final. These beta terms are a product draft, not legal advice."],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#09070f] px-5 py-16 text-zinc-100 sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link href="/signup" className="text-sm text-purple-300 hover:text-purple-200">← Back to account creation</Link>
        <p className="mt-10 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">StudySpace · Beta</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-zinc-500">Effective date: October 31, 2026 · Beta draft</p>
        <div className="mt-8 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 text-sm leading-6 text-amber-100/90">
          This is the current beta terms draft. The operator&apos;s formal legal identity, contact details and governing-law information still need confirmation and legal review before broad public release.
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
          Also read the <Link href="/privacy" className="text-purple-300 underline underline-offset-4">Privacy Policy</Link>.
        </div>
      </article>
    </main>
  );
}
