import crypto from 'node:crypto';
import db from '../db/db.js';

export async function seedPedidosParaMapaSeNecessario() {
  const countRow = await db.prepare('SELECT count(*) as total FROM pedidos').get();
  const total = Number(countRow?.total || 0);

  // Se já tiver mais de 15 pedidos, não precisa semear
  if (total >= 15) {
    return;
  }

  console.log(`⚡ Semeando pedidos históricos para mapa de calor (atual: ${total})...`);

  // Buscar ruas representativas de Cascavel para formar os clusters
  const ruas = await db.prepare(`
    SELECT * FROM ruas_cascavel 
    WHERE nome ILIKE '%Brasil%' 
       OR nome ILIKE '%Paraná%' 
       OR nome ILIKE '%Rio Grande%' 
       OR nome ILIKE '%São Paulo%'
       OR nome ILIKE '%Assunção%'
       OR nome ILIKE '%Recife%'
       OR nome ILIKE '%Flamboyant%'
       OR nome ILIKE '%Antonina%'
       OR nome ILIKE '%Kennedy%'
       OR nome ILIKE '%Salgado Filho%'
       OR nome ILIKE '%Universitária%'
       OR nome ILIKE '%Cuiabá%'
       OR nome ILIKE '%Carlos Gomes%'
       OR nome ILIKE '%Rocha Pombo%'
       OR nome ILIKE '%Muffato%'
       OR nome ILIKE '%Piquiri%'
    LIMIT 25
  `).all();

  if (!ruas || ruas.length === 0) {
    console.warn('⚠️ Nenhuma rua encontrada para semear pedidos.');
    return;
  }

  const clientesNomes = [
    'Lucas Silveira', 'Mariana Costa', 'Gabriel Toledo', 'Beatriz Lima',
    'Rodrigo Almeida', 'Camila Rocha', 'Felipe Santos', 'Larissa Mendes',
    'Guilherme Neves', 'Fernanda Dias', 'Thiago Moreira', 'Juliana Pires',
    'Bruno Nogueira', 'Amanda Barbosa', 'Diego Castro', 'Letícia Duarte',
    'Vinícius Carvalho', 'Renata Farias', 'Marcelo Teixeira', 'Carolina Cunha'
  ];

  const formas = ['pix', 'credito', 'debito', 'dinheiro'];
  const produtos = await db.prepare('SELECT id, nome, preco_base FROM produtos LIMIT 6').all();

  let proxCodigo = 1003;
  // Criar 45 pedidos distribuídos com pesos diferentes
  // Mais pedidos nas avenidas centrais e universitárias para criar os "raios de calor"
  const pesosRuas = [
    { nome: 'Brasil', peso: 7 },
    { nome: 'Paraná', peso: 6 },
    { nome: 'Universitária', peso: 5 },
    { nome: 'Salgado Filho', peso: 4 },
    { nome: 'Assunção', peso: 4 },
    { nome: 'Recife', peso: 3 },
    { nome: 'Carlos Gomes', peso: 3 },
    { nome: 'Antonina', peso: 3 }
  ];

  for (let i = 0; i < 45; i++) {
    // Escolhe rua com preferência de peso
    const escolhaPeso = pesosRuas[i % pesosRuas.length];
    let rua = ruas.find(r => r.nome.includes(escolhaPeso.nome)) || ruas[i % ruas.length];

    const nomeCliente = clientesNomes[i % clientesNomes.length];
    const telefone = `4599${String(1000000 + i * 3791).slice(0, 7)}`;
    const numRua = Math.floor(100 + Math.random() * 2800);
    const endereco = `${rua.nome}, ${numRua} - ${rua.bairro}`;

    // Cadastrar ou obter cliente
    let cliente = await db.prepare('SELECT id FROM clientes WHERE telefone = ?').get(telefone);
    let clienteId;
    if (cliente) {
      clienteId = cliente.id;
    } else {
      const resCli = await db.prepare(`
        INSERT INTO clientes (nome, telefone, endereco, complemento, referencia)
        VALUES (?, ?, ?, ?, ?) RETURNING id
      `).run(nomeCliente, telefone, endereco, `Apto ${10 + (i % 80)}`, 'Próximo ao comércio');
      clienteId = resCli.lastInsertRowid;
    }

    // Calcular valores do pedido
    const subtotal = 3890 + Math.floor(Math.random() * 8500); // R$ 38,90 a R$ 123,90
    const taxa = 700;
    const total = subtotal + taxa;
    const diasAtras = Math.floor(Math.random() * 25);
    const horasAtras = Math.floor(Math.random() * 23);
    const minutosAtras = Math.floor(Math.random() * 59);

    const token = crypto.randomBytes(20).toString('hex');
    const codigo = `#BB-${proxCodigo++}`;
    const forma = formas[i % formas.length];

    // Inserir pedido com data retroativa
    const resPedido = await db.prepare(`
      INSERT INTO pedidos (
        codigo, acesso_token, cliente_id, status, forma_pagamento,
        subtotal, taxa_entrega, total, valor_motoboy,
        criado_em, aceito_em, entregue_em
      ) VALUES (
        ?, ?, ?, 'entregue', ?,
        ?, ?, ?, 600,
        now() - interval '${diasAtras} days' - interval '${horasAtras} hours' - interval '${minutosAtras} minutes',
        now() - interval '${diasAtras} days' - interval '${horasAtras} hours' + interval '5 minutes',
        now() - interval '${diasAtras} days' - interval '${horasAtras} hours' + interval '35 minutes'
      ) RETURNING id
    `).run(codigo, token, clienteId, forma, subtotal, taxa, total);

    const pedidoId = resPedido.lastInsertRowid;

    // Inserir 1 a 3 itens
    if (produtos.length > 0) {
      const prod = produtos[i % produtos.length];
      await db.prepare(`
        INSERT INTO pedido_itens (pedido_id, produto_id, nome_produto, preco_unitario, quantidade)
        VALUES (?, ?, ?, ?, ?)
      `).run(pedidoId, prod.id, prod.nome, prod.preco_base, 1);
    }
  }

  console.log(`✅ Sucesso! 45 pedidos semeados para alimentar os raios do mapa de calor.`);
}

if (process.argv[1]?.endsWith('seed_pedidos_mapa.js')) {
  seedPedidosParaMapaSeNecessario().then(() => process.exit(0)).catch(err => {
    console.error('Erro ao semear:', err);
    process.exit(1);
  });
}
