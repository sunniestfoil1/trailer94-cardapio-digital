import React, { useState, useEffect } from 'react';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';
import { RefreshCw } from 'lucide-react';

export function AdminPage() {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function checarSessao() {
      try {
        const token = localStorage.getItem('trailer94_admin_token') || localStorage.getItem('bulls_admin_token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch('/api/auth/dono/me', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.autenticado) {
            setUsuario(data.usuario);
          }
        }
      } catch (err) {
        console.error('Falha ao checar sessão de admin:', err);
      } finally {
        setCarregando(false);
      }
    }

    checarSessao();
  }, []);

  async function handleLogout() {
    const token = localStorage.getItem('trailer94_admin_token') || localStorage.getItem('bulls_admin_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
    await fetch('/api/auth/dono/logout', { method: 'POST', headers });
    localStorage.removeItem('trailer94_admin_token');
    localStorage.removeItem('bulls_admin_token');
    setUsuario(null);
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <RefreshCw className="w-10 h-10 text-amber-400 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-300">Carregando painel administrativo...</p>
      </div>
    );
  }

  if (!usuario) {
    return <AdminLogin onLoginSucesso={(u) => setUsuario(u)} />;
  }

  return <AdminDashboard usuario={usuario} onLogout={handleLogout} />;
}
