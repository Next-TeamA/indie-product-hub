import Link from "next/link";

export function Logo({ href = "/projects", size = "default" }: { href?: string; size?: "default" | "large" }) {
  const fontSize = size === "large" ? "text-2xl" : "text-lg";

  return (
    <Link href={href} className={`logo ${fontSize} inline-flex items-center gap-0`}>
      Launch<span className="logo-dot">.</span>Pad
    </Link>
  );
}
