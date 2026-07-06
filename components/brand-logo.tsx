import Link from "next/link";
import Image from "next/image";

const logoSrc = "/brand/408-review-logo-a.png";

type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

type BrandLogoProps = BrandMarkProps & {
  href?: string;
  compact?: boolean;
  tone?: "default" | "inverse";
};

const markSizeClass = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-11 w-11 rounded-xl",
  lg: "h-14 w-14 rounded-2xl",
};

export function BrandMark({ size = "md", className = "" }: BrandMarkProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-white ring-1 ring-emerald-100 ${markSizeClass[size]} ${className}`}
      aria-hidden="true"
    >
      <Image
        src={logoSrc}
        alt=""
        width={96}
        height={96}
        className="h-full w-full object-cover"
        draggable={false}
      />
    </span>
  );
}

export function BrandLogo({ href, compact = false, size = "md", tone = "default", className = "" }: BrandLogoProps) {
  const titleClass = tone === "inverse" ? "text-white" : "text-slate-950";
  const subtitleClass = tone === "inverse" ? "text-emerald-200" : "text-emerald-600";
  const content = (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <BrandMark size={size} />
      {!compact ? (
        <span className="min-w-0">
          <span className={`block truncate text-xl font-black tracking-normal md:text-2xl ${titleClass}`}>
            408 错题复盘系统
          </span>
          <span className={`mt-0.5 block truncate text-xs font-black tracking-normal md:text-sm ${subtitleClass}`}>
            11408-review
          </span>
        </span>
      ) : null}
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="inline-flex min-w-0 items-center">
      {content}
    </Link>
  );
}
