import React, { useEffect, useState } from 'react';
import { X, Upload, Check, Loader2 } from 'lucide-react';

// Modal simples: mostra as imagens já enviadas pro bucket (reaproveitar) e um
// botão de upload de arquivo novo. Escolher uma chama onEscolher(url), que
// quem usa o componente decide o que fazer (vincular ao produto).
export function SeletorImagemProduto({ produto, onFechar, onEscolher }) {
  const [imagens, setImagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    fetch('/api/admin/imagens')
      .then(r => r.json())
      .then(setImagens)
      .catch(() => setErro('Não consegui carregar as imagens já enviadas.'))
      .finally(() => setCarregando(false));
  }, []);

  async function enviarArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviando(true);
    setErro('');
    try {
      const formData = new FormData();
      formData.append('imagem', arquivo);
      const res = await fetch('/api/admin/upload-imagem', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.mensagem || 'Falha no upload.');
      await onEscolher(data.arquivo);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={onFechar}>
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Foto de: {produto.nome}</h3>
            <p className="text-xs text-slate-400">Escolha uma já enviada ou suba um arquivo novo.</p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-800">
          <label className={`flex items-center justify-center gap-2 border-2 border-dashed border-slate-700 rounded-xl py-4 cursor-pointer hover:border-amber-400 transition-colors ${enviando ? 'opacity-60 pointer-events-none' : ''}`}>
            {enviando ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <Upload className="w-4 h-4 text-amber-400" />}
            <span className="text-xs font-bold text-slate-300">
              {enviando ? 'Enviando...' : 'Subir foto nova do computador'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={enviarArquivo} disabled={enviando} />
          </label>
          {erro && <p className="text-xs text-red-400 mt-2">{erro}</p>}
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Já enviadas ({imagens.length})
          </h4>
          {carregando ? (
            <p className="text-xs text-slate-500">Carregando...</p>
          ) : imagens.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma imagem enviada ainda.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {imagens.map((img) => (
                <button
                  key={img.nome}
                  onClick={() => onEscolher(img.url)}
                  className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-800 hover:border-amber-400 transition-colors group"
                  title={img.nome}
                >
                  <img src={img.url} alt={img.nome} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Check className="w-5 h-5 text-amber-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
