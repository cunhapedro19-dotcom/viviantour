import { CadasturCertificateDialog } from "@/components/site/CadasturCertificateDialog";
import { CADASTUR } from "@/lib/cadastur";

type CadasturTrustProps = {
  variant: "home" | "footer";
};

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path d="M12 2.4 20 5v6.2c0 5-3.2 9.2-8 10.8-4.8-1.6-8-5.8-8-10.8V5l8-2.6Zm0 2.1L6 6.4v4.8c0 3.9 2.3 7.3 6 8.7 3.7-1.4 6-4.8 6-8.7V6.4l-6-1.9Zm-1.1 10.2-2.7-2.6 1.3-1.3 1.4 1.4 3.8-3.8 1.3 1.3-5.1 5Z" />
    </svg>
  );
}

export function CadasturTrust({ variant }: CadasturTrustProps) {
  if (variant === "footer") {
    return (
      <div className="mt-3 border-t border-areia-200 pt-3 text-xs leading-relaxed text-tinta-mute">
        <div className="flex items-start gap-2">
          <ShieldIcon className="mt-0.5 h-4 w-4 shrink-0 fill-turquesa-600" />
          <div>
            <p className="font-semibold text-tinta-soft">Cadastur nº {CADASTUR.registrationNumber}</p>
            <p>{CADASTUR.legalName}</p>
            <p>Agência de Turismo cadastrada no Ministério do Turismo.</p>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 font-semibold text-oceano-700">
              <CadasturCertificateDialog className="underline-offset-4 hover:underline">
                Consultar certificado
              </CadasturCertificateDialog>
              <a
                href={CADASTUR.verificationUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-4 hover:underline"
              >
                Verificar autenticidade ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-areia-200/90 bg-white/70 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-turquesa-50">
          <ShieldIcon className="h-5 w-5 fill-turquesa-600" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-tinta">Viaje com segurança e confiança</p>
          <p className="text-xs leading-relaxed text-tinta-mute sm:text-sm">
            Agência de Turismo cadastrada no Ministério do Turismo · Cadastur nº {CADASTUR.registrationNumber}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3 pl-12 text-xs font-semibold text-oceano-700 sm:pl-0">
        <CadasturCertificateDialog className="underline-offset-4 hover:underline">
          Consultar certificado
        </CadasturCertificateDialog>
        <a
          href={CADASTUR.verificationUrl}
          target="_blank"
          rel="noreferrer"
          className="hidden underline-offset-4 hover:underline md:inline"
        >
          Verificar ↗
        </a>
      </div>
    </div>
  );
}
