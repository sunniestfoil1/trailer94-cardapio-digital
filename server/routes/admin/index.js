import { Router } from 'express';
import crypto from 'node:crypto';
import multer from 'multer';
import db from '../../db/db.js';
import { autenticarDono } from '../../auth/sessao.js';
import { mudarStatusPedido, broadcast } from '../../realtime/hub.js';
import { hashSenha, compararSenha } from '../../auth/senha.js';
import { subirImagemProduto, listarImagensProdutos, apagarImagemProduto } from '../../lib/supabaseStorage.js';
import { gerarBufferComanda, enviarParaImpressoraRede } from '../../lib/impressaoTermica.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Apenas arquivos de imagem são aceitos.'));
    cb(null, true);
  }
});

// Todas as rotas do admin exigem autenticação do dono
router.use(autenticarDono);

// GET /api/admin/dashboard?periodo=hoje|15dias|mes — Métricas de performance e visão geral
router.get('/dashboard', async (req, res) => {
  const periodo = ['hoje', '15dias', 'mes'].includes(req.query.periodo) ? req.query.periodo : 'hoje';
  const filtroData = {
    hoje: "date(criado_em) = date('now')",
    '15dias': "criado_em >= (now() - interval '15 days')",
    mes: "date_trunc('month', criado_em) = date_trunc('month', now())"
  }[periodo];

  const pedidosHoje = await db.prepare(`
    SELECT COUNT(*) as total_pedidos,
           COALESCE(SUM(total), 0) as faturamento_total,
           SUM(CASE WHEN status = 'recebido' THEN 1 ELSE 0 END) as novos,
           SUM(CASE WHEN status = 'em_preparo' THEN 1 ELSE 0 END) as em_preparo,
           SUM(CASE WHEN status = 'pronto' THEN 1 ELSE 0 END) as prontos,
           SUM(CASE WHEN status = 'em_entrega' THEN 1 ELSE 0 END) as em_entrega,
           SUM(CASE WHEN status = 'entregue' THEN 1 ELSE 0 END) as entregues
    FROM pedidos
    WHERE ${filtroData}
  `).get();

  const motoboysOnline = (await db.prepare(`
    SELECT COUNT(*) as total FROM motoboys WHERE status = 'ativo'
  `).get()).total;

  const motoboysPendentes = (await db.prepare(`
    SELECT COUNT(*) as total FROM motoboys WHERE status = 'pendente'
  `).get()).total;

  res.json({
    pedidosHoje: {
      total_pedidos: Number(pedidosHoje.total_pedidos),
      faturamento_total: Number(pedidosHoje.faturamento_total),
      novos: Number(pedidosHoje.novos),
      em_preparo: Number(pedidosHoje.em_preparo),
      prontos: Number(pedidosHoje.prontos),
      em_entrega: Number(pedidosHoje.em_entrega),
      entregues: Number(pedidosHoje.entregues)
    },
    motoboysOnline: Number(motoboysOnline),
    motoboysPendentes: Number(motoboysPendentes)
  });
});

// GET /api/admin/pedidos — Listagem com KDS (cozinha)
router.get('/pedidos', async (req, res) => {
  const { status, data } = req.query;

  let query = `
    SELECT p.*, c.nome as cliente_nome, c.telefone as cliente_telefone,
           c.endereco as cliente_endereco, c.complemento as cliente_complemento,
           c.referencia as cliente_referencia,
           m.nome as motoboy_nome, m.telefone as motoboy_telefone
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN motoboys m ON m.id = p.motoboy_id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }
  if (data) {
    query += ' AND date(p.criado_em) = ?';
    params.push(data);
  } else {
    // Padrão: pedidos das últimas 24h
    query += " AND p.criado_em >= datetime('now', '-24 hours')";
  }

  query += ' ORDER BY p.id DESC';

  const pedidos = await db.prepare(query).all(...params);

  for (const p of pedidos) {
    const itens = await db.prepare(`
      SELECT id, produto_id, nome_produto, preco_unitario, quantidade
      FROM pedido_itens
      WHERE pedido_id = ?
    `).all(p.id);

    for (const item of itens) {
      item.opcionais = await db.prepare(`
        SELECT nome_opcional, preco_adicional
        FROM pedido_item_opcionais
        WHERE pedido_item_id = ?
      `).all(item.id);
    }
    p.itens = itens;
  }

  res.json(pedidos);
});

// PATCH /api/admin/pedidos/:id — Alterar status do pedido
router.patch('/pedidos/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = ['recebido', 'em_preparo', 'pronto', 'em_entrega', 'entregue', 'cancelado'];
  if (!status || !statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'status_invalido' });
  }

  const pedidoAtualizado = await mudarStatusPedido(id, status);
  if (!pedidoAtualizado) {
    return res.status(404).json({ erro: 'pedido_nao_encontrado' });
  }

  res.json({ sucesso: true, pedido: pedidoAtualizado });
});

// GET /api/admin/produtos — Listagem de produtos para edição
router.get('/produtos', async (req, res) => {
  const produtos = await db.prepare(`
    SELECT p.*, c.nome as categoria_nome
    FROM produtos p
    JOIN categorias c ON c.id = p.categoria_id
    ORDER BY p.categoria_id ASC, p.ordem ASC
  `).all();

  for (const p of produtos) {
    p.imagens = await db.prepare('SELECT arquivo, principal FROM produto_imagens WHERE produto_id = ?').all(p.id);
    p.gruposOpcionais = await db.prepare('SELECT * FROM opcional_grupos WHERE produto_id = ? ORDER BY ordem ASC').all(p.id);
    for (const g of p.gruposOpcionais) {
      g.itens = await db.prepare('SELECT * FROM opcional_itens WHERE grupo_id = ? ORDER BY ordem ASC').all(g.id);
    }
  }

  res.json(produtos);
});

// POST /api/admin/produtos — Criar produto
router.post('/produtos', async (req, res) => {
  const { categoria_id, nome, descricao, ingredientes, preco_base, preco_promocional, destaque } = req.body;

  if (!categoria_id || !nome || !preco_base) {
    return res.status(400).json({ erro: 'campos_obrigatorios' });
  }

  const resultado = await db.prepare(`
    INSERT INTO produtos (categoria_id, nome, descricao, ingredientes, preco_base, preco_promocional, destaque, ativo)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1) RETURNING id
  `).run(
    categoria_id,
    nome.trim(),
    descricao?.trim() || null,
    ingredientes?.trim() || null,
    Number(preco_base),
    preco_promocional ? Number(preco_promocional) : null,
    destaque ? 1 : 0
  );

  res.status(201).json({ sucesso: true, id: resultado.lastInsertRowid });
});

// PUT /api/admin/produtos/:id — Atualizar produto
router.put('/produtos/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, ingredientes, preco_base, preco_promocional, ativo, destaque } = req.body;

  await db.prepare(`
    UPDATE produtos
    SET nome = COALESCE(?, nome),
        descricao = COALESCE(?, descricao),
        ingredientes = COALESCE(?, ingredientes),
        preco_base = COALESCE(?, preco_base),
        preco_promocional = ?,
        ativo = COALESCE(?, ativo),
        destaque = COALESCE(?, destaque)
    WHERE id = ?
  `).run(
    nome?.trim(),
    descricao?.trim(),
    ingredientes?.trim(),
    preco_base ? Number(preco_base) : null,
    preco_promocional ? Number(preco_promocional) : null,
    ativo !== undefined ? (ativo ? 1 : 0) : null,
    destaque !== undefined ? (destaque ? 1 : 0) : null,
    id
  );

  res.json({ sucesso: true });
});

// DELETE /api/admin/produtos/:id — Excluir produto do cardápio
router.delete('/produtos/:id', async (req, res) => {
  const { id } = req.params;
  const tx = db.transaction(async (t) => {
    const grupos = await t.prepare('SELECT id FROM opcional_grupos WHERE produto_id = ?').all(id);
    for (const g of grupos) {
      await t.prepare('DELETE FROM opcional_itens WHERE grupo_id = ?').run(g.id);
    }
    await t.prepare('DELETE FROM opcional_grupos WHERE produto_id = ?').run(id);
    await t.prepare('DELETE FROM produto_imagens WHERE produto_id = ?').run(id);
    await t.prepare('DELETE FROM produtos WHERE id = ?').run(id);
  });
  await tx();
  res.json({ sucesso: true });
});

// POST /api/admin/produtos/:id/imagens — Anexar imagem já hospedada (upload real fica pro próximo passo)
router.post('/produtos/:id/imagens', async (req, res) => {
  const { id } = req.params;
  const { arquivo, principal } = req.body;

  if (!arquivo || typeof arquivo !== 'string') {
    return res.status(400).json({ erro: 'arquivo_obrigatorio', mensagem: 'Informe o caminho/URL da imagem.' });
  }

  if (principal) {
    await db.prepare('UPDATE produto_imagens SET principal = 0 WHERE produto_id = ?').run(id);
  }

  const resultado = await db.prepare(`
    INSERT INTO produto_imagens (produto_id, arquivo, principal)
    VALUES (?, ?, ?) RETURNING id
  `).run(id, arquivo, principal ? 1 : 0);

  res.status(201).json({ sucesso: true, id: resultado.lastInsertRowid });
});

// DELETE /api/admin/produtos/:id/imagens/:imagemId
router.delete('/produtos/:id/imagens/:imagemId', async (req, res) => {
  const { imagemId } = req.params;
  await db.prepare('DELETE FROM produto_imagens WHERE id = ?').run(imagemId);
  res.json({ sucesso: true });
});

// POST /api/admin/upload-imagem — Envia um arquivo novo pro Supabase Storage
// e devolve a URL pronta pra usar em POST /produtos/:id/imagens. Separado em
// duas chamadas de propósito: assim a mesma imagem enviada uma vez pode ser
// reaproveitada em vários produtos sem subir de novo.
router.post('/upload-imagem', upload.single('imagem'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ erro: 'arquivo_obrigatorio', mensagem: 'Envie um arquivo de imagem.' });
  }

  try {
    const { arquivo, nomeArquivo } = await subirImagemProduto(req.file.buffer, req.file.originalname, req.file.mimetype);
    res.status(201).json({ sucesso: true, arquivo, nomeArquivo });
  } catch (err) {
    console.error('Erro no upload de imagem:', err);
    res.status(500).json({ erro: 'erro_upload', mensagem: 'Falha ao enviar a imagem.' });
  }
});

// GET /api/admin/imagens — Lista o que já foi enviado, pra reaproveitar em outro produto
router.get('/imagens', async (req, res) => {
  try {
    const imagens = await listarImagensProdutos();
    res.json(Array.isArray(imagens) ? imagens : []);
  } catch (err) {
    console.error('Erro ao listar imagens:', err);
    res.json([]);
  }
});

// DELETE /api/admin/imagens/:nomeArquivo — Remove do Storage (só se nenhum produto usar mais)
router.delete('/imagens/:nomeArquivo', async (req, res) => {
  try {
    await apagarImagemProduto(req.params.nomeArquivo);
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'erro_remocao', mensagem: 'Falha ao remover a imagem.' });
  }
});

// POST /api/admin/produtos/:id/grupos — Criar grupo de adicionais (ex: "Ponto da carne")
router.post('/produtos/:id/grupos', async (req, res) => {
  const { id } = req.params;
  const { titulo, obrigatorio, min_escolhas, max_escolhas, ordem } = req.body;

  if (!titulo?.trim()) {
    return res.status(400).json({ erro: 'titulo_obrigatorio' });
  }

  const resultado = await db.prepare(`
    INSERT INTO opcional_grupos (produto_id, titulo, obrigatorio, min_escolhas, max_escolhas, ordem)
    VALUES (?, ?, ?, ?, ?, ?) RETURNING id
  `).run(
    id,
    titulo.trim(),
    obrigatorio ? 1 : 0,
    Number(min_escolhas) || 0,
    Number(max_escolhas) || 1,
    Number(ordem) || 0
  );

  res.status(201).json({ sucesso: true, id: resultado.lastInsertRowid });
});

// PUT /api/admin/grupos/:id
router.put('/grupos/:id', async (req, res) => {
  const { id } = req.params;
  const { titulo, obrigatorio, min_escolhas, max_escolhas, ordem } = req.body;

  await db.prepare(`
    UPDATE opcional_grupos
    SET titulo = COALESCE(?, titulo),
        obrigatorio = COALESCE(?, obrigatorio),
        min_escolhas = COALESCE(?, min_escolhas),
        max_escolhas = COALESCE(?, max_escolhas),
        ordem = COALESCE(?, ordem)
    WHERE id = ?
  `).run(
    titulo?.trim(),
    obrigatorio !== undefined ? (obrigatorio ? 1 : 0) : null,
    min_escolhas !== undefined ? Number(min_escolhas) : null,
    max_escolhas !== undefined ? Number(max_escolhas) : null,
    ordem !== undefined ? Number(ordem) : null,
    id
  );

  res.json({ sucesso: true });
});

// DELETE /api/admin/grupos/:id
router.delete('/grupos/:id', async (req, res) => {
  await db.prepare('DELETE FROM opcional_grupos WHERE id = ?').run(req.params.id);
  res.json({ sucesso: true });
});

// POST /api/admin/grupos/:id/itens — Criar item de adicional (ex: "Bacon extra")
router.post('/grupos/:id/itens', async (req, res) => {
  const { id } = req.params;
  const { nome, preco_adicional, ordem } = req.body;

  if (!nome?.trim()) {
    return res.status(400).json({ erro: 'nome_obrigatorio' });
  }

  const resultado = await db.prepare(`
    INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem)
    VALUES (?, ?, ?, ?) RETURNING id
  `).run(id, nome.trim(), Number(preco_adicional) || 0, Number(ordem) || 0);

  res.status(201).json({ sucesso: true, id: resultado.lastInsertRowid });
});

// PUT /api/admin/itens/:id
router.put('/itens/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, preco_adicional, ordem } = req.body;

  await db.prepare(`
    UPDATE opcional_itens
    SET nome = COALESCE(?, nome),
        preco_adicional = COALESCE(?, preco_adicional),
        ordem = COALESCE(?, ordem)
    WHERE id = ?
  `).run(
    nome?.trim(),
    preco_adicional !== undefined ? Number(preco_adicional) : null,
    ordem !== undefined ? Number(ordem) : null,
    id
  );

  res.json({ sucesso: true });
});

// DELETE /api/admin/itens/:id
router.delete('/itens/:id', async (req, res) => {
  await db.prepare('DELETE FROM opcional_itens WHERE id = ?').run(req.params.id);
  res.json({ sucesso: true });
});

// GET /api/admin/categorias
router.get('/categorias', async (req, res) => {
  const categorias = await db.prepare('SELECT * FROM categorias ORDER BY ordem ASC').all();
  res.json(categorias);
});

// POST /api/admin/categorias
router.post('/categorias', async (req, res) => {
  const { nome, icone, ordem } = req.body;
  if (!nome?.trim()) {
    return res.status(400).json({ erro: 'nome_obrigatorio' });
  }
  const resultado = await db.prepare(`
    INSERT INTO categorias (nome, icone, ordem) VALUES (?, ?, ?) RETURNING id
  `).run(nome.trim(), icone || null, Number(ordem) || 0);
  res.status(201).json({ sucesso: true, id: resultado.lastInsertRowid });
});

// PUT /api/admin/categorias/:id
router.put('/categorias/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, icone, ordem, ativa } = req.body;
  await db.prepare(`
    UPDATE categorias
    SET nome = COALESCE(?, nome), icone = COALESCE(?, icone), ordem = COALESCE(?, ordem),
        ativa = COALESCE(?, ativa)
    WHERE id = ?
  `).run(nome?.trim(), icone, ordem !== undefined ? Number(ordem) : null, ativa !== undefined ? (ativa ? 1 : 0) : null, id);
  res.json({ sucesso: true });
});

// GET /api/admin/motoboys — Listagem e gestão de entregadores
router.get('/motoboys', async (req, res) => {
  const motoboys = await db.prepare(`
    SELECT m.*,
           (SELECT COUNT(*) FROM pedidos p WHERE p.motoboy_id = m.id AND p.status = 'entregue') as total_entregas,
           (SELECT COALESCE(SUM(p.valor_motoboy), 0) FROM pedidos p WHERE p.motoboy_id = m.id AND p.status = 'entregue') as total_ganhos
    FROM motoboys m
    ORDER BY m.criado_em DESC
  `).all();

  res.json(motoboys.map(m => ({ ...m, total_entregas: Number(m.total_entregas), total_ganhos: Number(m.total_ganhos) })));
});

// PATCH /api/admin/motoboys/:id/status — Aprovar ou desativar entregador
router.patch('/motoboys/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = ['pendente', 'ativo', 'recusado', 'desativado'];
  if (!status || !statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'status_invalido' });
  }

  await db.prepare(`
    UPDATE motoboys
    SET status = ?, aprovado_em = CASE WHEN ? = 'ativo' THEN datetime('now') ELSE aprovado_em END
    WHERE id = ?
  `).run(status, status, id);

  // Notificar o motoboy se ele estiver conectado
  await broadcast(`motoboy:${id}`, {
    tipo: 'motoboy:status_alterado',
    status
  });

  res.json({ sucesso: true, mensagem: `Status do entregador alterado para ${status}.` });
});

// GET /api/admin/configuracoes
router.get('/configuracoes', async (req, res) => {
  const configs = await db.prepare('SELECT chave, valor FROM configuracoes').all();
  const mapa = {};
  for (const c of configs) {
    try {
      mapa[c.chave] = JSON.parse(c.valor);
    } catch {
      mapa[c.chave] = c.valor;
    }
  }
  res.json(mapa);
});

// PUT /api/admin/configuracoes
router.put('/configuracoes', async (req, res) => {
  const valores = req.body;

  const tx = db.transaction(async (t) => {
    const stmt = t.prepare(`
      INSERT INTO configuracoes (chave, valor)
      VALUES (?, ?)
      ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
    `);
    for (const [chave, valor] of Object.entries(valores)) {
      const valorStr = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
      await stmt.run(chave, valorStr);
    }
  });

  await tx();
  res.json({ sucesso: true, mensagem: 'Configurações salvas com sucesso.' });
});

// POST /api/admin/alterar-senha — Troca segura de senha
router.post('/alterar-senha', async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;

  if (!senhaAtual || !novaSenha || novaSenha.length < 6) {
    return res.status(400).json({
      erro: 'dados_invalidos',
      mensagem: 'A nova senha deve possuir no mínimo 6 caracteres.'
    });
  }

  const usuario = await db.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(req.usuario.id);
  const senhaCorreta = await compararSenha(senhaAtual, usuario.senha_hash);

  if (!senhaCorreta) {
    return res.status(401).json({
      erro: 'senha_incorreta',
      mensagem: 'A senha atual informada está incorreta.'
    });
  }

  const novoHash = await hashSenha(novaSenha);
  await db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(novoHash, req.usuario.id);

  res.json({ sucesso: true, mensagem: 'Senha de administrador alterada com sucesso!' });
});

// GET /api/admin/mapa-calor?periodo=hoje|15dias|mes|todos — Dados para Mapa de Calor OpenStreetMap
router.get('/mapa-calor', async (req, res) => {
  const periodo = ['hoje', '15dias', 'mes', 'todos'].includes(req.query.periodo) ? req.query.periodo : 'todos';
  const filtroData = {
    hoje: "p.criado_em >= date_trunc('day', now())",
    '15dias': "p.criado_em >= (now() - interval '15 days')",
    mes: "date_trunc('month', p.criado_em) = date_trunc('month', now())",
    todos: "1=1"
  }[periodo];

  try {
    const pedidos = await db.prepare(`
      SELECT p.id, p.total, p.subtotal, p.criado_em, c.endereco, c.nome as cliente_nome
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE ${filtroData}
    `).all();

    const ruas = (await db.prepare(`
      SELECT id, nome, tipo, bairro, cidade, lat, lng 
      FROM ruas_foz
      WHERE lat != 0 AND lng != 0
    `).all()).sort((a, b) => b.nome.length - a.nome.length);

    const agrupado = {};
    const bairrosMap = {};
    let faturamentoTotal = 0;

    for (const p of pedidos) {
      const end = (p.endereco || '').toLowerCase();
      // Encontrar match por nome de rua mais específico (ordenadas por tamanho decrescente)
      const ruaMatch = ruas.find(r => end.includes(r.nome.toLowerCase()));

      if (ruaMatch) {
        const chave = `${ruaMatch.nome} - ${ruaMatch.bairro}`;
        if (!agrupado[chave]) {
          agrupado[chave] = {
            id: ruaMatch.id,
            rua: ruaMatch.nome,
            tipo: ruaMatch.tipo,
            bairro: ruaMatch.bairro,
            cidade: ruaMatch.cidade,
            lat: Number(ruaMatch.lat),
            lng: Number(ruaMatch.lng),
            total_pedidos: 0,
            valor_total: 0
          };
        }
        agrupado[chave].total_pedidos += 1;
        agrupado[chave].valor_total += Number(p.total);
        faturamentoTotal += Number(p.total);

        // Agrupamento por bairro
        const b = ruaMatch.bairro || 'Outros';
        if (!bairrosMap[b]) {
          bairrosMap[b] = { bairro: b, total_pedidos: 0, valor_total: 0 };
        }
        bairrosMap[b].total_pedidos += 1;
        bairrosMap[b].valor_total += Number(p.total);
      }
    }

    const listaPontos = Object.values(agrupado);
    const maxPedidos = Math.max(1, ...listaPontos.map(p => p.total_pedidos));
    const maxValor = Math.max(1, ...listaPontos.map(p => p.valor_total));

    // Determinar o raio em metros e intensidade da cor
    const pontosComRaio = listaPontos.map(pt => {
      const pesoPedidos = pt.total_pedidos / maxPedidos;
      const pesoValor = pt.valor_total / maxValor;
      const intensidade = Math.min(1, 0.2 + (pesoPedidos * 0.5) + (pesoValor * 0.3));
      
      // Raio dinâmico em metros (de 250m a 1200m)
      const raioMetros = Math.round(250 + (pesoPedidos * 650) + (pesoValor * 300));
      
      return {
        ...pt,
        raio_metros: raioMetros,
        intensidade: Number(intensidade.toFixed(2)),
        ticket_medio: Math.round(pt.valor_total / pt.total_pedidos)
      };
    }).sort((a, b) => b.total_pedidos - a.total_pedidos);

    const rankingBairros = Object.values(bairrosMap).sort((a, b) => b.total_pedidos - a.total_pedidos);

    res.json({
      sucesso: true,
      periodo,
      centro: {
        lat: -25.5163,
        lng: -54.5854,
        zoom: 13
      },
      estatisticas: {
        total_pedidos_mapeados: pedidos.length,
        total_pontos_geograficos: pontosComRaio.length,
        faturamento_total: faturamentoTotal,
        bairro_campeao: rankingBairros[0]?.bairro || 'Centro',
        rua_campea: pontosComRaio[0]?.rua || 'Avenida Brasil',
        raio_maximo_metros: Math.max(0, ...pontosComRaio.map(p => p.raio_metros)),
        ranking_bairros: rankingBairros.slice(0, 8),
        ranking_ruas: pontosComRaio.slice(0, 10)
      },
      pontos: pontosComRaio
    });
  } catch (err) {
    console.error('Erro ao gerar dados do mapa de calor:', err);
    res.status(500).json({ erro: 'erro_mapa', mensagem: 'Falha ao processar mapa de calor.' });
  }
});

// POST /api/admin/pedidos/:id/imprimir — Impressão de Comanda Térmica (ESC/POS ou Rede)
router.post('/pedidos/:id/imprimir', async (req, res) => {
  const { id } = req.params;
  const { largura = '80mm', via = 'COZINHA', ipImpressora } = req.body || {};

  try {
    const pedido = await db.prepare(`
      SELECT p.*, c.nome as cliente_nome, c.telefone as cliente_telefone, 
             c.endereco as cliente_endereco, c.complemento, c.referencia
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE p.id = ?
    `).get(id);

    if (!pedido) {
      return res.status(404).json({ erro: 'pedido_nao_encontrado' });
    }

    const itens = await db.prepare(`
      SELECT pi.*, p.nome as nome_produto
      FROM pedido_itens pi
      LEFT JOIN produtos p ON p.id = pi.produto_id
      WHERE pi.pedido_id = ?
    `).all(id);

    for (const item of itens) {
      item.opcionais = await db.prepare(`
        SELECT nome_opcional, preco_adicional 
        FROM pedido_item_opcionais 
        WHERE pedido_item_id = ?
      `).all(item.id);
    }

    pedido.itens = itens;

    // Gerar Buffer ESC/POS
    const buffer = gerarBufferComanda(pedido, largura, via);

    // Se IP foi informado ou configurado no banco, envia via TCP socket
    let envioRede = null;
    const ipAlvo = ipImpressora || (await db.prepare("SELECT valor FROM configuracoes WHERE chave = 'ip_impressora_termica'").get())?.valor;

    if (ipAlvo && ipAlvo.trim().length > 6) {
      try {
        const porta = 9100;
        envioRede = await enviarParaImpressoraRede(ipAlvo.trim(), porta, buffer);
      } catch (printErr) {
        console.warn('Aviso: Não foi possível enviar para impressora TCP/IP:', printErr.message);
        envioRede = { sucesso: false, erro: printErr.message };
      }
    }

    res.json({
      sucesso: true,
      mensagem: 'Comanda processada com sucesso.',
      envioRede,
      pedido,
      largura,
      via,
      base64Escpos: buffer.toString('base64')
    });
  } catch (err) {
    console.error('Erro ao processar impressão:', err);
    res.status(500).json({ erro: 'erro_impressao', mensagem: 'Falha ao processar comanda térmica.' });
  }
});

// Função auxiliar reutilizável para simular pedidos realistas em Foz do Iguaçu
async function gerarPedidoSimulado() {
  const nomesFoz = [
    'Guilherme Siqueira', 'Mariana Fagundes', 'Rodrigo Berton', 'Camila Nogueira',
    'Lucas Meneghel', 'Larissa Dall\'Oglio', 'Felipe Scherer', 'Juliana Moro',
    'Gabriel Copetti', 'Beatriz Zambon', 'Thiago Bordin', 'Fernanda Gurgel',
    'Rafael Pagnoncelli', 'Isabela Bilibio', 'Matheus Cordeiro', 'Bruna Dal Bosco',
    'André Zilio', 'Paula Faccin', 'Vinícius Giacomini', 'Letícia Carletto'
  ];

  const enderecosFoz = [
    { rua: 'Av. Sílvio Américo Sasdelli, 2143', bairro: 'Lancaster', ref: 'Em frente à Praça', comp: 'Apto 302, Bloco B' },
    { rua: 'Av. Brasil, 1200', bairro: 'Centro', ref: 'Próximo ao Hotel Golden Park', comp: 'Sala 4' },
    { rua: 'Av. Jorge Schimmelpfeng, 450', bairro: 'Centro', ref: 'Perto do McDonald\'s', comp: 'Apto 801' },
    { rua: 'Av. Juscelino Kubitschek, 890', bairro: 'Vila Portes', ref: 'Próximo à Ponte da Amizade', comp: 'Casa 2 fundos' },
    { rua: 'Av. Garibaldi, 650', bairro: 'Lancaster', ref: 'Próximo ao Supermercado', comp: 'Sobrado azul' },
    { rua: 'Av. Mário Filho, 1420', bairro: 'Morumbi', ref: 'Ao lado da Farmácia', comp: 'Apto 104' },
    { rua: 'Rua Almirante Barroso, 920', bairro: 'Centro', ref: 'Próximo à Igreja Matriz', comp: 'Casa 1' },
    { rua: 'Rua Benjamin Constant, 310', bairro: 'Lancaster', ref: 'Perto do Posto de Saúde', comp: 'Apto 502' },
    { rua: 'Av. das Cataratas, 1850', bairro: 'Vila Yolanda', ref: 'Caminho das Cataratas', comp: 'Condomínio Solar' },
    { rua: 'Av. República Argentina, 2400', bairro: 'Maracanã', ref: 'Próximo ao Shopping Catuaí', comp: 'Portaria 1' }
  ];

  const observacoesPossiveis = [
    'Sem cebola por favor, caprichar no molho da casa!',
    'Favor mandar maionese verde extra.',
    'Carne bem passada por gentileza.',
    'Deixar na portaria com o porteiro.',
    'Interfone 302 com defeito, dar toque no WhatsApp ao chegar.',
    'Por favor cortar os hambúrgueres ao meio!',
    'Mandem guardanapo extra por favor.',
    'Batatas bem crocantes por favor!'
  ];

  const formasPagamento = ['pix', 'pix', 'cartao_credito', 'cartao_credito', 'cartao_debito', 'dinheiro'];

  // Sorteio
  const clienteSorteado = nomesFoz[Math.floor(Math.random() * nomesFoz.length)];
  const endSorteado = enderecosFoz[Math.floor(Math.random() * enderecosFoz.length)];
  const obsSorteada = Math.random() > 0.3 ? observacoesPossiveis[Math.floor(Math.random() * observacoesPossiveis.length)] : null;
  const pagtoSorteado = formasPagamento[Math.floor(Math.random() * formasPagamento.length)];
  const telSorteado = `45998${Math.floor(100000 + Math.random() * 900000)}`;

  // Buscar produtos reais
  const todosProdutos = await db.prepare(`
    SELECT p.id, p.nome, p.preco_base, c.nome as categoria_nome 
    FROM produtos p 
    JOIN categorias c ON c.id = p.categoria_id 
    WHERE p.ativo = 1
  `).all();

  const burgers = todosProdutos.filter(p => p.categoria_nome?.toLowerCase().includes('burger') || p.categoria_nome?.toLowerCase().includes('pedidos'));
  const acompanhamentos = todosProdutos.filter(p => p.categoria_nome?.toLowerCase().includes('porç') || p.nome?.toLowerCase().includes('batata'));
  const bebidas = todosProdutos.filter(p => p.categoria_nome?.toLowerCase().includes('bebida'));

  const itensEscolhidos = [];
  const burgerPrincipal = burgers[Math.floor(Math.random() * burgers.length)] || todosProdutos[0];
  itensEscolhidos.push({ produto: burgerPrincipal, qtd: Math.random() > 0.7 ? 2 : 1 });

  if (Math.random() > 0.3 && acompanhamentos.length > 0) {
    const batata = acompanhamentos[Math.floor(Math.random() * acompanhamentos.length)];
    itensEscolhidos.push({ produto: batata, qtd: 1 });
  }

  if (Math.random() > 0.2 && bebidas.length > 0) {
    const refri = bebidas[Math.floor(Math.random() * bebidas.length)];
    itensEscolhidos.push({ produto: refri, qtd: Math.random() > 0.6 ? 2 : 1 });
  }

  // Cliente
  let clienteDb = await db.prepare('SELECT id FROM clientes WHERE telefone = ?').get(telSorteado);
  let clienteId;
  const enderecoCompleto = `${endSorteado.rua} - ${endSorteado.bairro}, Foz do Iguaçu - PR`;

  if (clienteDb) {
    clienteId = clienteDb.id;
    await db.prepare('UPDATE clientes SET nome = ?, endereco = ?, complemento = ?, referencia = ? WHERE id = ?')
      .run(clienteSorteado, enderecoCompleto, endSorteado.comp, endSorteado.ref, clienteId);
  } else {
    const resCli = await db.prepare('INSERT INTO clientes (nome, telefone, endereco, complemento, referencia) VALUES (?, ?, ?, ?, ?) RETURNING id')
      .run(clienteSorteado, telSorteado, enderecoCompleto, endSorteado.comp, endSorteado.ref);
    clienteId = resCli.lastInsertRowid;
  }

  // Itens e Opcionais
  let subtotalCalculado = 0;
  const itensSnapshot = [];

  for (const itemEscolhido of itensEscolhidos) {
    const prod = itemEscolhido.produto;
    const qtd = itemEscolhido.qtd;

    const opcionaisProd = await db.prepare(`
      SELECT oi.id, oi.nome, oi.preco_adicional, og.titulo as grupo
      FROM opcional_itens oi
      JOIN opcional_grupos og ON og.id = oi.grupo_id
      WHERE og.produto_id = ?
    `).all(prod.id);

    const opcionaisSelecionados = [];
    let adicionalOpcionais = 0;

    const pontos = opcionaisProd.filter(o => o.grupo?.toLowerCase().includes('ponto'));
    if (pontos.length > 0) {
      const ponto = pontos[Math.floor(Math.random() * pontos.length)];
      opcionaisSelecionados.push({ id: ponto.id, nome_opcional: ponto.nome, preco_adicional: 0 });
    }

    const turbinas = opcionaisProd.filter(o => o.preco_adicional > 0);
    if (turbinas.length > 0 && Math.random() > 0.4) {
      const extra = turbinas[Math.floor(Math.random() * turbinas.length)];
      opcionaisSelecionados.push({ id: extra.id, nome_opcional: extra.nome, preco_adicional: extra.preco_adicional });
      adicionalOpcionais += extra.preco_adicional;
    }

    const precoUnit = prod.preco_base + adicionalOpcionais;
    subtotalCalculado += precoUnit * qtd;

    itensSnapshot.push({
      produto_id: prod.id,
      nome_produto: prod.nome,
      preco_unitario: precoUnit,
      quantidade: qtd,
      opcionais: opcionaisSelecionados
    });
  }

  const taxaEntrega = subtotalCalculado >= 8000 ? 0 : 700;
  const totalCalculado = subtotalCalculado + taxaEntrega;
  const trocoPara = pagtoSorteado === 'dinheiro' ? (totalCalculado <= 4000 ? 5000 : 10000) : null;
  const acessoToken = crypto.randomBytes(20).toString('hex');

  // Inserir pedido
  const resPedido = await db.prepare(`
    INSERT INTO pedidos (
      cliente_id, status, forma_pagamento, troco_para, observacoes,
      subtotal, taxa_entrega, total, valor_motoboy, acesso_token
    ) VALUES (?, 'recebido', ?, ?, ?, ?, ?, ?, 600, ?) RETURNING id
  `).run(
    clienteId,
    pagtoSorteado,
    trocoPara,
    obsSorteada,
    subtotalCalculado,
    taxaEntrega,
    totalCalculado,
    acessoToken
  );

  const pedidoId = resPedido.lastInsertRowid;
  const codigo = `#T94-${1000 + Number(pedidoId)}`;
  await db.prepare('UPDATE pedidos SET codigo = ? WHERE id = ?').run(codigo, pedidoId);

  // Inserir itens e opcionais
  for (const item of itensSnapshot) {
    const resItem = await db.prepare(`
      INSERT INTO pedido_itens (pedido_id, produto_id, nome_produto, preco_unitario, quantidade)
      VALUES (?, ?, ?, ?, ?) RETURNING id
    `).run(pedidoId, item.produto_id, item.nome_produto, item.preco_unitario, item.quantidade);

    const itemId = resItem.lastInsertRowid;
    for (const opc of item.opcionais) {
      await db.prepare(`
        INSERT INTO pedido_item_opcionais (pedido_item_id, nome_opcional, preco_adicional)
        VALUES (?, ?, ?)
      `).run(itemId, opc.nome_opcional, opc.preco_adicional);
    }
  }

  const pedidoCompleto = {
    id: pedidoId,
    codigo,
    acesso_token: acessoToken,
    status: 'recebido',
    forma_pagamento: pagtoSorteado,
    troco_para: trocoPara,
    observacoes: obsSorteada,
    subtotal: subtotalCalculado,
    taxa_entrega: taxaEntrega,
    total: totalCalculado,
    cliente_id: clienteId,
    cliente_nome: clienteSorteado,
    cliente_telefone: telSorteado,
    cliente_endereco: enderecoCompleto,
    complemento: endSorteado.comp,
    referencia: endSorteado.ref,
    criado_em: new Date().toISOString(),
    itens: itensSnapshot
  };

  // Dispara via Realtime / WebSocket para a Cozinha KDS
  broadcast('cozinha', { tipo: 'pedido:novo', pedido: pedidoCompleto });

  return pedidoCompleto;
}

// POST /api/admin/pedidos/simular — Simula 1 Pedido Realista
router.post('/pedidos/simular', async (req, res) => {
  try {
    const pedido = await gerarPedidoSimulado();
    res.status(201).json({
      sucesso: true,
      mensagem: `Pedido ${pedido.codigo} de ${pedido.cliente_nome} simulado com sucesso!`,
      pedido
    });
  } catch (err) {
    console.error('Erro ao simular pedido:', err);
    res.status(500).json({ erro: 'erro_simular', mensagem: err.message });
  }
});

// POST /api/admin/pedidos/simular-lote — Simula Múltiplos Pedidos em Lote (ex: 3 a 5 pedidos)
router.post('/pedidos/simular-lote', async (req, res) => {
  try {
    const qtd = Math.min(10, Math.max(1, Number(req.body?.quantidade) || 5));
    const pedidosGerados = [];

    for (let i = 0; i < qtd; i++) {
      const pedido = await gerarPedidoSimulado();
      pedidosGerados.push(pedido);
    }

    res.status(201).json({
      sucesso: true,
      mensagem: `${pedidosGerados.length} pedidos simulados com sucesso em Foz do Iguaçu!`,
      pedidos: pedidosGerados
    });
  } catch (err) {
    console.error('Erro ao simular lote de pedidos:', err);
    res.status(500).json({ erro: 'erro_simular_lote', mensagem: err.message });
  }
});

export default router;
