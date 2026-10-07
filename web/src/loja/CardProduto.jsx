import React from 'react';
import { Plus, Users, Flame } from 'lucide-react';
import { formatarPreco } from '../compartilhado/formatadores';

export function CardProduto({ produto, onAbrirDetalhes }) {
  const precoAtual = produto.preco_promocional ?? produto.preco_base;
  const temDesconto = produto.preco_promocional !== null && produto.preco_promocional !== undefined && produto.preco_promocional < produto.preco_base;
  const imagemPrincipal = produto.imagens?.[0] || '/imagens/origem/instagram/baixada-1.jpg';

  return (
    <div 
      onClick={() => onAbrirDetalhes(produto)}
      className="group bg-slate-900/90 hover:bg-slate-900 rounded-2xl p-4 border-2 border-slate-800 hover:border-amber-400/90 shadow-xl hover:shadow-2xl transition-all cursor-pointer flex justify-between gap-4 relative overflow-hidden backdrop-blur-md"
    >
      {/* Lado Esquerdo: Textos e Preços com espaçamento claro e sem aglomeração */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          {produto.destaque === 1 && (
            <div className="mb-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-400/40">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Mais pedido</span>
              </span>
            </div>
          )}

          <h3 className="text-base sm:text-lg font-black text-white group-hover:text-amber-400 transition-colors line-clamp-1">
            {produto.nome}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 mt-2 line-clamp-2 leading-relaxed font-medium">
            {produto.descricao || produto.ingredientes}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-black text-amber-400 tracking-tight">
              {formatarPreco(precoAtual)}
            </span>
            {temDesconto && (
              <span className="text-xs text-slate-500 line-through font-semibold">
                {formatarPreco(produto.preco_base)}
              </span>
            )}
          </div>

          {produto.serve_pessoas > 1 && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Serve {produto.serve_pessoas}</span>
            </span>
          )}
        </div>
      </div>

      {/* Lado Direito: Imagem com moldura forte e Botão Adicionar */}
      <div className="relative shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-slate-950 border-2 border-slate-700/80 group-hover:border-amber-400/50 transition-colors">
        <img 
          src={imagemPrincipal} 
          alt={produto.nome}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.currentTarget.src = '/imagens/origem/instagram/baixada-1.jpg';
          }}
        />

        {/* Botão de Adicionar Flutuante na imagem com contraste forte */}
        <button 
          aria-label={`Adicionar ${produto.nome}`}
          className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shadow-xl transition-transform active:scale-95"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
        </button>
      </div>
    </div>
  );
}
