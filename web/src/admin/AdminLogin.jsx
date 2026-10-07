import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import { EMPRESA_CONFIG } from '../empresa.config';

export function AdminLogin({ onLoginSucesso }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const adminPadrao = EMPRESA_CONFIG.admin;

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const res = await fetch('/api/auth/dono/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.mensagem || 'Credenciais inválidas.');
      }

      if (data.token) {
        localStorage.setItem('trailer94_admin_token', data.token);
        localStorage.setItem('bulls_admin_token', data.token);
      }
      onLoginSucesso(data.usuario);
    } catch (err) {
      setErro(err.message || 'Falha no login. Verifique seus dados.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-400 text-slate-950 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-400/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white">
            Painel do Administrador
          </h1>
          <p className="text-xs text-slate-400">
            {EMPRESA_CONFIG.nome} • Gestão KDS e Operação
          </p>
        </div>

        {erro && (
          <div className="p-3 bg-red-950/80 border border-red-500/40 text-red-200 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              E-mail do Administrador
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={adminPadrao.email}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 text-white placeholder-slate-500 text-sm border border-slate-700 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Senha de Acesso
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="password"
                required
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder={adminPadrao.senhaPadrao}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-800 text-white text-sm border border-slate-700 focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Dica de Acesso Rápido */}
          <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 text-[11px] text-slate-300 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block text-[10px]">Acesso Rápido:</span>
              <span className="font-mono text-amber-300 font-bold">{adminPadrao.email}</span> • <span className="font-mono text-amber-300 font-bold">{adminPadrao.senhaPadrao}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail(adminPadrao.email);
                setSenha(adminPadrao.senhaPadrao);
              }}
              className="text-[10px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Preencher
            </button>
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
          >
            <span>{carregando ? 'Validando...' : 'Entrar no Sistema KDS'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <a href="/" className="text-xs text-slate-400 hover:text-amber-400">
            ← Voltar para o Cardápio da Loja
          </a>
        </div>
      </div>
    </div>
  );
}
