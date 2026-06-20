import Link from "next/link";
import { ChevronLeft } from "lucide-react";

type Props = {
  href?: string;
  label?: string;
  className?: string;
};

export function BackButton({
  href = "/register",
  label = "Choose a path",
  className = "",
}: Props) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--neon-cyan)] transition-colors ${className}`}
    >
      <ChevronLeft className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}
