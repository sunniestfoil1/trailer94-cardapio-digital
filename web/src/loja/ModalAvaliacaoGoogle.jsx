import React from 'react';
import { X, Star, ExternalLink } from 'lucide-react';
import { EMPRESA_CONFIG } from '../empresa.config';

export function ModalAvaliacaoGoogle({ pedido, onFechar, onAvaliar }) {
  const reviewUrl = EMPRESA_CONFIG.googleReviewUrl || `https://search.google.com/local/writereview?placeid=${EMPRESA_CONFIG.googlePlaceId}`;

  function handleAvaliar() {
    onAvaliar();
    window.open(reviewUrl, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-slate-900/95 border-2 border-amber-500/30 w-full max-w-md rounded-3xl p-6 shadow-2xl relative text-center space-y-5 backdrop-blur-md animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar */}
        <button 
          onClick={onFechar}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer"
          title="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícone Oficial do Google + Estrelas */}
        <div className="flex flex-col items-center justify-center space-y-2 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex items-center justify-center shadow-inner">
            <svg className="w-10 h-10" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
          </div>
          
          <div className="flex items-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>

        {/* Textos de Solicitação Neutra */}
        <div className="space-y-2">
          <h3 className="text-lg font-black text-white leading-tight">
            Sua avaliação é muito importante para nós
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed px-2">
            Você teve uma boa experiência? Conte para a gente no Google.
          </p>
          {pedido?.codigo && (
            <span className="inline-block text-[10px] bg-slate-800 text-amber-400 px-2.5 py-0.5 rounded-full border border-slate-700 font-bold mt-1">
              Pedido {pedido.codigo}
            </span>
          )}
        </div>

        {/* Botão com efeito Glassmorphism */}
        <div className="space-y-2.5 pt-2">
          <button
            onClick={handleAvaliar}
            className="w-full py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-98 border border-white/20 backdrop-blur-md text-white font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl transition-all group cursor-pointer"
          >
            <span>Avaliar no Google</span>
            <ExternalLink className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={onFechar}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium py-1 cursor-pointer"
          >
            Agora não, continuar navegando
          </button>
        </div>
      </div>
    </div>
  );
}
