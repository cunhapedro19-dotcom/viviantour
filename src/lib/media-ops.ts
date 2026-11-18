"use client";

// Fotos e vídeos de anúncios: envio para o Supabase Storage (bucket "media")
// e vínculo com property_photos (hospedagens) / service_media (passeios).
// Só funciona no modo real.

import { DEMO_MODE } from "./config";
import { getSupabaseBrowserClient } from "./supabase/client";

export type MediaKind = "stay" | "tour";

export interface MediaItem {
  id: string;
  url: string;
  type: "image" | "video";
  sort: number;
}

export type MediaResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

const BUCKET = "media";
export const MAX_FILE_MB = 50;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
const MAX_IMAGE_SIDE = 2000;
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

function tableOf(kind: MediaKind) {
  return kind === "stay"
    ? { table: "property_photos", fk: "property_id", parent: "properties" }
    : { table: "service_media", fk: "service_id", parent: "services" };
}

// ---------------------------------------------------------------------------
// Preparação dos arquivos no navegador
// ---------------------------------------------------------------------------
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

/** Reduz fotos de celular (muitas vezes 8–12 MB) para JPEG de até 2000 px: sobe rápido e carrega leve no site. */
async function prepareImage(file: File): Promise<Blob> {
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = "#ffffff"; // PNG com transparência vira fundo branco no JPEG
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!blob) throw new Error("encode");
  return blob;
}

function randomName(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return rand;
}

/** Envia um arquivo da galeria para o Storage e devolve a URL pública. */
export async function uploadMediaFile(
  file: File,
  folder: string
): Promise<MediaResult<{ url: string; type: "image" | "video" }>> {
  if (DEMO_MODE) return { ok: false, error: "O envio de arquivos só funciona no modo real (Supabase configurado)." };

  let body: Blob = file;
  let contentType = file.type;
  let ext = "";
  let type: "image" | "video";

  if (file.type.startsWith("video/")) {
    if (!VIDEO_TYPES.includes(file.type)) {
      return { ok: false, error: "Formato de vídeo não aceito. Use MP4, MOV ou WebM." };
    }
    if (file.size > MAX_FILE_BYTES) {
      return { ok: false, error: `O vídeo passa de ${MAX_FILE_MB} MB. Grave em qualidade menor ou corte o vídeo.` };
    }
    type = "video";
    ext = file.type === "video/quicktime" ? "mov" : file.type === "video/webm" ? "webm" : "mp4";
  } else if (file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name)) {
    try {
      body = await prepareImage(file);
    } catch {
      return { ok: false, error: "Não foi possível ler esta imagem. Tente outra foto (JPG, PNG ou WebP)." };
    }
    if (body.size > MAX_FILE_BYTES) {
      return { ok: false, error: `A imagem passa de ${MAX_FILE_MB} MB.` };
    }
    type = "image";
    contentType = "image/jpeg";
    ext = "jpg";
  } else {
    return { ok: false, error: "Tipo de arquivo não aceito. Envie fotos ou vídeos." };
  }

  const sb = getSupabaseBrowserClient();
  const path = `${folder}/${randomName()}.${ext}`;
  const { error } = await sb.storage.from(BUCKET).upload(path, body, {
    contentType,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    return { ok: false, error: "Falha no envio. Verifique sua conexão e tente de novo." };
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(path);
  return { ok: true, url: data.publicUrl, type };
}

export async function removeUploadedFiles(urls: string[]): Promise<void> {
  if (DEMO_MODE) return;
  const paths = urls.map(storagePathOf).filter((path): path is string => Boolean(path));
  if (paths.length) await getSupabaseBrowserClient().storage.from(BUCKET).remove(paths);
}

// ---------------------------------------------------------------------------
// Banco de dados
// ---------------------------------------------------------------------------
export async function fetchMedia(kind: MediaKind, id: string): Promise<MediaItem[]> {
  if (DEMO_MODE) return [];
  const { table, fk } = tableOf(kind);
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from(table)
    .select("id, url, type, sort")
    .eq(fk, id)
    .order("sort", { ascending: true });
  return ((data ?? []) as Record<string, unknown>[]).map((m) => ({
    id: String(m.id),
    url: String(m.url),
    type: (m.type === "video" ? "video" : "image") as MediaItem["type"],
    sort: Number(m.sort ?? 0),
  }));
}

export async function addMediaRecord(
  kind: MediaKind,
  id: string,
  url: string,
  type: "image" | "video",
  sort: number
): Promise<MediaResult<{ item: MediaItem }>> {
  const { table, fk } = tableOf(kind);
  const sb = getSupabaseBrowserClient();
  const { data, error } = await sb
    .from(table)
    .insert({ [fk]: id, url, type, sort })
    .select("id")
    .single();
  if (error || !data) {
    return { ok: false, error: "O arquivo foi enviado, mas não foi possível vinculá-lo ao anúncio." };
  }
  return { ok: true, item: { id: String(data.id), url, type, sort } };
}

/** Caminho do arquivo dentro do bucket, se a URL for do nosso Storage. */
function storagePathOf(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const at = url.indexOf(marker);
  return at === -1 ? null : decodeURIComponent(url.slice(at + marker.length));
}

export async function removeMedia(kind: MediaKind, item: MediaItem): Promise<MediaResult> {
  const { table } = tableOf(kind);
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from(table).delete().eq("id", item.id);
  if (error) return { ok: false, error: "Não foi possível remover o arquivo." };
  const path = storagePathOf(item.url);
  if (path) await sb.storage.from(BUCKET).remove([path]); // se falhar, sobra só um arquivo órfão
  return { ok: true };
}

/** Grava a nova ordem (índice da lista = sort). */
export async function reorderMedia(kind: MediaKind, ordered: MediaItem[]): Promise<MediaResult> {
  const { table } = tableOf(kind);
  const sb = getSupabaseBrowserClient();
  const results = await Promise.all(ordered.map((m, i) => sb.from(table).update({ sort: i }).eq("id", m.id)));
  return results.some((r) => r.error) ? { ok: false, error: "Não foi possível reordenar." } : { ok: true };
}

/** Mantém a capa do anúncio (cover_url) igual à primeira foto. */
export async function syncCover(kind: MediaKind, id: string, items: MediaItem[]): Promise<void> {
  const { parent } = tableOf(kind);
  const sb = getSupabaseBrowserClient();
  const first = items[0];
  await sb.from(parent).update({ cover_url: first?.url ?? null }).eq("id", id);
}
