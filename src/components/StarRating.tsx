export function StarRating({
  rating,
  count,
  className = "",
}: {
  rating: number;
  count?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${className}`}>
      <svg viewBox="0 0 20 20" className="h-4 w-4 fill-turquesa-500" aria-hidden="true">
        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
      </svg>
      <span className="font-semibold text-tinta">
        {rating > 0 ? rating.toFixed(1).replace(".", ",") : "Novo"}
      </span>
      {typeof count === "number" && count > 0 && (
        <span className="text-tinta-mute">({count})</span>
      )}
    </span>
  );
}
