"use client";

import { useEffect, useState } from "react";
import { DEMO_MODE } from "@/lib/config";
import { isFavorite, toggleFavorite } from "@/lib/demo-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function FavoriteButton({ kind, id }: { kind: "stay" | "tour"; id: string }) {
  const [fav, setFav] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (DEMO_MODE) {
      setFav(isFavorite(kind, id));
      return;
    }
    let active = true;
    (async () => {
      const sb = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user || !active) return;
      const col = kind === "stay" ? "property_id" : "service_id";
      const { data: rows } = await sb.from("favorites").select("id").eq("profile_id", user.id).eq(col, id).maybeSingle();
      if (active) setFav(Boolean(rows));
    })();
    return () => {
      active = false;
    };
  }, [kind, id]);

  async function onToggle() {
    setFav((v) => !v);
    if (DEMO_MODE) {
      toggleFavorite(kind, id);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) {
      window.location.href = "/entrar";
      return;
    }
    const col = kind === "stay" ? "property_id" : "service_id";
    if (fav) {
      await sb.from("favorites").delete().eq("profile_id", user.id).eq(col, id);
    } else {
      await sb.from("favorites").insert({ profile_id: user.id, [col]: id });
    }
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-full border border-areia-300 bg-white px-4 py-2 text-sm font-medium text-tinta-soft transition hover:border-coral-400 hover:text-coral-500"
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-4 w-4 transition ${mounted && fav ? "fill-coral-500 stroke-coral-500" : "fill-none stroke-tinta-soft"}`}
        strokeWidth="2"
      >
        <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.4 4.5 6.2 4.5c2.2 0 3.7 1.2 4.8 2.7l1 1.4 1-1.4c1.1-1.5 2.6-2.7 4.8-2.7 3.8 0 5.8 4.1 4.2 7.2C19.5 16.3 12 21 12 21z" />
      </svg>
      {mounted && fav ? "Salvo" : "Salvar"}
    </button>
  );
}
