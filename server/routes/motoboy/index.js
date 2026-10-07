import { Router } from 'express';
import db from '../../db/db.js';
import { autenticarMotoboy } from '../../auth/sessao.js';
import { mudarStatusPedido, broadcast } from '../../realtime/hub.js';

const router = Router();

// Todas as rotas abaixo exigem autenticação de motoboy ativo
router.use(autenticarMotoboy);

// GET /api/motoboy/disponiveis — Entregas prontas aguardando motoboy
router.get('/disponiveis', async (req, res) => {
  const pedidos = await db.prepare(`
    SELECT p.id, p.codigo, p.subtotal, p.taxa_entrega, p.total, p.valor_motoboy,
           p.forma_pagamento, p.criado_em,
           c.nome as cliente_nome, c.telefone as cliente_telefone,
           c.endereco as cliente_endereco, c.complemento as cliente_complemento,
           c.referencia as cliente_referencia
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE p.status = 'pronto' AND p.motoboy_id IS NULL
    ORDER BY p.id ASC
  `).all();

  // Adicionar contagem de itens para o motoboy saber o volume
  for (const p of pedidos) {
    const qtd = await db.prepare('SELECT SUM(quantidade) as total_itens FROM pedido_itens WHERE pedido_id = ?').get(p.id);
    p.totalItens = qtd?.total_itens || 1;
    // Montar link direto de rota Google Maps
    const enderecoCodificado = encodeURIComponent(`${p.cliente_endereco}, ${p.cliente_complemento || ''}, Cascavel - PR`);
    p.rotaGoogleMaps = `https://www.google.com/maps/dir/?api=1&destination=${enderecoCodificado}`;
  }

  res.json(pedidos);
});

// POST /api/motoboy/pedidos/:id/aceitar — UPDATE atômico anti race-condition
router.post('/pedidos/:id/aceitar', async (req, res) => {
  const pedidoId = req.params.id;
  const motoboyId = req.motoboy.id;

  // Proteção atômica rigorosa: WHERE garante que ninguém pegou antes no mesmo milissegundo
  const resultado = await db.prepare(`
    UPDATE pedidos
    SET motoboy_id = ?, status = 'em_entrega', aceito_em = datetime('now')
    WHERE id = ? AND motoboy_id IS NULL AND status = 'pronto'
  `).run(motoboyId, pedidoId);

  if (resultado.changes === 0) {
    // Outro motoboy aceitou primeiro ou o pedido foi cancelado
    return res.status(409).json({
      erro: 'pedido_indisponivel',
      mensagem: 'Esta entrega acabou de ser aceita por outro entregador ou não está mais disponível.'
    });
  }

  // Notificar canais em tempo real
  const pedidoAtualizado = await db.prepare(`
    SELECT p.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.endereco as cliente_endereco,
           m.nome as motoboy_nome, m.veiculo as motoboy_veiculo
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    JOIN motoboys m ON m.id = p.motoboy_id
    WHERE p.id = ?
  `).get(pedidoId);

  await broadcast('motoboys', { tipo: 'entrega:removida', pedidoId: Number(pedidoId) });
  await broadcast('cozinha', { tipo: 'pedido:atualizado', pedido: pedidoAtualizado });
  await broadcast(`cliente:${pedidoAtualizado.acesso_token}`, {
    tipo: 'pedido:status',
    status: 'em_entrega',
    motoboy: { nome: req.motoboy.nome, veiculo: req.motoboy.veiculo }
  });

  res.json({
    sucesso: true,
    mensagem: 'Corrida aceita com sucesso! Boa entrega.',
    pedido: pedidoAtualizado
  });
});

// GET /api/motoboy/minhas-entregas — Entregas ativas e histórico do motoboy logado
router.get('/minhas-entregas', async (req, res) => {
  const motoboyId = req.motoboy.id;

  const ativas = await db.prepare(`
    SELECT p.id, p.codigo, p.subtotal, p.taxa_entrega, p.total, p.valor_motoboy,
           p.forma_pagamento, p.troco_para, p.observacoes, p.criado_em, p.aceito_em,
           c.nome as cliente_nome, c.telefone as cliente_telefone,
           c.endereco as cliente_endereco, c.complemento as cliente_complemento,
           c.referencia as cliente_referencia
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE p.motoboy_id = ? AND p.status = 'em_entrega'
    ORDER BY p.aceito_em DESC
  `).all(motoboyId);

  for (const p of ativas) {
    const enderecoCodificado = encodeURIComponent(`${p.cliente_endereco}, ${p.cliente_complemento || ''}, Cascavel - PR`);
    p.rotaGoogleMaps = `https://www.google.com/maps/dir/?api=1&destination=${enderecoCodificado}`;
    p.itens = await db.prepare('SELECT nome_produto, quantidade FROM pedido_itens WHERE pedido_id = ?').all(p.id);
  }

  const historico = await db.prepare(`
    SELECT p.id, p.codigo, p.total, p.valor_motoboy, p.status, p.aceito_em, p.entregue_em,
           c.nome as cliente_nome, c.endereco as cliente_endereco
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE p.motoboy_id = ? AND p.status = 'entregue'
    ORDER BY p.entregue_em DESC
    LIMIT 30
  `).all(motoboyId);

  res.json({ ativas, historico });
});

// PATCH /api/motoboy/entregas/:id/entregue — Baixa de entrega concluída
router.patch('/entregas/:id/entregue', async (req, res) => {
  const pedidoId = req.params.id;
  const motoboyId = req.motoboy.id;

  const resultado = await db.prepare(`
    UPDATE pedidos
    SET status = 'entregue', entregue_em = datetime('now')
    WHERE id = ? AND motoboy_id = ? AND status = 'em_entrega'
  `).run(pedidoId, motoboyId);

  if (resultado.changes === 0) {
    return res.status(400).json({
      erro: 'operacao_invalida',
      mensagem: 'Entrega não encontrada ou já finalizada.'
    });
  }

  // Notificar cliente e cozinha
  await mudarStatusPedido(pedidoId, 'entregue');

  res.json({ sucesso: true, mensagem: 'Entrega finalizada com sucesso! Parabéns pelo serviço.' });
});

// GET /api/motoboy/push/chave-publica — VAPID pública pra registrar a inscrição no navegador
router.get('/push/chave-publica', (req, res) => {
  res.json({ chavePublica: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/motoboy/push/subscribe
router.post('/push/subscribe', async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ erro: 'inscricao_invalida' });
  }

  const existente = await db.prepare('SELECT id FROM motoboy_push_subscriptions WHERE motoboy_id = ? AND endpoint = ?').get(req.motoboy.id, endpoint);
  if (existente) {
    await db.prepare('UPDATE motoboy_push_subscriptions SET ativo = 1, chaves = ? WHERE id = ?').run(JSON.stringify(keys), existente.id);
  } else {
    await db.prepare(`
      INSERT INTO motoboy_push_subscriptions (motoboy_id, endpoint, chaves, ativo)
      VALUES (?, ?, ?, 1)
    `).run(req.motoboy.id, endpoint, JSON.stringify(keys));
  }

  res.status(201).json({ sucesso: true });
});

// DELETE /api/motoboy/push/subscribe — motoboy desligou notificação (ex: fora do expediente)
router.delete('/push/subscribe', async (req, res) => {
  await db.prepare('UPDATE motoboy_push_subscriptions SET ativo = 0 WHERE motoboy_id = ?').run(req.motoboy.id);
  res.json({ sucesso: true });
});

// GET /api/motoboy/metricas — Ganhos e quantidade de entregas
router.get('/metricas', async (req, res) => {
  const motoboyId = req.motoboy.id;

  const hoje = await db.prepare(`
    SELECT COUNT(*) as total_entregas, COALESCE(SUM(valor_motoboy), 0) as total_ganhos
    FROM pedidos
    WHERE motoboy_id = ? AND status = 'entregue' AND date(entregue_em) = date('now')
  `).get(motoboyId);

  const geral = await db.prepare(`
    SELECT COUNT(*) as total_entregas, COALESCE(SUM(valor_motoboy), 0) as total_ganhos
    FROM pedidos
    WHERE motoboy_id = ? AND status = 'entregue'
  `).get(motoboyId);

  res.json({
    hoje: {
      entregas: Number(hoje.total_entregas),
      ganhosCentavos: Number(hoje.total_ganhos),
      ganhosFormatados: `R$ ${(Number(hoje.total_ganhos) / 100).toFixed(2).replace('.', ',')}`
    },
    geral: {
      entregas: Number(geral.total_entregas),
      ganhosCentavos: Number(geral.total_ganhos),
      ganhosFormatados: `R$ ${(Number(geral.total_ganhos) / 100).toFixed(2).replace('.', ',')}`
    }
  });
});

export default router;
