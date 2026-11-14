import Link from "next/link";
import { DEMO_MODE } from "@/lib/config";

export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <div className="bg-oceano-900 text-white">
      <div className="container-x flex flex-col items-start gap-1 py-2 text-xs sm:flex-row sm:items-center sm:justify-center sm:gap-3">
        <span className="font-semibold uppercase tracking-wider text-turquesa-300">Modo demonstração</span>
        <span className="text-oceano-100">
          Explore com dados de exemplo de Arraial do Cabo. Conecte o Supabase para ativar contas e reservas reais —{" "}
          <Link href="/sobre#supabase" className="underline decoration-turquesa-300 underline-offset-2 hover:text-white">
            veja o guia
          </Link>
          .
        </span>
      </div>
    </div>
  );
}
