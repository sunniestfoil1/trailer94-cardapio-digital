import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Clock, Check, Play, Printer, Volume2, VolumeX, 
  RefreshCw, AlertCircle, Sparkles, Phone, MapPin, Bike, CheckCircle2,
  Store, ShieldCheck
} from 'lucide-react';
import { formatarPreco } from '../compartilhado/formatadores';
import { tocarSinoPedido } from '../compartilhado/audio';
import { inscreverCanal } from '../compartilhado/supabaseClient';
import { ModalComandaTermica, dispararImpressaoAutomatica } from '../admin/ComandaTermica';
import { EMPRESA_CONFIG } from '../empresa.config';

export function CozinhaPage() {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [somAtivo, setSomAtivo] = useState(true);
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('trailer94_autoprint') === 'true');
  const [pedidoImprimindo, setPedidoImprimindo] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState('ativos'); // 'ativos' | 'recebido' | 'em_preparo' | 'pronto'
  const [horaAtual, setHoraAtual] = useState(new Date().toLocaleTimeString('pt-BR'));

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setHoraAtual(new Date().toLocaleTimeString('pt-BR'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Carregar pedidos da Cozinha (pedidos das últimas 24h)
  async function carregarPedidos() {
    setCarregando(true);
    try {
      const res = await fetch('/api/cardapio/pedidos-cozinha');
      if (res.ok) {
        const dados = await res.json();
        setPedidos(dados);
      } else {
        // Fallback para rota pública se necessário
        const resGeral = await fetch('/api/cardapio');
        if (resGeral.ok) {
          const d = await resGeral.json();
          if (d.pedidos) setPedidos(d.pedidos);
        }
      }
    } catch (err) {
      console.error('Falha ao carregar pedidos da cozinha:', err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarPedidos();

    // Inscrever no canal Realtime da Cozinha KDS
    const parar = inscreverCanal('cozinha', (dados) => {
      if (dados.tipo === 'pedido:novo') {
        setPedidos(atuais => [dados.pedido, ...atuais]);
        if (somAtivo) tocarSinoPedido();

        // Auto Impressão Térmica se ativada
        if (autoPrint) {
          const largura = localStorage.getItem('trailer94_print_width') || '80mm';
          const vias = Number(localStorage.getItem('trailer94_print_vias')) || 1;
          const ip = localStorage.getItem('trailer94_print_ip') || '';
          dispararImpressaoAutomatica(dados.pedido, { largura, vias, ipImpressora: ip });
        }
      } else if (dados.tipo === 'pedido:atualizado') {
        setPedidos(atuais => atuais.map(p => p.id === dados.pedido.id ? dados.pedido : p));
      }
    });

    return parar;
  }, [somAtivo, autoPrint]);

  async function mudarStatus(pedidoId, novoStatus) {
    try {
      const res = await fetch(`/api/cardapio/pedidos/${pedidoId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });

      if (res.ok) {
        setPedidos(atuais => atuais.map(p => p.id === pedidoId ? { ...p, status: novoStatus } : p));
      } else {
        // Tenta rota alternativa se a rota pública de status falhar
        const resAdmin = await fetch(`/api/admin/pedidos/${pedidoId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: novoStatus })
        });
        if (resAdmin.ok) {
          setPedidos(atuais => atuais.map(p => p.id === pedidoId ? { ...p, status: novoStatus } : p));
        }
      }
    } catch (err) {
      console.error('Erro ao mudar status:', err);
    }
  }

  // Filtragem dos pedidos para visualização no KDS da Cozinha
  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroStatus === 'recebido') return p.status === 'recebido';
    if (filtroStatus === 'em_preparo') return p.status === 'em_preparo';
    if (filtroStatus === 'pronto') return p.status === 'pronto';
    // 'ativos': recebidos, em preparo ou prontos (exclui entregue/cancelado)
    return ['recebido', 'em_preparo', 'pronto'].includes(p.status);
  });

  const novosCount = pedidos.filter(p => p.status === 'recebido').length;
  const preparoCount = pedidos.filter(p => p.status === 'em_preparo').length;
  const prontosCount = pedidos.filter(p => p.status === 'pronto').length;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans selection:bg-amber-400 selection:text-black">
      {/* Header Fixo de Produção KDS */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
              <ChefHat className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">COZINHA & KDS</h1>
                <span className="text-xs bg-amber-400/20 text-amber-400 px-2.5 py-0.5 rounded-full border border-amber-400/30 font-extrabold">
                  {EMPRESA_CONFIG.nome}
                </span>
              </div>
              <p className="text-xs text-slate-400">Painel de Preparo & Embalagem ao Vivo</p>
            </div>
          </div>

          {/* Relógio em Tempo Real & Contadores de Produção */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-amber-400 font-bold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">{horaAtual}</span>
            </div>

            {/* Contadores KDS */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setFiltroStatus('ativos')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  filtroStatus === 'ativos' ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
              >
                Todos ({novosCount + preparoCount + prontosCount})
              </button>

              <button
                onClick={() => setFiltroStatus('recebido')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors flex items-center gap-1.5 ${
                  filtroStatus === 'recebido' ? 'bg-amber-500 text-slate-950' : 'text-amber-400 hover:bg-slate-800'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                Novos ({novosCount})
              </button>

              <button
                onClick={() => setFiltroStatus('em_preparo')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  filtroStatus === 'em_preparo' ? 'bg-blue-500 text-white' : 'text-blue-400 hover:bg-slate-800'
                }`}
              >
                Preparo ({preparoCount})
              </button>

              <button
                onClick={() => setFiltroStatus('pronto')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                  filtroStatus === 'pronto' ? 'bg-emerald-500 text-slate-950' : 'text-emerald-400 hover:bg-slate-800'
                }`}
              >
                Prontos ({prontosCount})
              </button>
            </div>

            {/* Controles de Som, Auto-Print e Navegação de Saída */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSomAtivo(!somAtivo)}
                className={`p-2 rounded-xl border transition-colors ${
                  somAtivo ? 'bg-amber-400/20 text-amber-400 border-amber-400/40' : 'bg-slate-800 text-slate-500 border-slate-700'
                }`}
                title={somAtivo ? 'Som de alarme ativado' : 'Som desativado'}
              >
                {somAtivo ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>

              <button
                onClick={() => {
                  const val = !autoPrint;
                  setAutoPrint(val);
                  localStorage.setItem('trailer94_autoprint', String(val));
                }}
                className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-colors ${
                  autoPrint ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Auto-Print: {autoPrint ? 'LIGADO' : 'DESLIGADO'}</span>
              </button>

              <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

              {/* Botões de Saída / Navegação */}
              <a
                href="/"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:border-amber-400/50"
                title="Voltar para a Loja Principal"
              >
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span>Ver Loja</span>
              </a>

              <a
                href="/admin"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:border-blue-400/50"
                title="Ir para o Painel Administrativo"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Admin</span>
              </a>

              <a
                href="/entregador"
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-all hover:border-emerald-400/50"
                title="Ir para o Painel do Entregador"
              >
                <Bike className="w-3.5 h-3.5 text-emerald-400" />
                <span>Entregador</span>
              </a>
            </div>
          </div>

        </div>
      </header>

      {/* Grid KDS Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {carregando ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
            <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
            <p className="font-bold text-sm">Carregando comanda da cozinha...</p>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-amber-400 flex items-center justify-center text-2xl shadow-inner">
              🍳
            </div>
            <h3 className="text-lg font-black text-white">Nenhum pedido pendente na cozinha</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Tudo pronto por aqui! Os novos pedidos do QR Code da mesa e delivery aparecerão nesta tela automaticamente com som.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {pedidosFiltrados.map(pedido => {
              const isNovo = pedido.status === 'recebido';
              const isPreparo = pedido.status === 'em_preparo';
              const isPronto = pedido.status === 'pronto';

              return (
                <div 
                  key={pedido.id}
                  className={`bg-slate-900 border-2 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between transition-all ${
                    isNovo 
                      ? 'border-amber-400 shadow-amber-400/10 animate-pulse' 
                      : isPreparo 
                        ? 'border-blue-500' 
                        : 'border-emerald-500 opacity-90'
                  }`}
                >
                  {/* Topo do Card do Pedido */}
                  <div className={`p-4 flex items-center justify-between border-b ${
                    isNovo ? 'bg-amber-400 text-slate-950 border-amber-500' : isPreparo ? 'bg-blue-600 text-white border-blue-500' : 'bg-emerald-600 text-white border-emerald-500'
                  }`}>
                    <div>
                      <span className="text-xl font-black block tracking-tight">
                        {pedido.codigo || `#T94-${pedido.id}`}
                      </span>
                      <span className="text-xs font-bold opacity-90">
                        {pedido.cliente_nome || 'Cliente Mesa/Balcão'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-black/30">
                        {isNovo ? '🔥 NOVO' : isPreparo ? '🍳 EM PREPARO' : '✅ PRONTO'}
                      </span>
                      <span className="text-[10px] block font-mono font-bold mt-1 opacity-90">
                        {new Date(pedido.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Itens do Pedido (Destaque Visual para a Cozinha) */}
                  <div className="p-4 flex-1 space-y-3 font-sans">
                    <div className="space-y-2.5 divide-y divide-slate-800">
                      {(pedido.itens || []).map((item, idx) => (
                        <div key={idx} className={`${idx > 0 ? 'pt-2.5' : ''}`}>
                          <div className="flex items-start justify-between text-sm font-black text-white">
                            <span className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center text-sm font-black shrink-0">
                                {item.quantidade}x
                              </span>
                              <span>{item.nome_produto}</span>
                            </span>
                          </div>

                          {/* Opcionais / Adicionais */}
                          {item.opcionais && item.opcionais.length > 0 && (
                            <ul className="pl-9 mt-1 text-xs text-amber-300 font-bold space-y-0.5">
                              {item.opcionais.map((opc, oIdx) => (
                                <li key={oIdx} className="flex items-center gap-1">
                                  <span>+ {opc.nome_opcional || opc.nome}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Observação do Item */}
                          {item.observacoes && (
                            <div className="pl-9 mt-1 text-xs text-rose-400 font-black flex items-center gap-1 bg-rose-950/40 p-1.5 rounded-lg border border-rose-500/30">
                              <span>⚠️ {item.observacoes}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Observações Gerais do Pedido */}
                    {pedido.observacoes && (
                      <div className="mt-3 p-2.5 bg-amber-400/10 border border-amber-400/30 rounded-xl text-xs text-amber-300 font-bold space-y-0.5">
                        <span className="text-[10px] text-amber-400 uppercase font-black block">Observação do Cliente:</span>
                        <p>{pedido.observacoes}</p>
                      </div>
                    )}
                  </div>

                  {/* Ações de Transição de Status na Cozinha */}
                  <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                      <span>Forma Pagto: <strong className="text-white uppercase font-bold">{pedido.forma_pagamento}</strong></span>
                      <span className="text-emerald-400 font-black">{formatarPreco(pedido.total)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setPedidoImprimindo(pedido)}
                        className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
                      >
                        <Printer className="w-4 h-4 text-amber-400" />
                        <span>Comanda</span>
                      </button>

                      {isNovo && (
                        <button
                          onClick={() => mudarStatus(pedido.id, 'em_preparo')}
                          className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                        >
                          <Play className="w-4 h-4 fill-white" />
                          <span>Iniciar Preparo</span>
                        </button>
                      )}

                      {isPreparo && (
                        <button
                          onClick={() => mudarStatus(pedido.id, 'pronto')}
                          className="py-2.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Marcar Pronto</span>
                        </button>
                      )}

                      {isPronto && (
                        <button
                          onClick={() => mudarStatus(pedido.id, 'entregue')}
                          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-black text-xs flex items-center justify-center gap-1.5 border border-emerald-500/30 transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Finalizar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de Impressão de Comanda */}
      {pedidoImprimindo && (
        <ModalComandaTermica
          pedido={pedidoImprimindo}
          onFechar={() => setPedidoImprimindo(null)}
        />
      )}
    </div>
  );
}
