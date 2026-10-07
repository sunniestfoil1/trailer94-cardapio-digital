import crypto from 'node:crypto';
import db from '../db/db.js';

const CLIENTES_FOZ = [
  { nome: 'Carlos Eduardo Silva', tel: '45999881122', end: 'Avenida Sílvio Américo Sasdelli, 2143 - Itaipu A, Foz do Iguaçu - PR' },
  { nome: 'Mariana Rodrigues', tel: '45999772233', end: 'Avenida Juscelino Kubitscheck, 1500 - Centro, Foz do Iguaçu - PR' },
  { nome: 'Lucas Gabriel Santos', tel: '45999663344', end: 'Rua Almirante Barroso, 890 - Centro, Foz do Iguaçu - PR' },
  { nome: 'Beatriz Fernandes', tel: '45999554455', end: 'Avenida das Cataratas, 3200 - Vila Yolanda, Foz do Iguaçu - PR' },
  { nome: 'Rafael Oliveira', tel: '45999445566', end: 'Avenida República Argentina, 2400 - Morumbi, Foz do Iguaçu - PR' },
  { nome: 'Camila Mendes', tel: '45999336677', end: 'Rua Marechal Deodoro, 450 - Centro, Foz do Iguaçu - PR' },
  { nome: 'Thiago Henrique', tel: '45999227788', end: 'Avenida Gramado, 1800 - Três Lagoas, Foz do Iguaçu - PR' },
  { nome: 'Juliana Castro', tel: '45999118899', end: 'Rua Tarobá, 650 - Jardim Festugato, Foz do Iguaçu - PR' },
  { nome: 'Felipe Augusto', tel: '45998889900', end: 'Avenida Garibaldi, 1100 - Vila A, Foz do Iguaçu - PR' },
  { nome: 'Larissa Lima', tel: '45998770011', end: 'Rua Xavier da Silva, 340 - Centro, Foz do Iguaçu - PR' },
  { nome: 'Diego Martins', tel: '45998661122', end: 'Avenida Morenitas, 2150 - Porto Meira, Foz do Iguaçu - PR' },
  { nome: 'Fernanda Rocha', tel: '45998552233', end: 'Rua Quintino Bocaiúva, 780 - Centro, Foz do Iguaçu - PR' },
  { nome: 'Bruno Carvalho', tel: '45998443344', end: 'Avenida Mário Filho, 1400 - Morumbi II, Foz do Iguaçu - PR' },
  { nome: 'Amanda Barbosa', tel: '45998334455', end: 'Rua Santos Dumont, 520 - Vila Maracanã, Foz do Iguaçu - PR' },
  { nome: 'Vinícius Souza', tel: '45998225566', end: 'Avenida Felipe Wandscheer, 3100 - Tamanduá, Foz do Iguaçu - PR' }
];

const PAGAMENTOS = [
  { tipo: 'pix', peso: 50 },
  { tipo: 'cartao_credito', peso: 25 },
  { tipo: 'cartao_debito', peso: 15 },
  { tipo: 'dinheiro', peso: 10 }
];

export async function gerarHistoricoVendasReais() {
  console.log('🚀 Gerando histórico de vendas realistas para o Trailer 94 (30 dias)...');

  // Buscar produtos disponíveis no banco
  const produtos = await db.prepare('SELECT id, nome, preco_base FROM produtos WHERE ativo = 1').all();
  if (!produtos || produtos.length === 0) {
    console.error('❌ Nenhum produto ativo encontrado no banco.');
    return;
  }

  // Obter motoboy cadastrado
  const motoboy = await db.prepare('SELECT id FROM motoboys LIMIT 1').get();
  const motoboyId = motoboy ? motoboy.id : 1;

  // Limpar pedidos antigos para simulação limpa
  await db.prepare('DELETE FROM pedido_item_opcionais').run();
  await db.prepare('DELETE FROM pedido_itens').run();
  await db.prepare('DELETE FROM pedidos').run();

  let totalPedidosInseridos = 0;
  let faturamentoTotalGeral = 0;
  let codigoSeq = 100;

  const hoje = new Date();

  // Iterar nos últimos 30 dias (do dia -30 até o dia 0)
  for (let d = 30; d >= 0; d--) {
    const dataDia = new Date(hoje);
    dataDia.setDate(hoje.getDate() - d);
    const diaSemana = dataDia.getDay(); // 0 = Domingo, 5 = Sexta, 6 = Sábado

    // Variação realista por dia da semana
    let qtdPedidosDia = 0;
    if (diaSemana === 5 || diaSemana === 6) { // Sexta e Sábado (Pico)
      qtdPedidosDia = Math.floor(22 + Math.random() * 15); // 22 a 36 pedidos
    } else if (diaSemana === 0) { // Domingo (Forte)
      qtdPedidosDia = Math.floor(16 + Math.random() * 10); // 16 a 25 pedidos
    } else if (diaSemana === 1) { // Segunda (Folga / Fraco)
      qtdPedidosDia = Math.floor(2 + Math.random() * 4); // 2 a 5 pedidos
    } else { // Terça, Quarta, Quinta (Normal)
      qtdPedidosDia = Math.floor(8 + Math.random() * 8); // 8 a 15 pedidos
    }

    // Se for hoje (d = 0), forçamos uma estrutura com pedidos ao vivo
    if (d === 0) {
      qtdPedidosDia = 18;
    }

    for (let i = 0; i < qtdPedidosDia; i++) {
      codigoSeq++;
      const cliObj = CLIENTES_FOZ[i % CLIENTES_FOZ.length];

      // Verificar ou cadastrar cliente
      let cliente = await db.prepare('SELECT id FROM clientes WHERE telefone = ?').get(cliObj.tel);
      let clienteId;
      if (cliente) {
        clienteId = cliente.id;
      } else {
        const resCli = await db.prepare(`
          INSERT INTO clientes (nome, telefone, endereco) VALUES (?, ?, ?) RETURNING id
        `).run(cliObj.nome, cliObj.tel, cliObj.end);
        clienteId = resCli.lastInsertRowid;
      }

      // Escolher 1 a 4 itens para o pedido
      const numItens = Math.floor(1 + Math.random() * 3);
      let subtotal = 0;
      const itensPedido = [];

      for (let j = 0; j < numItens; j++) {
        const prod = produtos[Math.floor(Math.random() * produtos.length)];
        const qtd = Math.random() > 0.8 ? 2 : 1;
        const totalItem = prod.preco_base * qtd;
        subtotal += totalItem;
        itensPedido.push({
          produto_id: prod.id,
          nome_produto: prod.nome,
          preco_unitario: prod.preco_base,
          quantidade: qtd
        });
      }

      const taxaEntrega = 700; // R$ 7,00
      const totalPedido = subtotal + taxaEntrega;
      faturamentoTotalGeral += totalPedido;

      // Forma de pagamento
      const randPg = Math.random() * 100;
      let formaPg = 'pix';
      if (randPg > 50 && randPg <= 75) formaPg = 'cartao_credito';
      else if (randPg > 75 && randPg <= 90) formaPg = 'cartao_debito';
      else if (randPg > 90) formaPg = 'dinheiro';

      const troco = formaPg === 'dinheiro' ? (totalPedido < 5000 ? 5000 : 10000) : null;

      // Definir status e horário
      let status = 'entregue';
      if (d === 0) {
        // Pedidos de hoje: alguns em preparo, alguns recebidos, alguns prontos
        if (i < 3) status = 'recebido';
        else if (i < 6) status = 'em_preparo';
        else if (i < 8) status = 'pronto';
        else status = 'entregue';
      } else {
        // Pedidos de dias anteriores: 96% entregue, 4% cancelado
        status = Math.random() > 0.96 ? 'cancelado' : 'entregue';
      }

      // Ajustar data e hora (entre 18:00 e 23:45)
      const hora = 18 + Math.floor(Math.random() * 5);
      const minuto = Math.floor(Math.random() * 59);
      const dataCriacao = new Date(dataDia);
      dataCriacao.setHours(hora, minuto, 0, 0);

      const timestampIso = dataCriacao.toISOString();
      const token = crypto.randomBytes(16).toString('hex');
      const codigo = `#T94-${codigoSeq}`;

      const resPed = await db.prepare(`
        INSERT INTO pedidos (
          codigo, acesso_token, cliente_id, status, forma_pagamento, 
          troco_para, subtotal, taxa_entrega, total, motoboy_id, valor_motoboy, criado_em, aceito_em, entregue_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
      `).run(
        codigo,
        token,
        clienteId,
        status,
        formaPg,
        troco,
        subtotal,
        taxaEntrega,
        totalPedido,
        status === 'recebido' ? null : motoboyId,
        status === 'entregue' ? taxaEntrega : 0,
        timestampIso,
        timestampIso,
        status === 'entregue' ? timestampIso : null
      );

      const pedidoId = resPed.lastInsertRowid;

      // Inserir itens do pedido
      for (const item of itensPedido) {
        await db.prepare(`
          INSERT INTO pedido_itens (pedido_id, produto_id, nome_produto, preco_unitario, quantidade)
          VALUES (?, ?, ?, ?, ?)
        `).run(pedidoId, item.produto_id, item.nome_produto, item.preco_unitario, item.quantidade);
      }

      totalPedidosInseridos++;
    }
  }

  console.log(`✅ Histórico populado com sucesso!`);
  console.log(`📊 Total de Pedidos: ${totalPedidosInseridos}`);
  console.log(`💰 Faturamento Total Simulado: R$ ${(faturamentoTotalGeral / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
}

gerarHistoricoVendasReais().catch(console.error);
