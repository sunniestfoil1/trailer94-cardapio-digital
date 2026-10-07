-- Schema Postgres (Supabase) para o Bulls Burger
-- Convertido do schema.sql (SQLite) original. Flags booleanas continuam como
-- INTEGER 0/1 de propósito, pra não precisar reescrever toda comparação
-- "=== 1" espalhada pelas rotas durante a migração.

CREATE TABLE IF NOT EXISTS categorias (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  icone TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativa INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS produtos (
  id BIGSERIAL PRIMARY KEY,
  categoria_id BIGINT NOT NULL REFERENCES categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ingredientes TEXT,
  preco_base INTEGER NOT NULL,        -- em centavos (ex: 4590 = R$ 45,90)
  preco_promocional INTEGER,
  serve_pessoas INTEGER DEFAULT 1,
  destaque INTEGER NOT NULL DEFAULT 0,
  ativo INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS produto_imagens (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  arquivo TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  principal INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS opcional_grupos (
  id BIGSERIAL PRIMARY KEY,
  produto_id BIGINT NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  obrigatorio INTEGER NOT NULL DEFAULT 0,
  min_escolhas INTEGER NOT NULL DEFAULT 0,
  max_escolhas INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS opcional_itens (
  id BIGSERIAL PRIMARY KEY,
  grupo_id BIGINT NOT NULL REFERENCES opcional_grupos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  preco_adicional INTEGER NOT NULL DEFAULT 0,
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS clientes (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  endereco TEXT NOT NULL,
  complemento TEXT,
  referencia TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'dono',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS motoboys (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  veiculo TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  aprovado_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pedidos (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT UNIQUE,
  acesso_token TEXT UNIQUE,
  cliente_id BIGINT NOT NULL REFERENCES clientes(id),
  status TEXT NOT NULL DEFAULT 'recebido',
  forma_pagamento TEXT NOT NULL,
  troco_para INTEGER,
  observacoes TEXT,
  subtotal INTEGER NOT NULL,
  taxa_entrega INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  motoboy_id BIGINT REFERENCES motoboys(id),
  valor_motoboy INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  aceito_em TIMESTAMPTZ,
  entregue_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id BIGINT NOT NULL REFERENCES produtos(id),
  nome_produto TEXT NOT NULL,
  preco_unitario INTEGER NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS pedido_item_opcionais (
  id BIGSERIAL PRIMARY KEY,
  pedido_item_id BIGINT NOT NULL REFERENCES pedido_itens(id) ON DELETE CASCADE,
  nome_opcional TEXT NOT NULL,
  preco_adicional INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id BIGSERIAL PRIMARY KEY,
  pedido_id BIGINT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  metodo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS motoboy_push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  motoboy_id BIGINT NOT NULL REFERENCES motoboys(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  chaves TEXT NOT NULL,
  ativo INTEGER NOT NULL DEFAULT 1,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

-- Base offline de ruas e logradouros de Cascavel - PR
CREATE TABLE IF NOT EXISTS ruas_cascavel (
  id BIGINT PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  bairro TEXT NOT NULL,
  cidade TEXT DEFAULT 'Cascavel',
  uf TEXT DEFAULT 'PR',
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  busca_termo TEXT NOT NULL,
  exibicao TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pedidos_disponiveis ON pedidos(status, motoboy_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos(categoria_id, ativo);
CREATE INDEX IF NOT EXISTS idx_motoboy_status ON motoboys(status);
CREATE INDEX IF NOT EXISTS idx_ruas_cascavel_busca ON ruas_cascavel(busca_termo);
CREATE INDEX IF NOT EXISTS idx_pedidos_acesso_token ON pedidos(acesso_token);
