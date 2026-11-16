"use client";

import { useEffect, useState } from "react";
import { DEMO_MODE } from "@/lib/config";
import { saveMonetization } from "@/lib/admin-ops";
import {
  MONETIZATION_DESCRIPTION,
  MONETIZATION_LABEL,
  fetchMonetizationBrowser,
  modelAppliesCommission,
  modelAppliesMonthlyFee,
} from "@/lib/monetization";
import type { Monetization, MonetizationModel } from "@/lib/types";

const MODELS = ["free", "commission", "subscription", "hybrid"] as const;

export default function AdminConfiguracoesPage() {
  const [current, setCurrent] = useState<Monetization | null>(null);
  const [model, setModel] = useState<MonetizationModel>("free");
  const [percent, setPercent] = useState("10");
  const [fee, setFee] = useState("0");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchMonetizationBrowser().then((m) => {
      if (!active) return;
      setCurrent(m);
      setModel(m.model);
      setPercent(String(m.percent));
      setFee((m.monthlyFeeCents / 100).toFixed(2).replace(/\.00$/, ""));
    });
    return () => {
      active = false;
    };
  }, []);

  if (current === null) {
    return <div className="card h-96 animate-pulse" />;
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const pct = Math.min(100, Math.max(0, Number(percent.replace(",", ".")) || 0));
    const feeCents = Math.max(0, Math.round((Number(fee.replace(",", ".")) || 0) * 100));
    const error = await saveMonetization({ model, percent: pct, monthlyFeeCents: feeCents });
    setSaving(false);
    if (error) {
      setMessage(`Não foi possível salvar: ${error}`);
      return;
    }
    setCurrent({ model, percent: pct, monthlyFeeCents: feeCents });
    setMessage(
      DEMO_MODE
        ? "Em demonstração não há o que gravar — na plataforma real o modelo fica salvo aqui."
        : "Modelo salvo! Já vale para o site e para os cálculos de comissão."
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Configurações</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Decisões da equipe Viviantourr que valem para toda a plataforma.
        </p>
      </header>

      <section className="card p-6">
        <h2 className="section-title text-lg">Como a plataforma monetiza</h2>
        <p className="mt-1 text-sm text-tinta-mute">
          Vale para hospedagens e serviços (passeios, embarcações e experiências). A mudança é
          imediata: reservas aceitas a partir de agora já seguem o novo modelo.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {MODELS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModel(m)}
              aria-pressed={model === m}
              className={`rounded-2xl border p-4 text-left transition ${
                model === m
                  ? "border-turquesa-500 bg-turquesa-50 shadow-card"
                  : "border-areia-200 bg-white hover:border-turquesa-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full border ${
                    model === m ? "border-turquesa-500" : "border-areia-300"
                  }`}
                >
                  {model === m && <span className="h-2 w-2 rounded-full bg-turquesa-500" />}
                </span>
                <strong className="text-sm text-tinta">{MONETIZATION_LABEL[m]}</strong>
              </span>
              <span className="mt-1.5 block text-xs leading-relaxed text-tinta-mute">
                {MONETIZATION_DESCRIPTION[m]}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {modelAppliesCommission(model) && (
            <div>
              <label htmlFor="percent" className="text-sm font-medium text-tinta">
                Comissão por reserva (%)
              </label>
              <input
                id="percent"
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-areia-200 px-3.5 py-2.5 text-sm text-tinta outline-none focus:border-turquesa-400"
              />
              <p className="mt-1 text-xs text-tinta-mute">
                Percentual retido de cada reserva confirmada. Fornecedores com acordo comercial
                próprio mantêm a regra individual.
              </p>
            </div>
          )}
          {modelAppliesMonthlyFee(model) && (
            <div>
              <label htmlFor="fee" className="text-sm font-medium text-tinta">
                Mensalidade (R$ por mês)
              </label>
              <input
                id="fee"
                type="number"
                min={0}
                step={1}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-areia-200 px-3.5 py-2.5 text-sm text-tinta outline-none focus:border-turquesa-400"
              />
              <p className="mt-1 text-xs text-tinta-mute">
                Valor referência exibido no site e no painel do fornecedor. A cobrança recorrente
                automática entra em uma fase futura.
              </p>
            </div>
          )}
          {!modelAppliesCommission(model) && !modelAppliesMonthlyFee(model) && (
            <p className="text-sm text-tinta-mute">
              Nenhum valor a definir: no modelo gratuito a plataforma não retém comissão e não
              cobra mensalidade.
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? "Salvando…" : "Salvar modelo"}
          </button>
          {message && <p className="text-sm text-tinta-soft">{message}</p>}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="section-title text-lg">Modelo em vigor agora</h2>
        <p className="mt-2 text-sm leading-relaxed text-tinta-soft">
          <strong>{MONETIZATION_LABEL[current.model]}</strong>
          {modelAppliesCommission(current.model) && (
            <> · comissão de {current.percent}% por reserva confirmada</>
          )}
          {modelAppliesMonthlyFee(current.model) && (
            <> · mensalidade de {(current.monthlyFeeCents / 100).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}</>
          )}
          .
        </p>
        <p className="mt-1 text-xs text-tinta-mute">
          Esta configuração aparece publicamente na página “Seja um parceiro” (/anuncie) e no
          painel financeiro dos fornecedores.
        </p>
      </section>
    </div>
  );
}
