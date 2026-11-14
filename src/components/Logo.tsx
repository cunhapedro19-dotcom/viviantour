import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Viviantourr — página inicial">
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
        <defs>
          <linearGradient id="logo-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#14678E" />
            <stop offset="1" stopColor="#1CA093" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="14" fill="url(#logo-g)" />
        <circle cx="44" cy="18" r="7" fill="#F6F1E7" />
        <path d="M6 38c6-5 12-5 18 0s12 5 18 0 12-5 18 0v14a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6z" fill="#EFF7FA" opacity="0.9" />
        <path d="M6 46c6-5 12-5 18 0s12 5 18 0 12-5 18 0v4c0 2-1 3-3 3H9c-2 0-3-1-3-3z" fill="#FFFFFF" opacity="0.7" />
      </svg>
      <span
        className={`font-display text-xl font-semibold tracking-tight ${
          light ? "text-white" : "text-tinta"
        }`}
      >
        Vivian<span className="text-turquesa-500">tourr</span>
      </span>
    </Link>
  );
}
