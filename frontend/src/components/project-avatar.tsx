"use client";

/**
 * Deterministic gradient avatar based on project name.
 * Creates ElevenLabs-style mesh gradient using multiple overlapping radial gradients.
 * Same name = same colors always.
 */

function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function hslFromHash(hash: number, offset: number): string {
  // Shift hue by offset to get varied but harmonious colors
  const hue = ((hash >> offset) % 360 + 360) % 360;
  const sat = 55 + ((hash >> (offset + 4)) % 25); // 55-80%
  const lit = 45 + ((hash >> (offset + 8)) % 20); // 45-65%
  return `hsl(${hue}, ${sat}%, ${lit}%)`;
}

export function ProjectAvatar({
  name,
  size = 40,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  const hash = hashStr(name || "P");
  const c1 = hslFromHash(hash, 0);
  const c2 = hslFromHash(hash, 7);
  const c3 = hslFromHash(hash, 14);

  // Offset positions for organic mesh feel
  const cx1 = 25 + (hash % 20);       // 25-45%
  const cy1 = 20 + ((hash >> 3) % 25); // 20-45%
  const cx2 = 60 + ((hash >> 6) % 25); // 60-85%
  const cy2 = 55 + ((hash >> 9) % 30); // 55-85%

  const radius = size < 32 ? 8 : size < 48 ? 10 : 14;
  const fontSize = size < 32 ? 12 : size < 48 ? 14 : 18;
  const initial = (name || "P")[0].toUpperCase();

  return (
    <div
      className={`shrink-0 flex items-center justify-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `
          radial-gradient(ellipse 80% 80% at ${cx1}% ${cy1}%, ${c1} 0%, transparent 65%),
          radial-gradient(ellipse 70% 70% at ${cx2}% ${cy2}%, ${c2} 0%, transparent 60%),
          radial-gradient(ellipse 90% 90% at 50% 100%, ${c3} 0%, transparent 70%),
          ${c3}
        `,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 700,
          color: "rgba(255,255,255,0.9)",
          textShadow: "0 1px 2px rgba(0,0,0,0.2)",
          fontFamily: "var(--font-logo), system-ui, sans-serif",
          letterSpacing: "0.02em",
        }}
      >
        {initial}
      </span>
    </div>
  );
}
