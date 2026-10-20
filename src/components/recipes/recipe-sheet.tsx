"use client";

import { ArrowLeft, Printer } from "lucide-react";
import { itemCost, recipeCosts, unitShort } from "./recipe-calculations";
import type { Recipe } from "@/types/recipe";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 });

export function RecipeSheet({ recipe, onBack }: { recipe: Recipe; onBack: () => void }) {
  const costs = recipeCosts(recipe);
  const remainder = recipe.expectedYieldG - recipe.expectedJars * recipe.jarWeightG;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="recipe-no-print mb-5 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-[#6f665d]">
          <ArrowLeft size={17} />Voltar para receitas
        </button>
        <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-xl bg-[#9c2348] px-4 py-2.5 text-sm font-bold text-white">
          <Printer size={17} />Imprimir em A4
        </button>
      </div>

      <article className="recipe-print rounded-[20px] border border-[#dfd2c0] bg-white p-6 shadow-[0_12px_35px_rgba(62,43,29,.06)] sm:p-9">
        <header className="flex flex-col justify-between gap-5 border-b border-[#ded4c6] pb-6 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#9c2348]">Ficha técnica de produção</p>
            <h1 className="mt-2 font-serif text-4xl font-semibold">{recipe.name}</h1>
            <p className="mt-2 text-sm text-[#6f665d]">{recipe.productName ?? "Sem produto associado"}</p>
          </div>
          <div className="text-left text-xs leading-6 text-[#746a61] sm:text-right">
            <p><strong>Versão:</strong> {recipe.version}</p>
            <p><strong>Situação:</strong> {recipe.active ? "Ativa" : "Inativa"}</p>
            <p><strong>Atualizada em:</strong> {new Date(recipe.updatedAt).toLocaleDateString("pt-BR")}</p>
          </div>
        </header>

        {recipe.description && <p className="mt-6 whitespace-pre-wrap text-sm leading-6 text-[#574f48]">{recipe.description}</p>}

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Info label="Rendimento final" value={`${number.format(recipe.expectedYieldG)} g`} />
          <Info label="Peso por pote" value={`${number.format(recipe.jarWeightG)} g`} />
          <Info label="Potes completos" value={String(recipe.expectedJars)} />
          <Info label="Sobra estimada" value={`${number.format(remainder)} g`} />
        </section>

        <section className="mt-8">
          <h2 className="font-serif text-2xl font-semibold">Ingredientes</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-[#ded4c6]">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-[#f7f1e7] text-[11px] uppercase tracking-[.1em] text-[#746a61]">
                <tr><th className="px-4 py-3">Ingrediente</th><th className="px-4 py-3">Quantidade</th><th className="px-4 py-3 text-right">Custo médio atual</th><th className="px-4 py-3 text-right">Custo total</th></tr>
              </thead>
              <tbody className="divide-y divide-[#e8dfd2]">
                {recipe.items.map(item => {
                  const cost = itemCost(item.quantity, item.unit, { id: item.ingredientId, name: item.ingredientName, unit: item.stockUnit, averageCost: item.averageCost, active: true });
                  return <tr key={item.id}><td className="px-4 py-3 font-semibold">{item.ingredientName}</td><td className="px-4 py-3">{number.format(item.quantity)} {unitShort(item.unit)}</td><td className="px-4 py-3 text-right">{money.format(item.averageCost)}/{unitShort(item.stockUnit)}</td><td className="px-4 py-3 text-right">{money.format(cost)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[#7d746b]">Custos calculados com os valores médios atuais do estoque.</p>
        </section>

        <section className="mt-7 grid gap-3 sm:grid-cols-3">
          <Info label="Custo do lote" value={money.format(costs.total)} />
          <Info label="Custo por pote" value={money.format(costs.perJar)} />
          <Info label="Custo por 100 g" value={money.format(costs.per100g)} />
        </section>

        {recipe.preparation && <section className="mt-8"><h2 className="font-serif text-2xl font-semibold">Modo de preparo</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#4f4943]">{recipe.preparation}</p></section>}
        {recipe.notes && <section className="mt-7 rounded-xl border border-[#ded4c6] bg-[#fbf7ef] p-4"><h2 className="text-xs font-bold uppercase tracking-[.12em] text-[#746a61]">Observações</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{recipe.notes}</p></section>}
      </article>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#ded4c6] bg-[#fffdf9] p-4"><p className="text-[10px] font-bold uppercase tracking-[.1em] text-[#7d746b]">{label}</p><p className="mt-2 font-serif text-xl font-semibold">{value}</p></div>;
}
