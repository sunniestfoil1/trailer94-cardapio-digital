import { Router } from 'express';
import db from '../db/db.js';

const router = Router();

function normalizarTexto(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// GET /api/enderecos/busca?q=... — Autocomplete ultrarrápido restrito a Foz do Iguaçu - PR
router.get('/busca', async (req, res) => {
  const q = req.query.q;
  if (!q || typeof q !== 'string' || q.trim().length < 2) {
    return res.json([]);
  }

  const normalizado = normalizarTexto(q);
  const queryTerm = `%${normalizado}%`;
  const startTerm = `${normalizado}%`;

  try {
    const ruas = await db.prepare(`
      SELECT id, nome, tipo, bairro, cidade, uf, lat, lng, exibicao
      FROM ruas_foz
      WHERE busca_termo ILIKE ?
      ORDER BY
        CASE
          WHEN busca_termo ILIKE ? THEN 1
          WHEN nome ILIKE ? THEN 2
          ELSE 3
        END,
        nome ASC
      LIMIT 8
    `).all(queryTerm, startTerm, startTerm);

    res.json(ruas);
  } catch (err) {
    console.error('Erro na busca de endereços:', err);
    res.status(500).json({ erro: 'erro_busca', mensagem: 'Falha ao buscar logradouros.' });
  }
});

// GET /api/enderecos/bairros — Lista de bairros atendidos em Foz do Iguaçu
router.get('/bairros', async (req, res) => {
  try {
    const linhas = await db.prepare(`
      SELECT DISTINCT bairro
      FROM ruas_foz
      WHERE bairro IS NOT NULL
      ORDER BY bairro ASC
    `).all();

    res.json(linhas.map(r => r.bairro));
  } catch (err) {
    res.status(500).json({ erro: 'erro_bairros' });
  }
});

export default router;
