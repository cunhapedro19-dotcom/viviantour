"use client";

import { useEffect, useState } from "react";
import { DEMO_MODE } from "@/lib/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Submission = {
  id: string; owner_id: string; contact_name: string; contact_phone: string; contact_email: string;
  property_name: string; property_type: string; neighborhood: string; address: string | null;
  capacity: number; bedrooms: number; bathrooms: number; description: string; amenities: string[];
  photo_urls: string[]; status: "pending" | "contacted" | "approved" | "rejected"; admin_note: string | null; created_at: string;
};
const LABELS: Record<Submission["status"], string> = { pending: "Aguardando an�lise", contacted: "Contato realizado", approved: "Aprovada", rejected: "Recusada" };

export default function PropertySubmissionsPage() {
  const [rows, setRows] = useState<Submission[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (DEMO_MODE) { setRows([]); return; }
    getSupabaseBrowserClient().from("property_interest_submissions").select("*").order("created_at", { ascending: false })
      .then(({ data, error: err }) => { if (err) setError("N�o foi poss�vel carregar as solicita��es. Confira se a migra��o de curadoria foi aplicada."); setRows((data ?? []) as Submission[]); });
  }, []);
  async function setStatus(id: string, status: Submission["status"]) {
    const { error: err } = await getSupabaseBrowserClient().from("property_interest_submissions").update({ status }).eq("id", id);
    if (err) { setError("N�o foi poss�vel atualizar o andamento."); return; }
    setRows((current) => (current ?? []).map((r) => r.id === id ? { ...r, status } : r));
  }
  return <div className="space-y-6"><header><h1 className="font-display text-2xl font-semibold text-tinta">Im�veis para curadoria</h1><p className="mt-1 text-sm text-tinta-mute">Propriet�rios enviam os dados e as fotos antes da aprova��o. Revise cada solicita��o e atualize o andamento.</p></header>
    {DEMO_MODE && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">A caixa de entrada real aparecer� quando o Supabase estiver conectado e a migra��o de curadoria for aplicada.</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {rows === null ? <div className="card h-24 animate-pulse"/> : rows.length === 0 ? <div className="card p-8 text-center text-sm text-tinta-mute">Nenhuma propriedade enviada para an�lise ainda.</div> : <div className="space-y-5">{rows.map((r)=><article key={r.id} className="card overflow-hidden p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-areia-100 px-3 py-1 text-xs font-semibold text-tinta-soft">{LABELS[r.status]}</span><h2 className="mt-3 font-display text-xl font-semibold text-tinta">{r.property_name}</h2><p className="mt-1 text-sm text-tinta-mute">{r.property_type} � {r.neighborhood} � enviada em {new Date(r.created_at).toLocaleDateString("pt-BR")}</p></div><select aria-label="Andamento da curadoria" className="input w-auto" value={r.status} onChange={(e)=>setStatus(r.id,e.target.value as Submission["status"])}>{Object.entries(LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-1 text-sm text-tinta-soft"><p><b>Propriet�rio:</b> {r.contact_name}</p><p><b>WhatsApp:</b> <a className="text-oceano-700 underline" href={`https://wa.me/${r.contact_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{r.contact_phone}</a></p><p><b>E-mail:</b> {r.contact_email}</p><p><b>Capacidade:</b> {r.capacity} h�spedes � {r.bedrooms} quartos � {r.bathrooms} banheiros</p>{r.address && <p><b>Refer�ncia:</b> {r.address}</p>}{r.amenities.length>0 && <p><b>Comodidades:</b> {r.amenities.join(", ")}</p>}</div><p className="whitespace-pre-wrap text-sm leading-relaxed text-tinta-soft">{r.description}</p></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{r.photo_urls.map((url,i)=><a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt={`Foto ${i+1} de ${r.property_name}`} className="aspect-[4/3] w-full rounded-xl object-cover"/></a>)}</div>
    </article>)}</div>}
  </div>;
}

