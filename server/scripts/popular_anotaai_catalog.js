import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from '../db/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

const targetDir = path.resolve(rootDir, 'web', 'public', 'imagens', 'produtos', 'trailer94');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Banner do topo informado pelo usuário
const BANNER_URL = 'https://staginganotaai.s3.us-west-2.amazonaws.com/produtos/6663127538b66b0019c870751717796540404blob';

// Lista de itens extraídos do JSON da Anota AI (somente os que possuem imagem)
const menuData = [
  {
    categoria: '🍔 Lanches Artesanais',
    ordem: 1,
    produtos: [
      {
        nome: 'Burguer',
        descricao: 'Pão brioche, suculento hambúrguer 120g e queijo cheddar cremoso.',
        preco: 15.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406211850_J267_i'
      },
      {
        nome: 'Burguer Salada',
        descricao: 'Pão brioche, suculento hambúrguer 120g, queijo cheddar cremoso, alface fresquinha e tomate.',
        preco: 17.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131852_CLT4_i'
      },
      {
        nome: 'Burguer Calabresa',
        descricao: 'Pão de brioche, hambúrguer 120g, calabresa fatiada, queijo cheddar, alface e tomate.',
        preco: 19.00,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406141756_0WN3_i'
      },
      {
        nome: 'Burguer Bacon',
        descricao: 'Pão brioche, suculento hambúrguer 120g, bacon, queijo cheddar cremoso, alface fresquinha e tomate.',
        preco: 19.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131926_75H3_i'
      },
      {
        nome: 'Burguer Bacon Onion',
        descricao: 'Pão brioche, suculento hambúrguer 120g, onion rings, bacon, queijo cheddar cremoso, alface fresquinha e tomate.',
        preco: 21.00,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131928_JHDV_i'
      },
      {
        nome: 'Burguer Bacon Duplo',
        descricao: 'Pão brioche, 2 suculentos hambúrgueres 120g, bacon duplo, queijo cheddar cremoso, alface fresquinha e tomate.',
        preco: 23.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131931_XDGN_i'
      }
    ]
  },
  {
    categoria: '🥪 Lanches Prensados',
    ordem: 2,
    produtos: [
      {
        nome: 'X-Salada Prensado',
        descricao: 'Pão com gergelim, suculento hambúrguer, presunto, queijo bem derretido, alface fresquinha e tomate.',
        preco: 16.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406140022_5U4J_i'
      },
      {
        nome: 'X-Calabresa Prensado',
        descricao: 'Pão com gergelim, suculento hambúrguer, calabresa, presunto, queijo bem derretido, alface fresquinha e tomate.',
        preco: 18.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406140023_2786_i'
      }
    ]
  },
  {
    categoria: '🔥 Combos Lanches Artesanais',
    ordem: 3,
    produtos: [
      {
        nome: 'Burguer + Batata + Refri',
        descricao: 'Burguer artesanal 120g com queijo cheddar + porção de batata frita + refrigerante lata geladinho.',
        preco: 24.00,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406211857_E11X_i'
      },
      {
        nome: 'Burguer Salada + Batata + Refri',
        descricao: 'Burguer Salada com hambúrguer 120g, alface e tomate + batata frita + refrigerante lata.',
        preco: 25.00,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131912_P2WY_i'
      },
      {
        nome: 'Burguer Calabresa + Batata + Refri',
        descricao: 'Pão brioche, hambúrguer 120g, calabresa fatiada, queijo cheddar, alface e tomate + batata frita + refri.',
        preco: 26.00,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406141742_13F7_i'
      },
      {
        nome: 'Burguer Bacon + Batata + Refri',
        descricao: 'Burguer Bacon crocante 120g com cheddar, alface e tomate + batata frita + refrigerante lata.',
        preco: 26.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131918_7V7Q_i'
      },
      {
        nome: 'Burguer Bacon Onion + Batata + Refri',
        descricao: 'Burguer Bacon Onion 120g com onion rings crocantes + batata frita + refrigerante lata.',
        preco: 27.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131920_8727_i'
      },
      {
        nome: 'Burguer Bacon Duplo + Batata + Refri',
        descricao: '2 Hambúrgueres 120g, bacon duplo, cheddar + batata frita + refrigerante lata.',
        preco: 32.60,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131921_YF70_i'
      }
    ]
  },
  {
    categoria: '🍟 Combo Lanches Prensados',
    ordem: 4,
    produtos: [
      {
        nome: 'X-Salada Prensado + Batata + Refri',
        descricao: 'X-Salada prensado tradicional + porção de batata frita + refrigerante lata geladinho.',
        preco: 25.00,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131941_WB0T_i'
      }
    ]
  },
  {
    categoria: '🌭 Combo Hot Dog Prensado',
    ordem: 5,
    produtos: [
      {
        nome: 'Dog Simples + Batata + Refri',
        descricao: 'Hot dog prensado simples com salsicha, purê cremoso, bacon, milho e batata palha + batata + refri.',
        preco: 23.80,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131859_T27V_i'
      },
      {
        nome: 'Dog Duplo + Batata + Refri',
        descricao: 'Hot dog prensado duplo com 2 salsichas, purê, bacon, milho e batata palha + batata + refri.',
        preco: 24.80,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131902_4A20_i'
      }
    ]
  },
  {
    categoria: '🌭 Hot Dog Prensado',
    ordem: 6,
    produtos: [
      {
        nome: 'Dog Simples',
        descricao: 'Pão, salsicha, bacon, purê de batata cremoso, delicioso molho da casa, milho e batata palha crocante.',
        preco: 16.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131935_6831_i'
      },
      {
        nome: 'Dog Duplo',
        descricao: 'Pão, 2 salsichas, bacon, purê de batata cremoso, delicioso molho da casa, milho e batata palha crocante.',
        preco: 17.50,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202406131936_P6L2_i'
      }
    ]
  },
  {
    categoria: '🥤 Bebidas',
    ordem: 7,
    produtos: [
      {
        nome: 'Refrigerante Guaraná Antarctica 350ml',
        descricao: 'Lata 350ml trincando de gelada.',
        preco: 7.00,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202301241119_8ko7t9c9a5p'
      },
      {
        nome: 'Coca-Cola Original 350ml',
        descricao: 'Lata 350ml trincando de gelada.',
        preco: 7.00,
        imageUrl: 'https://client-assets.anota.ai/produtos/6663127538b66b0019c87075/202210180010_cazgjkdma3s'
      }
    ]
  }
];

async function baixarImagem(url, filename) {
  const dest = path.resolve(targetDir, filename);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buffer);
    console.log(`✅ Baixada: ${filename}`);
    return `/imagens/produtos/trailer94/${filename}`;
  } catch (err) {
    console.error(`❌ Erro ao baixar ${url}:`, err.message);
    return null;
  }
}

async function popularBanco() {
  console.log('🚀 Iniciando download das imagens e população do banco de dados...');

  // Baixar banner do topo oficial do Anota AI
  await baixarImagem(BANNER_URL, 'banner_trailer94_anotaai.jpg');

  // Limpa banco de dados antigo
  await db.prepare('DELETE FROM pedido_item_opcionais').run();
  await db.prepare('DELETE FROM pedido_itens').run();
  await db.prepare('DELETE FROM produto_imagens').run();
  await db.prepare('DELETE FROM opcional_itens').run();
  await db.prepare('DELETE FROM opcional_grupos').run();
  await db.prepare('DELETE FROM produtos').run();
  await db.prepare('DELETE FROM categorias').run();

  let prodCounter = 1;

  for (const catData of menuData) {
    const catRes = await db.prepare(`
      INSERT INTO categorias (nome, ordem, ativa) VALUES (?, ?, 1) RETURNING id
    `).run(catData.categoria, catData.ordem);
    const catId = catRes.lastInsertRowid;

    for (const prodData of catData.produtos) {
      const fileName = `anota_prod_${prodCounter}.jpg`;
      const localPath = await baixarImagem(prodData.imageUrl, fileName);
      const precoCentavos = Math.round(prodData.preco * 100);

      const prodRes = await db.prepare(`
        INSERT INTO produtos (categoria_id, nome, descricao, preco_base, ativo, destaque, ordem)
        VALUES (?, ?, ?, ?, 1, ?, ?) RETURNING id
      `).run(
        catId,
        prodData.nome,
        prodData.descricao,
        precoCentavos,
        prodCounter <= 6 ? 1 : 0, // Destaques nos primeiros 6
        prodCounter
      );
      const prodId = prodRes.lastInsertRowid;

      if (localPath) {
        await db.prepare(`
          INSERT INTO produto_imagens (produto_id, arquivo, principal)
          VALUES (?, ?, 1)
        `).run(prodId, localPath);
      }

      // Adicionais padrão de ponto e extras para os hambúrgueres
      if (catData.categoria.includes('Artesanais') || catData.categoria.includes('Burguer')) {
        const gPonto = await db.prepare(`
          INSERT INTO opcional_grupos (produto_id, titulo, obrigatorio, min_escolhas, max_escolhas, ordem)
          VALUES (?, 'Ponto da Carne', 1, 1, 1, 1) RETURNING id
        `).run(prodId);
        
        await db.prepare(`
          INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, 'Ao Ponto (Rosada por dentro)', 0, 1)
        `).run(gPonto.lastInsertRowid);
        await db.prepare(`
          INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, 'Bem Passada', 0, 2)
        `).run(gPonto.lastInsertRowid);

        const gTurbina = await db.prepare(`
          INSERT INTO opcional_grupos (produto_id, titulo, obrigatorio, min_escolhas, max_escolhas, ordem)
          VALUES (?, 'Turbine seu Lanche', 0, 0, 3, 2) RETURNING id
        `).run(prodId);

        await db.prepare(`
          INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, 'Bacon Crocante Extra (+50g)', 600, 1)
        `).run(gTurbina.lastInsertRowid);
        await db.prepare(`
          INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, 'Blend 120g Extra', 900, 2)
        `).run(gTurbina.lastInsertRowid);
        await db.prepare(`
          INSERT INTO opcional_itens (grupo_id, nome, preco_adicional, ordem) VALUES (?, 'Maionese Verde da Casa Extra', 350, 3)
        `).run(gTurbina.lastInsertRowid);
      }

      prodCounter++;
    }
  }

  console.log('✨ Cardápio do Trailer 94 populado com dados reais do Anota AI!');
}

popularBanco().catch(console.error);
