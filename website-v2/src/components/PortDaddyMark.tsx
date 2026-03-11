import * as React from 'react'

interface Props {
  size?: number
  className?: string
  style?: React.CSSProperties
}

/**
 * Port Daddy — full character mark.
 * Captain's peak cap, strong face, hands gripping the crossguard of
 * an ethernet-cable anchor (RJ45 plug where the ring normally lives).
 */
export function PortDaddyMark({ size = 120, className, style }: Props) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.25)}
      viewBox="0 0 120 150"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* ══════════════════════════════
          CAPTAIN'S PEAK CAP
          ══════════════════════════════ */}
      {/* Crown */}
      <path d="M40 24 Q40 5 60 3 Q80 5 80 24" strokeWidth="2.4" />
      {/* Crown seam line */}
      <line x1="40" y1="22" x2="80" y2="22" strokeWidth="1.4" />
      {/* Peak brim */}
      <path d="M31 24 Q60 30 89 24" strokeWidth="2.2" />
      {/* Brim underside peak (left side only) */}
      <path d="M31 24 Q44 27 55 24" strokeWidth="1.2" />
      {/* Badge — tiny anchor emblem on crown front */}
      <circle cx="60" cy="13" r="3.5" strokeWidth="1.4" />
      <line x1="60" y1="9.5" x2="60" y2="16.5" strokeWidth="1.4" />
      <line x1="57" y1="12.5" x2="63" y2="12.5" strokeWidth="1.4" />
      <path d="M57.5 16.5 Q57.5 18.5 60 18.5 Q62.5 18.5 62.5 16.5" strokeWidth="1.1" />

      {/* ══════════════════════════════
          FACE
          ══════════════════════════════ */}
      {/* Jaw / face outline */}
      <path
        d="M40 27 Q33 36 33 45 Q35 56 60 63 Q85 56 87 45 Q87 36 80 27"
        strokeWidth="2.4"
      />
      {/* Left brow — strong, confident arch */}
      <path d="M41 37 Q50 32 58 36" strokeWidth="2.1" />
      {/* Right brow */}
      <path d="M62 36 Q70 32 79 37" strokeWidth="2.1" />
      {/* Left eye lid */}
      <path d="M43 43 Q50 39 57 43" strokeWidth="1.8" />
      <circle cx="50" cy="43.5" r="1.5" fill="currentColor" stroke="none" />
      {/* Right eye lid */}
      <path d="M63 43 Q70 39 77 43" strokeWidth="1.8" />
      <circle cx="70" cy="43.5" r="1.5" fill="currentColor" stroke="none" />
      {/* Nose — straight, defined */}
      <path d="M60 47 L58 53 Q60 55 62 53 L60 47" strokeWidth="1.5" />
      {/* Mouth — closed, slight upward set */}
      <path d="M50 58 Q60 63 70 58" strokeWidth="1.9" />

      {/* ══════════════════════════════
          NECK
          ══════════════════════════════ */}
      <line x1="54" y1="63" x2="53" y2="71" strokeWidth="2.2" />
      <line x1="66" y1="63" x2="67" y2="71" strokeWidth="2.2" />

      {/* ══════════════════════════════
          PEACOAT — collar, lapels, shoulders
          ══════════════════════════════ */}
      {/* Left shoulder sweep */}
      <path d="M53 71 Q33 73 24 85 Q22 91 24 100" strokeWidth="2" />
      {/* Right shoulder sweep */}
      <path d="M67 71 Q87 73 96 85 Q98 91 96 100" strokeWidth="2" />
      {/* Left lapel */}
      <path d="M53 71 L46 83 L60 92" strokeWidth="1.9" />
      {/* Right lapel */}
      <path d="M67 71 L74 83 L60 92" strokeWidth="1.9" />
      {/* Button at chest */}
      <circle cx="60" cy="96" r="2.2" fill="currentColor" stroke="none" />

      {/* Left hand grips crossguard */}
      <path d="M24 100 Q22 104 26 105 L30 105" strokeWidth="1.8" />
      {/* Right hand */}
      <path d="M96 100 Q98 104 94 105 L90 105" strokeWidth="1.8" />

      {/* ══════════════════════════════
          ETHERNET ANCHOR
          (drawn last so it sits in front)
          ══════════════════════════════ */}

      {/* RJ45 PLUG — replaces the traditional anchor ring */}
      <rect x="44" y="68" width="32" height="19" rx="2.5" strokeWidth="2.2" />
      {/* Locking tab below plug body */}
      <path d="M47 87 Q47 92 49 92 L71 92 Q73 92 73 87" strokeWidth="1.6" />
      {/* 8 conductor pins inside plug */}
      <line x1="47.5" y1="70.5" x2="47.5" y2="82" strokeWidth="1" />
      <line x1="49.9" y1="70.5" x2="49.9" y2="82" strokeWidth="1" />
      <line x1="52.3" y1="70.5" x2="52.3" y2="82" strokeWidth="1" />
      <line x1="54.7" y1="70.5" x2="54.7" y2="82" strokeWidth="1" />
      <line x1="57.1" y1="70.5" x2="57.1" y2="82" strokeWidth="1" />
      <line x1="59.5" y1="70.5" x2="59.5" y2="82" strokeWidth="1" />
      <line x1="61.9" y1="70.5" x2="61.9" y2="82" strokeWidth="1" />
      <line x1="64.3" y1="70.5" x2="64.3" y2="82" strokeWidth="1" />

      {/* SHANK — cable from plug tab to arms */}
      <line x1="60" y1="92" x2="60" y2="120" strokeWidth="2.4" />

      {/* CROSSGUARD — horizontal bar, hands grip here */}
      <line x1="22" y1="105" x2="98" y2="105" strokeWidth="2.4" />
      <circle cx="22" cy="105" r="3.2" fill="currentColor" stroke="none" />
      <circle cx="98" cy="105" r="3.2" fill="currentColor" stroke="none" />

      {/* ARMS — curve from shank bottom to flukes */}
      <path d="M60 120 Q40 124 29 143" strokeWidth="2.2" />
      <path d="M60 120 Q80 124 91 143" strokeWidth="2.2" />

      {/* LEFT FLUKE */}
      <path d="M29 143 Q18 137 20 127 Q24 119 35 127" strokeWidth="2.1" />
      {/* RIGHT FLUKE */}
      <path d="M91 143 Q102 137 100 127 Q96 119 85 127" strokeWidth="2.1" />
    </svg>
  )
}

/**
 * Simplified anchor-only version for small contexts (nav, favicon).
 * Same ethernet-anchor design, no character body.
 */
export function PortDaddyAnchor({ size = 20, className, style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 48"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* RJ45 plug */}
      <rect x="12" y="0" width="16" height="10" rx="1.5" strokeWidth="2" />
      {/* Tab */}
      <path d="M14 10 Q14 13 15 13 L25 13 Q26 13 26 10" strokeWidth="1.3" />
      {/* 4 conductor lines (simplified at small size) */}
      <line x1="14.5" y1="2" x2="14.5" y2="7.5" strokeWidth="0.9" />
      <line x1="17.2" y1="2" x2="17.2" y2="7.5" strokeWidth="0.9" />
      <line x1="19.9" y1="2" x2="19.9" y2="7.5" strokeWidth="0.9" />
      <line x1="22.6" y1="2" x2="22.6" y2="7.5" strokeWidth="0.9" />
      <line x1="25.3" y1="2" x2="25.3" y2="7.5" strokeWidth="0.9" />

      {/* Shank */}
      <line x1="20" y1="13" x2="20" y2="30" strokeWidth="2" />

      {/* Crossguard */}
      <line x1="5" y1="20" x2="35" y2="20" strokeWidth="2" />
      <circle cx="5" cy="20" r="2" fill="currentColor" stroke="none" />
      <circle cx="35" cy="20" r="2" fill="currentColor" stroke="none" />

      {/* Arms */}
      <path d="M20 30 Q12 32 8 42" strokeWidth="2" />
      <path d="M20 30 Q28 32 32 42" strokeWidth="2" />

      {/* Flukes */}
      <path d="M8 42 Q3 39 4 33 Q7 29 13 33" strokeWidth="1.8" />
      <path d="M32 42 Q37 39 36 33 Q33 29 27 33" strokeWidth="1.8" />
    </svg>
  )
}
