import React, { useState, useEffect } from 'react';
import { 
  Bike, Navigation, CheckCircle2, Clock, DollarSign, LogOut, 
  MapPin, Phone, AlertCircle, RefreshCw, ChevronRight, PackageCheck,
  Volume2, VolumeX
} from 'lucide-react';
import { formatarPreco, formatarTelefone } from '../compartilhado/formatadores';
import { tocarAlertaEntrega } from '../compartilhado/audio';
import { inscreverCanal } from '../compartilhado/supabaseClient';
import { ativarNotificacoesPush, desativarNotificacoesPush, statusPermissaoPush } from '../compartilhado/push';
import { MiniMapaRotaPreview } from './MiniMapaRotaPreview';
import { EMPRESA_CONFIG } from '../empresa.config';

export function EntregadorDashboard({ motoboy, onLogout }) {
  const [abaAtiva, setAbaAtiva] = useState('disponiveis'); // 'disponiveis' | 'ativas' | 'metricas'
  const [disponiveis, setDisponiveis] = useState([]);
  const [minhasAtivas, setMinhasAtivas] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [metricas, setMetricas] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [somAtivo, setSomAtivo] = useState(true);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [mensagemErro, setMensagemErro] = useState('');

  async function carregarTudo() {
    try {
      const [resDisp, resMinhas, resMetr] = await Promise.all([
        fetch('/api/motoboy/disponiveis'),
        fetch('/api/motoboy/minhas-entregas'),
        fetch('/api/motoboy/metricas')
      ]);

      if (resDisp.ok) setDisponiveis(await resDisp.json());
      if (resMinhas.ok) {
        const d = await resMinhas.json();
        setMinhasAtivas(d.ativas || []);
        setHistorico(d.historico || []);
      }
      if (resMetr.ok) setMetricas(await resMetr.json());
    } catch (err) {
      console.error('Falha ao atualizar dados do motoboy:', err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarTudo();

    // Tempo real via Supabase Realtime (o servidor manda com realtime.send)
    function tratarMensagem(dados) {
      if (dados.tipo === 'entrega:disponivel') {
        setDisponiveis(atuais => [dados.pedido, ...atuais.filter(p => p.id !== dados.pedido.id)]);
        if (somAtivo) {
          tocarAlertaEntrega();
        }
      } else if (dados.tipo === 'entrega:removida') {
        setDisponiveis(atuais => atuais.filter(p => p.id !== dados.pedidoId));
      } else if (dados.tipo === 'motoboy:status_alterado') {
        // Aprovação/desativação chegou em tempo real — recarrega tudo pra refletir
        carregarTudo();
      }
    }

    const pararMotoboys = inscreverCanal('motoboys', tratarMensagem);
    const pararPessoal = inscreverCanal(`motoboy:${motoboy.id}`, tratarMensagem);

    return () => {
      pararMotoboys();
      pararPessoal();
    };
  }, [motoboy.id, somAtivo]);

  const [pushAtivo, setPushAtivo] = useState(statusPermissaoPush() === 'granted');

  async function alternarPush() {
    if (pushAtivo) {
      await desativarNotificacoesPush(motoboy.id);
      setPushAtivo(false);
      setMensagemSucesso('Notificações desativadas.');
    } else {
      const ok = await ativarNotificacoesPush(motoboy.id);
      setPushAtivo(ok);
      setMensagemSucesso(ok ? 'Notificações ativadas! Você recebe alerta mesmo com o app fechado.' : '');
      if (!ok) setMensagemErro('Não foi possível ativar as notificações. Verifique a permissão do navegador.');
    }
  }

  async function aceitarCorrida(pedidoId) {
    setMensagemErro('');
    setMensagemSucesso('');

    try {
      const res = await fetch(`/api/motoboy/pedidos/${pedidoId}/aceitar`, {
        method: 'POST'
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error('Outro entregador acabou de aceitar esta corrida!');
        }
        throw new Error(data.mensagem || 'Falha ao aceitar corrida.');
      }

      setMensagemSucesso('Corrida aceita com sucesso! Rota liberada.');
      carregarTudo();
      setAbaAtiva('ativas');
    } catch (err) {
      setMensagemErro(err.message);
      carregarTudo();
    }
  }

  async function finalizarEntrega(pedidoId) {
    try {
      const res = await fetch(`/api/motoboy/entregas/${pedidoId}/entregue`, {
        method: 'PATCH'
      });
      if (res.ok) {
        setMensagemSucesso('Entrega finalizada com sucesso! Saldo creditado.');
        carregarTudo();
      }
    } catch (err) {
      setMensagemErro('Erro ao marcar entrega como finalizada.');
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Header do Entregador */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span>{motoboy.nome}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h1>
              <p className="text-[11px] text-slate-400">{motoboy.veiculo || 'Moto de Entrega'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={alternarPush}
              className={`p-2 rounded-xl border transition-colors ${pushAtivo ? 'bg-emerald-500 text-slate-950 border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              title={pushAtivo ? 'Desativar notificações push (fora do expediente)' : 'Ativar notificações push de novas entregas'}
            >
              <Bike className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                const novo = !somAtivo;
                setSomAtivo(novo);
                if (novo) tocarAlertaEntrega();
                setMensagemSucesso(novo ? 'Alerta sonoro de entregas ativado!' : 'Alerta sonoro silenciado.');
              }}
              className={`p-2 rounded-xl border transition-colors ${somAtivo ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              title={somAtivo ? 'Silenciar alerta de entrega' : 'Ativar alerta sonoro'}
            >
              {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button 
              onClick={carregarTudo}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              title="Atualizar"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              onClick={onLogout}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 bg-red-950/60 border border-red-500/30 px-3 py-1.5 rounded-xl font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="max-w-2xl mx-auto flex gap-2 mt-4">
          <button
            onClick={() => setAbaAtiva('disponiveis')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'disponiveis' 
                ? 'bg-amber-400 text-slate-950 shadow-md' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Disponíveis</span>
            {disponiveis.length > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                {disponiveis.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAbaAtiva('ativas')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              abaAtiva === 'ativas' 
                ? 'bg-amber-400 text-slate-950 shadow-md' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Em Rota</span>
            {minhasAtivas.length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                {minhasAtivas.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setAbaAtiva('metricas')}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              abaAtiva === 'metricas' 
                ? 'bg-amber-400 text-slate-950 shadow-md' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Ganhos
          </button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {mensagemSucesso && (
          <div className="p-3 bg-emerald-950 border border-emerald-500/50 text-emerald-200 text-xs rounded-xl flex items-center justify-between">
            <span>{mensagemSucesso}</span>
            <button onClick={() => setMensagemSucesso('')} className="text-emerald-400 font-bold ml-2">×</button>
          </div>
        )}

        {mensagemErro && (
          <div className="p-3 bg-red-950 border border-red-500/50 text-red-200 text-xs rounded-xl flex items-center justify-between">
            <span>{mensagemErro}</span>
            <button onClick={() => setMensagemErro('')} className="text-red-400 font-bold ml-2">×</button>
          </div>
        )}

        {/* ABA: ENTREGAS DISPONÍVEIS */}
        {abaAtiva === 'disponiveis' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Radar de Corridas Prontas no Trailer 94 ({disponiveis.length})
            </h2>

            {disponiveis.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                <Clock className="w-12 h-12 stroke-1 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-300">Nenhuma entrega disponível no momento</p>
                <p className="text-xs text-slate-500 mt-1">
                  Assim que a chapa liberar um pedido pronto, ele tocará aqui em tempo real.
                </p>
              </div>
            ) : (
              disponiveis.map((p) => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4 shadow-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs text-amber-400 font-extrabold">{p.codigo}</span>
                      <h3 className="text-sm font-bold text-white">{p.cliente_nome}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Seu Repasse:</span>
                      <span className="text-base font-black text-emerald-400">
                        {formatarPreco(p.valor_motoboy || 600)}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <p className="flex items-start gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>{p.cliente_endereco} {p.cliente_complemento ? `(${p.cliente_complemento})` : ''}</span>
                    </p>
                    {p.cliente_referencia && (
                      <p className="text-[11px] text-slate-400 pl-5.5">Ref: {p.cliente_referencia}</p>
                    )}
                  </div>

                  {/* Mini Mapa e Preview de Rota */}
                  <MiniMapaRotaPreview 
                    endereco={p.cliente_endereco}
                    idPedido={p.id}
                  />

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <div className="text-[11px] text-slate-400">
                      Total pedido: <strong className="text-slate-200">{formatarPreco(p.total)}</strong> ({p.forma_pagamento})
                    </div>

                    <button
                      onClick={() => aceitarCorrida(p.id)}
                      className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg transition-transform active:scale-95 flex items-center gap-1.5"
                    >
                      <Bike className="w-4 h-4" />
                      <span>Aceitar Corrida</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA: MINHAS ENTREGAS ATIVAS */}
        {abaAtiva === 'ativas' && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Entregas em Rota ({minhasAtivas.length})
            </h2>

            {minhasAtivas.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
                <Bike className="w-12 h-12 stroke-1 text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-300">Você não tem entregas em andamento</p>
                <p className="text-xs text-slate-500 mt-1">
                  Vá na aba "Disponíveis" e pegue uma corrida para iniciar o trajeto.
                </p>
              </div>
            ) : (
              minhasAtivas.map((p) => (
                <div key={p.id} className="bg-slate-900 border-2 border-amber-400/80 rounded-2xl p-5 shadow-2xl space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-bold text-amber-400">{p.codigo}</span>
                      <h3 className="text-base font-bold text-white">{p.cliente_nome}</h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
                      Repasse: {formatarPreco(p.valor_motoboy || 600)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl space-y-1.5 text-xs text-slate-300">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                      <strong className="text-white">{p.cliente_endereco}</strong>
                    </p>
                    {p.cliente_complemento && <p className="text-slate-400 pl-5.5">Compl: {p.cliente_complemento}</p>}
                    <p className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
                      <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{formatarTelefone(p.cliente_telefone)}</span>
                    </p>
                  </div>

                  {/* Mini Mapa de Rota com KM, Animação de Moto e Botão Google Maps */}
                  <MiniMapaRotaPreview 
                    endereco={p.cliente_endereco}
                    idPedido={p.id}
                  />

                  {/* Botão Concluir Entrega */}
                  <button
                    onClick={() => finalizarEntrega(p.id)}
                    className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>Confirmar Entrega Concluída</span>
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA: MÉTRICAS & HISTÓRICO */}
        {abaAtiva === 'metricas' && (
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Resumo de Produtividade
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                <span className="text-xs text-slate-400">Entregas Hoje</span>
                <p className="text-2xl font-black text-amber-400 mt-1">
                  {metricas?.hoje?.entregas || 0}
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
                <span className="text-xs text-slate-400">Ganhos Hoje</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {metricas?.hoje?.ganhosFormatados || 'R$ 0,00'}
                </p>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Últimas Entregas Realizadas
              </h3>

              <div className="divide-y divide-slate-800 text-xs">
                {historico.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Nenhuma entrega no histórico recente.</p>
                ) : (
                  historico.map((h) => (
                    <div key={h.id} className="py-2.5 flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white">{h.codigo}</span>
                        <p className="text-[11px] text-slate-400">{h.cliente_nome}</p>
                      </div>
                      <span className="font-extrabold text-emerald-400">
                        + {formatarPreco(h.valor_motoboy || 600)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
