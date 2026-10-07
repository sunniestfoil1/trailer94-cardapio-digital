import React, { useState } from 'react';
import { Clock, MapPin, Phone, Info, Search, Bike, ShieldCheck, ChevronRight, X } from 'lucide-react';
import { formatarTelefone } from '../compartilhado/formatadores';
import { EMPRESA_CONFIG } from '../empresa.config';

export function Header({ infoLoja, busca, setBusca }) {
  const [modalInfoAberto, setModalInfoAberto] = useState(false);
  const statusLoja = infoLoja?.statusLoja || { aberto: true, mensagem: EMPRESA_CONFIG.horarioFuncionamento };

  const nomeLoja = infoLoja?.nome || EMPRESA_CONFIG.nome;
  const sloganLoja = infoLoja?.descricao || EMPRESA_CONFIG.subtitulo;
  const cidadeLoja = infoLoja?.cidade || EMPRESA_CONFIG.cidade;
  const estadoLoja = infoLoja?.estado || EMPRESA_CONFIG.estado;

  return (
    <header className="bg-slate-900 text-white relative shadow-lg">
      {/* Banner Superior com textura */}
      <div className="h-52 sm:h-64 md:h-72 lg:h-80 w-full bg-slate-950 relative overflow-hidden">
        <img 
          src={infoLoja?.bannerUrl || EMPRESA_CONFIG.bannerUrl || '/banner.avif'} 
          alt={`${EMPRESA_CONFIG.nome} Banner`} 
          className="w-full h-full object-cover object-center opacity-100 filter contrast-105 brightness-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/15 to-transparent" />
        
        {/* Links rápidos para Entregador e Admin no canto superior */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
          <a 
            href="/cozinha" 
            className="flex items-center gap-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-emerald-300 border border-emerald-500/30 transition-all"
            title="Tela da Cozinha KDS"
          >
            <span>🍳 Cozinha</span>
          </a>
          <a 
            href="/entregador" 
            className="flex items-center gap-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-amber-300 border border-amber-500/30 transition-all"
            title="Área do Entregador"
          >
            <Bike className="w-3.5 h-3.5 text-amber-400" />
            <span>Entregador</span>
          </a>
          <a 
            href="/admin" 
            className="flex items-center gap-1.5 bg-black/40 hover:bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium text-slate-300 border border-white/20 transition-all"
            title="Painel Administrativo"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin</span>
          </a>
        </div>
      </div>

      {/* Conteúdo Principal do Topo */}
      <div className="max-w-4xl mx-auto px-4 -mt-16 sm:-mt-20 pb-4 relative z-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
          {/* Logo / Avatar com borda quadrada forte */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border-2 border-amber-400 shadow-2xl bg-black flex items-center justify-center p-1.5">
              <img
                src={infoLoja?.logoUrl || EMPRESA_CONFIG.logoUrl || '/logo.jpg'}
                alt={`Logo ${nomeLoja}`}
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            {/* Indicador de Status com bolinha do online piscando */}
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center pointer-events-none" title={statusLoja.aberto ? `${nomeLoja} Aberto e Online` : 'Fechado'}>
              {statusLoja.aberto && (
                <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-80" />
              )}
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-slate-950 shadow-md ${
                statusLoja.aberto 
                  ? 'bg-emerald-500 ring-2 ring-emerald-400/80 shadow-emerald-500/50' 
                  : 'bg-red-500 ring-1 ring-red-400/60'
              }`} />
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow">
                {nomeLoja}
              </h1>
              <span className={`px-3 py-0.5 rounded-lg text-xs font-bold ${
                statusLoja.aberto 
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm' 
                  : 'bg-red-950/90 text-red-300 border border-red-500/50 shadow-sm'
              }`}>
                {statusLoja.aberto ? '● Aberto agora' : '○ Fechado'}
              </span>
            </div>

            {/* Linha forte divisória de contraste */}
            <div className="h-1 w-16 bg-amber-400 rounded-full my-2.5 mx-auto sm:mx-0 shadow" />

            <p className="text-xs sm:text-sm text-slate-200 mt-1 mb-3 max-w-lg leading-relaxed font-medium">
              {sloganLoja}
            </p>

            {/* Badges de Informação com alto contraste e espaçamento */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 text-xs">
              <span className="flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold">{statusLoja.mensagem || EMPRESA_CONFIG.horarioFuncionamento}</span>
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/90 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg shadow-sm">
                <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-semibold">{cidadeLoja} - {estadoLoja}</span>
              </span>
              <button 
                onClick={() => setModalInfoAberto(true)}
                className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 rounded-lg font-bold shadow transition-all active:scale-95"
              >
                <Info className="w-3.5 h-3.5" />
                <span>Horários e Taxas</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Pesquisa com alto contraste e sem emojis */}
        <div className="mt-6 relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar burgers, lanches, porções ou bebidas..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-900 text-white placeholder-slate-400 border-2 border-slate-700 focus:border-amber-400 focus:outline-none text-sm transition-all shadow-inner font-medium"
          />
          {busca && (
            <button 
              onClick={() => setBusca('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Modal de Informações da Loja */}
      {modalInfoAberto && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl relative">
            <button 
              onClick={() => setModalInfoAberto(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
              <Info className="w-5 h-5" />
              <span>Informações do {EMPRESA_CONFIG.nome}</span>
            </h3>

            <div className="space-y-4 mt-5 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">Horário de Atendimento</h4>
                  <p className="text-xs text-slate-300 mt-0.5">{EMPRESA_CONFIG.horarioFuncionamento}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <MapPin className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">Localização</h4>
                  <p className="text-xs text-slate-300 mt-0.5">{EMPRESA_CONFIG.enderecoCompleto}</p>
                  <p className="text-xs text-slate-400 mt-1">Tempo estimado de entrega: {EMPRESA_CONFIG.tempoEstimadoEntrega}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-white">WhatsApp Oficial</h4>
                  <p className="text-xs text-slate-300 mt-0.5">{formatarTelefone(EMPRESA_CONFIG.whatsapp)}</p>
                  <a 
                    href={`https://wa.me/55${EMPRESA_CONFIG.whatsapp}?text=${encodeURIComponent(`Olá ${EMPRESA_CONFIG.nome}! Gostaria de tirar uma dúvida.`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold mt-1"
                  >
                    <span>Conversar no WhatsApp</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>

            <button 
              onClick={() => setModalInfoAberto(false)}
              className="mt-6 w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition-all"
            >
              Entendi e Fechar
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
