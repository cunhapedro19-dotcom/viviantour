"use client";

import { useCallback, useEffect, useState } from "react";
import { DEMO_MODE } from "@/lib/config";
import {
  addMediaRecord,
  fetchMedia,
  MAX_FILE_MB,
  removeMedia,
  reorderMedia,
  syncCover,
  uploadMediaFile,
} from "@/lib/media-ops";
import type { MediaItem, MediaKind } from "@/lib/media-ops";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Fotos e vídeos de um anúncio. O botão abre a galeria do aparelho
 * (celular ou computador); as fotos são reduzidas antes do envio.
 * A primeira foto da lista é a capa.
 */
export function MediaManager({ kind, id }: { kind: MediaKind; id: string }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const reload = useCallback(async () => {
    const list = await fetchMedia(kind, id);
    setItems(list);
    return list;
  }, [kind, id]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (files.length === 0 || busy) return;

    setBusy(true);
    setErrors([]);
    const { data: { user } } = await getSupabaseBrowserClient().auth.getUser();
    if (!user) {
      setErrors(["Sua sessão expirou. Entre novamente antes de enviar arquivos."]);
      setBusy(false);
      return;
    }
    const folder = `${user.id}/${kind === "stay" ? "imoveis" : "passeios"}/${id}`;
    let nextSort = (items ?? []).reduce((max, m) => Math.max(max, m.sort), -1) + 1;
    const problems: string[] = [];

    for (let i = 0; i < files.length; i++) {
      setProgress(`Enviando ${i + 1} de ${files.length}…`);
      const uploaded = await uploadMediaFile(files[i], folder);
      if (!uploaded.ok) {
        problems.push(`${files[i].name}: ${uploaded.error}`);
        continue;
      }
      const saved = await addMediaRecord(kind, id, uploaded.url, uploaded.type, nextSort);
      if (!saved.ok) {
        problems.push(`${files[i].name}: ${saved.error}`);
        continue;
      }
      nextSort += 1;
      setItems((list) => [...(list ?? []), saved.item]);
    }

    const fresh = await reload();
    await syncCover(kind, id, fresh);
    setErrors(problems);
    setProgress("");
    setBusy(false);
  }

  async function makeCover(item: MediaItem) {
    const ordered = [item, ...(items ?? []).filter((m) => m.id !== item.id)];
    setItems(ordered.map((m, i) => ({ ...m, sort: i })));
    const result = await reorderMedia(kind, ordered);
    if (!result.ok) {
      window.alert(result.error);
    }
    const fresh = await reload();
    await syncCover(kind, id, fresh);
  }

  async function remove(item: MediaItem) {
    if (!window.confirm("Remover este arquivo do anúncio?")) return;
    const result = await removeMedia(kind, item);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    const fresh = await reload();
    await syncCover(kind, id, fresh);
  }

  const firstImageId = (items ?? []).find((m) => m.type === "image")?.id;

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-tinta">Fotos e vídeos</h2>
          <p className="mt-1 text-sm text-tinta-mute">
            Escolha direto da galeria do seu celular ou computador. As fotos são reduzidas automaticamente; vídeos
            podem ter até {MAX_FILE_MB} MB (MP4, MOV ou WebM). A primeira foto é a capa do anúncio.
          </p>
        </div>

        {DEMO_MODE ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
            O envio de arquivos só funciona no modo real (com o Supabase configurado).
          </p>
        ) : (
          <label
            className={`btn-turquesa cursor-pointer focus-within:ring-2 focus-within:ring-turquesa-400 focus-within:ring-offset-2 ${
              busy ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {busy ? progress || "Enviando…" : "Adicionar fotos e vídeos"}
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              className="sr-only"
              onChange={handleFiles}
              disabled={busy}
            />
          </label>
        )}

        {errors.length > 0 && (
          <ul className="space-y-1 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
      </div>

      {items === null ? (
        <div className="card h-48 animate-pulse" />
      ) : items.length === 0 ? (
        <p className="card px-6 py-10 text-center text-sm text-tinta-mute">
          Nenhuma foto ou vídeo enviado ainda.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="card overflow-hidden">
              <div className="relative aspect-square bg-areia-100">
                {item.type === "video" ? (
                  <video
                    src={item.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                )}
                {item.type === "video" && (
                  <span className="absolute left-2 top-2 rounded-full bg-tinta/80 px-2.5 py-1 text-[11px] font-semibold text-white">
                    Vídeo
                  </span>
                )}
                {item.id === firstImageId && (
                  <span className="absolute left-2 top-2 rounded-full bg-turquesa-500 px-2.5 py-1 text-[11px] font-semibold text-white">
                    Capa
                  </span>
                )}
              </div>
              <div className="flex gap-2 p-2">
                {item.type === "image" && item.id !== firstImageId && (
                  <button type="button" onClick={() => makeCover(item)} className="btn-outline btn-sm flex-1">
                    Tornar capa
                  </button>
                )}
                <button type="button" onClick={() => remove(item)} className="btn-danger btn-sm flex-1">
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
