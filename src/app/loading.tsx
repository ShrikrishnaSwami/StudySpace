export default function Loading() {
  return (
    <main
      aria-label="Loading StudySpace"
      aria-busy="true"
      className="min-h-[70vh] bg-[#07050b] px-5 py-10 text-white"
    >
      <div className="mx-auto w-full max-w-7xl animate-pulse space-y-6">
        <div className="h-8 w-56 rounded-lg bg-white/[0.08]" />
        <div className="h-4 w-80 max-w-full rounded bg-white/[0.05]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-28 rounded-2xl border border-white/[0.06] bg-white/[0.025]" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-72 rounded-2xl border border-white/[0.06] bg-white/[0.025]" />
          <div className="h-72 rounded-2xl border border-white/[0.06] bg-white/[0.025]" />
        </div>
        <p className="text-sm text-white/40">Loading your workspace…</p>
      </div>
    </main>
  );
}
