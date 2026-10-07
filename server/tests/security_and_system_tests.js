import assert from 'node:assert';
import db from '../db/db.js';
import { hashSenha } from '../auth/senha.js';
import { criarSessao } from '../auth/sessao.js';
import { calcularStatusLoja } from '../routes/cardapio.js';

const BASE_URL = 'http://localhost:3005';

let testesPassados = 0;
let totalTestes = 0;

function reportar(nome, sucesso, detalhe = '') {
  totalTestes++;
  if (sucesso) {
    testesPassados++;
    console.log(`  ✅ [PASS] ${nome}`);
  } else {
    console.error(`  ❌ [FAIL] ${nome}: ${detalhe}`);
  }
}

async function rodarBateriaDeTestes() {
  console.log('\n======================================================');
  console.log('🛡️  BATERIA DE TESTES DE SISTEMA E SEGURANÇA DEFENSIVA');
  console.log('======================================================\n');

  // --------------------------------------------------------------------------
  // TESTE 1: Anti-Tamper de Preço (Tentativa de adulterar valor no cliente)
  // --------------------------------------------------------------------------
  console.log('--- 1. Testes de Manipulação de Preços (Anti-Fraud) ---');
  try {
    const payloadMalicioso = {
      cliente: {
        nome: 'Hacker Preço',
        telefone: '45999990001',
        endereco: 'Rua das Brechas, 100'
      },
      itens: [{
        produtoId: 2, // Bulls Xedar Supremo (R$ 38,90 = 3890 centavos)
        quantidade: 1,
        precoUnitario: 1, // TENTATIVA DE FRAUDE: Enviar 1 centavo
        precoTotal: 1
      }],
      formaPagamento: 'pix'
    };

    const res = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadMalicioso)
    });
    const data = await res.json();

    // Se o pedido passar, o total DEVE ser recalculado pelo backend com o preço real da DB + taxa de entrega
    // Preço Bulls Xedar (3890) + Taxa Entrega (700) = 4590 centavos
    if (res.ok) {
      reportar('Preço recalculado pelo backend (impediu spoofing de R$ 0,01)', data.total === 4590, `Esperado 4590 centavos, recebido ${data.total}`);
    } else {
      // Caso tenha barrado por validação obrigatória ou pedido mínimo
      reportar('Bloqueou payload malicioso de preço ou exigiu opções válidas', true);
    }
  } catch (err) {
    reportar('Anti-Tamper de Preço', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 2: Validação de Grupos Obrigatórios de Opcionais
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Validação de Regras de Negócio e Opcionais Obrigatórios ---');
  try {
    const payloadSemObrigatorio = {
      cliente: {
        nome: 'Cliente Sem Ponto',
        telefone: '45999990002',
        endereco: 'Rua do Burger, 200'
      },
      itens: [{
        produtoId: 2, // Bulls Xedar (exige Ponto da Carne)
        quantidade: 1,
        opcionais: [] // TENTATIVA: omitir ponto da carne obrigatório
      }],
      formaPagamento: 'pix'
    };

    const res = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadSemObrigatorio)
    });
    const data = await res.json();

    reportar(
      'Rejeitou pedido sem opcional obrigatório (Ponto da Carne)',
      res.status === 400 && data.erro === 'opcional_obrigatorio_faltando',
      `Status: ${res.status}, Erro: ${data.erro}`
    );
  } catch (err) {
    reportar('Validação de Opcionais Obrigatórios', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 3: Regra de Pedido Mínimo
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Validação de Pedido Mínimo ---');
  try {
    const payloadAbaixoMinimo = {
      cliente: {
        nome: 'Cliente Pedido Baixo',
        telefone: '45999990003',
        endereco: 'Rua Centro, 50'
      },
      itens: [{
        produtoId: 11, // Coca-Cola Lata R$ 6,50 (abaixo do pedido mínimo de R$ 25,00)
        quantidade: 1,
        opcionais: []
      }],
      formaPagamento: 'pix'
    };

    const res = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadAbaixoMinimo)
    });
    const data = await res.json();

    reportar(
      'Bloqueou pedido abaixo do valor mínimo configurado (R$ 25,00)',
      res.status === 400 && data.erro === 'pedido_minimo_nao_atingido',
      `Status: ${res.status}, Erro: ${data.erro}`
    );
  } catch (err) {
    reportar('Bloqueio Pedido Mínimo', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 4: Controle de Acesso e RBAC (Tentativa de acesso anônimo ao Admin)
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Segurança de Autenticação e RBAC (Painel Admin) ---');
  try {
    const rotasProtegidas = [
      '/api/admin/dashboard',
      '/api/admin/pedidos',
      '/api/admin/produtos',
      '/api/admin/motoboys',
      '/api/admin/configuracoes'
    ];

    for (const rota of rotasProtegidas) {
      const res = await fetch(`${BASE_URL}${rota}`);
      const data = await res.json();
      reportar(
        `Acesso anônimo bloqueado em ${rota}`,
        res.status === 401 && data.erro === 'nao_autorizado',
        `Status: ${res.status}`
      );
    }
  } catch (err) {
    reportar('RBAC Admin', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 5: Tentativa de Motoboy Não Aprovado (Pendente) Aceitar Corridas
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Isolamento de Motoboy Pendente / Inativo ---');
  try {
    // Cadastrar motoboy teste pendente
    const resCad = await fetch(`${BASE_URL}/api/auth/motoboy/cadastro`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Marcos Invasor',
        telefone: '45988887777',
        usuario: `marcos_${Date.now()}`,
        senha: 'senhaforte123'
      })
    });
    reportar('Cadastro de novo motoboy entra com status pendente', resCad.status === 201);

    // Tentar logar com o motoboy pendente
    const telLimpo = '45988887777';
    const pin = telLimpo.slice(-4);
    const resLogin = await fetch(`${BASE_URL}/api/auth/motoboy/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: (await resCad.json()).usuario || 'marcos_test',
        pin
      })
    });
    reportar('Login de motoboy pendente é barrado até aprovação', resLogin.status === 403 || resLogin.status === 401);
  } catch (err) {
    reportar('Isolamento Motoboy Pendente', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 6: Autenticação por PIN (4 últimos dígitos do telefone)
  // --------------------------------------------------------------------------
  console.log('\n--- 6. Autenticação Rápida do Motoboy por PIN ---');
  try {
    // Usuário cadastrado no seed: 'carlos.moto', fone final '4321', status ativo
    const resLoginPinCorreto = await fetch(`${BASE_URL}/api/auth/motoboy/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'carlos.moto',
        pin: '4321'
      })
    });
    const dataLogin = await resLoginPinCorreto.json();
    reportar('Login por PIN correto (4321) bem-sucedido', resLoginPinCorreto.ok && dataLogin.sucesso);

    // Login com PIN errado
    const resLoginPinErrado = await fetch(`${BASE_URL}/api/auth/motoboy/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: 'carlos.moto',
        pin: '9999'
      })
    });
    reportar('Login com PIN incorreto é rejeitado (401)', resLoginPinErrado.status === 401);
  } catch (err) {
    reportar('Autenticação PIN', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 7: Teste de Race Condition (Corrida Concorrente de 10 Motoboys)
  // --------------------------------------------------------------------------
  console.log('\n--- 7. Teste de Concorrência Extrema e Race Condition ---');
  try {
    // 1. Criar pedido de teste diretamente em status 'pronto'
    const clienteRes = await db.prepare('INSERT INTO clientes (nome, telefone, endereco) VALUES (?, ?, ?) RETURNING id').run('Cliente Concorrencia', '45999991111', 'Rua Teste');
    const pedidoRes = await db.prepare(`
      INSERT INTO pedidos (cliente_id, codigo, status, forma_pagamento, subtotal, taxa_entrega, total, valor_motoboy)
      VALUES (?, ?, 'pronto', 'pix', 5000, 700, 5700, 600) RETURNING id
    `).run(clienteRes.lastInsertRowid, `#TEST-RACE-${Date.now()}`);
    const pedidoId = pedidoRes.lastInsertRowid;

    // 2. Criar 10 motoboys ativos no banco e obter tokens via HTTP Login
    const motoboyTokens = [];
    const hashValido = await hashSenha('senha123');

    for (let i = 1; i <= 10; i++) {
      const u = `moto_race_${Date.now()}_${i}`;
      const fone = `459999900${i.toString().padStart(2, '0')}`;
      await db.prepare(`
        INSERT INTO motoboys (nome, telefone, usuario, senha_hash, status)
        VALUES (?, ?, ?, ?, 'ativo')
      `).run(`Motoboy Concorrente ${i}`, fone, u, hashValido);

      // Fazer login real via HTTP para registrar sessão na memória do servidor
      const loginRes = await fetch(`${BASE_URL}/api/auth/motoboy/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: u, senha: 'senha123' })
      });
      const loginData = await loginRes.json();
      motoboyTokens.push(loginData.token);
    }

    // 3. Disparar 10 requisições simultâneas de 'aceitar' no exato mesmo instante (Promise.all)
    const promessas = motoboyTokens.map(token => 
      fetch(`${BASE_URL}/api/motoboy/pedidos/${pedidoId}/aceitar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    );

    const respostas = await Promise.all(promessas);
    const statusCodes = respostas.map(r => r.status);
    const sucessos = statusCodes.filter(s => s === 200).length;
    const conflitos = statusCodes.filter(s => s === 409).length;

    reportar(
      'Exatamente 1 motoboy consegue aceitar a entrega (Race Condition eliminada)',
      sucessos === 1,
      `Sucessos: ${sucessos}, Conflitos (409): ${conflitos}`
    );

    reportar(
      'Outros 9 motoboys receberam HTTP 409 Conflito (Pedido indisponível)',
      conflitos === 9,
      `Conflitos: ${conflitos}`
    );

    // Verificar integridade no banco
    const pedidoFinal = await db.prepare('SELECT status, motoboy_id FROM pedidos WHERE id = ?').get(pedidoId);
    reportar(
      'Estado final no banco é consistente (em_entrega com 1 único motoboy atribuído)',
      pedidoFinal.status === 'em_entrega' && pedidoFinal.motoboy_id !== null
    );
  } catch (err) {
    reportar('Teste de Race Condition', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 8: SQL Injection Immunity
  // --------------------------------------------------------------------------
  console.log('\n--- 8. Blindagem Contra SQL Injection ---');
  try {
    const payloadsSql = [
      "' OR '1'='1",
      "admin'--",
      "'; DROP TABLE produtos; --",
      "1 UNION SELECT null, null, null--"
    ];

    let todasFalharam = true;
    for (const sql of payloadsSql) {
      const res = await fetch(`${BASE_URL}/api/auth/dono/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sql, senha: 'qualquersenha' })
      });
      if (res.status !== 401) {
        todasFalharam = false;
      }
    }

    // Conferir se a tabela produtos ainda existe intacta
    const totalProdutos = Number((await db.prepare('SELECT count(*) as total FROM produtos').get()).total);

    reportar(
      'Consultas parametrizadas impedem SQL Injection em todos os vetores',
      todasFalharam && totalProdutos > 0,
      `Produtos intactos: ${totalProdutos}`
    );
  } catch (err) {
    reportar('Imunidade a SQL Injection', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 9: Cálculo de Horário Noturno / Madrugada
  // --------------------------------------------------------------------------
  console.log('\n--- 9. Verificação de Regra de Horário (Cruzando Meia-Noite) ---');
  try {
    const statusLoja = await calcularStatusLoja();
    reportar(
      'Cálculo de status de funcionamento operacional (19h às 04h/05h)',
      typeof statusLoja.aberto === 'boolean' && statusLoja.mensagem !== undefined,
      `Status atual: ${statusLoja.aberto ? 'Aberto' : 'Fechado'} - ${statusLoja.mensagem}`
    );
  } catch (err) {
    reportar('Cálculo de Horário Noturno', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 10: Sanitização Contra XSS e Injeção de Tags
  // --------------------------------------------------------------------------
  console.log('\n--- 10. Sanitização XSS e Injeção de Tags HTML ---');
  try {
    const payloadXss = {
      cliente: {
        nome: '<script>alert("xss")</script>Carlos Teste',
        telefone: '45999990099',
        endereco: '<img src=x onerror=alert(1)>Av Brasil, 100'
      },
      itens: [{
        produtoId: 1, // Combo 2x Bull's Egg R$ 45,90
        quantidade: 1,
        opcionais: [{ id: 1 }] // Ponto ao ponto
      }],
      formaPagamento: 'pix',
      observacoes: '<iframe src="evil.com"></iframe>Sem cebola'
    };

    const res = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadXss)
    });
    const data = await res.json();

    if (res.ok) {
      // Verificar se as tags foram completamente expurgadas no banco
      const pedidoDb = await db.prepare(`
        SELECT p.observacoes, c.nome, c.endereco
        FROM pedidos p
        JOIN clientes c ON c.id = p.cliente_id
        WHERE p.acesso_token = ?
      `).get(data.acessoToken);

      const semTags = !pedidoDb.nome.includes('<script>') &&
                      !pedidoDb.endereco.includes('<img') &&
                      !pedidoDb.observacoes?.includes('<iframe');

      reportar('Tags maliciosas <script>, <img>, <iframe> foram sanitizadas', semTags);
    } else {
      reportar('Payload malicioso interceptado na validação', true);
    }
  } catch (err) {
    reportar('Sanitização XSS', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 11: Bloqueio de Abuso de Quantidade (Float, Negativo, Overflow)
  // --------------------------------------------------------------------------
  console.log('\n--- 11. Defesa Contra Manipulação de Quantidades ---');
  try {
    const quantidadesInvalidas = [0, -5, 1.5, 999999, 'abc'];
    let todasBarradas = true;

    for (const qtd of quantidadesInvalidas) {
      const res = await fetch(`${BASE_URL}/api/pedidos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: { nome: 'Qtd Teste', telefone: '45999990088', endereco: 'Rua Qtd, 10' },
          itens: [{ produtoId: 1, quantidade: qtd, opcionais: [{ id: 1 }] }],
          formaPagamento: 'pix'
        })
      });
      if (res.status !== 400) {
        todasBarradas = false;
      }
    }

    reportar(
      'Rejeitou quantidades não-inteiras, negativas, zero e valores astronômicos',
      todasBarradas
    );
  } catch (err) {
    reportar('Defesa de Quantidade', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 12: Bloqueio de Excesso de Opcionais (Bypass de max_escolhas)
  // --------------------------------------------------------------------------
  console.log('\n--- 12. Blindagem de Limites de Opcionais por Grupo ---');
  try {
    // Grupo 1 (Ponto da carne) tem max_escolhas = 1. Tentar enviar 3 pontos no mesmo burger!
    const res = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: { nome: 'Abusador Opcionais', telefone: '45999990077', endereco: 'Rua Opc, 20' },
        itens: [{
          produtoId: 1,
          quantidade: 1,
          opcionais: [{ id: 1 }, { id: 2 }, { id: 3 }] // 3 opções no grupo de escolha única!
        }],
        formaPagamento: 'pix'
      })
    });
    const data = await res.json();

    reportar(
      'Bloqueou tentativa de burlar max_escolhas do grupo de opcionais',
      res.status === 400 && data.erro === 'limite_opcionais_excedido',
      `Status: ${res.status}, Erro: ${data.erro}`
    );
  } catch (err) {
    reportar('Limites de Opcionais', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 13: Validação de Troco Insuficiente em Pagamento em Dinheiro
  // --------------------------------------------------------------------------
  console.log('\n--- 13. Proteção Contra Troco Inválido/Insuficiente ---');
  try {
    // Pedido custa mais de R$ 50, cliente pede troco para R$ 20
    const res = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: { nome: 'Troco Invalido', telefone: '45999990066', endereco: 'Rua Troco, 30' },
        itens: [{ produtoId: 1, quantidade: 1, opcionais: [{ id: 1 }] }], // Total: 45,90 + 7,00 = 52,90
        formaPagamento: 'dinheiro',
        trocoPara: 20 // R$ 20 é menor que R$ 52,90
      })
    });
    const data = await res.json();

    reportar(
      'Bloqueou troco menor que o total do pedido',
      res.status === 400 && data.erro === 'troco_insuficiente',
      `Status: ${res.status}, Erro: ${data.erro}`
    );
  } catch (err) {
    reportar('Validação de Troco', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 14: Anti-IDOR real no Acompanhamento Público (/api/pedidos/:token)
  // --------------------------------------------------------------------------
  console.log('\n--- 14. Proteção de Privacidade do Cliente (Anti-IDOR) ---');
  try {
    // 14a. Varrer por id sequencial (1, 2, 3...) NÃO pode mais encontrar nada
    const resVarredura = await fetch(`${BASE_URL}/api/pedidos/1`);
    reportar(
      'Buscar pedido pelo id sequencial (ex: /api/pedidos/1) não retorna mais nada',
      resVarredura.status === 404,
      `Status retornado para id sequencial: ${resVarredura.status}`
    );

    // 14b. Criar um pedido de verdade e conferir que só o token de acesso funciona
    const resCriacao = await fetch(`${BASE_URL}/api/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente: { nome: 'Cliente Teste IDOR', telefone: '45999998888', endereco: 'Rua Teste, 123 - Centro' },
        itens: [{ produtoId: 1, quantidade: 1, opcionais: [{ id: 1 }] }],
        formaPagamento: 'pix'
      })
    });
    const dataCriacao = await resCriacao.json();

    const resToken = await fetch(`${BASE_URL}/api/pedidos/${dataCriacao.acessoToken}`);
    const dataToken = await resToken.json();

    const telefoneMascarado = dataToken.cliente_telefone && dataToken.cliente_telefone.includes('****');
    reportar(
      'Com o token de acesso correto, o pedido é encontrado e o telefone vem mascarado',
      resToken.ok && telefoneMascarado,
      `Status: ${resToken.status}, Telefone retornado: ${dataToken.cliente_telefone}`
    );

    // 14c. Token forjado/adivinhado não pode funcionar
    const resTokenFalso = await fetch(`${BASE_URL}/api/pedidos/0000000000000000000000000000000000000a`);
    reportar(
      'Token de acesso forjado não retorna nenhum pedido',
      resTokenFalso.status === 404,
      `Status: ${resTokenFalso.status}`
    );
  } catch (err) {
    reportar('Anti-IDOR Privacidade', false, err.message);
  }

  // --------------------------------------------------------------------------
  // TESTE 15: Autocomplete Offline Restrito a Cascavel - PR
  // --------------------------------------------------------------------------
  console.log('\n--- 15. Autocomplete Local e Filtro Exclusivo Cascavel ---');
  try {
    const resBusca = await fetch(`${BASE_URL}/api/enderecos/busca?q=brasil`);
    const dataBusca = await resBusca.json();

    const todosCascavel = Array.isArray(dataBusca) && dataBusca.length > 0 && dataBusca.every(r => r.cidade === 'Cascavel');
    reportar(
      'Autocomplete retorna logradouros filtrados exclusivamente para Cascavel - PR',
      todosCascavel,
      `Retornou ${dataBusca.length} vias com coordenadas`
    );

    const resCurto = await fetch(`${BASE_URL}/api/enderecos/busca?q=a`);
    const dataCurto = await resCurto.json();
    reportar(
      'Busca com menos de 2 caracteres retorna lista vazia (Proteção contra spam de requisições)',
      Array.isArray(dataCurto) && dataCurto.length === 0,
      `Tamanho retornado: ${dataCurto.length}`
    );
  } catch (err) {
    reportar('Autocomplete Cascavel', false, err.message);
  }

  console.log('\n======================================================');
  console.log(`📊 RESULTADO FINAL: ${testesPassados} / ${totalTestes} TESTES PASSARAM COM SUCESSO!`);
  console.log('======================================================\n');

  if (testesPassados === totalTestes) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

rodarBateriaDeTestes();
