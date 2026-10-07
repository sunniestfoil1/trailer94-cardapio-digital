/**
 * 🍔 Script de Povoamento Oficial do Cardápio do Trailer 94 (Foz do Iguaçu - PR)
 * 
 * Cadastra todas as categorias reais, lanches artesanais, prensados, combos,
 * porções, sobremesas e adicionais/opcionais extraídos do iFood do Trailer 94.
 */

import db from '../db/db.js';
import { hashSenha } from '../auth/senha.js';

console.log('====================================================');
console.log('🚀 INICIALIZANDO CARDÁPIO OFICIAL REAL: TRAILER 94');
console.log('====================================================\n');

async function seed() {
  try {
    // 1. Limpar cardápio anterior
    await db.prepare('DELETE FROM pedido_item_opcionais').run();
    await db.prepare('DELETE FROM pedido_itens').run();
    await db.prepare('DELETE FROM opcional_itens').run();
    await db.prepare('DELETE FROM opcional_grupos').run();
    await db.prepare('DELETE FROM produto_imagens').run();
    await db.prepare('DELETE FROM produtos').run();
    await db.prepare('DELETE FROM categorias').run();

    // 2. Categorias do Trailer 94
    console.log('📁 Criando categorias oficiais do Trailer 94...');
    const categorias = [
      { nome: '🔥 Combos & Promoções', icone: 'flame', ordem: 1 },
      { nome: '🍔 Burgers Artesanais', icone: 'burger', ordem: 2 },
      { nome: '🥪 Lanches Prensados & Tradicionais', icone: 'sandwich', ordem: 3 },
      { nome: '🌭 Hot Dogs', icone: 'dog', ordem: 4 },
      { nome: '🍟 Porções & Acompanhamentos', icone: 'fries', ordem: 5 },
      { nome: '🍮 Sobremesas & Bebidas', icone: 'drink', ordem: 6 }
    ];

    const catIds = {};
    for (const cat of categorias) {
      const res = await db.prepare('INSERT INTO categorias (nome, icone, ordem, ativa) VALUES (?, ?, ?, 1) RETURNING id')
        .run(cat.nome, cat.icone, cat.ordem);
      catIds[cat.nome] = res.lastInsertRowid;
    }

    // 3. Produtos Reais do Trailer 94
    console.log('🍔 Cadastrando lanches e fotos reais do Trailer 94...');
    const produtos = [
      // Combos & Promoções
      {
        cat: '🔥 Combos & Promoções',
        nome: 'Combo Casal Premium',
        descricao: '2 Lanches com hambúrgueres artesanais de 120g cada, bacon crocante, cheddar, alface fresquinho e tomate. 1 Batata grande com cheddar cremoso e bacon + 1 Coca-Cola 600ml + 2 molhos especiais da casa.',
        preco: 10990,
        precoPromocional: 9990,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_1.jpg'
      },
      {
        cat: '🔥 Combos & Promoções',
        nome: 'Burguer Bacon + Batata + Refri',
        descricao: 'Burguer Bacon artesanal 120g com queijo cheddar, alface e tomate + Porção de batata frita crocante + Refrigerante lata 350ml geladinho.',
        preco: 4990,
        precoPromocional: 3699,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_2.jpg'
      },
      {
        cat: '🔥 Combos & Promoções',
        nome: 'Dog Simples + Batata + Refri',
        descricao: 'Hot dog tradicional com salsicha, purê de batata cremoso, bacon, milho e batata palha + batata frita + refrigerante lata.',
        preco: 3999,
        precoPromocional: 2899,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_3.jpg'
      },
      {
        cat: '🔥 Combos & Promoções',
        nome: 'Baguete de Isca de Carne com Fritas + Refri',
        descricao: 'Delicioso pão baguete, 150g de isca de carne bovina suculenta, cebola caramelizada, alface fresquinha, tomate e maionese verde artesanal + porção de fritas + Coca lata.',
        preco: 4699,
        precoPromocional: 3999,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_4.jpg'
      },

      // Burgers Artesanais
      {
        cat: '🍔 Burgers Artesanais',
        nome: 'Burguer Bacon Duplo',
        descricao: 'Pão brioche selado, 2 suculentos hambúrgueres artesanais 120g, bacon duplo crocante, queijo cheddar cremoso derretido, alface fresquinha e tomate.',
        preco: 3999,
        precoPromocional: 3499,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_5.jpg'
      },
      {
        cat: '🍔 Burgers Artesanais',
        nome: 'Burguer Bacon Onion',
        descricao: 'Pão brioche selado na manteiga, suculento hambúrguer artesanal 120g, onion rings crocantes, bacon, queijo cheddar cremoso, alface e tomate.',
        preco: 3499,
        precoPromocional: 3199,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_6.jpg'
      },
      {
        cat: '🍔 Burgers Artesanais',
        nome: 'Burguer Bacon com Ovo',
        descricao: 'Pão brioche selado, hambúrguer artesanal 120g, bacon crocante, ovo frito no ponto, queijo cheddar cremoso, alface fresquinha e tomate.',
        preco: 3699,
        precoPromocional: 3099,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_7.jpg'
      },
      {
        cat: '🍔 Burgers Artesanais',
        nome: 'Burguer Calabresa',
        descricao: 'Pão brioche selado, hambúrguer artesanal 120g, calabresa fatiada grelhada, queijo cheddar cremoso, alface fresquinha e tomate.',
        preco: 3299,
        precoPromocional: 2799,
        destaque: 0,
        imagem: '/imagens/produtos/trailer94/t94_prod_8.jpg'
      },
      {
        cat: '🍔 Burgers Artesanais',
        nome: 'Burguer Bacon',
        descricao: 'Pão brioche selado na manteiga, suculento hambúrguer 120g, fatias de bacon crocante, queijo cheddar cremoso, alface fresquinha e tomate.',
        preco: 2999,
        precoPromocional: 2699,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_9.jpg'
      },
      {
        cat: '🍔 Burgers Artesanais',
        nome: 'Burguer Salada',
        descricao: 'Pão brioche tostado, suculento hambúrguer 120g, queijo cheddar cremoso, alface fresquinha e tomate.',
        preco: 2699,
        precoPromocional: 2399,
        destaque: 0,
        imagem: '/imagens/produtos/trailer94/t94_prod_10.jpg'
      },
      {
        cat: '🍔 Burgers Artesanais',
        nome: 'Burguer Simples',
        descricao: 'Pão brioche tostado na manteiga, suculento hambúrguer artesanal 120g e queijo cheddar cremoso derretido.',
        preco: 2399,
        precoPromocional: 1999,
        destaque: 0,
        imagem: '/imagens/produtos/trailer94/t94_prod_11.jpg'
      },

      // Lanches Prensados & Tradicionais
      {
        cat: '🥪 Lanches Prensados & Tradicionais',
        nome: 'X-Tudo do Trailer',
        descricao: 'Pão com gergelim prensado na chapa, hambúrguer suculento, bacon crocante, calabresa fatiada, frango desfiado, ovo, presunto, queijo derretido, alface fresquinha e tomate.',
        preco: 4399,
        precoPromocional: 3399,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_12.jpg'
      },
      {
        cat: '🥪 Lanches Prensados & Tradicionais',
        nome: 'X-Calabresa',
        descricao: 'Pão com gergelim prensado, suculento hambúrguer, calabresa fatiada grelhada, presunto, queijo derretido, alface e tomate.',
        preco: 3299,
        precoPromocional: 2999,
        destaque: 0,
        imagem: '/imagens/produtos/trailer94/t94_prod_13.jpg'
      },
      {
        cat: '🥪 Lanches Prensados & Tradicionais',
        nome: 'X-Frango Especial',
        descricao: 'Pão com gergelim prensado na chapa, frango desfiado temperado, presunto, queijo derretido, alface fresquinha e tomate.',
        preco: 3199,
        precoPromocional: 2799,
        destaque: 0,
        imagem: '/imagens/produtos/trailer94/t94_prod_14.jpg'
      },
      {
        cat: '🥪 Lanches Prensados & Tradicionais',
        nome: 'X-Burguer Tradicional',
        descricao: 'Pão com gergelim prensado, hambúrguer da casa, presunto, queijo derretido, alface fresquinha e tomate.',
        preco: 2699,
        precoPromocional: 2299,
        destaque: 0,
        imagem: '/imagens/produtos/trailer94/t94_prod_15.jpg'
      },

      // Hot Dogs
      {
        cat: '🌭 Hot Dogs',
        nome: 'Hot Dog Tradicional Especial',
        descricao: 'Pão macio, salsicha grelhada, bacon em cubos, purê de batata cremoso artesanal, molho especial da casa, milho verde e batata palha crocante.',
        preco: 2899,
        precoPromocional: 1999,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_16.jpg'
      },

      // Porções & Acompanhamentos
      {
        cat: '🍟 Porções & Acompanhamentos',
        nome: 'Batata Frita Pequena com Cheddar e Bacon',
        descricao: 'Batatas fritas rústicas e crocantes servidas com piscina de queijo cheddar cremoso e cubos de bacon bem crocante.',
        preco: 1290,
        precoPromocional: 999,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_17.jpg'
      },
      {
        cat: '🍟 Porções & Acompanhamentos',
        nome: 'Batata Frita Grande com Cheddar e Bacon',
        descricao: 'Porção generosa de batatas crocantes com bastante queijo cheddar cremoso derretido e farofa de bacon crocante.',
        preco: 3490,
        precoPromocional: 2999,
        destaque: 0,
        imagem: '/imagens/produtos/trailer94/t94_prod_1.jpg'
      },
      {
        cat: '🍟 Porções & Acompanhamentos',
        nome: 'Anéis de Cebola (Onion Rings)',
        descricao: 'Porção crocante de anéis de cebola empanados. Acompanha maionese verde da casa.',
        preco: 2590,
        precoPromocional: 2290,
        destaque: 0,
        imagem: '/imagens/produtos/trailer94/t94_prod_6.jpg'
      },

      // Sobremesas & Bebidas
      {
        cat: '🍮 Sobremesas & Bebidas',
        nome: 'Pudim de Leite Cremoso',
        descricao: 'Delicioso pudim de leite caseiro cremoso com gulosas colheradas de calda de caramelo dourada.',
        preco: 1599,
        precoPromocional: 799,
        destaque: 1,
        imagem: '/imagens/produtos/trailer94/t94_prod_7.jpg'
      },
      {
        cat: '🍮 Sobremesas & Bebidas',
        nome: 'Refrigerante Lata 350ml',
        descricao: 'Coca-Cola, Guaraná Antarctica ou Fanta geladíssima.',
        preco: 650,
        precoPromocional: null,
        destaque: 0,
        imagem: '/imagens/demo/refrigerante-lata.jpg'
      },
      {
        cat: '🍮 Sobremesas & Bebidas',
        nome: 'Coca-Cola 600ml Gelada',
        descricao: 'Garrafa de Coca-Cola 600ml geladíssima.',
        preco: 900,
        precoPromocional: null,
        destaque: 0,
        imagem: '/imagens/demo/refrigerante-lata.jpg'
      }
    ];

    for (const prod of produtos) {
      const catId = catIds[prod.cat] || 1;
      const res = await db.prepare(`
        INSERT INTO produtos (categoria_id, nome, descricao, preco_base, preco_promocional, destaque, ativo, ordem)
        VALUES (?, ?, ?, ?, ?, ?, 1, 1) RETURNING id
      `).run(catId, prod.nome, prod.descricao, prod.preco, prod.precoPromocional, prod.destaque);
      
      const prodId = res.lastInsertRowid;

      // Imagem do produto
      await db.prepare('INSERT INTO produto_imagens (produto_id, arquivo, ordem, principal) VALUES (?, ?, 0, 1)')
        .run(prodId, prod.imagem);

      // Opcionais para burgers artesanais (Ponto da carne e adicionais)
      if (prod.cat === '🍔 Burgers Artesanais' || prod.cat === '🔥 Combos & Promoções') {
        const resGrupoPonto = await db.prepare(`
          INSERT INTO opcional_grupos (produto_id, titulo, obrigatorio, min_escolhas, max_escolhas, ordem)
          VALUES (?, 'Escolha o Ponto da Carne', 1, 1, 1, 1) RETURNING id
        `).run(prodId);
        
        await db.prepare('INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, ?, 0, 1)').run(resGrupoPonto.lastInsertRowid, 'Ao Ponto (Suculento)');
        await db.prepare('INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, ?, 0, 2)').run(resGrupoPonto.lastInsertRowid, 'Bem Passado');

        const resGrupoExtras = await db.prepare(`
          INSERT INTO opcional_grupos (produto_id, titulo, obrigatorio, min_escolhas, max_escolhas, ordem)
          VALUES (?, 'Turbine seu Lanche (Adicionais)', 0, 0, 5, 2) RETURNING id
        `).run(prodId);

        await db.prepare('INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, ?, ?, ?)').run(resGrupoExtras.lastInsertRowid, 'Bacon Crocante Extra', 500, 1);
        await db.prepare('INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, ?, ?, ?)').run(resGrupoExtras.lastInsertRowid, 'Hambúrguer Artesanal 120g Extra', 800, 2);
        await db.prepare('INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, ?, ?, ?)').run(resGrupoExtras.lastInsertRowid, 'Cheddar Cremoso Extra', 400, 3);
        await db.prepare('INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, ?, ?, ?)').run(resGrupoExtras.lastInsertRowid, 'Ovo Frito Extra', 300, 4);
        await db.prepare('INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, ?, ?, ?)').run(resGrupoExtras.lastInsertRowid, 'Maionese Verde da Casa (Pote 50ml)', 350, 5);
      }
    }

    // 4. Usuário Administrador
    console.log('👤 Configurando administrador do Trailer 94...');
    const adminEmail = 'admin@trailer94.com.br';
    const hashAdmin = await hashSenha('trailer942026');

    await db.prepare(`
      INSERT INTO usuarios (nome, email, senha_hash, papel)
      VALUES ('Gerente Trailer 94', ?, ?, 'dono')
      ON CONFLICT (email) DO UPDATE SET senha_hash = excluded.senha_hash
    `).run(adminEmail, hashAdmin);

    // 5. Entregador
    console.log('🏍️ Configurando entregador padrão do Trailer 94...');
    const motoUsuario = 'carlos@trailer94.com.br';
    const hashMoto = await hashSenha('motoboy2026');

    await db.prepare(`
      INSERT INTO motoboys (nome, telefone, usuario, senha_hash, status, veiculo)
      VALUES ('Carlos Entregador', '+55 45 99999-4321', ?, ?, 'ativo', 'Honda CG 160 Fan')
      ON CONFLICT (usuario) DO UPDATE SET senha_hash = excluded.senha_hash, status = 'ativo'
    `).run(motoUsuario, hashMoto);

    console.log('\n====================================================');
    console.log('✅ BANCO DE DADOS POPULADO COM O CARDÁPIO REAL DO TRAILER 94!');
    console.log('====================================================');
    console.log(`📌 Admin: ${adminEmail} | Senha: trailer942026`);
    console.log(`📌 Motoboy: ${motoUsuario} | Senha: motoboy2026`);
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro durante seed:', err);
    process.exit(1);
  }
}

seed();
