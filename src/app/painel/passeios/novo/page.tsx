"use client";

import { useRouter } from "next/navigation";
import { ServiceForm } from "@/components/panel/ServiceForm";
import { createTour } from "@/lib/panel-ops";
import { usePanelUser } from "@/lib/use-panel-user";

export default function NovoPasseioPage() {
  const { user } = usePanelUser();
  const router = useRouter();

  async function handleSubmit(input: Parameters<typeof createTour>[1]) {
    if (!user) return false;
    const result = await createTour(user, input);
    if (!result.ok) {
      window.alert(result.error);
      return false;
    }
    router.push(`/painel/passeios/${result.id}`);
    return true;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Novo passeio</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          O anúncio é criado como rascunho. Depois de aprovado, você cria as saídas na aba
          “Saídas”.
        </p>
      </header>
      <ServiceForm submitLabel="Criar passeio" onSubmit={handleSubmit} />
    </div>
  );
}
