import React, { useState } from 'react';
import { X, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { formatarPreco } from '../compartilhado/formatadores';
import { useCarrinho } from '../compartilhado/CarrinhoContext';

export function ModalProduto({ produto, onClose }) {
  const { adicionarItem } = useCarrinho();
  const [quantidade, setQuantidade] = useState(1);
  const [observacoes, setObservacoes] = useState('');
  // Mapa de seleções: grupoId -> array de itens selecionados
  const [opcoesSelecionadas, setOpcoesSelecionadas] = useState({});
  const [erroValidacao, setErroValidacao] = useState('');

  if (!produto) return null;

  const grupos = produto.gruposOpcionais || [];

  function selecionarOpcao(grupo, item) {
    setErroValidacao('');
    setOpcoesSelecionadas(anteriores => {
      const atuais = anteriores[grupo.id] || [];
      const ehUnicaEscolha = grupo.max_escolhas === 1;

      if (ehUnicaEscolha) {
        return { ...anteriores, [grupo.id]: [item] };
      }

      // Escolha múltipla (checkbox)
      const jaSelecionado = atuais.some(it => it.id === item.id);
      if (jaSelecionado) {
        return {
          ...anteriores,
          [grupo.id]: atuais.filter(it => it.id !== item.id)
        };
      } else {
        if (atuais.length >= grupo.max_escolhas) {
          return anteriores; // limite atingido
        }
        return {
          ...anteriores,
          [grupo.id]: [...atuais, item]
        };
      }
    });
  }

  // Calcular valor adicional total dos opcionais
  const adicionalTotal = Object.values(opcoesSelecionadas)
    .flat()
    .reduce((acc, item) => acc + (item.preco_adicional || 0), 0);

  const precoBase = produto.preco_promocional ?? produto.preco_base;
  const precoUnitarioTotal = precoBase + adicionalTotal;
  const totalItem = precoUnitarioTotal * quantidade;

  function validarEAdicionar() {
    // Validar se todos os grupos obrigatórios foram preenchidos
    for (const grupo of grupos) {
      if (grupo.obrigatorio) {
        const escolhas = opcoesSelecionadas[grupo.id] || [];
        if (escolhas.length < grupo.min_escolhas || escolhas.length === 0) {
          setErroValidacao(`Por favor, selecione uma opção obrigatória em "${grupo.titulo}".`);
          return;
        }
      }
    }

    const todosOpcionais = Object.values(opcoesSelecionadas).flat();
    adicionarItem(produto, todosOpcionais, observacoes.trim(), quantidade);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div 
        className="bg-slate-950 w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl border-t-2 sm:border-2 border-amber-400/80 text-white overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com Imagem de Destaque e Linha Forte */}
        <div className="relative h-56 sm:h-64 w-full bg-black shrink-0">
          <img 
            src={produto.imagens?.[0] || '/imagens/origem/instagram/baixada-1.jpg'} 
            alt={produto.nome}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = '/imagens/origem/instagram/baixada-1.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-black/60" />

          {/* Botão Fechar de Alto Contraste */}
          <button 
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/80 hover:bg-black text-white border border-slate-700 flex items-center justify-center backdrop-blur-md transition-transform active:scale-95"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Informações Principais do Produto */}
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-xl sm:text-2xl font-black text-white drop-shadow-md">
              {produto.nome}
            </h2>
            <div className="h-1 w-16 bg-amber-400 rounded-full my-2 shadow-md shadow-amber-400/30"></div>
            <p className="text-amber-400 font-black text-xl">
              {formatarPreco(precoBase)}
            </p>
          </div>
        </div>

        {/* Corpo com scroll dos opcionais e tabela estruturada */}
        <div className="overflow-y-auto p-5 sm:p-6 space-y-6 flex-1 text-slate-100">
          {/* Descrição e Ingredientes */}
          {(produto.descricao || produto.ingredientes) && (
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                {produto.descricao || produto.ingredientes}
              </p>
            </div>
          )}

          {/* Grupos de Opcionais em formato de TABELA ESTRUTURADA */}
          {grupos.map((grupo) => {
            const ehUnico = grupo.max_escolhas === 1;
            const selecionados = opcoesSelecionadas[grupo.id] || [];

            return (
              <div key={grupo.id} className="border-t-2 border-slate-800/90 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                      {grupo.titulo}
                    </h4>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {ehUnico ? 'Escolha 1 opção' : `Escolha até ${grupo.max_escolhas} opções`}
                    </p>
                  </div>
                  {grupo.obrigatorio ? (
                    <span className="text-[10px] uppercase tracking-wider font-black px-2.5 py-1 bg-amber-400 text-slate-950 rounded-md">
                      Obrigatório
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 bg-slate-800 text-slate-400 rounded-md border border-slate-700">
                      Opcional
                    </span>
                  )}
                </div>

                {/* Tabela de Opcionais com linhas fortes e sem aglomeração de textos */}
                <div className="overflow-hidden rounded-xl border-2 border-slate-800 bg-slate-900/90">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-950/80 border-b-2 border-slate-800 text-[11px] font-black uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-3.5 w-12 text-center">Item</th>
                        <th className="py-2.5 px-3 text-left">Descrição</th>
                        <th className="py-2.5 px-3.5 text-right">Adicional</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {grupo.itens?.map((item) => {
                        const ativo = selecionados.some(it => it.id === item.id);
                        return (
                          <tr
                            key={item.id}
                            onClick={() => selecionarOpcao(grupo, item)}
                            className={`cursor-pointer transition-colors select-none ${
                              ativo 
                                ? 'bg-amber-400/20 text-white font-semibold' 
                                : 'hover:bg-slate-800/70 text-slate-200'
                            }`}
                          >
                            <td className="py-3.5 px-3.5 text-center">
                              <div className={`w-5 h-5 rounded-${ehUnico ? 'full' : 'md'} border-2 flex items-center justify-center mx-auto transition-colors ${
                                ativo ? 'bg-amber-400 border-amber-400 text-slate-950 font-black' : 'border-slate-500 bg-slate-800'
                              }`}>
                                {ativo && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-xs sm:text-sm font-semibold">
                              {item.nome}
                            </td>
                            <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                              {item.preco_adicional > 0 ? (
                                <span className="text-xs sm:text-sm font-black text-amber-400">
                                  + {formatarPreco(item.preco_adicional)}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500 font-bold">Grátis</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {/* Campo de Observações */}
          <div className="border-t-2 border-slate-800/90 pt-5">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Alguma observação especial?
            </label>
            <textarea 
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Ex: sem cebola, maionese à parte, carne bem passada..."
              className="w-full text-xs sm:text-sm p-3.5 rounded-xl border-2 border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
            />
          </div>

          {/* Mensagem de Erro de Validação */}
          {erroValidacao && (
            <div className="p-3.5 bg-red-950/80 border-2 border-red-500 text-red-200 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold">{erroValidacao}</span>
            </div>
          )}
        </div>

        {/* Rodapé Fixo com Quantidade e CTA */}
        <div className="p-4 sm:p-5 bg-slate-950 border-t-2 border-slate-800/90 flex items-center gap-4 shrink-0">
          <div className="flex items-center border-2 border-slate-700 rounded-xl bg-slate-900 shadow-md px-2 py-1">
            <button 
              onClick={() => setQuantidade(q => Math.max(1, q - 1))}
              disabled={quantidade <= 1}
              aria-label="Diminuir quantidade"
              className="p-1.5 text-slate-400 disabled:opacity-30 hover:text-amber-400"
            >
              <Minus className="w-4 h-4 stroke-[3]" />
            </button>
            <span className="w-8 text-center font-black text-sm text-white">
              {quantidade}
            </span>
            <button 
              onClick={() => setQuantidade(q => q + 1)}
              aria-label="Aumentar quantidade"
              className="p-1.5 text-slate-400 hover:text-amber-400"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          <button 
            onClick={validarEAdicionar}
            className="flex-1 py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm flex items-center justify-between shadow-xl shadow-amber-400/20 transition-all active:scale-98"
          >
            <span>Adicionar ao Pedido</span>
            <span className="font-black text-base">{formatarPreco(totalItem)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
