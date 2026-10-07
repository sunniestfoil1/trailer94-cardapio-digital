if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@trailer94.com.br',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Manda a notificação pra todo motoboy ativo que tiver inscrição salva.
// Se uma inscrição não existir mais no navegador do motoboy (ele desinstalou,
// trocou de aparelho etc.), o push falha com 404/410 — nesse caso apagamos a
// inscrição velha do banco em vez de deixar acumular lixo.
export async function notificarMotoboysDisponiveis(pedido) {
  const inscricoes = await db.prepare(`
    SELECT mps.id, mps.endpoint, mps.chaves, mps.motoboy_id
    FROM motoboy_push_subscriptions mps
    JOIN motoboys m ON m.id = mps.motoboy_id
    WHERE mps.ativo = 1 AND m.status = 'ativo'
  `).all();

  const payload = JSON.stringify({
    titulo: '🔥 Nova entrega disponível!',
    corpo: `${pedido.codigo || 'Pedido'} — repasse ${((pedido.valor_motoboy || 0) / 100).toFixed(2).replace('.', ',')}`,
    url: '/entregador'
  });

  await Promise.all(inscricoes.map(async (inscricao) => {
    try {
      const chaves = JSON.parse(inscricao.chaves);
      await webpush.sendNotification({ endpoint: inscricao.endpoint, keys: chaves }, payload);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.prepare('DELETE FROM motoboy_push_subscriptions WHERE id = ?').run(inscricao.id);
      } else {
        console.error('Falha ao enviar push pro motoboy', inscricao.motoboy_id, err.message);
      }
    }
  }));
}
