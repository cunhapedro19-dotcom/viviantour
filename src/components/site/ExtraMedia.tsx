import { Artwork } from "@/components/Artwork";

/** Fotos além das que cabem na galeria principal e vídeos do anúncio. */
export function ExtraMedia({
  images,
  videos,
  skip,
  name,
}: {
  images: string[];
  videos?: string[];
  skip: number;
  name: string;
}) {
  const extra = images.slice(skip);
  const clips = videos ?? [];
  if (extra.length === 0 && clips.length === 0) return null;

  return (
    <section className="mb-8 space-y-4" aria-label="Mais fotos e vídeos">
      {extra.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {extra.map((src, i) => (
            <div key={`${src}-${i}`} className="aspect-[4/3] overflow-hidden rounded-2xl bg-areia-100">
              <Artwork seed={src} alt={`${name} — foto ${i + skip + 1}`} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
      {clips.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {clips.map((src) => (
            <video
              key={src}
              src={src}
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-2xl bg-tinta object-contain"
            />
          ))}
        </div>
      )}
    </section>
  );
}
