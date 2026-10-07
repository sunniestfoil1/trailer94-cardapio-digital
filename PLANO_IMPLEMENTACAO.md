# Plano de implementação — Sistema de pedidos Bulls Burger

Referência visual e funcional: `menu.brendi.com.br/labrasaburgercascavel` (La Brasa
Burger Cascavel, na plataforma Brendi). O bundle capturado está em
`bulls_site/menu.brendi.com.br-full-capture.zip` — é build minificado,

Dados reais do Bulls Burger já levantados (Instagram @bull.s.burguer, ver
research desta conversa): WhatsApp `+55 45 98818-4380`, cardápio (Bulls Xedar,
Bulls Egg, Bacon, Calabresa, cachorro-quente com molho caseiro), preços reais
(2 Bull's Egg R$ 45,90 impresso no post; combo de quarta R$ 100), horário
19h–3h/4h/5h conforme o dia. Cidade exata ainda não confirmada — pendente de
resposta sua. Isso não bloqueia este plano nem o schema, só os dados de seed.

## 1. Stack e por quê

| Camada | Escolha | Motivo |
|---|---|---|
| Frontend | React + Vite, JS puro (sem TypeScript) | Regra fixa do seu CLAUDE.md: React (não Preact), sem TS a menos que eu peça |
| Roteamento | React Router | 3 áreas na mesma SPA: loja, admin, entregador |
| Backend | Node.js + Express | Simples, mesma linguagem do front, fácil de rodar local |
| Banco | SQLite via `better-sqlite3` | Síncrono, transacional, sem servidor externo — pedido do enunciado |
| Tempo real | WebSocket (`ws`) | Mais leve que Socket.IO para o volume de uma hamburgueria; sem dependência de infra extra |
| Autenticação dono | e-mail + senha, `bcrypt` + sessão via cookie httpOnly | Simples, sem exigir biblioteca externa de auth |
| Autenticação motoboy | usuário/senha OU PIN (4 últimos dígitos do telefone cadastrado) | Conforme pedido |
| Notificação motoboy | Web Push (VAPID) + Service Worker | "Push web sem app", é exatamente a API pra isso |
| Rota até o cliente | Deep link `https://www.google.com/maps/dir/?api=1&destination=...` | Único uso de Google Maps — não depende de Perfil da Empresa |

uso Tailwind/shadcn ## 2. Estrutura de pastas

```
bulls_site/
  server/                  # Express + SQLite + WebSocket + push
    db/
      schema.sql
      seed.sql
      db.js                # abre o better-sqlite3, roda migrations
    routes/
      cardapio.js           # GET público: categorias, produtos, opcionais
      pedidos.js            # POST pedido, GET status
      auth-dono.js
      auth-motoboy.js
      admin/
        produtos.js
        categorias.js
        pedidos.js
        motoboys.js
        configuracoes.js
      motoboy/
        disponiveis.js
        aceitar.js           # UPDATE atômico
        minhas-entregas.js
        metricas.js
        push.js               # subscribe/unsubscribe
    realtime/
      hub.js                 # canais: cozinha, admin, motoboys
    auth/
      sessao.js
      senha.js               # hash/verifica bcrypt
    push/
      vapid.js
    server.js
  web/                      # React + Vite
    src/
      loja/                  # cardápio público + carrinho + checkout
      admin/                 # painel do dono
      entregador/            # área do motoboy
      compartilhado/         # componentes comuns (botões, ícones de marca)
    vite.config.js           # server.port = Number(process.env.PORT) || 0
  imagens/
    origem/                  # fotos reais do Bulls (já iniciada com o scrape do Instagram)
    demo/                    # imagens de banco/web para produtos-exemplo, trocadas depois
    gerado/                  # AVIF/WebP construídos no build, fora do git
  PLANO_IMPLEMENTACAO.md
```

## 3. Banco de dados (SQLite)

```sql
-- categorias do cardápio
CREATE TABLE categorias (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativa INTEGER NOT NULL DEFAULT 1
);

-- produtos
CREATE TABLE produtos (
  id INTEGER PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  nome TEXT NOT NULL,
  descricao TEXT,
  ingredientes TEXT,
  preco_base INTEGER NOT NULL,        -- em centavos, nunca float
  serve_pessoas INTEGER DEFAULT 1,
  destaque INTEGER NOT NULL DEFAULT 0, -- aparece em "Mais pedidos"
  ativo INTEGER NOT NULL DEFAULT 1,
  ordem INTEGER NOT NULL DEFAULT 0
);

-- imagens por produto (permite trocar/reaproveitar sem mexer em código)
CREATE TABLE produto_imagens (
  id INTEGER PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  arquivo TEXT NOT NULL,       -- caminho relativo em imagens/origem ou imagens/demo
  ordem INTEGER NOT NULL DEFAULT 0,
  principal INTEGER NOT NULL DEFAULT 0
);

-- grupos de opcional (ex: "Qual o ponto da carne?", "Adicionais")
CREATE TABLE opcional_grupos (
  id INTEGER PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  titulo TEXT NOT NULL,
  obrigatorio INTEGER NOT NULL DEFAULT 0,
  min_escolhas INTEGER NOT NULL DEFAULT 0,
  max_escolhas INTEGER NOT NULL DEFAULT 1,  -- 1 = escolha única, >1 = múltipla
  ordem INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE opcional_itens (
  id INTEGER PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES opcional_grupos(id),
  nome TEXT NOT NULL,
  preco_adicional INTEGER NOT NULL DEFAULT 0, -- centavos
  ordem INTEGER NOT NULL DEFAULT 0
);

-- clientes: sem login, só o necessário para entregar o pedido
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  endereco TEXT NOT NULL,
  complemento TEXT,
  referencia TEXT,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- pedidos
CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  status TEXT NOT NULL DEFAULT 'recebido',
    -- recebido -> em_preparo -> pronto -> em_entrega -> entregue | cancelado
  forma_pagamento TEXT NOT NULL,      -- 'pix' | 'debito' | 'credito'
  observacoes TEXT,
  subtotal INTEGER NOT NULL,          -- centavos
  taxa_entrega INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  motoboy_id INTEGER REFERENCES motoboys(id),   -- NULL = disponível
  valor_motoboy INTEGER,                        -- quanto o motoboy recebe por essa corrida
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  aceito_em TEXT,
  entregue_em TEXT
);

CREATE TABLE pedido_itens (
  id INTEGER PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  nome_produto TEXT NOT NULL,   -- snapshot: preço/nome não mudam se o produto for editado depois
  preco_unitario INTEGER NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE pedido_item_opcionais (
  id INTEGER PRIMARY KEY,
  pedido_item_id INTEGER NOT NULL REFERENCES pedido_itens(id),
  nome_opcional TEXT NOT NULL,  -- snapshot
  preco_adicional INTEGER NOT NULL DEFAULT 0
);

-- pagamentos (registro do que foi escolhido; sem gateway integrado nesta fase — ver seção 8)
CREATE TABLE pagamentos (
  id INTEGER PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  metodo TEXT NOT NULL,        -- 'pix' | 'debito' | 'credito'
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | confirmado
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- dono/admin
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  criado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

-- motoboys
CREATE TABLE motoboys (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL,
  usuario TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente | ativo | recusado | desativado
  criado_em TEXT NOT NULL DEFAULT (datetime('now')),
  aprovado_em TEXT
);

CREATE TABLE motoboy_push_subscriptions (
  id INTEGER PRIMARY KEY,
  motoboy_id INTEGER NOT NULL REFERENCES motoboys(id),
  endpoint TEXT NOT NULL,
  chaves TEXT NOT NULL,       -- JSON (p256dh, auth)
  ativo INTEGER NOT NULL DEFAULT 1
);

-- configurações gerais (chave/valor — cobre horário, taxa, pedido mínimo etc.)
CREATE TABLE configuracoes (
  chave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);
-- chaves usadas: horario_funcionamento (JSON por dia da semana),
-- taxa_entrega_padrao, pedido_minimo, nome_loja, whatsapp, endereco_referencia
```

Índice crítico para a corrida do motoboy:
```sql
CREATE INDEX idx_pedidos_disponiveis ON pedidos(status, motoboy_id);
```

## 4. Rotas da API

**Públicas (loja):**
- `GET /api/cardapio` — categorias + produtos + imagens + grupos de opcional
- `GET /api/loja/status` — aberto/fechado calculado no servidor a partir de `configuracoes.horario_funcionamento` e do horário atual do servidor
- `POST /api/pedidos` — cria cliente (ou reaproveita por telefone) + pedido + itens; recusa se `status` for fechado
- `GET /api/pedidos/:id` — acompanhamento do pedido pelo próprio cliente (tela de status)

**Autenticação:**
- `POST /api/auth/dono/login` → seta cookie de sessão
- `POST /api/auth/motoboy/login` (usuário+senha OU usuário+PIN)
- `POST /api/auth/motoboy/cadastro` → cria com `status='pendente'`
- `POST /api/auth/logout`

**Admin (autenticado como dono):**
- CRUD `/api/admin/categorias`, `/api/admin/produtos`, `/api/admin/produtos/:id/imagens`
- `GET /api/admin/pedidos` (com filtro por status/data)
- `PATCH /api/admin/pedidos/:id` (mudar status: em_preparo, pronto, cancelado)
- CRUD `/api/admin/motoboys`, `PATCH /api/admin/motoboys/:id/status` (aprovar/recusar/ativar/desativar)
- `GET /api/admin/motoboys/:id/metricas`
- `GET/PUT /api/admin/configuracoes`

**Motoboy (autenticado como motoboy ativo):**
- `GET /api/motoboy/disponiveis` — pedidos com `status='pronto' AND motoboy_id IS NULL`
- `POST /api/motoboy/pedidos/:id/aceitar` — ver seção 6 (transação atômica)
- `GET /api/motoboy/minhas-entregas`
- `PATCH /api/motoboy/entregas/:id/entregue`
- `POST /api/motoboy/push/subscribe` / `DELETE /api/motoboy/push/subscribe`

## 5. Tempo real (WebSocket)

Três canais lógicos no mesmo servidor `ws`, roteados por tipo de cliente na
conexão (token de sessão manda o papel — dono, motoboy ou anônimo/cliente
acompanhando um pedido):

- `cozinha` (tela de produção + painel admin): recebe `pedido:novo`,
  `pedido:atualizado`
- `motoboys`: recebe `entrega:disponivel` (quando um pedido vira `pronto`) e
  `entrega:removida` (quando outro motoboy aceita — tira da lista de quem não
  pegou)
- `cliente:{pedido_id}`: recebe `pedido:status` para a tela de acompanhamento

Toda mudança de status de pedido passa por uma função central
`mudarStatusPedido(id, novoStatus)` no backend que já dispara o broadcast
certo — evita esquecer de notificar um canal.

## 6. Corrida do motoboy — proteção contra race condition

`better-sqlite3` é síncrono e a conexão de escrita é única por processo, o que
já elimina a maior parte do risco, mas o UPDATE precisa ser condicional para
não sobrescrever silenciosamente:

```js
const resultado = db.prepare(`
  UPDATE pedidos
  SET motoboy_id = ?, status = 'em_entrega', aceito_em = datetime('now')
  WHERE id = ? AND motoboy_id IS NULL AND status = 'pronto'
`).run(motoboyId, pedidoId)

if (resultado.changes === 0) {
  // outro motoboy já pegou, ou pedido não está mais disponível
  return res.status(409).json({ erro: 'pedido_indisponivel' })
}
// só quem realmente mudou a linha manda o broadcast de sucesso
broadcast('motoboys', { tipo: 'entrega:removida', pedidoId })
```

O `WHERE` com as duas condições dentro do mesmo `UPDATE` é o que garante
atomicidade — não existe janela entre "ler se está livre" e "marcar como meu"
porque as duas coisas são a mesma instrução SQL.

## 7. Autenticação do motoboy por PIN

PIN = 4 últimos dígitos do telefone atualmente cadastrado no registro do
motoboy (não um PIN separado guardado à parte — isso significa que, se o
telefone for editado pelo dono, o PIN muda junto, sempre lido em tempo real do
campo `telefone`). Login por PIN pede usuário + PIN; o servidor recalcula os 4
últimos dígitos do `telefone` atual e compara. É pensado como atalho rápido
pro motoboy no celular, não substitui a senha (que continua existindo pro
cadastro inicial).

## 8. Pagamento — o que este plano cobre e o que fica de fora

O pedido descreve a **seleção visual** de PIX ou cartão (débito/crédito),
única escolha, destacada, com os ícones que já estão em
`1AUXILIO/svg e estrutura/pagamentos` (pix.webp, visa.webp, mastercard,
elo...) nas cores originais. Isso está no escopo e entra nesta fase.

Não há pedido de integração com gateway de pagamento (Mercado Pago, Stripe,
PagSeguro etc.) nem credencial nenhuma foi mencionada. Por isso o pagamento
fica registrado como **intenção** (`pagamentos.status = 'pendente'`) e a
cobrança real acontece na entrega (maquininha do motoboy pra cartão, chave PIX
mostrada/copiada pro cliente) — é o mesmo modelo que negócios de delivery
pequenos usam antes de contratar um gateway. Se você quiser cobrança
automática de verdade depois, isso é uma fase separada (precisa de conta em
algum gateway, o que não faço sem você decidir e fornecer as credenciais).

## 9. Horário de funcionamento

`configuracoes.horario_funcionamento` guarda um JSON por dia da semana
(`{"seg": {"abre":"19:00","fecha":"04:00"}, ...}`), editável pelo dono no
admin. `GET /api/loja/status` calcula aberto/fechado no servidor (fonte da
verdade, evita cliente com relógio errado) considerando horários que cruzam a
meia-noite (19h–4h do dia seguinte). O front consulta essa rota ao carregar e
via WebSocket quando o dono muda a configuração manualmente (ex: fechar mais
cedo num dia). Cardápio continua navegável fechado; checkout é bloqueado com
mensagem, igual ao padrão visto no site de referência.

## 10. Fluxo do cliente (loja pública)

1. Abre o cardápio (`/`) — vê categorias, "Mais pedidos", produtos
2. Toca num produto → tela de detalhe com grupos de opcional (obrigatórios
   bloqueiam avançar até preencher) → adiciona ao carrinho
3. Carrinho fica persistente (Context + `localStorage`, sobrevive a
   voltar/adicionar mais itens) com contador e total sempre visíveis
4. Finalizar pedido → nome, telefone, endereço, observações → escolhe
   PIX/débito/crédito (single-select destacado) → resumo completo → confirma
5. Tela de acompanhamento (`/pedido/:id`) muda em tempo real conforme a cozinha
   e o motoboy atualizam o status

## 11. Painel do dono

Login (`/admin`) → dashboard com pedidos do dia em tempo real (tela de
produção: recebido → em preparo → pronto), CRUD de produtos/categorias/imagens
(reaproveitar imagem já enviada ou subir nova), configurações (horário, taxa de
entrega, pedido mínimo), gestão de motoboys (aprovar/recusar/ativar/desativar)
e métricas por motoboy (entregas no dia, total de entregas, valor recebido).

## 12. Área do motoboy

Ícone discreto no rodapé/header da loja pública (ex: um ícone de moto) leva a
`/entregador`, área separada com login próprio. Cadastro fica `pendente` até o
dono aprovar; aprovação libera acesso em tempo real (o motoboy logado recebe o
evento e a tela destrava sem precisar deslogar/logar de novo). Uma vez ativo:
lista de entregas disponíveis (valor do pedido, taxa de entrega, valor que ele
recebe) atualizada via WebSocket, aceitar (com a proteção da seção 6), botão
"abrir rota" que monta a URL do Google Maps com o endereço do pedido, marcar
como entregue, histórico e métricas próprias. Toggle de notificações push
(liga/desliga conforme ele quer trabalhar ou não).

## 13. Ordem de construção sugerida

1. Backend base: schema SQLite + seed com os dados reais do Bulls Burger já
   levantados + rota pública de cardápio + cálculo de aberto/fechado
2. Loja pública: cardápio, produto, carrinho, checkout (sem pagamento real,
   só seleção) — aqui entram as imagens de banco/web para produtos-demo
3. WebSocket + tela de produção (cozinha) + admin de pedidos
4. Admin completo: produtos/categorias/imagens/configurações
5. Motoboy: cadastro, aprovação, login (senha e PIN), lista de disponíveis,
   aceitar com proteção de corrida, rota no Maps, entregas, métricas
6. Push notifications (Web Push + Service Worker)
7. Polimento: responsividade, animações (reaproveitando os componentes de
   `1AUXILIO/svg e estrutura/componentes prontos`), auditoria de peso

## 14. Decisões em aberto (preciso confirmar antes de codar)

- **Cidade exata do Bulls Burger** — ainda pendente da pergunta anterior;
  não bloqueia o schema, só o seed de endereço/config.
- **Gateway de pagamento**: confirmando que, por ora, é só seleção visual +
  cobrança manual na entrega (seção 8), e não integração automática.
- **Taxa de entrega e valor do motoboy**: fixos por pedido ou calculados por
  distância/bairro? Assumindo valor fixo configurável no admin até você dizer
  o contrário — é a opção mais simples e não exige API de geolocalização paga.
