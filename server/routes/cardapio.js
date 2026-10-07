import { Router } from 'express';
import db from '../db/db.js';

const router = Router();

// Função que calcula se o Bulls Burger está aberto no momento atual do servidor
export async function calcularStatusLoja() {
  const config = await db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get('horario_funcionamento');
  if (!config) return { aberto: true, motivo: 'horario_padrao' };

  try {
    const horarios = JSON.parse(config.valor);
    const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
    const agora = new Date();

    // Obter hora e minutos locais
    const diaHoje = dias[agora.getDay()];
    const diaOntem = dias[(agora.getDay() + 6) % 7];
    const horaAtualMinutos = agora.getHours() * 60 + agora.getMinutes();

    // 1. Verificar se hoje está em janela normal ou madrugada
    const regraHoje = horarios[diaHoje];
    const regraOntem = horarios[diaOntem];

    // Se ontem cruzou a meia-noite (ex: 19:00 as 04:00) e agora são menos que 04:00
    if (regraOntem && regraOntem.ativo) {
      const [abreH, abreM] = regraOntem.abre.split(':').map(Number);
      const [fechaH, fechaM] = regraOntem.fecha.split(':').map(Number);
      const abreMin = abreH * 60 + abreM;
      const fechaMin = fechaH * 60 + fechaM;

      if (fechaMin < abreMin && horaAtualMinutos < fechaMin) {
        return {
          aberto: true,
          dia: diaOntem,
          mensagem: `Aberto até às ${regraOntem.fecha}`,
          horario: regraOntem
        };
      }
    }

    // Verificar se hoje está aberto agora
    if (regraHoje && regraHoje.ativo) {
      const [abreH, abreM] = regraHoje.abre.split(':').map(Number);
      const [fechaH, fechaM] = regraHoje.fecha.split(':').map(Number);
      const abreMin = abreH * 60 + abreM;
      const fechaMin = fechaH * 60 + fechaM;

      if (fechaMin > abreMin) {
        if (horaAtualMinutos >= abreMin && horaAtualMinutos < fechaMin) {
          return { aberto: true, dia: diaHoje, mensagem: `Aberto até às ${regraHoje.fecha}`, horario: regraHoje };
        }
      } else {
        // Cruza a meia-noite
        if (horaAtualMinutos >= abreMin) {
          return { aberto: true, dia: diaHoje, mensagem: `Aberto até às ${regraHoje.fecha}`, horario: regraHoje };
        }
      }
    }

    return {
      aberto: false,
      mensagem: `Fechado no momento. Abrimos às ${regraHoje?.abre || '19:00'}`,
      proximaAbertura: regraHoje?.abre || '19:00'
    };
  } catch (err) {
    return { aberto: true, fallback: true };
  }
}

// GET /api/cardapio — Categorias, produtos, imagens e opcionais
router.get('/', async (req, res) => {
  const categorias = await db.prepare(`
    SELECT id, nome, icone, ordem
    FROM categorias
    WHERE ativa = 1
    ORDER BY ordem ASC
  `).all();

  const produtos = await db.prepare(`
    SELECT p.id, p.categoria_id, p.nome, p.descricao, p.ingredientes,
           p.preco_base, p.preco_promocional, p.serve_pessoas, p.destaque, p.ordem
    FROM produtos p
    WHERE p.ativo = 1
    ORDER BY p.ordem ASC
  `).all();

  const imagens = await db.prepare(`
    SELECT produto_id, arquivo, principal
    FROM produto_imagens
    ORDER BY ordem ASC
  `).all();

  const grupos = await db.prepare(`
    SELECT id, produto_id, titulo, obrigatorio, min_escolhas, max_escolhas, ordem
    FROM opcional_grupos
    ORDER BY ordem ASC
  `).all();

  const itensOpcionais = await db.prepare(`
    SELECT id, grupo_id, nome, preco_adicional, ordem
    FROM opcional_itens
    ORDER BY ordem ASC
  `).all();

  // Indexar dados para resposta limpa e aninhada
  const gruposMap = new Map();
  for (const g of grupos) {
    g.itens = [];
    gruposMap.set(g.id, g);
  }
  for (const item of itensOpcionais) {
    const grupo = gruposMap.get(item.grupo_id);
    if (grupo) grupo.itens.push(item);
  }

  const produtosMap = new Map();
  for (const p of produtos) {
    p.imagens = [];
    p.gruposOpcionais = [];
    produtosMap.set(p.id, p);
  }
  for (const img of imagens) {
    const p = produtosMap.get(img.produto_id);
    if (p) p.imagens.push(img.arquivo);
  }
  for (const g of gruposMap.values()) {
    const p = produtosMap.get(g.produto_id);
    if (p) p.gruposOpcionais.push(g);
  }

  const resultado = categorias.map(c => ({
    ...c,
    produtos: produtos.filter(p => p.categoria_id === c.id)
  }));

  // Buscar destaques
  const destaques = produtos.filter(p => p.destaque === 1);

  res.json({
    categorias: resultado,
    destaques,
    statusLoja: await calcularStatusLoja()
  });
});

// GET /api/loja/status
router.get('/status', async (req, res) => {
  res.json(await calcularStatusLoja());
});

// GET /api/loja/info — Informações gerais do negócio
router.get('/info', async (req, res) => {
  const configs = await db.prepare('SELECT chave, valor FROM configuracoes').all();
  const info = {};
  for (const c of configs) {
    info[c.chave] = c.valor;
  }
  res.json({
    nome: info.nome_loja || 'Trailer 94',
    whatsapp: info.whatsapp || '(45) 99999-9494',
    cidade: info.cidade || 'Foz do Iguaçu',
    estado: info.estado || 'PR',
    endereco: info.endereco_referencia || 'Foz do Iguaçu - PR',
    taxaEntrega: Number(info.taxa_entrega_padrao || 700),
    pedidoMinimo: Number(info.pedido_minimo || 2500),
    tempoEstimado: info.tempo_estimado_entrega || '30-45 min',
    logoUrl: info.logo_url || null,
    bannerUrl: info.banner_url || null,
    statusLoja: await calcularStatusLoja()
  });
});

// GET /api/cardapio/pedidos-cozinha — Lista pedidos recentes da Cozinha KDS
router.get('/pedidos-cozinha', async (req, res) => {
  const pedidos = await db.prepare(`
    SELECT p.id, p.codigo, p.acesso_token, p.status, p.forma_pagamento, p.troco_para,
           p.observacoes, p.subtotal, p.taxa_entrega, p.total, p.criado_em,
           c.nome as cliente_nome, c.telefone as cliente_telefone, c.endereco as cliente_endereco
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE p.criado_em >= datetime('now', '-24 hours')
      OR p.status IN ('recebido', 'em_preparo', 'pronto')
    ORDER BY p.id DESC
  `).all();

  const ids = pedidos.map(p => p.id);
  if (ids.length > 0) {
    const todosItens = await db.prepare(`
      SELECT id, pedido_id, produto_id, nome_produto, preco_unitario, quantidade
      FROM pedido_itens
      WHERE pedido_id IN (${ids.map(() => '?').join(',')})
    `).all(...ids);

    const itemIds = todosItens.map(i => i.id);
    let todosOpcionais = [];
    if (itemIds.length > 0) {
      todosOpcionais = await db.prepare(`
        SELECT pedido_item_id, nome_opcional, preco_adicional
        FROM pedido_item_opcionais
        WHERE pedido_item_id IN (${itemIds.map(() => '?').join(',')})
      `).all(...itemIds);
    }

    const opcMap = new Map();
    for (const o of todosOpcionais) {
      if (!opcMap.has(o.pedido_item_id)) opcMap.set(o.pedido_item_id, []);
      opcMap.get(o.pedido_item_id).push(o);
    }

    const itemMap = new Map();
    for (const item of todosItens) {
      item.opcionais = opcMap.get(item.id) || [];
      if (!itemMap.has(item.pedido_id)) itemMap.set(item.pedido_id, []);
      itemMap.get(item.pedido_id).push(item);
    }

    for (const p of pedidos) {
      p.itens = itemMap.get(p.id) || [];
    }
  }

  res.json(pedidos);
});

// PATCH /api/cardapio/pedidos/:id/status — Atualização de status da cozinha/loja
router.patch('/pedidos/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const permitidos = ['recebido', 'em_preparo', 'pronto', 'em_entrega', 'entregue', 'cancelado'];
  if (!permitidos.includes(status)) {
    return res.status(400).json({ erro: 'status_invalido', mensagem: 'Status inválido.' });
  }

  await db.prepare('UPDATE pedidos SET status = ? WHERE id = ?').run(status, id);
  res.json({ sucesso: true, status });
});

export default router;
