import db from '../db/db.js';
import { notificarMotoboysDisponiveis } from '../lib/webpush.js';

// Antes disso rodava um servidor ws próprio, o que não existe em função
// serverless (não tem processo de longa duração pra manter conexões abertas).
// A troca é usar o broadcast nativo do Supabase Realtime: o servidor manda a
// mensagem com uma função SQL (realtime.send), e quem tiver se inscrito no
// canal pelo cliente supabase-js recebe, sem o servidor precisar segurar
// conexão nenhuma.
export async function broadcast(canal, payload) {
  try {
    await db.prepare('SELECT realtime.send(?::jsonb, ?, ?, false)').run(
      JSON.stringify(payload),
      payload.tipo || 'mensagem',
      canal
    );
  } catch {
    // Ignorar broadcast Supabase em modo SQLite local
  }
}

/**
 * Função central para mudança de status de pedido e disparo de tempo real
 */
export async function mudarStatusPedido(pedidoId, novoStatus, extra = {}) {
  const pedido = await db.prepare('SELECT * FROM pedidos WHERE id = ?').get(pedidoId);
  if (!pedido) return null;

  let query = 'UPDATE pedidos SET status = ?';
  const params = [novoStatus];

  if (novoStatus === 'em_entrega' && extra.motoboy_id) {
    query += ", motoboy_id = ?, aceito_em = datetime('now')";
    params.push(extra.motoboy_id);
  } else if (novoStatus === 'entregue') {
    query += ", entregue_em = datetime('now')";
  }

  query += ' WHERE id = ?';
  params.push(pedidoId);

  await db.prepare(query).run(...params);

  const pedidoAtualizado = await db.prepare(`
    SELECT p.*, c.nome as cliente_nome, c.telefone as cliente_telefone, c.endereco as cliente_endereco
    FROM pedidos p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE p.id = ?
  `).get(pedidoId);

  // 1. Notificar canal da Cozinha / Admin KDS
  await broadcast('cozinha', {
    tipo: 'pedido:atualizado',
    pedido: pedidoAtualizado
  });

  // 2. Notificar canal do Cliente específico (pelo token, nunca pelo id sequencial)
  await broadcast(`cliente:${pedidoAtualizado.acesso_token}`, {
    tipo: 'pedido:status',
    status: novoStatus,
    atualizadoEm: new Date().toISOString()
  });

  // 3. Notificar Motoboys se ficou pronto ou se foi pego
  if (novoStatus === 'pronto') {
    await broadcast('motoboys', {
      tipo: 'entrega:disponivel',
      pedido: pedidoAtualizado
    });
    // Push chega mesmo com o app do motoboy fechado; o broadcast acima só
    // atualiza quem já está com a tela aberta.
    notificarMotoboysDisponiveis(pedidoAtualizado).catch(err =>
      console.error('Falha ao notificar motoboys via push:', err)
    );
  } else if (novoStatus === 'em_entrega') {
    await broadcast('motoboys', {
      tipo: 'entrega:removida',
      pedidoId
    });
  }

  return pedidoAtualizado;
}
