"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MediaManager } from "@/components/panel/MediaManager";

export default function AdminMidiaPage() {
  const params = useParams() as { kind?: string; id?: string };
  const kind = params.kind === "passeio" ? "tour" : "stay";
  const id = params.id ?? "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-tinta">
            Fotos e vídeos {kind === "stay" ? "da hospedagem" : "do passeio"}
          </h1>
          <p className="mt-1 text-sm text-tinta-mute">As alterações aparecem no site assim que o anúncio estiver publicado.</p>
        </div>
        <Link href="/admin/anuncios" className="btn-outline btn-sm">
          Voltar aos anúncios
        </Link>
      </header>
      {id && <MediaManager kind={kind} id={id} />}
    </div>
  );
}
