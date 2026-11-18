"use client";

import { useEffect, useState } from "react";
import { imgUrl } from "@/components/Artwork";

export function ListingGallery({
  images,
  name,
  variant,
}: {
  images: string[];
  name: string;
  variant: "stay" | "tour";
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowRight") setActiveIndex((index) => (index === null ? null : (index + 1) % images.length));
      if (event.key === "ArrowLeft") setActiveIndex((index) => (index === null ? null : (index - 1 + images.length) % images.length));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, images.length]);

  function photo(index: number, className: string) {
    const actualIndex = Math.min(index, Math.max(0, images.length - 1));
    const src = images[actualIndex] ?? "";
    return (
      <button
        key={index}
        type="button"
        onClick={() => setActiveIndex(actualIndex)}
        aria-label={`Ampliar foto ${actualIndex + 1} de ${name}`}
        className={`group relative block overflow-hidden ${className}`}
      >
        <img src={imgUrl(src)} alt={index === 0 ? name : `${name}, foto ${index + 1}`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
        <span className="absolute bottom-3 right-3 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-tinta shadow">
          Ver foto inteira
        </span>
      </button>
    );
  }

  return (
    <>
      <div className={`mb-8 grid h-[300px] gap-3 overflow-hidden rounded-3xl sm:h-[440px] ${variant === "stay" ? "grid-cols-3" : "grid-cols-2"}`}>
        {variant === "stay" ? (
          <>
            {photo(0, "col-span-2 row-span-2")}
            {photo(1, "")}
            {photo(2, "")}
          </>
        ) : (
          <>
            {photo(0, "")}
            {photo(1, "")}
          </>
        )}
      </div>

      {activeIndex !== null && images.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Fotos de ${name}`}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 sm:p-8"
          onClick={() => setActiveIndex(null)}
        >
          <button type="button" onClick={() => setActiveIndex(null)} aria-label="Fechar fotos" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25">×</button>
          {images.length > 1 && (
            <button type="button" onClick={(event) => { event.stopPropagation(); setActiveIndex((index) => index === null ? null : (index - 1 + images.length) % images.length); }} aria-label="Foto anterior" className="absolute left-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25 sm:left-6">‹</button>
          )}
          <img
            src={imgUrl(images[activeIndex])}
            alt={`${name}, foto ${activeIndex + 1}`}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          {images.length > 1 && (
            <button type="button" onClick={(event) => { event.stopPropagation(); setActiveIndex((index) => index === null ? null : (index + 1) % images.length); }} aria-label="Próxima foto" className="absolute right-3 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-2xl text-white hover:bg-white/25 sm:right-6">›</button>
          )}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">{activeIndex + 1} / {images.length}</p>
        </div>
      )}
    </>
  );
}
