import type { SVGProps } from "react";
import Link from "next/link";

export function TeaCupIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M22 10c-2 3 2 5 0 8" opacity="0.7" />
      <path d="M32 8c-2 3 2 5 0 8" opacity="0.7" />
      <path d="M42 10c-2 3 2 5 0 8" opacity="0.7" />
      <path d="M12 24h36l-3 24a6 6 0 0 1-6 5H21a6 6 0 0 1-6-5L12 24z" />
      <path d="M48 30c6 0 8 4 8 8s-2 8-8 8" />
      <path d="M8 56h44" />
    </svg>
  );
}

type LogoProps = {
  variant?: "light" | "dark";
  size?: number;
  withCup?: boolean;
  href?: string;
};

export function Logo({ variant = "dark", size = 32, withCup = true, href }: LogoProps) {
  const color = variant === "light" ? "text-[var(--gold-pale)]" : "text-[var(--maroon-deep)]";
  const inner = (
    <div className={`flex items-center gap-2 ${color}`}>
      {withCup && <TeaCupIcon style={{ width: size, height: size }} />}
      <span
        className="font-bold leading-none"
        style={{ fontFamily: "var(--font-deva, 'Noto Serif Devanagari', serif)", fontSize: size * 0.85 }}
      >
        अभिनंदन
      </span>
    </div>
  );
  if (href) return <Link href={href} className="flex items-center">{inner}</Link>;
  return inner;
}
