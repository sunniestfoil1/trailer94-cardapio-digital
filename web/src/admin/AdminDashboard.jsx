import React, { useState, useEffect } from 'react';
import { 
  ChefHat, Bike, DollarSign, Package, Settings, LogOut, 
  Check, X, Clock, AlertTriangle, ArrowRight, RefreshCw, 
  Search, ShieldCheck, Flame, ToggleLeft, ToggleRight, CheckCircle2,
  Volume2, VolumeX, KeyRound, Calendar, ImageIcon, Pencil, PlusCircle,
  Smartphone, Download, MapPin, Printer, Zap, Bell, BellRing,
  MessageCircle, Layers, Play, Pause
} from 'lucide-react';
import { formatarPreco, formatarTelefone } from '../compartilhado/formatadores';
import { tocarSinoPedido } from '../compartilhado/audio';
import { inscreverCanal } from '../compartilhado/supabaseClient';
import { SeletorImagemProduto } from './SeletorImagemProduto';
import { ModalEditarProduto } from './ModalEditarProduto';
import { MapaCalorPedidos } from './MapaCalorPedidos';
import { ModalComandaTermica, dispararImpressaoAutomatica } from './ComandaTermica';
import { PainelFinanceiroCMV } from './PainelFinanceiroCMV';
import { EMPRESA_CONFIG } from '../empresa.config';

export function AdminDashboard({ usuario, onLogout }) {
  const [abaAtiva, setAbaAtiva] = useState('kds'); // 'kds' | 'produtos' | 'motoboys' | 'mapa' | 'financeiro' | 'configuracoes'
  const [metricas, setMetricas] = useState(null);
  const [pedidos, setPedidos] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [motoboys, setMotoboys] = useState([]);
  const [configuracoes, setConfiguracoes] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [somAtivo, setSomAtivo] = useState(true);
  const [simulandoPedido, setSimulandoPedido] = useState(false);
  const [simulandoLote, setSimulandoLote] = useState(false);
  const [autoFluxoAtivo, setAutoFluxoAtivo] = useState(false);
  const [realtimeConectado, setRealtimeConectado] = useState(true);

  // Estados de Impressão Térmica Automática & Manual
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('bulls_autoprint') === 'true');
  const [larguraTermica, setLarguraTermica] = useState(() => localStorage.getItem('bulls_print_width') || '80mm');
  const [viasTermica, setViasTermica] = useState(() => Number(localStorage.getItem('bulls_print_vias')) || 1);
  const [ipImpressora, setIpImpressora] = useState(() => localStorage.getItem('bulls_print_ip') || '');
  const [pedidoImprimindo, setPedidoImprimindo] = useState(null);

  // Estados de troca de senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  const [feedback, setFeedback] = useState('');
  const [produtoEditandoImagem, setProdutoEditandoImagem] = useState(null);
  const [modalProduto, setModalProduto] = useState(null); // null = fechado; {} = criar; produto = editar
  const [periodo, setPeriodo] = useState('hoje'); // 'hoje' | '15dias' | 'mes'

  // PWA Support & Install Prompt
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [pwaInstalado, setPwaInstalado] = useState(false);

  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', () => {
      setPwaInstalado(true);
      setDeferredPrompt(null);
    });
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
    };
  }, []);

  async function instalarPWA() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        mostrarFeedback('Aplicativo instalado no seu celular com sucesso!');
        setPwaInstalado(true);
      }
      setDeferredPrompt(null);
    } else {
      mostrarFeedback('No Android: toque no menu (⋮) do Chrome e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".');
    }
  }

  function fetchAuth(url, opts = {}) {
    const token = localStorage.getItem('trailer94_admin_token') || localStorage.getItem('bulls_admin_token');
    const headers = {
      ...(opts.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    return fetch(url, { ...opts, headers });
  }

  function mudarPeriodo(novoPeriodo) {
    setPeriodo(novoPeriodo);
    carregarDados(novoPeriodo);
  }

  async function escolherImagemProduto(produtoId, url) {
    await fetchAuth(`/api/admin/produtos/${produtoId}/imagens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arquivo: url, principal: true })
    });
    setProdutoEditandoImagem(null);
    carregarDados();
    mostrarFeedback('Foto do produto atualizada!');
  }

  async function carregarDados(periodoParam) {
    try {
      const p = periodoParam || periodo;
      const [resDash, resPed, resProd, resCat, resMoto, resConf] = await Promise.all([
        fetchAuth(`/api/admin/dashboard?periodo=${p}`),
        fetchAuth('/api/admin/pedidos'),
        fetchAuth('/api/admin/produtos'),
        fetchAuth('/api/admin/categorias'),
        fetchAuth('/api/admin/motoboys'),
        fetchAuth('/api/admin/configuracoes')
      ]);

      if (resDash.ok) setMetricas(await resDash.json());
      if (resPed.ok) setPedidos(await resPed.json());
      if (resProd.ok) setProdutos(await resProd.json());
      if (resCat.ok) setCategorias(await resCat.json());
      if (resMoto.ok) setMotoboys(await resMoto.json());
      if (resConf.ok) setConfiguracoes(await resConf.json());
    } catch (err) {
      console.error('Falha ao carregar painel:', err);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarDados();

    // Tempo real via Supabase Realtime (canal "cozinha")
    const parar = inscreverCanal('cozinha', (dados) => {
      if (dados.tipo === 'pedido:novo') {
        setPedidos(atuais => [dados.pedido, ...atuais]);
        mostrarFeedback(`Novo Pedido Recebido: ${dados.pedido.codigo}!`);
        if (somAtivo) {
          tocarSinoPedido();
        }

        // Impressão Térmica Automática se habilitada
        const deveImprimir = localStorage.getItem('bulls_autoprint') === 'true';
        if (deveImprimir) {
          const largura = localStorage.getItem('bulls_print_width') || '80mm';
          const vias = Number(localStorage.getItem('bulls_print_vias')) || 1;
          const ip = localStorage.getItem('bulls_print_ip') || '';
          dispararImpressaoAutomatica(dados.pedido, { largura, vias, ipImpressora: ip });
        }
      } else if (dados.tipo === 'pedido:atualizado') {
        setPedidos(atuais => atuais.map(p => p.id === dados.pedido.id ? dados.pedido : p));
      } else if (dados.tipo === 'motoboy:novo_cadastro') {
        mostrarFeedback(`Novo entregador cadastrado: ${dados.motoboy.nome}!`);
        carregarDados();
      }
    });

    return parar;
  }, [somAtivo]);

  function mostrarFeedback(msg) {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  }

  async function mudarStatus(pedidoId, novoStatus) {
    try {
      const res = await fetchAuth(`/api/admin/pedidos/${pedidoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      if (res.ok) {
        mostrarFeedback(`Status do pedido atualizado para ${novoStatus}.`);
        carregarDados();
      }
    } catch (err) {
      console.error('Erro ao mudar status:', err);
    }
  }

  async function alternarStatusMotoboy(motoboyId, novoStatus) {
    try {
      const res = await fetchAuth(`/api/admin/motoboys/${motoboyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
      if (res.ok) {
        mostrarFeedback(`Entregador agora está ${novoStatus}.`);
        carregarDados();
      }
    } catch (err) {
      console.error('Erro ao atualizar motoboy:', err);
    }
  }

  async function salvarPrecoProduto(produtoId, novoPrecoCentavos) {
    try {
      await fetchAuth(`/api/admin/produtos/${produtoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preco_base: novoPrecoCentavos })
      });
      mostrarFeedback('Preço atualizado com sucesso!');
      carregarDados();
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
    }
  }

  async function alternarAtivoProduto(produtoId, ativoAtual) {
    try {
      await fetchAuth(`/api/admin/produtos/${produtoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !ativoAtual })
      });
      mostrarFeedback('Disponibilidade do produto alterada!');
      carregarDados();
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
    }
  }

  async function handleSimularPedido() {
    setSimulandoPedido(true);
    try {
      const res = await fetchAuth('/api/admin/pedidos/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.mensagem || 'Falha ao simular pedido.');
      }
      mostrarFeedback(`⚡ Pedido ${data.pedido.codigo} gerado com sucesso (${data.pedido.cliente_nome})!`);
      carregarDados();
    } catch (err) {
      console.error('Erro ao simular pedido:', err);
      mostrarFeedback(`Erro na simulação: ${err.message}`);
    } finally {
      setSimulandoPedido(false);
    }
  }

  async function handleSimularLote(quantidade = 5) {
    setSimulandoLote(true);
    try {
      const res = await fetchAuth('/api/admin/pedidos/simular-lote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantidade })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.mensagem || 'Falha ao simular lote.');
      }
      mostrarFeedback(`🚀 Lote de ${data.pedidos?.length || quantidade} pedidos gerado com sucesso!`);
      if (somAtivo) {
        tocarSinoPedido();
      }
      carregarDados();
    } catch (err) {
      console.error('Erro ao simular lote:', err);
      mostrarFeedback(`Erro no lote: ${err.message}`);
    } finally {
      setSimulandoLote(false);
    }
  }

  // Timer para o fluxo contínuo de pedidos ao vivo (quando ativado)
  useEffect(() => {
    let timer = null;
    if (autoFluxoAtivo) {
      timer = setInterval(() => {
        handleSimularPedido();
      }, 25000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoFluxoAtivo]);

  async function salvarConfiguracoes(e) {
    e.preventDefault();
    try {
      const res = await fetchAuth('/api/admin/configuracoes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configuracoes)
      });
      if (res.ok) {
        mostrarFeedback('Configurações salvas com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao salvar configs:', err);
    }
  }

  async function handleAlterarSenha(e) {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) {
      mostrarFeedback('As novas senhas digitadas não coincidem.');
      return;
    }
    setAlterandoSenha(true);
    try {
      const res = await fetchAuth('/api/admin/alterar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.mensagem || 'Falha ao alterar senha.');
      }
      mostrarFeedback('Senha de administrador atualizada com sucesso!');
      setSenhaAtual('');
      setNovaSenha('');
      setConfirmarSenha('');
    } catch (err) {
      mostrarFeedback(`Erro: ${err.message}`);
    } finally {
      setAlterandoSenha(false);
    }
  }

  function handleHorarioChange(dia, campo, valor) {
    const atual = configuracoes.horario_funcionamento || {};
    const atualDia = atual[dia] || { abre: '19:00', fecha: '04:00', ativo: true };
    const novoDia = { ...atualDia, [campo]: valor };
    const novoHorario = { ...atual, [dia]: novoDia };
    setConfiguracoes({ ...configuracoes, horario_funcionamento: novoHorario });
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">
      {/* Topo do Admin */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-400/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
              {/* Bolinha do online piscando */}
              <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center pointer-events-none" title="Servidor & KDS Online">
                <span className="animate-ping absolute inline-flex h-3.5 w-3.5 rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 border-2 border-slate-900 shadow-sm" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-black text-white flex items-center gap-2">
                <span>{EMPRESA_CONFIG.nome} — Painel KDS & Admin</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Ao vivo ⚡
                </span>
              </h1>
              <p className="text-xs text-slate-400">Usuário: {usuario.nome} ({usuario.papel})</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const novo = !somAtivo;
                setSomAtivo(novo);
                if (novo) tocarSinoPedido();
                mostrarFeedback(novo ? 'Alerta sonoro ativado!' : 'Alerta sonoro silenciado.');
              }}
              className={`p-2 rounded-xl border transition-colors ${somAtivo ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700'}`}
              title={somAtivo ? 'Silenciar som da cozinha' : 'Ativar som da cozinha'}
            >
              {somAtivo ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={() => {
                const novo = !autoPrint;
                setAutoPrint(novo);
                localStorage.setItem('bulls_autoprint', String(novo));
                mostrarFeedback(novo ? 'Impressão automática de comandas ATIVADA! 🖨️' : 'Impressão automática DESATIVADA.');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                autoPrint 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm shadow-emerald-500/10' 
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={autoPrint ? 'Impressão térmica automática ativada (clique para pausar)' : 'Ativar impressão térmica automática para novos pedidos'}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Auto-Print</span>
              <span className={`w-2 h-2 rounded-full ${autoPrint ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            </button>

            <button
              onClick={handleSimularPedido}
              disabled={simulandoPedido}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-black transition-all shadow-md shadow-amber-500/10 disabled:opacity-50"
              title="Simular entrada de pedido realista de Cascavel no KDS com alerta sonoro"
            >
              <Zap className={`w-3.5 h-3.5 ${simulandoPedido ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{simulandoPedido ? 'Simulando...' : 'Simular Pedido'}</span>
            </button>

            <button 
              onClick={carregarDados}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              title="Atualizar dados"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a 
              href="/"
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              Ver Loja Pública ↗
            </a>
            <button 
              onClick={onLogout}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-950/60 border border-red-500/30 px-3 py-1.5 rounded-xl font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="max-w-6xl mx-auto flex gap-2 mt-4 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setAbaAtiva('kds')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              abaAtiva === 'kds' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>KDS / Produção ({pedidos.filter(p => p.status !== 'entregue' && p.status !== 'cancelado').length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('produtos')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              abaAtiva === 'produtos' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Cardápio & Preços ({produtos.length})</span>
          </button>

          <button
            onClick={() => setAbaAtiva('motoboys')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              abaAtiva === 'motoboys' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span>Entregadores ({motoboys.length})</span>
            {metricas?.motoboysPendentes > 0 && (
              <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {metricas.motoboysPendentes}
              </span>
            )}
          </button>

          <button
            onClick={() => setAbaAtiva('mapa')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              abaAtiva === 'mapa' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 fill-current" />
            <span>Mapa de Entregas (Calor)</span>
          </button>

          <button
            onClick={() => setAbaAtiva('financeiro')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              abaAtiva === 'financeiro' ? 'bg-amber-400 text-slate-950 shadow-md font-black' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>DRE & Lucro Real (CMV)</span>
          </button>

          <button
            onClick={() => setAbaAtiva('configuracoes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              abaAtiva === 'configuracoes' ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurações</span>
          </button>
        </div>
      </header>



      {/* Conteúdo Principal */}
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Seletor de período das métricas */}
        <div className="flex items-center gap-2">
          {[
            { chave: 'hoje', rotulo: 'Hoje' },
            { chave: '15dias', rotulo: 'Últimos 15 dias' },
            { chave: 'mes', rotulo: 'Este mês' }
          ].map((opcao) => (
            <button
              key={opcao.chave}
              onClick={() => mudarPeriodo(opcao.chave)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                periodo === opcao.chave
                  ? 'bg-amber-400 text-slate-950 border-amber-400'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>

        {/* Cartões de Métricas no Topo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400">Faturamento no período</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
              {formatarPreco(metricas?.pedidosHoje?.faturamento_total || 0)}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400">Total de Pedidos</span>
            <p className="text-xl sm:text-2xl font-black text-amber-400 mt-1">
              {metricas?.pedidosHoje?.total_pedidos || 0}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400">Na Chapa / Cozinha</span>
            <p className="text-xl sm:text-2xl font-black text-blue-400 mt-1">
              {metricas?.pedidosHoje?.em_preparo || 0}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <span className="text-xs text-slate-400">Entregadores Ativos</span>
            <p className="text-xl sm:text-2xl font-black text-purple-400 mt-1">
              {metricas?.motoboysOnline || 0}
            </p>
          </div>
        </div>

        {/* ABA: KDS (KITCHEN DISPLAY SYSTEM) */}
        {abaAtiva === 'kds' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-amber-400" />
                  Fluxo de Cozinha e Expedição
                </h2>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Notificações & Realtime: Conectado</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleSimularPedido}
                  disabled={simulandoPedido || simulandoLote}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 text-xs font-black shadow-md shadow-amber-500/10 transition-all disabled:opacity-50"
                  title="Gera 1 pedido aleatório realista em Cascavel"
                >
                  <Zap className={`w-3.5 h-3.5 ${simulandoPedido ? 'animate-spin' : ''}`} />
                  <span>{simulandoPedido ? 'Gerando...' : '⚡ Simular 1'}</span>
                </button>

                <button
                  onClick={() => handleSimularLote(5)}
                  disabled={simulandoPedido || simulandoLote}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 active:scale-95 text-white text-xs font-black shadow-md shadow-purple-500/20 transition-all disabled:opacity-50"
                  title="Gera 5 pedidos com nomes, bairros e adicionais diferentes em lote"
                >
                  <Layers className={`w-3.5 h-3.5 ${simulandoLote ? 'animate-spin' : ''}`} />
                  <span>{simulandoLote ? 'Gerando 5...' : '🚀 Lote (5 Pedidos)'}</span>
                </button>

                <button
                  onClick={() => {
                    const novo = !autoFluxoAtivo;
                    setAutoFluxoAtivo(novo);
                    mostrarFeedback(novo ? 'Fluxo ao vivo ATIVADO! (1 pedido a cada 25s)' : 'Fluxo ao vivo pausado.');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    autoFluxoAtivo
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/10'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title={autoFluxoAtivo ? 'Pausar fluxo automático de pedidos' : 'Ativar entrada contínua de pedidos em segundo plano'}
                >
                  {autoFluxoAtivo ? <Pause className="w-3.5 h-3.5 text-rose-400 animate-pulse" /> : <Play className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{autoFluxoAtivo ? 'Ao Vivo: ON' : 'Fluxo Auto'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Coluna 1: Novos / Recebidos */}
              <div className="bg-slate-900/80 border border-amber-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-extrabold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    <span>1. Recebidos ({pedidos.filter(p => p.status === 'recebido').length})</span>
                  </h3>
                </div>

                <div className="space-y-3">
                  {pedidos.filter(p => p.status === 'recebido').map(p => (
                    <div key={p.id} className="bg-slate-950 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5 shadow-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-amber-400">{p.codigo}</span>
                          <button
                            onClick={() => setPedidoImprimindo(p)}
                            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-700 transition-colors"
                            title="Imprimir comanda térmica deste pedido"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {p.cliente_telefone && (
                            <a
                              href={`https://wa.me/55${p.cliente_telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${p.cliente_nome}! Aqui é da hamburgueria Bulls Burger. Seu pedido ${p.codigo} foi recebido e já entrou na nossa fila!`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                              title="Avisar cliente no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white">{formatarPreco(p.total)}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-200">{p.cliente_nome}</p>

                      <div className="text-xs text-slate-300 divide-y divide-slate-800/80 bg-slate-900/60 p-2 rounded-lg">
                        {p.itens?.map((it, i) => (
                          <div key={i} className="py-1">
                            <span className="font-bold text-amber-300">{it.quantidade}x</span> {it.nome_produto}
                            {it.opcionais?.length > 0 && (
                              <p className="text-[10px] text-slate-400">({it.opcionais.map(o => o.nome_opcional).join(', ')})</p>
                            )}
                          </div>
                        ))}
                      </div>

                      {p.observacoes && (
                        <p className="text-[10px] text-amber-300 bg-amber-950/60 p-1.5 rounded border border-amber-500/30">
                          Obs: {p.observacoes}
                        </p>
                      )}

                      <button
                        onClick={() => mudarStatus(p.id, 'em_preparo')}
                        className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-transform active:scale-95"
                      >
                        <ChefHat className="w-3.5 h-3.5" />
                        <span>Mandar para a Chapa</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna 2: Em Preparo */}
              <div className="bg-slate-900/80 border border-blue-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-extrabold text-xs text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ChefHat className="w-4 h-4 text-blue-400" />
                    <span>2. Na Chapa ({pedidos.filter(p => p.status === 'em_preparo').length})</span>
                  </h3>
                </div>

                <div className="space-y-3">
                  {pedidos.filter(p => p.status === 'em_preparo').map(p => (
                    <div key={p.id} className="bg-slate-950 border border-blue-500/30 rounded-xl p-3.5 space-y-2.5 shadow-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-blue-400">{p.codigo}</span>
                          <button
                            onClick={() => setPedidoImprimindo(p)}
                            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                            title="Imprimir comanda térmica deste pedido"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {p.cliente_telefone && (
                            <a
                              href={`https://wa.me/55${p.cliente_telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${p.cliente_nome}! Seu pedido ${p.codigo} da Bulls Burger já está na chapa sendo preparado!`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                              title="Avisar cliente no WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white">{formatarPreco(p.total)}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-200">{p.cliente_nome}</p>

                      <div className="text-xs text-slate-300 divide-y divide-slate-800/80 bg-slate-900/60 p-2 rounded-lg">
                        {p.itens?.map((it, i) => (
                          <div key={i} className="py-1">
                            <span className="font-bold text-blue-300">{it.quantidade}x</span> {it.nome_produto}
                            {it.opcionais?.length > 0 && (
                              <p className="text-[10px] text-slate-400">({it.opcionais.map(o => o.nome_opcional).join(', ')})</p>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => mudarStatus(p.id, 'pronto')}
                        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1 transition-transform active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Pronto! Chamar Entregador</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coluna 3: Prontos & Em Entrega */}
              <div className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-extrabold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Bike className="w-4 h-4 text-emerald-400" />
                    <span>3. Expedição & Entrega</span>
                  </h3>
                </div>

                <div className="space-y-3">
                  {pedidos.filter(p => p.status === 'pronto' || p.status === 'em_entrega').map(p => (
                    <div key={p.id} className="bg-slate-950 border border-emerald-500/30 rounded-xl p-3.5 space-y-2 shadow-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-emerald-400">{p.codigo}</span>
                          <button
                            onClick={() => setPedidoImprimindo(p)}
                            className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 transition-colors"
                            title="Imprimir comanda térmica deste pedido"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {p.cliente_telefone && (
                            <a
                              href={`https://wa.me/55${p.cliente_telefone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${p.cliente_nome}! Seu pedido ${p.codigo} da Bulls Burger está PRONTO e ${p.status === 'em_entrega' ? `já saiu para entrega com ${p.motoboy_nome || 'nosso entregador'}! 🛵` : 'está aguardando o motoboy para entrega imediata!'}`)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/60 transition-colors"
                              title="Avisar cliente no WhatsApp que o pedido está pronto ou a caminho"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          p.status === 'pronto' ? 'bg-amber-950 text-amber-300' : 'bg-purple-950 text-purple-300'
                        }`}>
                          {p.status === 'pronto' ? 'Aguardando Motoboy' : `Em rota (${p.motoboy_nome || 'Motoboy'})`}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">{p.cliente_endereco}</p>

                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => mudarStatus(p.id, 'entregue')}
                          className="flex-1 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs"
                        >
                          Concluir
                        </button>
                        <button
                          onClick={() => mudarStatus(p.id, 'cancelado')}
                          className="px-3 py-1.5 rounded-lg bg-red-950 text-red-300 hover:bg-red-900 font-bold text-xs"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: PRODUTOS & PREÇOS */}
        {abaAtiva === 'produtos' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Gestão de Cardápio e Preços
              </h2>
              <button
                onClick={() => setModalProduto({})}
                disabled={categorias.length === 0}
                className="flex items-center gap-1.5 bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-amber-300 disabled:opacity-50"
                title={categorias.length === 0 ? 'Crie uma categoria primeiro' : 'Criar novo lanche'}
              >
                <PlusCircle className="w-3.5 h-3.5" /> Novo Lanche
              </button>
            </div>

            <div className="divide-y divide-slate-800">
              {produtos.map((prod) => (
                <div key={prod.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setProdutoEditandoImagem(prod)}
                      className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-700 shrink-0 group"
                      title="Trocar foto do produto"
                    >
                      {prod.imagens?.[0]?.arquivo ? (
                        <img src={prod.imagens[0].arquivo} alt={prod.nome} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <ImageIcon className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageIcon className="w-4 h-4 text-amber-400" />
                      </div>
                    </button>
                    <div>
                      <span className="text-[11px] text-amber-400 font-semibold">{prod.categoria_nome}</span>
                      <h3 className="text-sm font-bold text-white">{prod.nome}</h3>
                      <p className="text-xs text-slate-400 max-w-md line-clamp-1">{prod.descricao}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setModalProduto(prod)}
                      className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg border border-slate-800 hover:border-amber-400/40"
                      title="Editar nome, preço e adicionais"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400">R$</span>
                      <input
                        type="number"
                        step="0.10"
                        defaultValue={(prod.preco_base / 100).toFixed(2)}
                        onBlur={(e) => {
                          const novoCentavos = Math.round(Number(e.target.value) * 100);
                          if (novoCentavos !== prod.preco_base) {
                            salvarPrecoProduto(prod.id, novoCentavos);
                          }
                        }}
                        className="w-16 bg-transparent text-sm font-bold text-amber-300 text-right focus:outline-none"
                      />
                    </div>

                    <button
                      onClick={() => alternarAtivoProduto(prod.id, prod.ativo === 1)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 ${
                        prod.ativo === 1 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-red-950 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {prod.ativo === 1 ? 'Ativo' : 'Pausado'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: GESTÃO DE MOTOBOYS */}
        {abaAtiva === 'motoboys' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Equipe de Entregadores Cadastrados
            </h2>

            <div className="divide-y divide-slate-800">
              {motoboys.map((m) => (
                <div key={m.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{m.nome}</h3>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        m.status === 'ativo' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' :
                        m.status === 'pendente' ? 'bg-amber-950 text-amber-300 border border-amber-500/30' :
                        'bg-red-950 text-red-300 border border-red-500/30'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatarTelefone(m.telefone)} • Usuário: <strong className="text-slate-300">@{m.usuario}</strong> • {m.veiculo || 'Moto'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Total de entregas: {m.total_entregas || 0} ({formatarPreco(m.total_ganhos || 0)})
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.status === 'pendente' ? (
                      <button
                        onClick={() => alternarStatusMotoboy(m.id, 'ativo')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovar Entregador</span>
                      </button>
                    ) : m.status === 'ativo' ? (
                      <button
                        onClick={() => alternarStatusMotoboy(m.id, 'desativado')}
                        className="px-3 py-1.5 rounded-lg bg-red-950 text-red-300 hover:bg-red-900 border border-red-500/30 font-semibold text-xs"
                      >
                        Pausar
                      </button>
                    ) : (
                      <button
                        onClick={() => alternarStatusMotoboy(m.id, 'ativo')}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs"
                      >
                        Reativar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: CONFIGURAÇÕES DA LOJA */}
        {abaAtiva === 'configuracoes' && (
          <div className="space-y-6 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Painel 1: Parâmetros Operacionais */}
              <form onSubmit={salvarConfiguracoes} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Settings className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Parâmetros Operacionais
                  </h2>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Taxa de Entrega Padrão (Centavos)</label>
                    <input 
                      type="number"
                      value={configuracoes.taxa_entrega_padrao || 700}
                      onChange={(e) => setConfiguracoes({ ...configuracoes, taxa_entrega_padrao: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">700 = R$ 7,00</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Repasse ao Motoboy por Corrida (Centavos)</label>
                    <input 
                      type="number"
                      value={configuracoes.valor_motoboy_padrao || 600}
                      onChange={(e) => setConfiguracoes({ ...configuracoes, valor_motoboy_padrao: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">600 = R$ 6,00</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Pedido Mínimo (Centavos)</label>
                    <input 
                      type="number"
                      value={configuracoes.pedido_minimo || 2500}
                      onChange={(e) => setConfiguracoes({ ...configuracoes, pedido_minimo: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700 font-bold"
                    />
                    <span className="text-[10px] text-slate-500">2500 = R$ 25,00</span>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Tempo Estimado de Entrega</label>
                    <input 
                      type="text"
                      value={configuracoes.tempo_estimado_entrega || '40-55 min'}
                      onChange={(e) => setConfiguracoes({ ...configuracoes, tempo_estimado_entrega: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">WhatsApp Oficial</label>
                    <input 
                      type="text"
                      value={configuracoes.whatsapp || '+55 45 98818-4380'}
                      onChange={(e) => setConfiguracoes({ ...configuracoes, whatsapp: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg mt-2"
                  >
                    Salvar Parâmetros
                  </button>
                </div>
              </form>

              {/* Painel 2: Segurança & Alterar Senha */}
              <form onSubmit={handleAlterarSenha} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                      Alterar Senha do Administrador
                    </h2>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1">Senha Atual</label>
                      <input 
                        type="password"
                        required
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        placeholder="Digite sua senha atual"
                        className="w-full p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Nova Senha (Mínimo 6 caracteres)</label>
                      <input 
                        type="password"
                        required
                        minLength={6}
                        value={novaSenha}
                        onChange={(e) => setNovaSenha(e.target.value)}
                        placeholder="Digite a nova senha segura"
                        className="w-full p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">Confirmar Nova Senha</label>
                      <input 
                        type="password"
                        required
                        minLength={6}
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        placeholder="Repita a nova senha"
                        className="w-full p-2.5 rounded-xl bg-slate-800 text-white border border-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={alterandoSenha}
                  className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-sm shadow-md mt-4 disabled:opacity-50"
                >
                  {alterandoSenha ? 'Atualizando...' : 'Atualizar Senha de Acesso'}
                </button>
              </form>
            </div>

            {/* Painel 3: Horários Semanais de Funcionamento */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                    Grade Semanal de Abertura & Fechamento
                  </h2>
                </div>
                <button
                  onClick={salvarConfiguracoes}
                  className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow"
                >
                  Salvar Horários
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {[
                  { id: 'seg', label: 'Segunda-feira' },
                  { id: 'ter', label: 'Terça-feira' },
                  { id: 'qua', label: 'Quarta-feira' },
                  { id: 'qui', label: 'Quinta-feira' },
                  { id: 'sex', label: 'Sexta-feira' },
                  { id: 'sab', label: 'Sábado' },
                  { id: 'dom', label: 'Domingo' }
                ].map(({ id, label }) => {
                  const horario = (configuracoes.horario_funcionamento && configuracoes.horario_funcionamento[id]) || {
                    abre: '19:00',
                    fecha: '04:00',
                    ativo: true
                  };

                  return (
                    <div key={id} className={`p-3 rounded-xl border transition-colors ${
                      horario.ativo ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-900/40 border-slate-800 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-200">{label}</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={!!horario.ativo}
                            onChange={(e) => handleHorarioChange(id, 'ativo', e.target.checked)}
                            className="rounded border-slate-700 text-amber-400 focus:ring-0"
                          />
                          <span className="text-[10px] text-slate-400">Ativo</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Abertura</label>
                          <input 
                            type="time"
                            value={horario.abre || '19:00'}
                            onChange={(e) => handleHorarioChange(id, 'abre', e.target.value)}
                            disabled={!horario.ativo}
                            className="w-full p-1.5 rounded-lg bg-slate-900 text-white border border-slate-700 text-center font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Fechamento</label>
                          <input 
                            type="time"
                            value={horario.fecha || '04:00'}
                            onChange={(e) => handleHorarioChange(id, 'fecha', e.target.value)}
                            disabled={!horario.ativo}
                            className="w-full p-1.5 rounded-lg bg-slate-900 text-white border border-slate-700 text-center font-mono text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Painel 4: Impressora Térmica & Comandas Automáticas (58mm / 80mm ESC/POS) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                      Impressora Térmica & Comandas Automáticas
                    </h2>
                    <p className="text-xs text-slate-400">Suporte a bobinas 80mm e 58mm com protocolo padrão ESC/POS e Kiosk Print</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                    autoPrint ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {autoPrint ? '● Auto-Print Ativo' : '○ Manual'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                {/* Auto Impressão */}
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col justify-between">
                  <div>
                    <span className="font-bold text-slate-200 block">Auto-Print ao Receber</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Dispara a impressão da comanda na hora que o pedido cai no KDS.
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer mt-3">
                    <input 
                      type="checkbox"
                      checked={autoPrint}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setAutoPrint(val);
                        localStorage.setItem('bulls_autoprint', String(val));
                        mostrarFeedback(val ? 'Auto-Print ativado!' : 'Auto-Print desativado.');
                      }}
                      className="rounded border-slate-700 text-amber-400 focus:ring-0 w-4 h-4"
                    />
                    <span className="font-bold text-amber-400">{autoPrint ? 'Ligado' : 'Desligado'}</span>
                  </label>
                </div>

                {/* Largura da Bobina */}
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <span className="font-bold text-slate-200 block">Largura da Bobina</span>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLarguraTermica('80mm');
                        localStorage.setItem('bulls_print_width', '80mm');
                        mostrarFeedback('Largura configurada: 80mm');
                      }}
                      className={`p-2 rounded-lg font-bold border text-center transition-colors ${
                        larguraTermica === '80mm' ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      80mm (Padrão)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setLarguraTermica('58mm');
                        localStorage.setItem('bulls_print_width', '58mm');
                        mostrarFeedback('Largura configurada: 58mm');
                      }}
                      className={`p-2 rounded-lg font-bold border text-center transition-colors ${
                        larguraTermica === '58mm' ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      58mm (Mini)
                    </button>
                  </div>
                </div>

                {/* Número de Vias */}
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <span className="font-bold text-slate-200 block">Vias por Pedido</span>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setViasTermica(1);
                        localStorage.setItem('bulls_print_vias', '1');
                        mostrarFeedback('Imprimindo 1 via (Cozinha)');
                      }}
                      className={`p-2 rounded-lg font-bold border text-center transition-colors ${
                        viasTermica === 1 ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      1 Via (Cozinha)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setViasTermica(2);
                        localStorage.setItem('bulls_print_vias', '2');
                        mostrarFeedback('Imprimindo 2 vias (Cozinha + Entrega)');
                      }}
                      className={`p-2 rounded-lg font-bold border text-center transition-colors ${
                        viasTermica === 2 ? 'bg-amber-400 text-slate-950 border-amber-400' : 'bg-slate-900 text-slate-400 border-slate-700'
                      }`}
                    >
                      2 Vias (+Entrega)
                    </button>
                  </div>
                </div>

                {/* IP Impressora de Rede */}
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5">
                  <span className="font-bold text-slate-200 block">IP da Impressora de Rede</span>
                  <input
                    type="text"
                    value={ipImpressora}
                    onChange={(e) => {
                      setIpImpressora(e.target.value);
                      localStorage.setItem('bulls_print_ip', e.target.value.trim());
                    }}
                    placeholder="Ex: 192.168.1.200"
                    className="w-full p-2 rounded-lg bg-slate-900 text-white border border-slate-700 text-xs font-mono"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    Vazio = usa a impressora padrão do computador/navegador.
                  </span>
                </div>
              </div>

              {/* Dica de Kiosk Mode para impressão 100% silenciosa */}
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-slate-300 text-xs flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span>💡 Impressão Silenciosa Direta (Sem caixa de diálogo)</span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Para imprimir direto na impressora sem a caixa do Windows/Chrome confirmar, inicie o navegador com o atalho: <code className="bg-slate-900 text-amber-300 px-1 py-0.5 rounded font-mono">--kiosk-printing</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const pedidoTeste = {
                      id: 'teste-001',
                      codigo: '#BB-TESTE',
                      data_criacao: new Date().toISOString(),
                      cliente_nome: 'Cliente de Teste',
                      cliente_telefone: '(45) 99999-0000',
                      cliente_endereco: 'Av. Brasil, 5000 - Centro, Cascavel - PR',
                      forma_pagamento: 'pix',
                      total: 4890,
                      itens: [
                        { quantidade: 1, nome_produto: 'Bulls Smash Burger', opcionais: [{ nome_opcional: 'Bacon Extra' }] },
                        { quantidade: 1, nome_produto: 'Batata Rústica Bulls' }
                      ],
                      observacoes: 'Teste de impressão térmica automática'
                    };
                    setPedidoImprimindo(pedidoTeste);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs shrink-0 border border-amber-400/30"
                >
                  Testar Impressão
                </button>
              </div>
            </div>

            {/* Card de Instalação do App PWA no Celular Android */}
            <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-amber-500/5 border-2 border-amber-400/40 rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-400/20 shrink-0">
                    <Smartphone className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      <span>Aplicativo Oficial Bulls Admin (Android / PWA)</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                        Disponível
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                      Instale o painel no seu celular Android para usar em tela cheia como um app nativo, sem as barras do navegador, abrindo diretamente na gestão de pedidos e KDS em <b>/admin</b>.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={instalarPWA}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-400/20 transition-transform active:scale-95 shrink-0"
                >
                  <Download className="w-4 h-4 stroke-[2.5]" />
                  <span>{pwaInstalado ? 'Aplicativo Instalado' : 'Instalar / Baixar App no Celular'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aba do Mapa de Calor com OpenStreetMap */}
        {abaAtiva === 'mapa' && (
          <MapaCalorPedidos />
        )}

        {/* Aba Financeira de DRE & CMV (Lucro Real) */}
        {abaAtiva === 'financeiro' && (
          <PainelFinanceiroCMV metricas={metricas} pedidos={pedidos} />
        )}
      </main>

      {produtoEditandoImagem && (
        <SeletorImagemProduto
          produto={produtoEditandoImagem}
          onFechar={() => setProdutoEditandoImagem(null)}
          onEscolher={(url) => escolherImagemProduto(produtoEditandoImagem.id, url)}
        />
      )}

      {modalProduto && (
        <ModalEditarProduto
          produto={modalProduto.id ? modalProduto : null}
          categorias={categorias}
          onFechar={() => setModalProduto(null)}
          onSalvo={() => {
            carregarDados();
            mostrarFeedback('Lanche salvo com sucesso!');
          }}
        />
      )}

      {/* Modal de Pré-Visualização e Impressão Térmica */}
      {pedidoImprimindo && (
        <ModalComandaTermica
          pedido={pedidoImprimindo}
          onFechar={() => setPedidoImprimindo(null)}
        />
      )}
    </div>
  );
}
