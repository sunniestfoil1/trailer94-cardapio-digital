import React, { useState, useEffect } from 'react';
import { EntregadorLogin } from './EntregadorLogin';
import { EntregadorDashboard } from './EntregadorDashboard';
import { RefreshCw } from 'lucide-react';

export function EntregadorPage() {
  const [motoboy, setMotoboy] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function checarSessao() {
      try {
        const res = await fetch('/api/auth/motoboy/me');
        if (res.ok) {
          const data = await res.json();
          if (data.autenticado) {
            setMotoboy(data.motoboy);
          }
        }
      } catch (err) {
        console.error('Falha ao checar sessão de motoboy:', err);
      } finally {
        setCarregando(false);
      }
    }

    checarSessao();
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/motoboy/logout', { method: 'POST' });
    setMotoboy(null);
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-300">Carregando portal do entregador...</p>
      </div>
    );
  }

  if (!motoboy) {
    return <EntregadorLogin onLoginSucesso={(m) => setMotoboy(m)} />;
  }

  return <EntregadorDashboard motoboy={motoboy} onLogout={handleLogout} />;
}
