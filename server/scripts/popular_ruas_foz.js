import db from '../db/db.js';

async function popularRuasFoz() {
  console.log('📍 [BANCO DE DADOS] Criando e populando tabela de logradouros de Foz do Iguaçu - PR...');

  // Criar tabela ruas_foz se não existir
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ruas_foz (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT,
      bairro TEXT NOT NULL,
      cidade TEXT NOT NULL DEFAULT 'Foz do Iguaçu',
      uf TEXT NOT NULL DEFAULT 'PR',
      lat REAL NOT NULL DEFAULT -25.5163,
      lng REAL NOT NULL DEFAULT -54.5854,
      exibicao TEXT,
      busca_termo TEXT
    );
  `).run();

  // Criar alias/tabela de compatibilidade ruas_cascavel apontando para Foz do Iguaçu se necessário
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ruas_cascavel (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      tipo TEXT,
      bairro TEXT NOT NULL,
      cidade TEXT NOT NULL DEFAULT 'Foz do Iguaçu',
      uf TEXT NOT NULL DEFAULT 'PR',
      lat REAL NOT NULL DEFAULT -25.5163,
      lng REAL NOT NULL DEFAULT -54.5854,
      exibicao TEXT,
      busca_termo TEXT
    );
  `).run();

  const ruasFozData = [
    { nome: 'Avenida Sílvio Américo Sasdelli', tipo: 'Avenida', bairro: 'Itaipu A', lat: -25.4941847, lng: -54.5626942 },
    { nome: 'Avenida Sílvio Américo Sasdelli', tipo: 'Avenida', bairro: 'Lancaster', lat: -25.4980000, lng: -54.5680000 },
    { nome: 'Avenida Brasil', tipo: 'Avenida', bairro: 'Centro', lat: -25.5420000, lng: -54.5880000 },
    { nome: 'Avenida Jorge Schimmelpfeng', tipo: 'Avenida', bairro: 'Centro', lat: -25.5450000, lng: -54.5860000 },
    { nome: 'Avenida Juscelino Kubitschek', tipo: 'Avenida', bairro: 'Vila Portes', lat: -25.5100000, lng: -54.5820000 },
    { nome: 'Avenida Juscelino Kubitschek', tipo: 'Avenida', bairro: 'Centro', lat: -25.5350000, lng: -54.5850000 },
    { nome: 'Avenida das Cataratas', tipo: 'Avenida', bairro: 'Vila Yolanda', lat: -25.5550000, lng: -54.5780000 },
    { nome: 'Avenida República Argentina', tipo: 'Avenida', bairro: 'Centro', lat: -25.5320000, lng: -54.5790000 },
    { nome: 'Avenida República Argentina', tipo: 'Avenida', bairro: 'Maracanã', lat: -25.5220000, lng: -54.5650000 },
    { nome: 'Avenida Garibaldi', tipo: 'Avenida', bairro: 'Lancaster', lat: -25.5010000, lng: -54.5620000 },
    { nome: 'Avenida Mário Filho', tipo: 'Avenida', bairro: 'Morumbi', lat: -25.5250000, lng: -54.5380000 },
    { nome: 'Avenida Jules Rimet', tipo: 'Avenida', bairro: 'Parque Imperatriz', lat: -25.5120000, lng: -54.5500000 },
    { nome: 'Avenida Tarquínio Joslin dos Santos', tipo: 'Avenida', bairro: 'Vila A', lat: -25.5050000, lng: -54.5750000 },
    { nome: 'Avenida Andradina', tipo: 'Avenida', bairro: 'Vila A', lat: -25.4990000, lng: -54.5710000 },
    { nome: 'Avenida Morenitas', tipo: 'Avenida', bairro: 'Porto Meira', lat: -25.5780000, lng: -54.5650000 },
    { nome: 'Avenida General Meira', tipo: 'Avenida', bairro: 'Porto Meira', lat: -25.5700000, lng: -54.5720000 },
    { nome: 'Avenida Costa e Silva', tipo: 'Avenida', bairro: 'Parque Presidente', lat: -25.5280000, lng: -54.5690000 },
    { nome: 'Avenida Gramado', tipo: 'Avenida', bairro: 'Três Lagoas', lat: -25.4650000, lng: -54.5120000 },
    { nome: 'Rua Almirante Barroso', tipo: 'Rua', bairro: 'Centro', lat: -25.5410000, lng: -54.5840000 },
    { nome: 'Rua Quintino Bocaiúva', tipo: 'Rua', bairro: 'Centro', lat: -25.5390000, lng: -54.5860000 },
    { nome: 'Rua Marechal Deodoro', tipo: 'Rua', bairro: 'Centro', lat: -25.5400000, lng: -54.5870000 },
    { nome: 'Rua Tarobá', tipo: 'Rua', bairro: 'Centro', lat: -25.5430000, lng: -54.5820000 },
    { nome: 'Rua Santos Dumont', tipo: 'Rua', bairro: 'Centro', lat: -25.5380000, lng: -54.5830000 },
    { nome: 'Rua Benjamin Constant', tipo: 'Rua', bairro: 'Lancaster', lat: -25.4975000, lng: -54.5660000 },
    { nome: 'Rua Pedro Basso', tipo: 'Rua', bairro: 'Alto São Francisco', lat: -25.5290000, lng: -54.5770000 },
    { nome: 'Rua Bartolomeu de Gusmão', tipo: 'Rua', bairro: 'Centro', lat: -25.5360000, lng: -54.5810000 },
    { nome: 'Rua Xavier da Silva', tipo: 'Rua', bairro: 'Centro', lat: -25.5370000, lng: -54.5820000 },
    { nome: 'Rua Edmundo de Barros', tipo: 'Rua', bairro: 'Centro', lat: -25.5440000, lng: -54.5800000 }
  ];

  // Limpar e reinserir dados limpos de Foz do Iguaçu
  await db.prepare('DELETE FROM ruas_foz').run();
  await db.prepare('DELETE FROM ruas_cascavel').run();

  function normalizar(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  for (const r of ruasFozData) {
    const exibicao = `${r.nome} - ${r.bairro}, Foz do Iguaçu - PR`;
    const buscaTermo = normalizar(`${r.nome} ${r.bairro} Foz do Iguaçu`);

    await db.prepare(`
      INSERT INTO ruas_foz (nome, tipo, bairro, cidade, uf, lat, lng, exibicao, busca_termo)
      VALUES (?, ?, ?, 'Foz do Iguaçu', 'PR', ?, ?, ?, ?)
    `).run(r.nome, r.tipo, r.bairro, r.lat, r.lng, exibicao, buscaTermo);

    await db.prepare(`
      INSERT INTO ruas_cascavel (nome, tipo, bairro, cidade, uf, lat, lng, exibicao, busca_termo)
      VALUES (?, ?, ?, 'Foz do Iguaçu', 'PR', ?, ?, ?, ?)
    `).run(r.nome, r.tipo, r.bairro, r.lat, r.lng, exibicao, buscaTermo);
  }

  console.log(`✅ ${ruasFozData.length} logradouros oficiais de Foz do Iguaçu - PR cadastrados com sucesso!`);
}

popularRuasFoz().catch(console.error);
