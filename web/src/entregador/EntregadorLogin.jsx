import React, { useState } from 'react';
import { Bike, KeyRound, Lock, User, Phone, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatarTelefone } from '../compartilhado/formatadores';
import { EMPRESA_CONFIG } from '../empresa.config';

export function EntregadorLogin({ onLoginSucesso }) {
  const [aba, setAba] = useState('login'); // 'login' ou 'cadastro'
  const [modoLogin, setModoLogin] = useState('pin'); // 'pin' ou 'senha'

  // Campos Login
  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [senha, setSenha] = useState('');

  // Campos Cadastro
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [novoUsuario, setNovoUsuario] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [veiculo, setVeiculo] = useState('');

  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [cadastroPendente, setCadastroPendente] = useState(false);

  const motoboyPadrao = EMPRESA_CONFIG.motoboy;

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const payload = {
        usuario: usuario.trim(),
        ...(modoLogin === 'pin' ? { pin: pin.trim() } : { senha })
      };

      const res = await fetch('/api/auth/motoboy/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.erro === 'cadastro_pendente') {
          setCadastroPendente(true);
          return;
        }
        throw new Error(data.mensagem || 'Falha no login');
      }

      onLoginSucesso(data.motoboy);
    } catch (err) {
      setErro(err.message || 'Falha no login');
    } finally {
      setCarregando(false);
    }
  }

  async function handleCadastro(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const payload = {
        nome: nome.trim(),
        telefone: telefone.replace(/\D/g, ''),
        usuario: novoUsuario.trim(),
        senha: novaSenha,
        veiculo: veiculo.trim() || 'Moto'
      };

      const res = await fetch('/api/auth/motoboy/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.mensagem || 'Falha ao cadastrar');
      }

      setCadastroPendente(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  if (cadastroPendente) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-black text-amber-400">Cadastro em Análise!</h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Seu cadastro foi recebido pela equipe do <strong>Trailer 94</strong>. Assim que a gerência aprovar, seu acesso com PIN/senha será liberado automaticamente.
          </p>
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-400">
            Dica: Seu PIN de acesso rápido são os <strong>4 últimos dígitos</strong> do seu WhatsApp cadastrado.
          </div>
          <button 
            onClick={() => {
              setCadastroPendente(false);
              setAba('login');
            }}
            className="w-full py-3 rounded-xl bg-amber-400 text-slate-950 font-bold text-sm"
          >
            Voltar para o Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Cabeçalho */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-400/20">
            <Bike className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Portal do Entregador
          </h1>
          <p className="text-xs text-slate-400">
            {EMPRESA_CONFIG.nome} • {EMPRESA_CONFIG.cidade} - {EMPRESA_CONFIG.estado}
          </p>
        </div>

        {/* Abas Login vs Cadastro */}
        <div className="flex bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => { setAba('login'); setErro(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              aba === 'login' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Já sou Entregador
          </button>
          <button
            type="button"
            onClick={() => { setAba('cadastro'); setErro(''); }}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              aba === 'cadastro' ? 'bg-amber-400 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Quero Entregar
          </button>
        </div>

        {erro && (
          <div className="p-3 bg-red-950/80 border border-red-500/40 text-red-200 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{erro}</span>
          </div>
        )}

        {aba === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nome de Usuário
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  required
                  value={usuario}
                  onChange={(e) => setUsuario(e.target.value)}
                  placeholder="carlos@gmail.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 text-white placeholder-slate-500 text-sm border border-slate-700 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Alternador PIN vs Senha */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Modo de Acesso:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModoLogin('senha')}
                  className={`font-semibold ${modoLogin === 'senha' ? 'text-amber-400 underline' : 'text-slate-500'}`}
                >
                  Senha
                </button>
                <span className="text-slate-700">|</span>
                <button
                  type="button"
                  onClick={() => setModoLogin('pin')}
                  className={`font-semibold ${modoLogin === 'pin' ? 'text-amber-400 underline' : 'text-slate-500'}`}
                >
                  PIN Rápido
                </button>
              </div>
            </div>

            {modoLogin === 'pin' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  PIN Rápido (4 últimos dígitos do celular)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="password"
                    maxLength={4}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="4321"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 text-white tracking-widest text-center text-lg font-bold border border-slate-700 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="motoboy2026"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 text-white text-sm border border-slate-700 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Dica de Acesso Rápido */}
            <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-[11px] text-slate-300 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">Acesso Rápido:</span>
                <span className="font-mono text-amber-300 font-bold">{motoboyPadrao.usuario}</span> • <span className="font-mono text-amber-300 font-bold">{motoboyPadrao.senhaPadrao}</span> (PIN: {motoboyPadrao.pinPadrao})
              </div>
              <button
                type="button"
                onClick={() => {
                  setUsuario(motoboyPadrao.usuario);
                  setModoLogin('senha');
                  setSenha(motoboyPadrao.senhaPadrao);
                }}
                className="text-[10px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1.5 rounded-lg"
              >
                Preencher
              </button>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
            >
              <span>{carregando ? 'Acessando...' : 'Acessar Central de Corridas'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleCadastro} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nome Completo *</label>
              <input 
                type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs border border-slate-700 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">WhatsApp (DDD + Número) *</label>
              <input 
                type="tel" required value={telefone} onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                placeholder="(45) 99999-9999"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs border border-slate-700 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Usuário *</label>
                <input 
                  type="text" required value={novoUsuario} onChange={(e) => setNovoUsuario(e.target.value)}
                  placeholder="ex: joao.moto"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs border border-slate-700 focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Senha *</label>
                <input 
                  type="password" required value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs border border-slate-700 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Veículo / Placa</label>
              <input 
                type="text" value={veiculo} onChange={(e) => setVeiculo(e.target.value)}
                placeholder="Honda CG 160 - Placa ABC-1234"
                className="w-full px-3 py-2 rounded-xl bg-slate-800 text-white text-xs border border-slate-700 focus:border-amber-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg mt-2"
            >
              <span>{carregando ? 'Enviando...' : 'Enviar Cadastro para Aprovação'}</span>
            </button>
          </form>
        )}

        <div className="pt-2 text-center">
          <a href="/" className="text-xs text-slate-400 hover:text-amber-400">
            ← Voltar para o Cardápio da Loja
          </a>
        </div>
      </div>
    </div>
  );
}
