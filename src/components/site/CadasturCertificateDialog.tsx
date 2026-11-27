"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CADASTUR } from "@/lib/cadastur";

type CadasturCertificateDialogProps = {
  children: ReactNode;
  className?: string;
};

export function CadasturCertificateDialog({
  children,
  className,
}: CadasturCertificateDialogProps) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setZoomed(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        const first = focusable[0];
        const last = focusable.at(-1);

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function closeDialog() {
    setOpen(false);
    setZoomed(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-oceano-950/80 p-3 backdrop-blur-sm sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]"
          >
            <header className="flex items-start justify-between gap-4 border-b border-areia-200 px-4 py-3 sm:px-5">
              <div>
                <h2 id={titleId} className="font-display text-lg font-semibold text-tinta sm:text-xl">
                  Certificado Cadastur
                </h2>
                <p className="text-xs text-tinta-mute sm:text-sm">
                  {CADASTUR.legalName} · válido até {CADASTUR.validThrough}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={closeDialog}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xl text-tinta-soft transition hover:bg-areia-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-turquesa-400"
                aria-label="Fechar certificado"
              >
                ×
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-auto bg-areia-100 p-2 sm:p-4">
              <button
                type="button"
                className={`mx-auto block rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-turquesa-400 ${
                  zoomed ? "w-[1320px] max-w-none cursor-zoom-out" : "w-full cursor-zoom-in"
                }`}
                onClick={() => setZoomed((value) => !value)}
                aria-label={zoomed ? "Reduzir certificado" : "Ampliar certificado"}
              >
                <Image
                  src={CADASTUR.certificateImage.src}
                  width={CADASTUR.certificateImage.width}
                  height={CADASTUR.certificateImage.height}
                  alt={CADASTUR.certificateImage.alt}
                  loading="eager"
                  unoptimized
                  sizes={zoomed ? "1320px" : "(max-width: 1200px) 100vw, 1152px"}
                  className="h-auto w-full rounded-lg bg-white object-contain"
                />
              </button>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-areia-200 px-4 py-3 text-xs sm:px-5 sm:text-sm">
              <button
                type="button"
                className="font-semibold text-oceano-700 underline-offset-4 hover:underline"
                onClick={() => setZoomed((value) => !value)}
              >
                {zoomed ? "Reduzir imagem" : "Ampliar imagem"}
              </button>
              <a
                href={CADASTUR.verificationUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-oceano-700 underline-offset-4 hover:underline"
              >
                Verificar autenticidade no Cadastur ↗
              </a>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
