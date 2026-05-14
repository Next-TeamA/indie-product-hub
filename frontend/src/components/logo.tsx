import Link from "next/link";

export function Logo({
  href = "/projects",
  size = "default",
}: {
  href?: string;
  size?: "default" | "large";
}) {
  const fontSize = size === "large" ? "text-[22px]" : "text-[17px]";

  return (
    <Link href={href} className={`logo-text ${fontSize} text-slate-900 inline-flex items-center gap-0 hover:opacity-80 transition-opacity`}>
      Launch<span className="text-blue-500">.</span>Pad
    </Link>
  );
}
