import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCarrinho } from '../compartilhado/CarrinhoContext';
import { formatarPreco } from '../compartilhado/formatadores';

export function BotaoSacolaFlutuante() {
  const { totalItens, subtotal, setCarrinhoAberto, animandoSacola } = useCarrinho();

  if (totalItens === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 px-4 max-w-md mx-auto pointer-events-none">
      <button 
        onClick={() => setCarrinhoAberto(true)}
        className={`pointer-events-auto w-full py-3.5 px-5 rounded-2xl bg-slate-900 text-white shadow-2xl flex items-center justify-between border-2 border-amber-400 transition-all active:scale-95 ${
          animandoSacola ? 'bag-button-pop' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingBag className="w-6 h-6 text-amber-400" />
            <span className="absolute -top-1.5 -right-2 bg-amber-400 text-slate-950 font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-900">
              {totalItens}
            </span>
          </div>
          <span className="font-bold text-sm text-slate-100">
            Ver Sacola
          </span>
        </div>

        <span className="font-extrabold text-base text-amber-300">
          {formatarPreco(subtotal)}
        </span>
      </button>
    </div>
  );
}
