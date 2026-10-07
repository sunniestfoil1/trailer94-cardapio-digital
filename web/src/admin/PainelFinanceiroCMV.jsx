import React, { useState } from 'react';
import { DollarSign, TrendingUp, PieChart, ShoppingBag, Percent, ArrowUpRight, ShieldCheck, Download } from 'lucide-react';
import { formatarPreco } from '../compartilhado/formatadores';

export function PainelFinanceiroCMV({ metricas, pedidos }) {
  const [cmvPercentual, setCmvPercentual] = useState(32); // 32% padrão de hamburgueria artesanal

  const totalPedidos = metricas?.pedidosHoje?.total_pedidos || pedidos.length || 0;
  const faturamentoTotal = metricas?.pedidosHoje?.faturamento_total || pedidos.reduce((acc, p) => acc + (p.total || 0), 0);
  const ticketMedio = totalPedidos > 0 ? Math.round(faturamentoTotal / totalPedidos) : 0;

  // Repasses para motoboy
  const totalRepasseMotoboys = pedidos.filter(p => p.status === 'entregue' || p.motoboy_id).length * 600;

  // CMV estimado
  const custoInsumosEstimado = Math.round(faturamentoTotal * (cmvPercentual / 100));

  // Lucro bruto e margem líquida
  const lucroBrutoEstimado = Math.max(0, faturamentoTotal - custoInsumosEstimado - totalRepasseMotoboys);
  const margemLucroLiquida = faturamentoTotal > 0 ? Math.round((lucroBrutoEstimado / faturamentoTotal) * 100) : 0;

  // Estatística de pagamento
  const contagemPagamento = pedidos.reduce((acc, p) => {
    const metodo = p.forma_pagamento || 'pix';
    acc[metodo] = (acc[metodo] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <span>DRE Operacional & CMV — Trailer 94</span>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
              Lucro Real em Tempo Real
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Cálculo instantâneo de margens, custo de mercadoria vendida e resultado líquido da noite.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl text-xs">
          <span className="text-slate-400 pl-2">Ajustar CMV:</span>
          <select
            value={cmvPercentual}
            onChange={(e) => setCmvPercentual(Number(e.target.value))}
            className="bg-slate-800 text-amber-400 font-black rounded-lg px-2.5 py-1 border border-slate-700 focus:outline-none"
          >
            <option value={28}>28% (Super Econômico)</option>
            <option value={32}>32% (Padrão Artesanal)</option>
            <option value={36}>36% (Insumos Premium)</option>
            <option value={40}>40% (Margem Baixa)</option>
          </select>
        </div>
      </div>

      {/* Cartões Executivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Faturamento Bruto</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </span>
          <p className="text-2xl font-black text-emerald-400">
            {formatarPreco(faturamentoTotal)}
          </p>
          <span className="text-[10px] text-slate-500 block">Total faturado no período</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Ticket Médio</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </span>
          <p className="text-2xl font-black text-amber-400">
            {formatarPreco(ticketMedio)}
          </p>
          <span className="text-[10px] text-slate-500 block">Média por cliente atendido</span>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-1">
          <span className="text-xs text-slate-400 flex items-center justify-between">
            <span>Custo Insumos (CMV {cmvPercentual}%)</span>
            <Percent className="w-4 h-4 text-red-400" />
          </span>
          <p className="text-2xl font-black text-red-400">
            - {formatarPreco(custoInsumosEstimado)}
          </p>
          <span className="text-[10px] text-slate-500 block">Carne, pão, queijo e embalagens</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/20 via-slate-900 to-slate-900 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-1 shadow-lg">
          <span className="text-xs text-emerald-300 font-bold flex items-center justify-between">
            <span>Lucro Líquido Operacional</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </span>
          <p className="text-2xl font-black text-emerald-300">
            {formatarPreco(lucroBrutoEstimado)}
          </p>
          <span className="text-[10px] text-emerald-400/90 font-bold block">
            Margem Líquida Real: {margemLucroLiquida}%
          </span>
        </div>
      </div>

      {/* Tabela Demonstrativo DRE Simplificado */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <PieChart className="w-4 h-4 text-amber-400" />
          <span>Estrutura Financeira da Operação (DRE)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 text-left">Rubrica / Linha Financeira</th>
                <th className="py-2.5 text-right">Percentual</th>
                <th className="py-2.5 text-right">Valor em Reais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              <tr>
                <td className="py-3 text-white font-bold">(+) Receita Bruta de Vendas (Pedidos)</td>
                <td className="py-3 text-right text-slate-300">100,0%</td>
                <td className="py-3 text-right text-emerald-400 font-black">{formatarPreco(faturamentoTotal)}</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-300">(-) Custo dos Insumos & Carnes (CMV Estimado)</td>
                <td className="py-3 text-right text-red-400">-{cmvPercentual},0%</td>
                <td className="py-3 text-right text-red-400 font-bold">- {formatarPreco(custoInsumosEstimado)}</td>
              </tr>
              <tr>
                <td className="py-3 text-slate-300">(-) Repasse de Corridas aos Motoboys (R$ 6/entrega)</td>
                <td className="py-3 text-right text-orange-400">
                  {faturamentoTotal > 0 ? `-${((totalRepasseMotoboys / faturamentoTotal) * 100).toFixed(1)}%` : '0%'}
                </td>
                <td className="py-3 text-right text-orange-400 font-bold">- {formatarPreco(totalRepasseMotoboys)}</td>
              </tr>
              <tr className="bg-slate-950/60 font-black">
                <td className="py-3.5 text-amber-300 text-sm">(=) RESULTADO OPERACIONAL LÍQUIDO DO PERÍODO</td>
                <td className="py-3.5 text-right text-emerald-400 text-sm">{margemLucroLiquida}%</td>
                <td className="py-3.5 text-right text-emerald-400 text-base">{formatarPreco(lucroBrutoEstimado)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Calculadora de Economia vs iFood */}
      <div className="bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 border-2 border-amber-500/30 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
          <div>
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-400" />
              <span>Simulador de Economia — Cardápio Próprio vs iFood</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Demonstre em tempo real quanto dinheiro o Trailer 94 deixa de rasgar em comissões ao migrar vendas para o sistema próprio.
            </p>
          </div>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2.5 py-1 rounded-full border border-amber-500/40">
            Ferramenta de Venda ao Vivo
          </span>
        </div>

        <CalculadoraEconomiaIFood faturamentoPadrao={faturamentoTotal > 0 ? faturamentoTotal / 100 : 15000} />
      </div>

      {/* Distribuição por Meio de Pagamento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { id: 'pix', rotulo: 'PIX Instantâneo', cor: 'emerald' },
          { id: 'cartao_credito', rotulo: 'Cartão de Crédito', cor: 'blue' },
          { id: 'dinheiro', rotulo: 'Dinheiro em Espécie', cor: 'amber' }
        ].map(item => {
          const totalQtd = contagemPagamento[item.id] || 0;
          const pct = totalPedidos > 0 ? Math.round((totalQtd / totalPedidos) * 100) : 0;
          return (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-xs text-slate-400">{item.rotulo}</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-xl font-black text-white">{totalQtd} pedidos</span>
                <span className="text-xs font-bold text-amber-400">{pct}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full" 
                  style={{ width: `${pct}%` }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatarReaisFloat(valor) {
  if (valor === null || valor === undefined || isNaN(valor)) return '0,00';
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function CalculadoraEconomiaIFood({ faturamentoPadrao = 15000 }) {
  const [faturamentoIfood, setFaturamentoIfood] = useState(faturamentoPadrao);
  const [taxaIfood, setTaxaIfood] = useState(15.2); // 12% comissão + 3.2% pagamento online (Plano Básico)
  const [qtdPedidosMes, setQtdPedidosMes] = useState(300); // 300 pedidos/mês médios
  const [pctMigracao, setPctMigracao] = useState(40); // 40% migrados pro cardápio próprio

  // iFood
  const comissaoIfoodMensal = (faturamentoIfood * (taxaIfood / 100)) + (faturamentoIfood > 1800 ? 110 : 0);
  
  // Anota AI (Mensalidade por faixa + 3.5% taxa média pgto online)
  const mensalidadeAnotaAi = qtdPedidosMes <= 150 ? 99.99 : qtdPedidosMes <= 250 ? 199.99 : 299.99;
  const taxaPgtoAnotaAi = (faturamentoIfood * 0.035);
  const custoAnotaAiMensal = mensalidadeAnotaAi + taxaPgtoAnotaAi;

  // Economia no Trailer 94 Cardápio Digital
  const faturamentoMigrado = faturamentoIfood * (pctMigracao / 100);
  const economiaMensalIfood = faturamentoMigrado * (taxaIfood / 100);
  const economiaAnualIfood = economiaMensalIfood * 12;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Input Faturamento iFood */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300 block">
            Faturamento Mensal (iFood):
          </label>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-400">R$</span>
            <input
              type="number"
              value={faturamentoIfood}
              onChange={(e) => setFaturamentoIfood(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-black text-amber-400 w-full focus:outline-none focus:border-amber-500"
              step={500}
            />
          </div>
          <span className="text-[10px] text-slate-500">Valor bruto de vendas/mês</span>
        </div>

        {/* Input Plano iFood */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300 block">
            Plano iFood Escolhido:
          </label>
          <select
            value={taxaIfood}
            onChange={(e) => setTaxaIfood(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white w-full focus:outline-none focus:border-amber-500"
          >
            <option value={15.2}>Plano Básico (12% + 3.2% pgto)</option>
            <option value={26.2}>Plano Entrega (23% + 3.2% pgto)</option>
            <option value={27.5}>Plano Entrega Flex (~27.5% total)</option>
          </select>
          <span className="text-[10px] text-slate-500">Taxa cobrada a cada pedido</span>
        </div>

        {/* Input Qtd Pedidos para Anota AI */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300 block">
            Volume de Pedidos/Mês:
          </label>
          <input
            type="number"
            value={qtdPedidosMes}
            onChange={(e) => setQtdPedidosMes(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-black text-blue-400 w-full focus:outline-none focus:border-blue-500"
            step={25}
          />
          <span className="text-[10px] text-slate-500">Define o plano da Anota AI</span>
        </div>

        {/* Input % de Migração */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300 block">
            Migração p/ Cardápio Próprio:
          </label>
          <select
            value={pctMigracao}
            onChange={(e) => setPctMigracao(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-emerald-400 w-full focus:outline-none focus:border-emerald-500"
          >
            <option value={20}>20% dos clientes no site</option>
            <option value={40}>40% dos clientes no site (Recomendado)</option>
            <option value={60}>60% dos clientes no site</option>
            <option value={100}>100% no Cardápio Próprio</option>
          </select>
          <span className="text-[10px] text-slate-500">Vendas convertidas p/ QR/Site</span>
        </div>
      </div>

      {/* Tabela Comparativa Visual (iFood vs Anota AI vs Trailer 94 Cardápio Digital) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Card iFood */}
        <div className="bg-red-950/30 border-2 border-red-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
            <span className="font-black text-red-400 text-sm">🔴 iFood</span>
            <span className="text-[10px] bg-red-500/20 text-red-300 font-bold px-2 py-0.5 rounded-full">
              Comissão {taxaIfood}%
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Mensalidade:</span>
              <span className="font-bold">R$ {faturamentoIfood > 1800 ? (taxaIfood > 20 ? '150,00' : '110,00') : '0,00'}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Taxa por Venda ({taxaIfood}%):</span>
              <span className="font-bold text-red-400">R$ {formatarReaisFloat(faturamentoIfood * (taxaIfood / 100))}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between font-black text-sm">
              <span className="text-slate-200">CUSTO MENSAL:</span>
              <span className="text-red-400">R$ {formatarReaisFloat(comissaoIfoodMensal)}</span>
            </div>
          </div>
        </div>

        {/* Card Anota AI */}
        <div className="bg-blue-950/30 border-2 border-blue-500/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
            <span className="font-black text-blue-400 text-sm">🔵 Anota AI</span>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-full">
              Faixa {qtdPedidosMes} ped/mês
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Plano Mensalidade:</span>
              <span className="font-bold">R$ {formatarReaisFloat(mensalidadeAnotaAi)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Taxa Pgto Online (3.5%):</span>
              <span className="font-bold text-blue-400">R$ {formatarReaisFloat(taxaPgtoAnotaAi)}</span>
            </div>
            <div className="border-t border-slate-800 pt-2 flex justify-between font-black text-sm">
              <span className="text-slate-200">CUSTO MENSAL:</span>
              <span className="text-blue-400">R$ {formatarReaisFloat(custoAnotaAiMensal)}</span>
            </div>
          </div>
        </div>

        {/* Card Trailer 94 Cardápio Digital (Vencedor) */}
        <div className="bg-gradient-to-br from-emerald-500/20 via-slate-900 to-emerald-950/40 border-2 border-emerald-500/60 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
            <span className="font-black text-emerald-400 text-sm flex items-center gap-1">
              <span>⭐ Trailer 94 (Site Próprio)</span>
            </span>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-300 font-black px-2 py-0.5 rounded-full border border-emerald-400/40">
              0% COMISSÃO
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-emerald-300 font-bold">
              <span>Economia Mensal Estimada:</span>
              <span className="text-emerald-400 font-black text-sm">+ R$ {formatarReaisFloat(economiaMensalIfood)}</span>
            </div>
            <div className="flex justify-between text-amber-300 font-bold">
              <span>Lucro Anual Acumulado:</span>
              <span className="text-amber-400 font-black text-sm">+ R$ {formatarReaisFloat(economiaAnualIfood)}</span>
            </div>
            <div className="border-t border-emerald-500/30 pt-2 text-[10px] text-emerald-400 font-bold text-center">
              💰 O faturamento fica 100% no seu bolso, sem intermédiaire descontando pedágio!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
