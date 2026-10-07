import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const temDatabaseUrl = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());

let db;

if (temDatabaseUrl) {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  function traduzirSql(sql) {
    return sql
      .replace(/datetime\(\s*'now'\s*,\s*'-24 hours'\s*\)/gi, "(now() - interval '24 hours')")
      .replace(/datetime\(\s*'now'\s*\)/gi, 'now()')
      .replace(/date\(\s*'now'\s*\)/gi, 'CURRENT_DATE')
      .replace(/date\(\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\)/gi, '($1)::date');
  }

  function parametrizar(sql) {
    let i = 0;
    return sql.replace(/\?/g, () => `$${++i}`);
  }

  function prepararComExecutor(sql, executor) {
    const pgSql = parametrizar(traduzirSql(sql));
    return {
      async get(...params) {
        const r = await executor(pgSql, params);
        return r.rows[0];
      },
      async all(...params) {
        const r = await executor(pgSql, params);
        return r.rows;
      },
      async run(...params) {
        const r = await executor(pgSql, params);
        return { changes: r.rowCount, lastInsertRowid: r.rows[0]?.id };
      }
    };
  }

  db = {
    prepare(sql) {
      return prepararComExecutor(sql, (text, params) => pool.query(text, params));
    },
    transaction(fn) {
      return async (...args) => {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const tx = {
            prepare(sql) {
              return prepararComExecutor(sql, (text, params) => client.query(text, params));
            }
          };
          const resultado = await fn(tx, ...args);
          await client.query('COMMIT');
          return resultado;
        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      };
    },
    async close() {
      await pool.end();
    }
  };
} else {
  // Modo Local SQLite Nativo (Zero-Config / Sem necessidade de credenciais externas)
  console.log('📦 [BANCO DE DADOS] DATABASE_URL não informada.');
  console.log('🚀 [BANCO DE DADOS] Ativando Banco de Dados Local SQLite em server/db/local_delivery.sqlite');

  const { DatabaseSync } = await import('node:sqlite');
  const dbPath = path.resolve(__dirname, 'local_delivery.sqlite');
  const sqlite = new DatabaseSync(dbPath);

  // Executa schema inicial
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      icone TEXT,
      ordem INTEGER NOT NULL DEFAULT 0,
      ativa INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      categoria_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      ingredientes TEXT,
      preco_base INTEGER NOT NULL,
      preco_promocional INTEGER,
      serve_pessoas INTEGER DEFAULT 1,
      destaque INTEGER NOT NULL DEFAULT 0,
      ativo INTEGER NOT NULL DEFAULT 1,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS produto_imagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      arquivo TEXT NOT NULL,
      ordem INTEGER NOT NULL DEFAULT 0,
      principal INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS opcional_grupos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      titulo TEXT NOT NULL,
      obrigatorio INTEGER NOT NULL DEFAULT 0,
      min_escolhas INTEGER NOT NULL DEFAULT 0,
      max_escolhas INTEGER NOT NULL DEFAULT 1,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS opcional_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      grupo_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      preco_adicional INTEGER NOT NULL DEFAULT 0,
      ordem INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      endereco TEXT NOT NULL,
      complemento TEXT,
      referencia TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      papel TEXT NOT NULL DEFAULT 'dono',
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS motoboys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL,
      usuario TEXT NOT NULL UNIQUE,
      senha_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ativo',
      veiculo TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
      aprovado_em TEXT
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      acesso_token TEXT UNIQUE,
      cliente_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'recebido',
      forma_pagamento TEXT NOT NULL,
      troco_para INTEGER,
      observacoes TEXT,
      subtotal INTEGER NOT NULL,
      taxa_entrega INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      motoboy_id INTEGER,
      valor_motoboy INTEGER NOT NULL DEFAULT 0,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
      aceito_em TEXT,
      entregue_em TEXT
    );

    CREATE TABLE IF NOT EXISTS pedido_itens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      produto_id INTEGER,
      nome_produto TEXT NOT NULL,
      preco_unitario INTEGER NOT NULL,
      quantidade INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pedido_item_opcionais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_item_id INTEGER NOT NULL,
      nome_opcional TEXT NOT NULL,
      preco_adicional INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pedido_id INTEGER NOT NULL,
      metodo TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Semente inicial básica se a tabela de categorias estiver vazia
  const qtdCat = sqlite.prepare('SELECT COUNT(*) as total FROM categorias').get()?.total;
  if (!qtdCat || qtdCat === 0) {
    sqlite.exec(`
      INSERT INTO categorias (nome, ordem, ativa) VALUES 
        ('🔥 Smash Burgers', 1, 1),
        ('🍔 Burgers Especiais', 2, 1),
        ('🍟 Porções & Batatas', 3, 1),
        ('🥤 Bebidas', 4, 1);

      INSERT INTO produtos (categoria_id, nome, descricao, preco_base, ativo, destaque) VALUES 
        (1, 'Smash Bacon Supreme', 'Dois blends 90g com cheddar e bacon crocante no brioche', 3290, 1, 1),
        (1, 'Classic Cheese Smash', 'Dois blends 90g com queijo prato e maionese artesanal', 2890, 1, 1),
        (2, 'Monster Cheddar Duplo', 'Burger 180g artesanal com piscina de cheddar e bacon', 3990, 1, 1),
        (3, 'Batata Rústica Especial', 'Batatas crocantes temperadas com alecrim e maionese verde', 2490, 1, 1),
        (4, 'Refrigerante Lata 350ml', 'Coca-Cola ou Guaraná gelado', 650, 1, 0);

      -- Usuário Dono padrão (senha: admin2026 com bcrypt)
      INSERT OR IGNORE INTO usuarios (nome, email, senha_hash, papel) VALUES
        ('Administrador', 'admin@delivery.com.br', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'dono');

      -- Motoboy padrão (senha: motoboy2026 com bcrypt)
      INSERT OR IGNORE INTO motoboys (nome, telefone, usuario, senha_hash, status, veiculo) VALUES
        ('Carlos Entregador', '+55 11 99999-4321', 'carlos@delivery.com.br', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'ativo', 'Honda CG 160 Fan');
    `);
  }

  db = {
    prepare(sql) {
      const cleanSql = sql
        .replace(/RETURNING\s+id/gi, '')
        .replace(/\$\d+/g, '?');

      const stmt = sqlite.prepare(cleanSql);
      const cleanParams = (params) => params.map(p => p === undefined ? null : p);

      return {
        async get(...params) {
          return stmt.get(...cleanParams(params));
        },
        async all(...params) {
          return stmt.all(...cleanParams(params));
        },
        async run(...params) {
          const res = stmt.run(...cleanParams(params));
          return { changes: res.changes, lastInsertRowid: res.lastInsertRowid };
        }
      };
    },
    transaction(fn) {
      return async (...args) => {
        sqlite.exec('BEGIN TRANSACTION');
        try {
          const resultado = await fn(db, ...args);
          sqlite.exec('COMMIT');
          return resultado;
        } catch (err) {
          sqlite.exec('ROLLBACK');
          throw err;
        }
      };
    },
    async close() {
      sqlite.close();
    }
  };
}

export function inicializarBanco() {}
export default db;
