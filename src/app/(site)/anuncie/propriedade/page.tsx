"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_MODE } from "@/lib/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const AMENITIES = ["Wi-Fi", "Ar-condicionado", "Cozinha equipada", "Piscina", "Churrasqueira", "Estacionamento", "Vista para o mar", "Varanda", "Aceita pets", "Roupa de cama e banho"];

export default function PropertyInterestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [form, setForm] = useState({ property_name: "", property_type: "Casa", neighborhood: "", address: "", capacity: "4", bedrooms: "2", bathrooms: "1", description: "" });
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) { setLoading(false); return; }
    const sb = getSupabaseBrowserClient();
    sb.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.replace("/entrar?next=%2Fanuncie%2Fpropriedade"); return; }
      const { data: profile } = await sb.from("profiles").select("full_name,phone,role").eq("id", user.id).maybeSingle();
      if (profile?.role !== "owner") { router.replace("/cadastro?role=owner&next=%2Fanuncie%2Fpropriedade"); return; }
      setUserId(user.id); setEmail(user.email ?? ""); setName(profile.full_name ?? ""); setPhone(profile.phone ?? ""); setLoading(false);
    });
  }, [router]);

  function update(key: keyof typeof form, value: string) { setForm((current) => ({ ...current, [key]: value })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      if (DEMO_MODE) { setError("O envio do formul�rio exige uma conta real. Configure o Supabase para receber solicita��es."); return; }
      if (photos.length < 3) { setError("Adicione pelo menos 3 fotos para a Vivian conseguir avaliar a propriedade."); return; }
      if (photos.some((file) => file.size > 10 * 1024 * 1024)) { setError("Cada foto pode ter no m�ximo 10 MB."); return; }
      const sb = getSupabaseBrowserClient();
      const photoUrls: string[] = [];
      for (const [index, file] of photos.entries()) {
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/property-submissions/${crypto.randomUUID()}-${index}.${ext}`;
        const { error: uploadError } = await sb.storage.from("media").upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw new Error("N�o foi poss�vel enviar as fotos. Confira os formatos e tente novamente.");
        photoUrls.push(sb.storage.from("media").getPublicUrl(path).data.publicUrl);
      }
      const { error: submitError } = await sb.rpc("submit_property_interest", { p_submission: {
        contact_name: name, contact_phone: phone, contact_email: email,
        ...form, capacity: Number(form.capacity), bedrooms: Number(form.bedrooms), bathrooms: Number(form.bathrooms),
        amenities, photo_urls: photoUrls,
      } });
      if (submitError) throw new Error(submitError.message.includes("OWNER_REQUIRED") ? "Entre com uma conta cadastrada como Propriet�rio para enviar a propriedade." : "N�o foi poss�vel registrar o envio. Tente novamente.");
      setSent(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Falha no envio."); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="container-x py-20 text-center text-sm text-tinta-mute">Carregando formul�rio.</div>;
  if (sent) return <div className="container-x py-20"><div className="card mx-auto max-w-xl p-8 text-center"><div className="text-4xl">V</div><h1 className="mt-4 font-display text-2xl font-semibold text-tinta">Propriedade enviada para an�lise</h1><p className="mt-3 text-sm leading-relaxed text-tinta-mute">A Vivian recebeu as informa��es e as fotos. Ela vai analisar a propriedade e entrar em contato pelo WhatsApp informado. Voc� n�o precisa cadastrar o an�ncio novamente.</p><Link href="/" className="btn-primary mt-6 inline-flex">Voltar ao site</Link></div></div>;
  if (DEMO_MODE) return <div className="container-x py-20"><div className="card mx-auto max-w-xl p-8 text-center"><h1 className="font-display text-2xl font-semibold text-tinta">Formul�rio de propriet�rio</h1><p className="mt-3 text-sm text-tinta-mute">O envio de solicita��es reais requer a conex�o do Supabase. No site publicado, o propriet�rio entra ou cria uma conta e envia a propriedade para curadoria.</p><Link href="/anuncie" className="btn-outline mt-5 inline-flex">Voltar</Link></div></div>;

  return <div className="container-x max-w-4xl py-12">
    <header className="mb-8"><p className="kicker text-turquesa-700">Curadoria Viviantourr</p><h1 className="mt-2 font-display text-3xl font-semibold text-tinta">Apresente sua propriedade</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-tinta-mute">Preencha as informa��es e envie fotos. A Vivian vai analisar a hospedagem e falar com voc� antes de qualquer an�ncio ser publicado.</p></header>
    <form onSubmit={submit} className="space-y-6">
      <section className="card space-y-4 p-6"><h2 className="font-display text-lg font-semibold text-tinta">Seus dados para contato</h2><p className="text-sm text-tinta-mute">{name} � {email} � {phone}</p><p className="text-xs text-tinta-mute">Para corrigir esses dados, atualize seu perfil antes de enviar.</p></section>
      <section className="card space-y-4 p-6"><h2 className="font-display text-lg font-semibold text-tinta">Sobre a hospedagem</h2><div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="label">Nome da propriedade *</label><input required className="input" value={form.property_name} onChange={(e)=>update("property_name",e.target.value)} placeholder="Ex.: Casa Vista para o Mar" /></div>
        <div><label className="label">Tipo de im�vel</label><select className="input" value={form.property_type} onChange={(e)=>update("property_type",e.target.value)}>{["Casa","Apartamento","Pousada","Flat","Loft","Outro"].map(x=><option key={x}>{x}</option>)}</select></div>
        <div><label className="label">Bairro / regi�o *</label><input required className="input" value={form.neighborhood} onChange={(e)=>update("neighborhood",e.target.value)} placeholder="Ex.: Prainha, Figueira, Monte Alto" /></div>
        <div className="sm:col-span-2"><label className="label">Endere�o ou ponto de refer�ncia (opcional)</label><input className="input" value={form.address} onChange={(e)=>update("address",e.target.value)} /></div>
        <div><label className="label">Capacidade de h�spedes *</label><input required type="number" min="1" className="input" value={form.capacity} onChange={(e)=>update("capacity",e.target.value)} /></div><div><label className="label">Quartos</label><input type="number" min="0" className="input" value={form.bedrooms} onChange={(e)=>update("bedrooms",e.target.value)} /></div><div><label className="label">Banheiros</label><input type="number" min="0" step="0.5" className="input" value={form.bathrooms} onChange={(e)=>update("bathrooms",e.target.value)} /></div>
        <div className="sm:col-span-2"><label className="label">Conte um pouco sobre o im�vel *</label><textarea required minLength={10} rows={5} className="input" value={form.description} onChange={(e)=>update("description",e.target.value)} placeholder="Descreva os espa�os, a dist�ncia at� a praia e os diferenciais." /></div>
      </div><div><p className="label">Comodidades</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{AMENITIES.map((item)=><label key={item} className="flex items-center gap-2 rounded-xl border border-areia-200 px-3 py-2 text-sm"><input type="checkbox" checked={amenities.includes(item)} onChange={()=>setAmenities((xs)=>xs.includes(item)?xs.filter((x)=>x!==item):[...xs,item])}/>{item}</label>)}</div></div></section>
      <section className="card space-y-3 p-6"><h2 className="font-display text-lg font-semibold text-tinta">Fotos da propriedade *</h2><p className="text-sm text-tinta-mute">Envie pelo menos 3 fotos. JPG, PNG ou WebP; at� 10 MB cada.</p><input required type="file" multiple accept="image/jpeg,image/png,image/webp" className="input" onChange={(e)=>setPhotos(Array.from(e.target.files ?? []).slice(0,20))}/><p className="text-xs text-tinta-mute">{photos.length ? `${photos.length} foto(s) selecionada(s)` : "At� 20 fotos"}</p></section>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-lg text-xs text-tinta-mute">Ao enviar, voc� autoriza a equipe Viviantourr a analisar estas informa��es para avaliar a parceria. O an�ncio s� ser� publicado ap�s aprova��o.</p><button disabled={busy} className="btn-primary">{busy ? "Enviando." : "Enviar para an�lise da Vivian"}</button></div>
    </form>
  </div>;
}

