"use client";

import { useId } from "react";

type StudySpaceMarkProps = {
  size?: number;
  className?: string;
  animated?: boolean;
  label?: string;
};

export default function StudySpaceMark({
  size = 36,
  className = "",
  animated = true,
  label = "StudySpace",
}: StudySpaceMarkProps) {
  const id = useId().replace(/:/g, "");
  return (
    <span
      className={[\"ss-brand-emblem\", animated ? \"ss-brand-emblem-live\" : \"\", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      aria-label={label}
      role="img"
    >
      <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={`ss-mark-bg-${id}`} x1="5" y1="3" x2="43" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#B69AFF" />
            <stop offset=".52" stopColor="#8062F4" />
            <stop offset="1" stopColor="#4B55C9" />
          </linearGradient>
          <linearGradient id={`ss-mark-page-${id}`} x1="12" y1="14" x2="36" y2="37" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fff" />
            <stop offset="1" stopColor="#D8D0FF" />
          </linearGradient>
          <filter id={`ss-mark-glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#ss-mark-bg-${id})`} />
        <path d="M7 12.5C7 10.6 8.6 9 10.5 9H37.5C39.4 9 41 10.6 41 12.5V35.5C41 37.4 39.4 39 37.5 39H10.5C8.6 39 7 37.4 7 35.5V12.5Z" fill="white" fillOpacity=".08" />
        <path d="M12.5 15.5C17.1 14.1 21.1 15.1 24 18.1C26.9 15.1 30.9 14.1 35.5 15.5V33.3C30.9 32 26.9 33 24 36C21.1 33 17.1 32 12.5 33.3V15.5Z" stroke={`url(#ss-mark-page-${id})`} strokeWidth="2.1" strokeLinejoin="round" />
        <path d="M24 18.5V35.5" stroke="white" strokeOpacity=".72" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M17 21.5C19 21.4 20.6 21.8 22 22.8M17 26C19 25.9 20.6 26.3 22 27.3M31 21.5C29 21.4 27.4 21.8 26 22.8M31 26C29 25.9 27.4 26.3 26 27.3" stroke="white" strokeOpacity=".76" strokeWidth="1.35" strokeLinecap="round" />
        <path className="ss-brand-star" d="M35.5 6.2L36.7 9.3L39.8 10.5L36.7 11.7L35.5 14.8L34.3 11.7L31.2 10.5L34.3 9.3L35.5 6.2Z" fill="white" filter={`url(#ss-mark-glow-${id})`} />
        <circle className="ss-brand-orbit-dot" cx="8.5" cy="36.5" r="1.35" fill="#D7C9FF" />
      </svg>
    </span>
  );
}
