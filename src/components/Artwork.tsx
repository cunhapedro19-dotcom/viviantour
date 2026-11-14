// Renderiza imagens do projeto (/img/*.jpg) ou URLs externas (Supabase Storage).
export function imgUrl(seed: string): string {
  if (seed.startsWith("http") || seed.startsWith("/")) return seed;
  return `/img/${seed}.jpg`;
}

export function Artwork({
  seed,
  alt,
  className,
  eager = false,
}: {
  seed: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <img
      src={imgUrl(seed)}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
    />
  );
}
