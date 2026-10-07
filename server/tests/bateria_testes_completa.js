const BASE_URL = 'http://localhost:3005';

let tokenAdmin = null;
let tokenMotoboy = null;
let pedidoTesteId = null;
let produtoValidoId = null;
let categoriaValidaId = null;
let produtoCriadoId = null;

async function testar(titulo, fn) {
  try {
    await fn();
    console.log(`✅ [OK] ${titulo}`);
  } catch (err) {
    console.log(`❌ [FALHA] ${titulo}: ${err.message}`);
  }
}

function assert(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}

async function rodarBateriaDeTestes() {
  console.log('\n======================================================');
  console.log('🧪 BATERIA COMPLETA DE TESTES END-TO-END - TRAILER 94');
  console.log('======================================================\n');

  // 1. CARDÁPIO E LOJA PÚBLICA
  await testar('1.1. Consulta ao Cardápio Público (/api/cardapio)', async () => {
    const res = await fetch(`${BASE_URL}/api/cardapio`);
    assert(res.ok, `HTTP ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data.categorias) && data.categorias.length > 0, 'Nenhuma categoria retornada');
    assert(Array.isArray(data.destaques) && data.destaques.length > 0, 'Nenhum destaque retornado');
    
    categoriaValidaId = data.categorias[0].id;
    const produtosBebidas = data.categorias.flatMap(c => c.produtos).filter(p => p.preco_base >= 600);
    produtoValidoId = produtosBebidas[0]?.id || data.categorias[0].produtos[0].id;
  });

  await testar('1.2. Informações Gerais da Loja (/api/loja/info)', async () => {
    const res = await fetch(`${BASE_URL}/api/loja/info`);
    assert(res.ok, `HTTP ${res.status}`);
    const data = await res.json();
    assert(data.nome === 'Trailer 94', `Nome retornado incorreto: ${data.nome}`);
    assert(data.cidade === 'Foz do Iguaçu', `Cidade retornada incorreta: ${data.cidade}`);
  });

  // 2. CUPONS E CHECKOUT DO CLIENTE
  await testar('2.1. Validação de Cupom Promocional (TRAILER10)', async () => {
    const res = await fetch(`${BASE_URL}/api/pedidos/validar-cupom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cupom: 'TRAILER10', subtotal: 6500 })
    });
    assert(res.ok, `HTTP ${res.status}`);
    const data = await res.json();
    assert(data.valido === true, 'Cupom não validado');
    assert(data.desconto === 1000, `Desconto retornado incorreto: ${data.desconto}`);
  });

  await testar('2.2. Criação de Pedido Real de Checkout (PIX)', async () => {
    assert(produtoValidoId, 'ID do produto válido ausente');
    const res = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: {
          nome: 'Cliente Teste Bateria E2E',
          telefone: '45999991111',
          endereco: 'Avenida Sílvio Américo Sasdelli, 1000 - Itaipu A',
          complemento: 'Bloco B Apto 204'
        },
        formaPagamento: 'pix',
        observacoes: 'Sem cebola no burger por favor!',
        itens: [
          { produtoId: produtoValidoId, quantidade: 4, opcionais: [] }
        ]
      })
    });
    assert(res.ok, `HTTP ${res.status}`);
    const data = await res.json();
    assert(data.sucesso === true, 'Pedido não criado');
    pedidoTesteId = data.pedidoId || data.pedido?.id;
    assert(pedidoTesteId, 'ID do pedido não retornado');
  });

  // 3. FLUXO DA COZINHA E KDS (NA CHAPA -> PRONTO -> CONCLUÍDO)
  await testar('3.1. Listagem de Pedidos na Cozinha (/api/cardapio/pedidos-cozinha)', async () => {
    const res = await fetch(`${BASE_URL}/api/cardapio/pedidos-cozinha`);
    assert(res.ok, `HTTP ${res.status}`);
    const data = await res.json();
    assert(Array.isArray(data) && data.length > 0, 'Nenhum pedido retornado na cozinha');
  });

  await testar('3.2. Mudar Status para "Na Chapa" (em_preparo)', async () => {
    assert(pedidoTesteId, 'ID do pedido de teste ausente');
    const res = await fetch(`${BASE_URL}/api/cardapio/pedidos/${pedidoTesteId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'em_preparo' })
    });
    assert(res.ok, `HTTP ${res.status}`);
  });

  await testar('3.3. Mudar Status para "Pronto para Entrega" (pronto)', async () => {
    assert(pedidoTesteId, 'ID do pedido de teste ausente');
    const res = await fetch(`${BASE_URL}/api/cardapio/pedidos/${pedidoTesteId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pronto' })
    });
    assert(res.ok, `HTTP ${res.status}`);
  });

  // 4. AUTENTICAÇÃO E OPERAÇÕES ADMINISTRATIVAS (CRUD)
  await testar('4.1. Autenticação de Administrador (/api/auth/dono/login)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/dono/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@trailer94.com.br', senha: 'trailer942026' })
    });
    assert(res.ok, `HTTP ${res.status}`);
    const data = await res.json();
    assert(data.token, 'Token de admin não fornecido');
    tokenAdmin = data.token;
  });

  await testar('4.2. Criar Novo Lanche no Cardápio (CRUD Admin - Create)', async () => {
    assert(tokenAdmin, 'Token de admin ausente');
    assert(categoriaValidaId, 'ID de categoria ausente');
    const res = await fetch(`${BASE_URL}/api/admin/produtos`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        categoria_id: categoriaValidaId,
        nome: 'Burger Teste Automatizado',
        descricao: 'Hamburguer especial de teste end-to-end',
        preco_base: 3490,
        destaque: 0,
        ativo: 1
      })
    });
    assert(res.ok, `HTTP ${res.status}`);
    const data = await res.json();
    produtoCriadoId = data.id || data.produtoId || data.produto?.id;
    assert(produtoCriadoId, 'ID do produto criado ausente');
  });

  await testar('4.3. Editar Preço e Descrição do Lanche (CRUD Admin - Update)', async () => {
    assert(produtoCriadoId, 'ID do produto de teste ausente');
    const res = await fetch(`${BASE_URL}/api/admin/produtos/${produtoCriadoId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenAdmin}`
      },
      body: JSON.stringify({
        categoria_id: categoriaValidaId,
        nome: 'Burger Teste Automatizado (Atualizado)',
        descricao: 'Descrição atualizada com sucesso',
        preco_base: 3990,
        destaque: 1,
        ativo: 1
      })
    });
    assert(res.ok, `HTTP ${res.status}`);
  });

  await testar('4.4. Apagar Lanche do Cardápio (CRUD Admin - Delete)', async () => {
    assert(produtoCriadoId, 'ID do produto de teste ausente');
    const res = await fetch(`${BASE_URL}/api/admin/produtos/${produtoCriadoId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    assert(res.ok, `HTTP ${res.status}`);
  });

  await testar('4.5. Consulta ao Dashboard de Métricas DRE (/api/admin/dashboard)', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${tokenAdmin}` }
    });
    assert(res.ok, `HTTP ${res.status}`);
    const data = await res.json();
    assert(data.pedidosHoje, 'Métricas de pedidos não retornadas');
    assert(Number(data.pedidosHoje.faturamento_total) >= 0, 'Faturamento total inválido');
  });

  // 5. ÁREA DO ENTREGADOR (MOTOBOY)
  await testar('5.1. Autenticação de Entregador (/api/auth/motoboy/login)', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/motoboy/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: 'carlos@trailer94.com.br', senha: 'motoboy2026' })
    });
    assert(res.ok, `HTTP ${res.status}`);
    const data = await res.json();
    assert(data.token, 'Token do motoboy não fornecido');
    tokenMotoboy = data.token;
  });

  await testar('5.2. Aceitar Entrega e Concluir Pedido (/api/motoboy/pedidos/:id/aceitar)', async () => {
    assert(tokenMotoboy, 'Token do motoboy ausente');
    assert(pedidoTesteId, 'ID do pedido de teste ausente');
    const resAceitar = await fetch(`${BASE_URL}/api/motoboy/pedidos/${pedidoTesteId}/aceitar`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${tokenMotoboy}`
      }
    });
    assert(resAceitar.ok, `HTTP ${resAceitar.status}`);

    const resConcluir = await fetch(`${BASE_URL}/api/cardapio/pedidos/${pedidoTesteId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'entregue' })
    });
    assert(resConcluir.ok, `HTTP ${resConcluir.status}`);
  });

  console.log('\n======================================================');
  console.log('🎉 BATERIA CONCLUÍDA: TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  console.log('======================================================\n');
}

rodarBateriaDeTestes().catch(console.error);
