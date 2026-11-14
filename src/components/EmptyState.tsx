import Link from "next/link";

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-8 py-14 text-center">
      <svg viewBox="0 0 64 64" className="h-14 w-14" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#EFF7FA" />
        <path d="M12 38c5-4 10-4 15 0s10 4 15 0 8-3 10-1" stroke="#479FC5" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M12 46c5-4 10-4 15 0s10 4 15 0" stroke="#78D4C8" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="42" cy="22" r="6" fill="#F4703E" opacity="0.85" />
      </svg>
      <h3 className="font-display text-xl font-semibold text-tinta">{title}</h3>
      <p className="max-w-md text-sm text-tinta-mute">{description}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-primary btn-sm mt-2">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
