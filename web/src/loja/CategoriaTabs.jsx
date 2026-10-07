import React from 'react';

export function CategoriaTabs({ categorias, categoriaAtiva, onSelecionarCategoria }) {
  if (!categorias || categorias.length === 0) return null;

  function handleClick(catId, event) {
    onSelecionarCategoria(catId);
    if (event?.currentTarget) {
      event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  return (
    <nav className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b-2 border-slate-800 shadow-2xl">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div 
          className="flex items-center gap-2 overflow-x-auto py-2.5 px-1 touch-pan-x whitespace-nowrap scroll-smooth"
          style={{ 
            scrollbarWidth: 'none', 
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {categorias.map((cat) => {
            const ativa = categoriaAtiva === cat.id;
            const nomeSemEmoji = cat.nome.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();

            return (
              <button
                key={cat.id}
                onClick={(e) => handleClick(cat.id, e)}
                className={`shrink-0 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wide transition-all select-none border-2 cursor-pointer ${
                  ativa
                    ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md shadow-amber-400/20 scale-102'
                    : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-amber-400/50 hover:text-white'
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
