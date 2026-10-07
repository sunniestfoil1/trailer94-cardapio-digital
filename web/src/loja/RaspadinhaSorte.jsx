import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, X, Gift, Check, Flame, Trophy, Copy } from 'lucide-react';

export function RaspadinhaSorte({ onFechar, onAplicarCupom }) {
  const canvasRef = useRef(null);
  const [raspando, setRaspando] = useState(false);
  const [revelado, setRevelado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Sorteio diário ou fixado
  const [premio] = useState(() => {
    const premiosPossiveis = [
      { codigo: 'TRAILER10', titulo: 'R$ 10,00 OFF', desc: 'Em pedidos a partir de R$ 60', icone: '🔥' },
      { codigo: 'FRETEFREE', titulo: 'FRETE GRÁTIS', desc: 'Válido para toda a cidade', icone: '🛵' },
      { codigo: 'TRAILER5', titulo: 'R$ 5,00 OFF', desc: 'Em qualquer pedido hoje', icone: '🍔' }
    ];
    // Sorteia 1
    const idx = Math.floor(Math.random() * premiosPossiveis.length);
    return premiosPossiveis[idx];
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Desenhar camada de raspadinha metálica dourada
    const gradiente = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradiente.addColorStop(0, '#f59e0b');
    gradiente.addColorStop(0.3, '#d97706');
    gradiente.addColorStop(0.6, '#b45309');
    gradiente.addColorStop(1, '#78350f');

    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Texto instrução na raspadinha
    ctx.font = 'bold 16px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✨ RASPE COM O DEDO OU MOUSE ✨', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText('Descubra seu prêmio exclusivo!', canvas.width / 2, canvas.height / 2 + 15);
  }, []);

  function raspar(e) {
    if (revelado) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;

    if (clientX === undefined || clientY === undefined) return;

    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2, false);
    ctx.fill();

    verificarProgresso();
  }

  function verificarProgresso() {
    const canvas = canvasRef.current;
    if (!canvas || revelado) return;
    const ctx = canvas.getContext('2d');

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let pixelsRaspados = 0;
      const totalPixels = pixels.length / 4;

      // Amostragem para performance
      for (let i = 3; i < pixels.length; i += 16) {
        if (pixels[i] === 0) pixelsRaspados++;
      }

      const percentual = (pixelsRaspados / (totalPixels / 4)) * 100;
      if (percentual > 35) {
        setRevelado(true);
        // Limpa totalmente
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    } catch {
      // Ignora se der erro de cors
    }
  }

  function handleCopiar() {
    navigator.clipboard.writeText(premio.codigo);
    setCopiado(true);
    if (onAplicarCupom) {
      onAplicarCupom(premio.codigo);
    }
    setTimeout(() => {
      onFechar();
    }, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-amber-400/80 rounded-3xl max-w-sm w-full p-6 text-white shadow-2xl shadow-amber-500/20 relative overflow-hidden">
        {/* Botão Fechar */}
        <button
          onClick={onFechar}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Cabeçalho */}
        <div className="text-center space-y-1 mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-400/20 text-amber-400 border border-amber-400/40 mb-2 shadow-inner">
            <Trophy className="w-6 h-6 animate-bounce" />
          </div>
          <h3 className="text-lg font-black text-white flex items-center justify-center gap-1.5">
            <span>Raspadinha da Sorte</span>
            <span className="text-xs bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
              Trailer 94
            </span>
          </h3>
          <p className="text-xs text-slate-300">
            Passe o mouse ou deslize o dedo para raspar e revelar seu presente de hoje!
          </p>
        </div>

        {/* Área da Raspadinha */}
        <div className="relative w-full h-36 bg-slate-950 rounded-2xl border-2 border-dashed border-amber-400/60 overflow-hidden flex flex-col items-center justify-center p-3 select-none">
          {/* Conteúdo Revelado (Fica Atrás do Canvas) */}
          <div className="text-center space-y-1">
            <span className="text-3xl block">{premio.icone}</span>
            <span className="text-base font-black text-amber-400 uppercase tracking-tight block">
              {premio.titulo}
            </span>
            <span className="text-[11px] text-slate-300 block">
              {premio.desc}
            </span>
            <div className="mt-1 inline-block bg-slate-900 border border-amber-400/50 px-3 py-1 rounded-lg">
              <span className="font-mono font-black text-white tracking-widest text-xs">
                CÓDIGO: {premio.codigo}
              </span>
            </div>
          </div>

          {/* Camada Interativa do Canvas */}
          <canvas
            ref={canvasRef}
            width={340}
            height={144}
            className={`absolute inset-0 w-full h-full cursor-pointer touch-none transition-opacity duration-500 ${
              revelado ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
            onMouseDown={() => setRaspando(true)}
            onMouseUp={() => setRaspando(false)}
            onMouseLeave={() => setRaspando(false)}
            onMouseMove={(e) => raspando && raspar(e)}
            onTouchStart={() => setRaspando(true)}
            onTouchEnd={() => setRaspando(false)}
            onTouchMove={(e) => raspar(e)}
          />
        </div>

        {/* Ações */}
        <div className="mt-5 space-y-2">
          {revelado ? (
            <button
              onClick={handleCopiar}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-400/30 transition-transform active:scale-95"
            >
              {copiado ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4 stroke-[2.5]" />}
              <span>{copiado ? 'Cupom Aplicado com Sucesso!' : 'Copiar & Aplicar Cupom'}</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setRevelado(true);
                const canvas = canvasRef.current;
                if (canvas) {
                  const ctx = canvas.getContext('2d');
                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                }
              }}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Revelar Prêmio Imediatamente</span>
            </button>
          )}

          <p className="text-[10px] text-center text-slate-400">
            * 1 cupom por pedido. Desconto aplicado diretamente na sua sacola.
          </p>
        </div>
      </div>
    </div>
  );
}
