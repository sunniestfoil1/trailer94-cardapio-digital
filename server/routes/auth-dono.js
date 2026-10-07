import { Router } from 'express';
import db from '../db/db.js';
import { compararSenha } from '../auth/senha.js';
import { criarSessao, revogarSessao, obterSessao } from '../auth/sessao.js';
import { opcoesCookieSessao } from '../auth/cookieOpts.js';

const router = Router();

// POST /api/auth/dono/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'campos_obrigatorios', mensagem: 'E-mail e senha são obrigatórios.' });
  }

  const usuario = await db.prepare('SELECT id, nome, email, senha_hash, papel FROM usuarios WHERE email = ?').get(email.trim().toLowerCase());
  if (!usuario) {
    return res.status(401).json({ erro: 'credenciais_invalidas', mensagem: 'E-mail ou senha incorretos.' });
  }

  const senhaValida = await compararSenha(senha, usuario.senha_hash);
  if (!senhaValida) {
    return res.status(401).json({ erro: 'credenciais_invalidas', mensagem: 'E-mail ou senha incorretos.' });
  }

  const token = criarSessao('dono', usuario.id, { papel: usuario.papel });

  // Configurar cookie seguro (secure/sameSite variam por ambiente, ver cookieOpts.js)
  res.cookie('bulls_admin_token', token, opcoesCookieSessao());

  res.json({
    sucesso: true,
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel
    }
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const token = req.cookies?.bulls_admin_token || req.headers.authorization?.replace('Bearer ', '');
  revogarSessao(token);
  res.clearCookie('bulls_admin_token');
  res.json({ sucesso: true, mensagem: 'Logout efetuado.' });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const token = req.cookies?.bulls_admin_token || req.headers.authorization?.replace('Bearer ', '');
  const sessao = obterSessao(token);

  if (!sessao || sessao.tipo !== 'dono') {
    return res.status(401).json({ autenticado: false });
  }

  const usuario = await db.prepare('SELECT id, nome, email, papel FROM usuarios WHERE id = ?').get(sessao.id);
  if (!usuario) {
    return res.status(401).json({ autenticado: false });
  }

  res.json({
    autenticado: true,
    usuario
  });
});

export default router;
