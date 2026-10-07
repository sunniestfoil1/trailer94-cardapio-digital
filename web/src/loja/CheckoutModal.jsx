import React, { useState, useEffect, useRef } from 'react';
import { X, Check, ArrowLeft, Loader2, MapPin, Phone, User, CreditCard, DollarSign, Search, Navigation } from 'lucide-react';
import { useCarrinho } from '../compartilhado/CarrinhoContext';
import { formatarPreco, formatarTelefone } from '../compartilhado/formatadores';
import { registrarPedidoSessao } from '../compartilhado/avaliacaoHelper';

export function CheckoutModal({ infoLoja, cupomAtivo, onClose, onPedidoCriado }) {
  const { itens, subtotal, limparCarrinho } = useCarrinho();
  const taxaEntregaBase = infoLoja?.taxaEntrega || 700;
  const freteGratis = subtotal >= 8000 || cupomAtivo?.tipo === 'frete_gratis';
  const taxaEntrega = freteGratis ? 0 : taxaEntregaBase;
  const valorDesconto = cupomAtivo?.desconto || 0;
  const total = Math.max(0, subtotal + taxaEntrega - valorDesconto);

  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  
  // Campos de endereço estruturados com autocomplete para Foz do Iguaçu - PR
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [complemento, setComplemento] = useState('');
  const [referencia, setReferencia] = useState('');
  
  const [sugestoesRuas, setSugestoesRuas] = useState([]);
  const [mostrandoSugestoes, setMostrandoSugestoes] = useState(false);
  const [buscandoRuas, setBuscandoRuas] = useState(false);
  const numeroInputRef = useRef(null);
  const sugestoesRef = useRef(null);

  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [trocoPara, setTrocoPara] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  // Busca preditiva de ruas de Foz do Iguaçu (offline / local backend)
  useEffect(() => {
    if (!rua || rua.trim().length < 2) {
      setSugestoesRuas([]);
      setMostrandoSugestoes(false);
      return;
    }

    const timer = setTimeout(async () => {
      setBuscandoRuas(true);
      try {
        const res = await fetch(`/api/enderecos/busca?q=${encodeURIComponent(rua.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSugestoesRuas(data || []);
          if (data && data.length > 0) {
            setMostrandoSugestoes(true);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar ruas:', err);
      } finally {
        setBuscandoRuas(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [rua]);

  // Fechar dropdown de sugestões ao clicar fora
  useEffect(() => {
    function handleClickFora(e) {
      if (sugestoesRef.current && !sugestoesRef.current.contains(e.target)) {
        setMostrandoSugestoes(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  function selecionarRua(sug) {
    setRua(sug.nome);
    setBairro(sug.bairro || '');
    setMostrandoSugestoes(false);
    setTimeout(() => {
      numeroInputRef.current?.focus();
    }, 50);
  }

  function handleTelefoneChange(e) {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length <= 11) {
      setTelefone(formatarTelefone(val));
    }
  }

  async function handleFinalizarPedido(e) {
    e.preventDefault();
    setErro('');

    if (!nome.trim() || !telefone.trim() || !rua.trim() || !numero.trim() || !bairro.trim()) {
      setErro('Por favor, preencha todos os campos obrigatórios (Nome, WhatsApp, Rua, Número e Bairro).');
      return;
    }

    const enderecoCompleto = `${rua.trim()}, ${numero.trim()} - ${bairro.trim()}`;

    setEnviando(true);

    try {
      const payload = {
        cliente: {
          nome: nome.trim(),
          telefone: telefone.replace(/\D/g, ''),
          endereco: enderecoCompleto,
          complemento: complemento.trim() || undefined,
          referencia: referencia.trim() || undefined,
        },
        itens: itens.map(item => ({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          opcionais: item.opcionais.map(op => ({ id: op.id }))
        })),
        formaPagamento,
        trocoPara: formaPagamento === 'dinheiro' && trocoPara ? trocoPara : undefined,
        observacoes: observacoes.trim() || undefined,
        cupom: cupomAtivo?.codigo || undefined
      };

      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.mensagem || 'Falha ao finalizar pedido.');
      }

      limparCarrinho();
      if (data.acessoToken) {
        registrarPedidoSessao(data.acessoToken);
      }
      onPedidoCriado(data.acessoToken);
    } catch (err) {
      setErro(err.message || 'Erro inesperado ao enviar seu pedido.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div 
        className="bg-white w-full max-w-xl rounded-2xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold text-base">Finalizar Pedido</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleFinalizarPedido} className="overflow-y-auto p-4 sm:p-6 space-y-5 flex-1">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {erro}
            </div>
          )}

          {/* Dados do Cliente */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-500" />
              <span>Seus Dados de Contato</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome Completo *
                </label>
                <input 
                  type="text" 
                  required
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: João da Silva"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  WhatsApp com DDD *
                </label>
                <input 
                  type="tel" 
                  required
                  value={telefone}
                  onChange={handleTelefoneChange}
                  placeholder="(45) 99999-9999"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Endereço de Entrega com Autocomplete Exclusivo Cascavel */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span>Endereço de Entrega</span>
              </h3>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                <span>Foz do Iguaçu - PR</span>
              </span>
            </div>

            {/* Campo Rua com Autocomplete */}
            <div className="relative" ref={sugestoesRef}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rua ou Avenida *
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  required
                  value={rua}
                  onChange={(e) => setRua(e.target.value)}
                  onFocus={() => {
                    if (sugestoesRuas.length > 0) setMostrandoSugestoes(true);
                  }}
                  placeholder="Comece a digitar o nome da sua rua..."
                  className="w-full text-xs sm:text-sm p-2.5 pr-8 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
                {buscandoRuas ? (
                  <Loader2 className="w-4 h-4 text-amber-500 animate-spin absolute right-2.5 top-3" />
                ) : (
                  <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
                )}
              </div>

              {/* Dropdown Flutuante de Sugestões de Foz do Iguaçu */}
              {mostrandoSugestoes && sugestoesRuas.length > 0 && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  <div className="p-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3">
                    Logradouros encontrados em Foz do Iguaçu - PR
                  </div>
                  {sugestoesRuas.map((sug) => (
                    <button
                      key={`${sug.id}-${sug.nome}-${sug.bairro}`}
                      type="button"
                      onClick={() => selecionarRua(sug)}
                      className="w-full text-left p-2.5 hover:bg-amber-50/80 transition-colors flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <div className="truncate">
                          <p className="text-xs font-bold text-slate-900 truncate">{sug.nome}</p>
                          {sug.bairro && <p className="text-[11px] text-slate-500 truncate">Bairro: {sug.bairro}</p>}
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded shrink-0">
                        Selecionar ↵
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Número e Bairro */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número *
                </label>
                <input 
                  type="text" 
                  required
                  ref={numeroInputRef}
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex: 1500 ou S/N"
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bairro em Foz do Iguaçu *
                </label>
                <input 
                  type="text" 
                  required
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Ex: Itaipu A, Lancaster, Centro..."
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Complemento e Ponto de Referência */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Complemento (Opcional)
                </label>
                <input 
                  type="text" 
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  placeholder="Apto 302, Bloco B..."
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ponto de Referência (Opcional)
                </label>
                <input 
                  type="text" 
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ex: Próximo ao Colégio Marista..."
                  className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Seleção Visual de Forma de Pagamento */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-amber-500" />
              <span>Forma de Pagamento</span>
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              {/* PIX */}
              <div 
                onClick={() => setFormaPagamento('pix')}
                className={`p-3 rounded-xl border cursor-pointer select-none flex items-center gap-3 transition-all ${
                  formaPagamento === 'pix' 
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/40' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <img src="/pagamentos/pix.webp" alt="PIX" className="w-7 h-7 object-contain" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">PIX</h4>
                  <p className="text-[10px] text-slate-500">Chave na tela</p>
                </div>
              </div>

              {/* Cartão de Débito */}
              <div 
                onClick={() => setFormaPagamento('debito')}
                className={`p-3 rounded-xl border cursor-pointer select-none flex items-center gap-3 transition-all ${
                  formaPagamento === 'debito' 
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/40' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <img src="/pagamentos/visa.webp" alt="Débito" className="w-7 h-7 object-contain" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Cartão Débito</h4>
                  <p className="text-[10px] text-slate-500">Na entrega</p>
                </div>
              </div>

              {/* Cartão de Crédito */}
              <div 
                onClick={() => setFormaPagamento('credito')}
                className={`p-3 rounded-xl border cursor-pointer select-none flex items-center gap-3 transition-all ${
                  formaPagamento === 'credito' 
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/40' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <img src="/pagamentos/martercard.webp" alt="Crédito" className="w-7 h-7 object-contain" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Cartão Crédito</h4>
                  <p className="text-[10px] text-slate-500">Na entrega</p>
                </div>
              </div>

              {/* Dinheiro */}
              <div 
                onClick={() => setFormaPagamento('dinheiro')}
                className={`p-3 rounded-xl border cursor-pointer select-none flex items-center gap-3 transition-all ${
                  formaPagamento === 'dinheiro' 
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-400/40' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  R$
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Dinheiro</h4>
                  <p className="text-[10px] text-slate-500">Precisa de troco?</p>
                </div>
              </div>
            </div>

            {formaPagamento === 'dinheiro' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Troco para quanto? (Deixe em branco se não precisar)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={trocoPara}
                  onChange={(e) => setTrocoPara(e.target.value)}
                  placeholder="Ex: 50 ou 100"
                  className="w-full text-xs sm:text-sm p-2 rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>

          {/* Resumo Financeiro */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal ({itens.length} itens)</span>
              <span>{formatarPreco(subtotal)}</span>
            </div>
            {valorDesconto > 0 && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>Desconto ({cupomAtivo?.codigo})</span>
                <span>- {formatarPreco(valorDesconto)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxa de Entrega</span>
              <span className={freteGratis ? 'text-emerald-600 font-bold' : ''}>
                {freteGratis ? 'GRÁTIS' : formatarPreco(taxaEntrega)}
              </span>
            </div>
            <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total a pagar</span>
              <span className="text-amber-600 font-black">{formatarPreco(total)}</span>
            </div>
          </div>

          {/* Botão de Confirmação */}
          <button 
            type="submit"
            disabled={enviando}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-950 disabled:bg-slate-600 text-amber-300 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
          >
            {enviando ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Enviando seu pedido...</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                <span>Confirmar e Realizar Pedido ({formatarPreco(total)})</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
