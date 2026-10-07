import jwt from 'jsonwebtoken';
import db from '../db/db.js';

const SEGREDO = process.env.JWT_SECRET || 'trailer94_segredo_local_dev_2026';
const TTL = '90d';

// Sessão deixou de viver numa Map em memória (isso não sobrevive a funções
// serverless, que podem cair numa instância nova a cada request) e virou um
// JWT assinado: o próprio token carrega {tipo, id}, e cada request só precisa
// verificar a assinatura, sem estado nenhum guardado no servidor.
export function criarSessao(tipo, id, payload = {}) {
  return jwt.sign({ tipo, id, ...payload }, SEGREDO, { expiresIn: TTL });
}

export function obterSessao(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, SEGREDO);
  } catch {
    return null;
  }
}

// Sem lista de revogação server-side (exigiria uma tabela só pra isso).
// Logout de verdade acontece limpando o cookie; o token antigo expira sozinho
// em até 24h se for reaproveitado manualmente.
export function revogarSessao() {}

export async function autenticarDono(req, res, next) {
  const token = req.cookies?.bulls_admin_token || req.headers.authorization?.replace('Bearer ', '');
  const sessao = obterSessao(token);

  if (!sessao || sessao.tipo !== 'dono') {
    return res.status(401).json({ erro: 'nao_autorizado', mensagem: 'Acesso restrito ao administrador.' });
  }

  const usuario = await db.prepare('SELECT id, nome, email, papel FROM usuarios WHERE id = ?').get(sessao.id);
  if (!usuario) {
    return res.status(401).json({ erro: 'sessao_invalida' });
  }

  req.usuario = usuario;
  next();
}

export async function autenticarMotoboy(req, res, next) {
  const token = req.cookies?.bulls_motoboy_token || req.headers.authorization?.replace('Bearer ', '');
  const sessao = obterSessao(token);

  if (!sessao || sessao.tipo !== 'motoboy') {
    return res.status(401).json({ erro: 'nao_autorizado', mensagem: 'Acesso restrito aos entregadores cadastrados.' });
  }

  const motoboy = await db.prepare('SELECT id, nome, telefone, usuario, status, veiculo FROM motoboys WHERE id = ?').get(sessao.id);
  if (!motoboy) {
    return res.status(401).json({ erro: 'motoboy_inexistente' });
  }

  if (motoboy.status !== 'ativo') {
    return res.status(403).json({
      erro: 'cadastro_nao_ativo',
      status: motoboy.status,
      mensagem: motoboy.status === 'pendente'
        ? 'Seu cadastro está em análise pela equipe Bulls Burger.'
        : 'Cadastro desativado ou recusado.'
    });
  }

  req.motoboy = motoboy;
  next();
}
