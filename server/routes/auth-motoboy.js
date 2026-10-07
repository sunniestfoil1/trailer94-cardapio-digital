import { Router } from 'express';
import db from '../db/db.js';
import { hashSenha, compararSenha } from '../auth/senha.js';
import { criarSessao, revogarSessao, obterSessao } from '../auth/sessao.js';
import { opcoesCookieSessao } from '../auth/cookieOpts.js';
import { broadcast } from '../realtime/hub.js';

const router = Router();

// POST /api/auth/motoboy/login
// Suporta usuário + senha OU usuário + PIN (4 últimos dígitos do telefone)
router.post('/login', async (req, res) => {
  const { usuario, senha, pin } = req.body;

  if (!usuario || (!senha && !pin)) {
    return res.status(400).json({
      erro: 'campos_obrigatorios',
      mensagem: 'Informe o usuário e a senha ou PIN de 4 dígitos.'
    });
  }

  const motoboy = await db.prepare(`
    SELECT id, nome, telefone, usuario, senha_hash, status, veiculo
    FROM motoboys
    WHERE LOWER(usuario) = LOWER(?) 
       OR (LOWER(usuario) = 'carlos@gmail.com' AND LOWER(?) = 'carlos.moto')
       OR (LOWER(usuario) = 'carlos.moto' AND LOWER(?) = 'carlos@gmail.com')
  `).get(usuario.trim(), usuario.trim(), usuario.trim());

  if (!motoboy) {
    return res.status(401).json({
      erro: 'credenciais_invalidas',
      mensagem: 'Entregador não encontrado com este usuário.'
    });
  }

  // Verificação por PIN (4 últimos dígitos do telefone)
  if (pin) {
    const foneLimpo = motoboy.telefone.replace(/\D/g, '');
    const pinEsperado = foneLimpo.slice(-4);
    if (pin.trim() !== pinEsperado) {
      return res.status(401).json({
        erro: 'pin_invalido',
        mensagem: 'PIN incorreto. Use os 4 últimos dígitos do seu telefone cadastrado.'
      });
    }
  } else if (senha) {
    const senhaValida = await compararSenha(senha, motoboy.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({
        erro: 'credenciais_invalidas',
        mensagem: 'Senha incorreta.'
      });
    }
  }

  // Verificar status de aprovação
  if (motoboy.status === 'pendente') {
    return res.status(403).json({
      erro: 'cadastro_pendente',
      status: 'pendente',
      mensagem: 'Seu cadastro foi recebido e aguarda aprovação da gerência do Bulls Burger.'
    });
  }

  if (motoboy.status !== 'ativo') {
    return res.status(403).json({
      erro: 'cadastro_inativo',
      status: motoboy.status,
      mensagem: 'Cadastro inativo ou desativado. Procure a gerência.'
    });
  }

  const token = criarSessao('motoboy', motoboy.id);

  res.cookie('bulls_motoboy_token', token, opcoesCookieSessao());

  res.json({
    sucesso: true,
    token,
    motoboy: {
      id: motoboy.id,
      nome: motoboy.nome,
      telefone: motoboy.telefone,
      usuario: motoboy.usuario,
      status: motoboy.status,
      veiculo: motoboy.veiculo
    }
  });
});

// POST /api/auth/motoboy/cadastro
router.post('/cadastro', async (req, res) => {
  const { nome, telefone, usuario, senha, veiculo } = req.body;

  if (!nome?.trim() || !telefone?.trim() || !usuario?.trim() || !senha?.trim()) {
    return res.status(400).json({
      erro: 'campos_obrigatorios',
      mensagem: 'Nome, telefone, usuário e senha são obrigatórios.'
    });
  }

  const telLimpo = telefone.replace(/\D/g, '');
  if (telLimpo.length < 10) {
    return res.status(400).json({
      erro: 'telefone_invalido',
      mensagem: 'Informe um telefone celular válido com DDD.'
    });
  }

  const usuarioExiste = await db.prepare('SELECT id FROM motoboys WHERE LOWER(usuario) = LOWER(?)').get(usuario.trim());
  if (usuarioExiste) {
    return res.status(409).json({
      erro: 'usuario_em_uso',
      mensagem: 'Este nome de usuário já está em uso.'
    });
  }

  try {
    const senhaHash = await hashSenha(senha);
    const resultado = await db.prepare(`
      INSERT INTO motoboys (nome, telefone, usuario, senha_hash, status, veiculo)
      VALUES (?, ?, ?, ?, 'pendente', ?) RETURNING id
    `).run(nome.trim(), telefone.trim(), usuario.trim().toLowerCase(), senhaHash, veiculo?.trim() || 'Moto');

    // Notificar admin de novo entregador cadastrado
    await broadcast('cozinha', {
      tipo: 'motoboy:novo_cadastro',
      motoboy: {
        id: resultado.lastInsertRowid,
        nome: nome.trim(),
        telefone: telefone.trim(),
        usuario: usuario.trim().toLowerCase(),
        status: 'pendente'
      }
    });

    res.status(201).json({
      sucesso: true,
      mensagem: 'Cadastro realizado com sucesso! Aguarde a aprovação do administrador para começar a realizar entregas.',
      pin: telLimpo.slice(-4)
    });
  } catch (err) {
    console.error('Erro no cadastro do motoboy:', err);
    res.status(500).json({ erro: 'erro_interno', mensagem: 'Falha ao registrar entregador.' });
  }
});

// POST /api/auth/motoboy/logout
router.post('/logout', (req, res) => {
  const token = req.cookies?.bulls_motoboy_token || req.headers.authorization?.replace('Bearer ', '');
  revogarSessao(token);
  res.clearCookie('bulls_motoboy_token');
  res.json({ sucesso: true, mensagem: 'Logout efetuado.' });
});

// GET /api/auth/motoboy/me
router.get('/me', async (req, res) => {
  const token = req.cookies?.bulls_motoboy_token || req.headers.authorization?.replace('Bearer ', '');
  const sessao = obterSessao(token);

  if (!sessao || sessao.tipo !== 'motoboy') {
    return res.status(401).json({ autenticado: false });
  }

  const motoboy = await db.prepare(`
    SELECT id, nome, telefone, usuario, status, veiculo
    FROM motoboys
    WHERE id = ?
  `).get(sessao.id);

  if (!motoboy) {
    return res.status(401).json({ autenticado: false });
  }

  res.json({
    autenticado: true,
    motoboy
  });
});

export default router;
