import React, { useState } from 'react';
import { 
  X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, AlertTriangle, 
  Flame, Sparkles, Tag, Check, Gift, Truck
} from 'lucide-react';
import { useCarrinho } from '../compartilhado/CarrinhoContext';
import { formatarPreco } from '../compartilhado/formatadores';

export function GavetaCarrinho({ 
  infoLoja, 
  produtosDisponiveis = [], 
  onIrParaCheckout, 
  onAbrirRaspadinha,
  cupomAtivo,
  onAplicarCupom 
}) {
  const { 
    itens, 
    subtotal, 
    totalItens, 
    carrinhoAberto, 
    setCarrinhoAberto, 
    atualizarQuantidade, 
    removerItem,
    adicionarItem 
  } = useCarrinho();

  const [inputCupom, setInputCupom] = useState(cupomAtivo?.codigo || '');
  const [validandoCupom, setValidandoCupom] = useState(false);
  const [erroCupom, setErroCupom] = useState('');

  if (!carrinhoAberto) return null;

  const taxaEntregaBase = infoLoja?.taxaEntrega || 700;
  const pedidoMinimo = infoLoja?.pedidoMinimo || 2500;
  const metaFreteGratis = 8000; // R$ 80,00

  // Frete grátis por valor ou cupom FRETEFREE
  const freteGratis = subtotal >= metaFreteGratis || cupomAtivo?.tipo === 'frete_gratis';
  const taxaEntrega = freteGratis ? 0 : taxaEntregaBase;

  // Desconto de cupom
  const valorDesconto = cupomAtivo?.desconto || 0;
  const total = Math.max(0, subtotal + taxaEntrega - valorDesconto);

  const faltaParaMinimo = Math.max(0, pedidoMinimo - subtotal);
  const faltaParaFrete = Math.max(0, metaFreteGratis - subtotal);
  const progressoFrete = Math.min(100, (subtotal / metaFreteGratis) * 100);

  // Produtos para Upsell Inteligente (Bebidas e Porções que não estão no carrinho)
  const idsNoCarrinho = new Set(itens.map(i => i.produtoId));
  const sugestoesUpsell = produtosDisponiveis
    .filter(p => !idsNoCarrinho.has(p.id) && (
      p.categoria_nome?.toLowerCase().includes('bebida') ||
      p.categoria_nome?.toLowerCase().includes('porç') ||
      p.categoria_nome?.toLowerCase().includes('acompanha') ||
      p.nome?.toLowerCase().includes('batata') ||
      p.nome?.toLowerCase().includes('coca')
    ))
    .slice(0, 3);

  async function handleValidarCupom(e) {
    e.preventDefault();
    if (!inputCupom.trim()) return;

    setValidandoCupom(true);
    setErroCupom('');
    try {
      const res = await fetch('/api/pedidos/validar-cupom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cupom: inputCupom.trim(), subtotal })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.mensagem || 'Cupom inválido.');
      }
      if (onAplicarCupom) {
        onAplicarCupom({
          codigo: data.cupom,
          desconto: data.desconto,
          tipo: data.tipo,
          descricao: data.descricao
        });
      }
    } catch (err) {
      setErroCupom(err.message);
    } finally {
      setValidandoCupom(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
      <div 
        className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Carrinho */}
        <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base">Sua Sacola ({totalItens} {totalItens === 1 ? 'item' : 'itens'})</h2>
          </div>
          <button 
            onClick={() => setCarrinhoAberto(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progresso: Frete Grátis Inteligente */}
        <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-200/80">
          <div className="flex justify-between items-center text-xs font-bold text-emerald-950 mb-1">
            <span className="flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>{freteGratis ? '🎉 Frete Grátis Liberado para Cascavel!' : 'Frete Grátis a partir de R$ 80'}</span>
            </span>
            <span className="text-emerald-700">
              {freteGratis ? 'GRÁTIS' : `Faltam ${formatarPreco(faltaParaFrete)}`}
            </span>
          </div>
          <div className="w-full bg-emerald-200/80 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressoFrete}%` }}
            />
          </div>
        </div>

        {/* Banner Gamificado da Raspadinha da Sorte */}
        {onAbrirRaspadinha && (
          <div className="bg-gradient-to-r from-amber-500/15 via-amber-400/20 to-amber-500/10 border-b border-amber-300/60 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-600 animate-bounce" />
              <span className="text-xs font-black text-amber-950">
                Ganhe até R$ 10 OFF na Raspadinha Trailer 94!
              </span>
            </div>
            <button
              type="button"
              onClick={onAbrirRaspadinha}
              className="text-[11px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-3 h-3" />
              <span>Raspar Agora</span>
            </button>
          </div>
        )}

        {/* Lista de Itens */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 space-y-2">
          {itens.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <ShoppingBag className="w-16 h-16 stroke-1 mb-3 text-slate-300" />
              <p className="font-bold text-slate-600">Sua sacola está vazia</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Selecione os burgers e delícias do Trailer 94 para montar seu pedido.
              </p>
            </div>
          ) : (
            itens.map((item, index) => (
              <div key={index} className="py-3.5 flex gap-3 items-start">
                <img 
                  src={item.imagem} 
                  alt={item.nome}
                  className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-100 border border-slate-200"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/imagens/produtos/placeholder-lanche.jpg';
                  }}
                />

                <div className="flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <h4 className="font-bold text-sm text-slate-900 leading-snug">
                      {item.nome}
                    </h4>
                    <span className="font-extrabold text-sm text-slate-900 shrink-0">
                      {formatarPreco(item.precoUnitario * item.quantidade)}
                    </span>
                  </div>

                  {item.opcionais?.length > 0 && (
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.opcionais.map(op => op.nome || op.nome_opcional).join(', ')}
                    </p>
                  )}

                  {item.observacoes && (
                    <p className="text-[10px] text-amber-700 bg-amber-50 p-1 rounded mt-1 border border-amber-200">
                      Obs: {item.observacoes}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50">
                      <button 
                        onClick={() => atualizarQuantidade(index, -1)}
                        className="p-1 text-slate-600 hover:text-slate-900"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">
                        {item.quantidade}
                      </span>
                      <button 
                        onClick={() => atualizarQuantidade(index, 1)}
                        className="p-1 text-slate-600 hover:text-slate-900"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button 
                      onClick={() => removerItem(index)}
                      className="text-slate-400 hover:text-red-500 p-1"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Seção Upsell Inteligente: Turbine seu Pedido com 1 Clique */}
          {itens.length > 0 && sugestoesUpsell.length > 0 && (
            <div className="pt-4 border-t-2 border-dashed border-amber-200/80">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Turbine seu Pedido (Compre Junto)
                </h3>
              </div>

              <div className="space-y-2">
                {sugestoesUpsell.map(prod => (
                  <div 
                    key={prod.id}
                    className="p-2 rounded-xl bg-amber-50/50 border border-amber-200/60 flex items-center justify-between gap-2 hover:bg-amber-50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={prod.imagens?.[0]?.arquivo || prod.imagens?.[0] || '/imagens/produtos/placeholder-lanche.jpg'} 
                        alt={prod.nome}
                        className="w-10 h-10 rounded-lg object-cover bg-white shrink-0 border border-slate-200"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/imagens/produtos/placeholder-lanche.jpg';
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{prod.nome}</p>
                        <p className="text-xs font-extrabold text-amber-700">{formatarPreco(prod.preco_base)}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => adicionarItem(prod, [], '', 1)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] shrink-0 shadow-sm transition-transform active:scale-95 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Resumo e Botão de Finalizar */}
        {itens.length > 0 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 shrink-0 space-y-3">
            {/* Campo de Cupom */}
            <form onSubmit={handleValidarCupom} className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={inputCupom}
                  onChange={(e) => setInputCupom(e.target.value.toUpperCase())}
                  placeholder="Cupom (ex: BULLS10)"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 uppercase"
                />
              </div>
              <button
                type="submit"
                disabled={validandoCupom || !inputCupom.trim()}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs disabled:opacity-50"
              >
                {validandoCupom ? '...' : 'Aplicar'}
              </button>
            </form>

            {erroCupom && (
              <p className="text-[11px] text-red-600 font-semibold">{erroCupom}</p>
            )}

            {cupomAtivo && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold">
                <span className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>Cupom {cupomAtivo.codigo} ({cupomAtivo.descricao})</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setInputCupom('');
                    if (onAplicarCupom) onAplicarCupom(null);
                  }}
                  className="text-red-500 hover:underline text-[10px]"
                >
                  Remover
                </button>
              </div>
            )}

            <div className="space-y-1.5 text-xs text-slate-600 pt-1">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-900">{formatarPreco(subtotal)}</span>
              </div>

              {valorDesconto > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Desconto de Cupom</span>
                  <span>- {formatarPreco(valorDesconto)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Taxa de Entrega (Cascavel)</span>
                <span className={`font-semibold ${freteGratis ? 'text-emerald-600 font-black' : 'text-slate-900'}`}>
                  {freteGratis ? 'GRÁTIS' : formatarPreco(taxaEntrega)}
                </span>
              </div>

              <div className="flex justify-between text-sm font-extrabold text-slate-950 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span className="text-base text-amber-600">{formatarPreco(total)}</span>
              </div>
            </div>

            {faltaParaMinimo > 0 ? (
              <div className="flex items-center gap-2 p-2.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Adicione mais {formatarPreco(faltaParaMinimo)} para atingir o pedido mínimo.</span>
              </div>
            ) : (
              <button 
                onClick={() => {
                  setCarrinhoAberto(false);
                  onIrParaCheckout();
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-950 text-amber-300 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
              >
                <span>Avançar para Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
