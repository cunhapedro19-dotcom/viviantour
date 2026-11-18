"use client";

import { useState } from "react";
import { MAX_FILE_MB, removeUploadedFiles, uploadMediaFile } from "@/lib/media-ops";
import type { MediaItem } from "@/lib/media-ops";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_IMAGES = 20;
const MAX_VIDEOS = 3;

export function CreationMediaPicker({ onChange }: { onChange: (items: MediaItem[]) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const session = useState(() => (typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now())))[0];
  function update(next: MediaItem[]) { const ordered = next.map((item, sort) => ({ ...item, sort })); setItems(ordered); onChange(ordered); }
  async function add(files: FileList | File[]) {
    const selected = Array.from(files);
    let images = items.filter((item) => item.type === "image").length;
    let videos = items.filter((item) => item.type === "video").length;
    const accepted = selected.filter((file) => { if (file.type.startsWith("video/")) return ++videos <= MAX_VIDEOS; return ++images <= MAX_IMAGES; });
    if (accepted.length !== selected.length) setError(`Limite: ${MAX_IMAGES} fotos e ${MAX_VIDEOS} vídeos por anúncio.`); else setError("");
    const { data: { user } } = await getSupabaseBrowserClient().auth.getUser();
    if (!user) { setError("Sua sessão expirou. Entre novamente antes de enviar arquivos."); return; }
    const added: MediaItem[] = [];
    for (let i = 0; i < accepted.length; i++) { setStatus(`Enviando ${i + 1} de ${accepted.length}…`); const result = await uploadMediaFile(accepted[i], `${user.id}/rascunhos/${session}`); if (result.ok) added.push({ id: result.url, url: result.url, type: result.type, sort: items.length + added.length }); else setError(result.error); }
    update([...items, ...added]); setStatus("");
  }
  async function remove(index: number) { const item = items[index]; await removeUploadedFiles([item.url]); update(items.filter((_, i) => i !== index)); }
  function move(index: number, direction: -1 | 1) { const target = index + direction; if (target < 0 || target >= items.length) return; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; update(next); }
  return <section className="card space-y-4 p-6"><div><h2 className="font-display text-lg font-semibold text-tinta">Fotos e vídeos</h2><p className="mt-1 text-sm text-tinta-mute">Envie agora até {MAX_IMAGES} fotos e {MAX_VIDEOS} vídeos. Arraste ou use as setas para organizar: o primeiro item é a capa, inclusive vídeo.</p></div><label onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); void add(e.dataTransfer.files); }} className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-turquesa-300 bg-turquesa-50 px-5 py-8 text-center text-sm font-semibold text-turquesa-700"><span>{status || `Arraste arquivos aqui ou toque para selecionar (até ${MAX_FILE_MB} MB por arquivo)`}</span><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm" multiple onChange={(e) => { void add(e.target.files ?? []); e.currentTarget.value = ""; }} /></label>{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}{items.length > 0 && <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((item, index) => <li key={item.id} draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const from = Number(e.dataTransfer.getData("text/plain")); const next = [...items]; const [moved] = next.splice(from, 1); next.splice(index, 0, moved); update(next); }} className="card overflow-hidden"><div className="relative aspect-square bg-areia-100">{item.type === "video" ? <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" /> : <img src={item.url} alt="" className="h-full w-full object-cover" />}{index === 0 && <span className="absolute left-2 top-2 rounded-full bg-turquesa-500 px-2 py-1 text-xs font-semibold text-white">Capa</span>}</div><div className="flex gap-1 p-2"><button type="button" className="btn-outline btn-sm" onClick={() => move(index, -1)} disabled={index === 0}>←</button><button type="button" className="btn-outline btn-sm" onClick={() => move(index, 1)} disabled={index === items.length - 1}>→</button><button type="button" className="btn-danger btn-sm ml-auto" onClick={() => void remove(index)}>Remover</button></div></li>)}</ul>}</section>;
}
