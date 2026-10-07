import React from 'react';

export function CategoriaTabs({ categorias, categoriaAtiva, onSelecionarCategoria }) {
  if (!categorias || categorias.length === 0) return null;

  return (
    <nav className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b-2 border-slate-800 shadow-xl">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-3.5">
          {categorias.map((cat) => {
            const ativa = categoriaAtiva === cat.id;
            // Garantir que nenhum emoji apareça
            const nomeSemEmoji = cat.nome.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();

            return (
              <button
                key={cat.id}
                onClick={() => onSelecionarCategoria(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider transition-all select-none border-2 ${
                  ativa
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/25 scale-105'
                    : 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-amber-400/60 hover:text-white'
                }`}
              >
                {nomeSemEmoji}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
