import { Router } from 'express';
import crypto from 'node:crypto';
import db from '../db/db.js';
import { broadcast } from '../realtime/hub.js';
import { calcularStatusLoja } from './cardapio.js';

const router = Router();

// Função defensiva de sanitização de texto contra XSS e injeção de HTML
function sanitizarTexto(str, maxLen = 200) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/[<>]/g, '') // remove tags HTML
    .trim()
    .slice(0, maxLen);
}

function mascararTelefone(tel) {
  if (!tel) return '';
  const limpo = tel.replace(/\D/g, '');
  if (limpo.length >= 10) {
    return `(${limpo.slice(0, 2)}) 9****-${limpo.slice(-4)}`;
  }
  return '****';
}

// POST /api/pedidos/validar-cupom — Validação de cupom promocional (BULLS10, BULLS5, FRETEFREE)
router.post('/validar-cupom', (req, res) => {
  const { cupom, subtotal } = req.body || {};
  const codigo = (cupom || '').trim().toUpperCase();
  const subtotalCentavos = Number(subtotal) || 0;

  if (!codigo) {
    return res.status(400).json({ valido: false, mensagem: 'Informe o código do cupom.' });
  }

  if (codigo === 'BULLS10' || codigo === 'TRAILER10') {
    if (subtotalCentavos < 6000) {
      return res.status(400).json({
        valido: false,
        mensagem: 'Este cupom exige pedido mínimo de R$ 60,00 em produtos.'
      });
    }
    return res.json({
      valido: true,
      cupom: codigo,
      desconto: 1000,
      tipo: 'valor_fixo',
      descricao: 'R$ 10,00 OFF garantido!'
    });
  }

  if (codigo === 'BULLS5' || codigo === 'TRAILER5') {
    return res.json({
      valido: true,
      cupom: codigo,
      desconto: 500,
      tipo: 'valor_fixo',
      descricao: 'R$ 5,00 OFF garantido!'
    });
  }

  if (codigo === 'FRETEFREE') {
    return res.json({
      valido: true,
      cupom: 'FRETEFREE',
      desconto: 0,
      tipo: 'frete_gratis',
      descricao: 'Frete Grátis garantido!'
    });
  }

  return res.status(404).json({ valido: false, mensagem: 'Cupom inválido ou expirado.' });
});

// POST /api/pedidos — Criação de novo pedido pelo cliente com blindagem defensiva máxima
router.post('/', async (req, res) => {
  const {
    cliente,
    itens,
    formaPagamento,
    trocoPara,
    observacoes,
    cupom
  } = req.body;

  // 1. Validar se a loja está aberta
  const statusLoja = await calcularStatusLoja();
  if (!statusLoja.aberto && process.env.NODE_ENV === 'production') {
    return res.status(400).json({
      erro: 'loja_fechada',
      mensagem: statusLoja.mensagem
    });
  }

  // 2. Validações e sanitização básica de cliente
  if (!cliente || typeof cliente !== 'object') {
    return res.status(400).json({ erro: 'dados_invalidos', mensagem: 'Dados do cliente inválidos.' });
  }

  const nomeSanitizado = sanitizarTexto(cliente.nome, 100);
  const enderecoSanitizado = sanitizarTexto(cliente.endereco, 250);
  const complementoSanitizado = sanitizarTexto(cliente.complemento, 100);
  const referenciaSanitizada = sanitizarTexto(cliente.referencia, 150);
  const observacoesSanitizadas = sanitizarTexto(observacoes, 300);

  if (!nomeSanitizado || nomeSanitizado.length < 2) {
    return res.status(400).json({ erro: 'nome_invalido', mensagem: 'Informe seu nome completo.' });
  }

  if (!enderecoSanitizado || enderecoSanitizado.length < 5) {
    return res.status(400).json({ erro: 'endereco_invalido', mensagem: 'Informe o endereço de entrega completo (Rua, Número e Bairro).' });
  }

  const telLimpo = (cliente.telefone || '').replace(/\D/g, '');
  if (telLimpo.length < 10 || telLimpo.length > 11) {
    return res.status(400).json({
      erro: 'telefone_invalido',
      mensagem: 'Informe um WhatsApp válido com DDD (10 ou 11 dígitos).'
    });
  }

  // 3. Validação dos itens
  if (!Array.isArray(itens) || itens.length === 0 || itens.length > 50) {
    return res.status(400).json({
      erro: 'carrinho_invalido',
      mensagem: 'O carrinho deve conter entre 1 e 50 itens.'
    });
  }

  // 4. Validação estrita de forma de pagamento
  const metodosValidos = ['pix', 'debito', 'credito', 'dinheiro'];
  if (!formaPagamento || !metodosValidos.includes(formaPagamento)) {
    return res.status(400).json({
      erro: 'forma_pagamento_invalida',
      mensagem: 'Forma de pagamento não suportada.'
    });
  }

  // 5. Cálculo estrito de preços e verificação de regras de opcionais no Banco
  try {
    let subtotalCalculado = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const qtd = Number(item.quantidade);
      if (!Number.isInteger(qtd) || qtd < 1 || qtd > 20) {
        return res.status(400).json({ erro: 'quantidade_invalida', mensagem: 'A quantidade de cada produto deve ser um número inteiro entre 1 e 20.' });
      }

      const idProd = item.produtoId || item.produto_id;
      const produto = await db.prepare('SELECT id, categoria_id, nome, preco_base, preco_promocional, ativo FROM produtos WHERE id = ?').get(idProd);
      if (!produto || produto.ativo !== 1) {
        return res.status(400).json({ erro: 'produto_indisponivel', mensagem: `Produto código ${item.produtoId} indisponível no cardápio.` });
      }

      // Preço base sempre determinado pelo banco de dados
      const precoBaseItem = produto.preco_promocional !== null && produto.preco_promocional !== undefined
        ? produto.preco_promocional
        : produto.preco_base;

      let adicionalOpcionais = 0;
      const opcionaisSnapshot = [];
      const contagemPorGrupo = {};

      // Validar grupos e escolhas de opcionais
      if (Array.isArray(item.opcionais) && item.opcionais.length > 0) {
        // Bloquear payload abusivo com mais de 20 opcionais no mesmo item
        if (item.opcionais.length > 20) {
          return res.status(400).json({ erro: 'opcionais_excessivos', mensagem: 'Limite de opcionais excedido.' });
        }

        for (const opc of item.opcionais) {
          const opcId = opc.id || opc;
          const itemOpcional = await db.prepare(`
            SELECT oi.id, oi.nome, oi.preco_adicional, og.id as grupo_id, og.obrigatorio, og.max_escolhas, og.titulo as grupo_titulo
            FROM opcional_itens oi
            JOIN opcional_grupos og ON og.id = oi.grupo_id
            WHERE oi.id = ? AND og.produto_id = ?
          `).get(opcId, produto.id);

          if (!itemOpcional) {
            return res.status(400).json({
              erro: 'opcional_invalido',
              mensagem: `Opção adicional inválida para o produto ${produto.nome}.`
            });
          }

          contagemPorGrupo[itemOpcional.grupo_id] = (contagemPorGrupo[itemOpcional.grupo_id] || 0) + 1;
          if (contagemPorGrupo[itemOpcional.grupo_id] > itemOpcional.max_escolhas) {
            return res.status(400).json({
              erro: 'limite_opcionais_excedido',
              mensagem: `Você pode escolher no máximo ${itemOpcional.max_escolhas} opções em "${itemOpcional.grupo_titulo}".`
            });
          }

          adicionalOpcionais += itemOpcional.preco_adicional;
          opcionaisSnapshot.push({
            nome: itemOpcional.nome,
            preco_adicional: itemOpcional.preco_adicional
          });
        }
      }

      // Validar grupos obrigatórios
      const gruposObrigatorios = await db.prepare('SELECT id, titulo, min_escolhas FROM opcional_grupos WHERE produto_id = ? AND obrigatorio = 1').all(produto.id);
      for (const go of gruposObrigatorios) {
        const escolhasNoGrupo = contagemPorGrupo[go.id] || 0;
        if (escolhasNoGrupo < Math.max(1, go.min_escolhas)) {
          return res.status(400).json({
            erro: 'opcional_obrigatorio_faltando',
            mensagem: `Selecione a opção obrigatória: "${go.titulo}" para ${produto.nome}.`
          });
        }
      }

      const precoUnitario = precoBaseItem + adicionalOpcionais;
      subtotalCalculado += precoUnitario * qtd;

      itensProcessados.push({
        produto_id: produto.id,
        nome_produto: produto.nome,
        preco_unitario: precoUnitario,
        quantidade: qtd,
        opcionais: opcionaisSnapshot
      });
    }

    // Configurações de taxa e pedido mínimo obtidas do banco
    const configTaxa = await db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get('taxa_entrega_padrao');
    const configMinimo = await db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get('pedido_minimo');
    const configMotoboy = await db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get('valor_motoboy_padrao');

    const taxaEntrega = Number(configTaxa?.valor || 700);
    const pedidoMinimo = Number(configMinimo?.valor || 2500);
    const valorMotoboy = Number(configMotoboy?.valor || 600);

    if (subtotalCalculado < pedidoMinimo) {
      return res.status(400).json({
        erro: 'pedido_minimo_nao_atingido',
        mensagem: `O pedido mínimo é de R$ ${(pedidoMinimo / 100).toFixed(2).replace('.', ',')}. Subtotal atual: R$ ${(subtotalCalculado / 100).toFixed(2).replace('.', ',')}`
      });
    }

    // Cálculo de Frete Grátis progressivo e Cupons de Desconto Promocionais
    let taxaEntregaFinal = taxaEntrega;
    let descontoCentavos = 0;

    // Frete Grátis automático para pedidos a partir de R$ 80,00 em Cascavel
    if (subtotalCalculado >= 8000) {
      taxaEntregaFinal = 0;
    }

    const cupomNormalizado = (cupom || '').trim().toUpperCase();
    if (cupomNormalizado) {
      if (cupomNormalizado === 'BULLS10') {
        if (subtotalCalculado >= 6000) {
          descontoCentavos = 1000; // R$ 10,00 OFF
        } else {
          return res.status(400).json({
            erro: 'cupom_minimo_nao_atingido',
            mensagem: 'O cupom BULLS10 exige pedido mínimo de R$ 60,00 em produtos.'
          });
        }
      } else if (cupomNormalizado === 'BULLS5') {
        descontoCentavos = 500; // R$ 5,00 OFF
      } else if (cupomNormalizado === 'FRETEFREE') {
        taxaEntregaFinal = 0;
      } else {
        return res.status(400).json({
          erro: 'cupom_invalido',
          mensagem: 'Cupom promocional inválido ou expirado.'
        });
      }
    }

    const totalCalculado = Math.max(0, subtotalCalculado + taxaEntregaFinal - descontoCentavos);

    // Validação de troco se pagamento for dinheiro
    let trocoParaCentavos = null;
    if (formaPagamento === 'dinheiro' && trocoPara) {
      const trocoNum = Number(trocoPara);
      if (isNaN(trocoNum) || trocoNum <= 0) {
        return res.status(400).json({ erro: 'troco_invalido', mensagem: 'Valor de troco informado é inválido.' });
      }
      trocoParaCentavos = Math.round(trocoNum * 100);
      if (trocoParaCentavos < totalCalculado) {
        return res.status(400).json({
          erro: 'troco_insuficiente',
          mensagem: `O valor para troco (R$ ${(trocoParaCentavos / 100).toFixed(2).replace('.', ',')}) não pode ser menor que o total do pedido (R$ ${(totalCalculado / 100).toFixed(2).replace('.', ',')}).`
        });
      }
    }

    // Observação enriquecida com cupom promocional se houver
    const obsFinal = cupomNormalizado
      ? `${observacoesSanitizadas ? observacoesSanitizadas + ' | ' : ''}[Cupom: ${cupomNormalizado}${descontoCentavos > 0 ? ' -R$ ' + (descontoCentavos / 100).toFixed(2) : ' Frete Grátis'}]`
      : (observacoesSanitizadas || null);

    // 6. Transação de escrita no Postgres — tudo grava junto ou nada grava
    const criarPedidoTx = db.transaction(async (tx) => {
      let clienteDb = await tx.prepare('SELECT id FROM clientes WHERE telefone = ?').get(telLimpo);
      let clienteId;

      if (clienteDb) {
        clienteId = clienteDb.id;
        await tx.prepare(`
          UPDATE clientes
          SET nome = ?, endereco = ?, complemento = ?, referencia = ?
          WHERE id = ?
        `).run(nomeSanitizado, enderecoSanitizado, complementoSanitizado || null, referenciaSanitizada || null, clienteId);
      } else {
        const resCliente = await tx.prepare(`
          INSERT INTO clientes (nome, telefone, endereco, complemento, referencia)
          VALUES (?, ?, ?, ?, ?) RETURNING id
        `).run(nomeSanitizado, telLimpo, enderecoSanitizado, complementoSanitizado || null, referenciaSanitizada || null);
        clienteId = resCliente.lastInsertRowid;
      }

      // Inserir pedido
      const acessoToken = crypto.randomBytes(20).toString('hex');
      const resPedido = await tx.prepare(`
        INSERT INTO pedidos (
          cliente_id, status, forma_pagamento, troco_para, observacoes,
          subtotal, taxa_entrega, total, valor_motoboy, acesso_token
        ) VALUES (?, 'recebido', ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
      `).run(
        clienteId,
        formaPagamento,
        trocoParaCentavos,
        obsFinal,
        subtotalCalculado,
        taxaEntregaFinal,
        totalCalculado,
        valorMotoboy,
        acessoToken
      );

      const pedidoId = resPedido.lastInsertRowid;
      const codigo = `#BB-${1000 + Number(pedidoId)}`;
      await tx.prepare('UPDATE pedidos SET codigo = ? WHERE id = ?').run(codigo, pedidoId);

      const stmtItem = tx.prepare(`
        INSERT INTO pedido_itens (pedido_id, produto_id, nome_produto, preco_unitario, quantidade)
        VALUES (?, ?, ?, ?, ?) RETURNING id
      `);

      const stmtOpcional = tx.prepare(`
        INSERT INTO pedido_item_opcionais (pedido_item_id, nome_opcional, preco_adicional)
        VALUES (?, ?, ?)
      `);

      for (const item of itensProcessados) {
        const resItem = await stmtItem.run(
          pedidoId,
          item.produto_id,
          item.nome_produto,
          item.preco_unitario,
          item.quantidade
        );
        const itemId = resItem.lastInsertRowid;

        for (const opc of item.opcionais) {
          await stmtOpcional.run(itemId, opc.nome, opc.preco_adicional);
        }
      }

      // Registro da intenção de pagamento
      await tx.prepare(`
        INSERT INTO pagamentos (pedido_id, metodo, status)
        VALUES (?, ?, 'pendente')
      `).run(pedidoId, formaPagamento);

      return { pedidoId, codigo, clienteId, total: totalCalculado, acessoToken };
    });

    const resultado = await criarPedidoTx();

    // Broadcast para o painel KDS do restaurante
    const pedidoCompleto = await db.prepare(`
      SELECT p.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.endereco as cliente_endereco,
             c.complemento as cliente_complemento, c.referencia as cliente_referencia
      FROM pedidos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE p.id = ?
    `).get(resultado.pedidoId);

    await broadcast('cozinha', {
      tipo: 'pedido:novo',
      pedido: pedidoCompleto
    });

    res.status(201).json({
      sucesso: true,
      pedidoId: resultado.pedidoId,
      acessoToken: resultado.acessoToken,
      codigo: resultado.codigo,
      total: resultado.total,
      mensagem: 'Pedido realizado com sucesso!'
    });
  } catch (err) {
    console.error('Erro ao processar pedido:', err);
    res.status(500).json({ erro: 'erro_interno', mensagem: 'Falha ao gravar pedido.' });
  }
});

// GET /api/pedidos/:token — Acompanhamento pelo cliente
// Busca só pelo token de acesso aleatório (nunca por id sequencial ou código
// amigável): id/código dariam pra qualquer um varrer todos os pedidos e
// coletar nome + endereço de outros clientes. Sem o token, o pedido não existe
// pra essa rota.
router.get('/:token', async (req, res) => {
  const { token } = req.params;

  const pedido = await db.prepare(`
    SELECT p.id, p.codigo, p.status, p.forma_pagamento, p.observacoes,
           p.subtotal, p.taxa_entrega, p.total, p.criado_em, p.aceito_em, p.entregue_em,
           c.nome as cliente_nome, c.telefone as cliente_telefone, c.endereco as cliente_endereco,
           c.complemento as cliente_complemento, c.referencia as cliente_referencia,
           m.nome as motoboy_nome, m.veiculo as motoboy_veiculo
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN motoboys m ON m.id = p.motoboy_id
    WHERE p.acesso_token = ?
  `).get(token);

  if (!pedido) {
    return res.status(404).json({ erro: 'pedido_nao_encontrado' });
  }

  // Buscar itens
  const itens = await db.prepare(`
    SELECT id, produto_id, nome_produto, preco_unitario, quantidade
    FROM pedido_itens
    WHERE pedido_id = ?
  `).all(pedido.id);

  for (const item of itens) {
    item.opcionais = await db.prepare(`
      SELECT nome_opcional, preco_adicional
      FROM pedido_item_opcionais
      WHERE pedido_item_id = ?
    `).all(item.id);
  }

  pedido.itens = itens;

  // Proteção de privacidade: Mascarar telefone para impedir coleta de dados em massa
  pedido.cliente_telefone = mascararTelefone(pedido.cliente_telefone);

  const configWhats = await db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get('whatsapp');
  pedido.lojaWhatsapp = configWhats?.valor || '+55 45 98818-4380';

  res.json(pedido);
});

export default router;
