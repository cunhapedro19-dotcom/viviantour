"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Artwork } from "./Artwork";
import { StarRating } from "./StarRating";
import type { CardData } from "@/lib/card";
import { DEMO_MODE } from "@/lib/config";
import { isFavorite, toggleFavorite } from "@/lib/demo-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function ListingCard({ data }: { data: CardData }) {
  const [fav, setFav] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (DEMO_MODE) {
      setFav(isFavorite(data.kind, data.id));
      return;
    }
    let active = true;
    (async () => {
      const sb = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user || !active) return;
      const col = data.kind === "stay" ? "property_id" : "service_id";
      const { data: rows } = await sb.from("favorites").select("id").eq("profile_id", user.id).eq(col, data.id).maybeSingle();
      if (active) setFav(Boolean(rows));
    })();
    return () => {
      active = false;
    };
  }, [data.kind, data.id]);

  async function onToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFav((v) => !v);
    if (DEMO_MODE) {
      toggleFavorite(data.kind, data.id);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      window.location.href = `/entrar?next=/${data.kind === "stay" ? "hospedagem" : "passeio"}/${data.slug}`;
      return;
    }
    const col = data.kind === "stay" ? "property_id" : "service_id";
    if (fav) {
      await sb.from("favorites").delete().eq("profile_id", user.id).eq(col, data.id);
    } else {
      await sb.from("favorites").insert({ profile_id: user.id, [col]: data.id });
    }
  }

  const href = data.kind === "stay" ? `/hospedagem/${data.slug}` : `/passeio/${data.slug}`;
  const cover = data.images[0] ?? "";
  const hover = data.images[1] ?? cover;

  return (
    <Link
      href={href}
      className="group block overflow-hidden rounded-3xl border border-areia-200 bg-white shadow-card transition duration-300 hover:-translate-y-0.5 hover:shadow-pop"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Artwork
          seed={cover}
          alt={data.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04] group-hover:opacity-0"
        />
        <Artwork
          seed={hover}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-100"
        />
        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-oceano-700 shadow-sm">
          {data.label}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-label={mounted && fav ? "Remover dos favoritos" : "Salvar nos favoritos"}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-sm transition hover:scale-105"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 transition ${mounted && fav ? "fill-coral-500 stroke-coral-500" : "fill-none stroke-tinta-soft"}`}
            strokeWidth="2"
          >
            <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.4 4.5 6.2 4.5c2.2 0 3.7 1.2 4.8 2.7l1 1.4 1-1.4c1.1-1.5 2.6-2.7 4.8-2.7 3.8 0 5.8 4.1 4.2 7.2C19.5 16.3 12 21 12 21z" />
          </svg>
        </button>
      </div>
      <div className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug text-tinta">{data.name}</h3>
          <StarRating rating={data.rating} count={data.reviewsCount} className="shrink-0" />
        </div>
        <p className="text-sm text-tinta-mute">{data.location}</p>
        <p className="pt-1 text-sm font-medium text-oceano-700">Consulte disponibilidade</p>
      </div>
    </Link>
  );
}
