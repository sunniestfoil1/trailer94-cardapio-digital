// Opções do cookie de sessão, dependentes de ambiente.
// Produção (frontend na Vercel, API em outro domínio): precisa secure:true
// e sameSite:'none' para o navegador aceitar mandar o cookie entre domínios.
// Local (Vite proxy / mesma origem): secure:false e sameSite:'lax' bastam,
// e 'none' sem https seria rejeitado pelo próprio navegador.
export function opcoesCookieSessao() {
  const producao = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: producao,
    sameSite: producao ? 'none' : 'lax',
    maxAge: 90 * 24 * 60 * 60 * 1000 // 90 dias de sessão contínua
  };
}
