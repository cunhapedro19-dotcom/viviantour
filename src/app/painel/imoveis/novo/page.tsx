"use client";

import { useRouter } from "next/navigation";
import { PropertyForm } from "@/components/panel/PropertyForm";
import { createStay } from "@/lib/panel-ops";
import { usePanelUser } from "@/lib/use-panel-user";

export default function NovoImovelPage() {
  const { user } = usePanelUser();
  const router = useRouter();

  async function handleSubmit(input: Parameters<typeof createStay>[1]) {
    if (!user) return false;
    const result = await createStay(user, input);
    if (!result.ok) {
      window.alert(result.error);
      return false;
    }
    router.push(`/painel/imoveis/${result.id}`);
    return true;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Novo imóvel</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          O anúncio é criado como rascunho. Envie para aprovação quando estiver completo.
        </p>
      </header>
      <PropertyForm submitLabel="Criar anúncio" onSubmit={handleSubmit} />
    </div>
  );
}
