import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SITE } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-areia-200 bg-white">
      <div className="container-x grid gap-10 py-12 md:grid-cols-4">
        <div className="space-y-3 md:col-span-1">
          <Logo />
          <p className="text-sm leading-relaxed text-tinta-mute">
            {SITE.tagline}. Conectando viajantes e fornecedores locais em um só lugar.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold text-tinta">Explorar</h3>
          <ul className="space-y-2 text-sm text-tinta-soft">
            <li><Link href="/buscar?tipo=stay" className="hover:text-oceano-600">Hospedagens</Link></li>
            <li><Link href="/buscar?tipo=tour" className="hover:text-oceano-600">Passeios de barco</Link></li>
            <li><Link href="/combos" className="hover:text-oceano-600">Combos especiais</Link></li>
            <li><Link href="/buscar?tipo=tour&categoria=mergulho" className="hover:text-oceano-600">Mergulho</Link></li>
            <li><Link href="/buscar?tipo=tour&categoria=bate-e-volta" className="hover:text-oceano-600">Bate e volta</Link></li>
            <li><Link href="/buscar?tipo=tour&categoria=experiencia-nautica" className="hover:text-oceano-600">Experiências náuticas</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold text-tinta">Viviantourr</h3>
          <ul className="space-y-2 text-sm text-tinta-soft">
            <li><Link href="/sobre" className="hover:text-oceano-600">Sobre a plataforma</Link></li>
            <li><Link href="/anuncie" className="hover:text-oceano-600">Seja um parceiro</Link></li>
            <li><Link href="/painel" className="hover:text-oceano-600">Painel do fornecedor</Link></li>
            <li><Link href="/entrar" className="hover:text-oceano-600">Entrar</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-bold text-tinta">Contato</h3>
          <ul className="space-y-2 text-sm text-tinta-soft">
            <li>{SITE.city} · {SITE.state}, Brasil</li>
            <li>{SITE.supportEmail}</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-areia-200">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-tinta-mute sm:flex-row">
          <p>© {new Date().getFullYear()} {SITE.name} · {SITE.city}, {SITE.state}</p>
          <p>Feito com carinho para o turismo local 🌊</p>
        </div>
      </div>
    </footer>
  );
}
