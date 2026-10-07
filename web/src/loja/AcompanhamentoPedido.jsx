import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, Bike, ChefHat, Check, Copy, MessageCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { formatarPreco, formatarTelefone } from '../compartilhado/formatadores';
import { inscreverCanal } from '../compartilhado/supabaseClient';
import { EMPRESA_CONFIG } from '../empresa.config';
import { registrarPedidoSessao } from '../compartilhado/avaliacaoHelper';

export function AcompanhamentoPedido({ pedidoId, onVoltarLoja }) {
  const [pedido, setPedido] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [copiado, setCopiado] = useState(false);

  async function carregarPedido() {
    try {
      const res = await fetch(`/api/pedidos/${pedidoId}`);
      if (res.ok) {
        const data = await res.json();
        setPedido(data);
      }
    } catch (err) {
      console.error('Falha ao obter status do pedido:', err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (pedidoId) {
      registrarPedidoSessao(pedidoId);
    }
    carregarPedido();

    // Tempo real via Supabase Realtime ou Barramento Local
    const parar = inscreverCanal(`cliente:${pedidoId}`, (dados) => {
      if (dados.tipo === 'pedido:status') {
        setPedido(atual => atual ? { ...atual, status: dados.status, motoboy_nome: dados.motoboy?.nome || atual.motoboy_nome } : null);
      }
    });

    return parar;
  }, [pedidoId]);

  function copiarChavePix() {
    navigator.clipboard.writeText(EMPRESA_CONFIG.whatsapp);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-4" />
        <p className="font-bold text-base">Carregando detalhes do seu pedido...</p>
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-red-400">Pedido não encontrado</h2>
        <p className="text-sm text-slate-400 mt-2">Verifique o código informado ou faça um novo pedido.</p>
        <button 
          onClick={onVoltarLoja}
          className="mt-6 px-6 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm"
        >
          Voltar ao Cardápio
        </button>
      </div>
    );
  }

  // Etapas da Timeline
  const etapas = [
    { chave: 'recebido', label: 'Pedido Recebido', desc: 'Aguardando confirmação da cozinha', icone: Clock },
    { chave: 'em_preparo', label: 'Na Chapa / Cozinha', desc: 'Seus burgers estão sendo preparados com carinho', icone: ChefHat },
    { chave: 'pronto', label: 'Pedido Pronto', desc: 'Embalado e aguardando motoboy para entrega', icone: CheckCircle2 },
    { chave: 'em_entrega', label: 'Saiu para Entrega', desc: pedido.motoboy_nome ? `Com ${pedido.motoboy_nome} (${pedido.motoboy_veiculo || 'Moto'})` : 'A caminho do seu endereço', icone: Bike },
    { chave: 'entregue', label: 'Pedido Entregue', desc: `Bom apetite! Obrigado pela preferência no ${EMPRESA_CONFIG.nome}`, icone: Check }
  ];

  const ordemStatus = ['recebido', 'em_preparo', 'pronto', 'em_entrega', 'entregue'];
  const indiceAtual = ordemStatus.indexOf(pedido.status);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 pb-20">
      <div className="max-w-xl mx-auto space-y-5">
        {/* Topo com botão voltar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onVoltarLoja}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Cardápio</span>
          </button>
          <span className="text-xs text-amber-400 font-bold bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-500/30">
            Tempo real ativo ⚡
          </span>
        </div>

        {/* Card do Pedido */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-slate-400">Código do Pedido</span>
              <h1 className="text-2xl font-black text-amber-400">{pedido.codigo}</h1>
              <p className="text-xs text-slate-400 mt-1">Feito para {pedido.cliente_nome}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Total</span>
              <p className="text-xl font-black text-white">{formatarPreco(pedido.total)}</p>
              <span className="text-[11px] text-amber-300 uppercase tracking-wider font-bold">
                {pedido.forma_pagamento}
              </span>
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-300">
            <span className="text-slate-500 block font-semibold">Endereço de entrega:</span>
            <p className="mt-0.5">{pedido.cliente_endereco}</p>
            {pedido.cliente_complemento && <p className="text-slate-400">Compl: {pedido.cliente_complemento}</p>}
          </div>
        </div>

        {/* PIX Box se método for PIX */}
        {pedido.forma_pagamento === 'pix' && pedido.status !== 'entregue' && (
          <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-2xl p-4 text-emerald-100">
            <h3 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
              <span>Pagamento via PIX</span>
            </h3>
            <p className="text-xs text-emerald-200/90 mt-1">
              Chave PIX (WhatsApp {EMPRESA_CONFIG.nome}): <strong className="text-white">{EMPRESA_CONFIG.whatsapp}</strong>
            </p>
            <button 
              onClick={copiarChavePix}
              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
            >
              {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiado ? 'Chave Copiada!' : 'Copiar Chave PIX'}</span>
            </button>
          </div>
        )}

        {/* Timeline Visual de Acompanhamento */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="font-bold text-sm text-white mb-5">Status da sua Entrega</h3>

          <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {etapas.map((etapa, idx) => {
              const Icone = etapa.icone;
              const concluido = idx <= indiceAtual;
              const atual = idx === indiceAtual;

              return (
                <div key={etapa.chave} className="flex items-start gap-4 relative">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                    concluido 
                      ? 'bg-amber-400 border-amber-400 text-slate-950' 
                      : 'bg-slate-950 border-slate-700 text-slate-600'
                  } ${atual ? 'ring-4 ring-amber-400/30 animate-pulse' : ''}`}>
                    <Icone className="w-4 h-4 stroke-[2.5]" />
                  </div>

                  <div className="flex-1 pt-0.5">
                    <h4 className={`text-sm font-bold ${concluido ? 'text-white' : 'text-slate-500'}`}>
                      {etapa.label}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                      {etapa.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Itens do Pedido */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="font-bold text-sm text-white mb-3">Itens Escolhidos</h3>
          <div className="divide-y divide-slate-800 text-xs">
            {pedido.itens?.map((it, idx) => (
              <div key={idx} className="py-2.5 flex justify-between">
                <div>
                  <span className="font-semibold text-slate-200">
                    {it.quantidade}x {it.nome_produto}
                  </span>
                  {it.opcionais?.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {it.opcionais.map(o => o.nome_opcional).join(', ')}
                    </p>
                  )}
                </div>
                <span className="font-bold text-slate-200">
                  {formatarPreco(it.preco_unitario * it.quantidade)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Botão de Suporte WhatsApp */}
        <a 
          href={`https://wa.me/55${EMPRESA_CONFIG.whatsapp}?text=${encodeURIComponent(`Olá ${EMPRESA_CONFIG.nome}! Gostaria de falar sobre o meu pedido ${pedido.codigo}.`)}`}
          target="_blank"
          rel="noreferrer"
          className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
        >
          <MessageCircle className="w-5 h-5" />
          <span>Falar com o {EMPRESA_CONFIG.nome} no WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
