import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Viviantourr — página inicial">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/logo.png"
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0"
        aria-hidden="true"
      />
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
