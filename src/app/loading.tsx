import StudySpaceMark from "@/components/StudySpaceMark";

const loadingTiles = [
  { label: "Courses", className: "ss-loader-tile-one" },
  { label: "Your work", className: "ss-loader-tile-two" },
  { label: "Study plan", className: "ss-loader-tile-three" },
];

export default function Loading() {
  return (
    <main
      id="main-content"
      aria-label="Loading StudySpace"
      aria-busy="true"
      className="ss-loading-screen"
    >
      <div className="ss-loading-grid" aria-hidden="true" />
      <div className="ss-loading-glow ss-loading-glow-a" aria-hidden="true" />
      <div className="ss-loading-glow ss-loading-glow-b" aria-hidden="true" />
      <section className="ss-loading-content">
        <div className="ss-loading-mark-wrap">
          <span className="ss-loading-orbit ss-loading-orbit-a" />
          <span className="ss-loading-orbit ss-loading-orbit-b" />
          <StudySpaceMark size={76} />
        </div>
        <p className="ss-loading-kicker">YOUR SPACE IS TAKING SHAPE</p>
        <h1>Getting everything <span>in sync.</span></h1>
        <p className="ss-loading-copy">Lining up your courses, plans and next steps.</p>
        <div className="ss-loading-progress" aria-hidden="true"><span /></div>
        <div className="ss-loading-tiles" aria-hidden="true">
          {loadingTiles.map((tile) => (
            <div key={tile.label} className={`ss-loading-tile ${tile.className}`}>
              <span className="ss-loading-tile-dot" />
              {tile.label}
            </div>
          ))}
        </div>
        <p className="ss-loading-foot"><span /> STUDYSPACE · MAKE ROOM FOR WHAT MATTERS</p>
      </section>
    </main>
  );
}
