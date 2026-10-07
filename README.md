# Bulls Burger — Sistema Integrado de Delivery & Gestão

Sistema completo e proprietário desenvolvido sob medida para o **Bulls Burger** (Cascavel - PR).
Combina loja pública de alta conversão, cozinha/KDS em tempo real via WebSocket e central do entregador com trava atômica contra race conditions e rotas no Google Maps.

---

## 🗺️ Tabela de Onde Mexer em Cada Coisa

| O que você quer alterar? | Onde fica o arquivo? | Como funciona? |
|---|---|---|
| **Horários, WhatsApp, Taxas e Pedido Mínimo** | Painel Admin (`/admin`) ou `server/db/seed.sql` | Configurações dinâmicas salvas na tabela `configuracoes` do SQLite |
| **Produtos, Preços e Promoções** | Painel Admin (`/admin`) ou `server/db/seed.sql` | Edição rápida in-place no painel com reflexo imediato no cardápio |
| **Grupos de Opcionais (Ponto da Carne, Adicionais)** | `server/db/schema.sql` e `server/db/seed.sql` | Tabelas `opcional_grupos` e `opcional_itens` com validação no backend |
| **Regras de Validação e Anti-Fraude** | `server/routes/pedidos.js` | Recálculo de preços obrigatório no servidor (preço do client é ignorado) |
| **Corrida do Motoboy & Concorrência** | `server/routes/motoboy/index.js` | `UPDATE ... WHERE motoboy_id IS NULL AND status = 'pronto'` |
| **Hub WebSocket em Tempo Real** | `server/realtime/hub.js` | Canais `cozinha`, `motoboys` e `cliente:{pedidoId}` |
| **Aparência e Componentes da Loja** | `web/src/loja/` | Header, Cardápio, Cards, BottomSheet de Produto e Checkout |
| **Design Tokens e Cores** | `web/src/index.css` e `web/tailwind.config.js` | Dourado Bulls (`#f2c54b`) e Grafite Escuro (`#0f172a`) |
| **Slide Apresentativo Executivo** | `apresentacao/index.html` | Apresentação interativa de slides navegável por teclado |
| **Contrato Formal em PDF** | `Contrato_Desenvolvimento_Bulls_Burger.pdf` | Gerado via ReportLab com base em `contrato_bulls_burger.json` |

---

## 🚀 Como Rodar Localmente

### 1. Iniciar o Servidor Backend (API & WebSocket)
```bash
cd server
npm install
node server.js
```
O servidor inicializa automaticamente o SQLite (`server/db/bulls.db`) e o WebSocket na porta **3005**:
- API REST: `http://localhost:3005/api`
- WebSocket: `ws://localhost:3005/ws`
- Apresentação: `http://localhost:3005/apresentacao`

### 2. Iniciar a Aplicação Web (Frontend React)
```bash
cd web
npm install
npm run dev
```
Disponível em `http://localhost:5173`:
- **Loja Pública**: `http://localhost:5173/`
- **Área do Entregador**: `http://localhost:5173/entregador`
  - *Usuário Teste:* `carlos.moto`
  - *PIN de Acesso Rápido:* `4321` (ou senha `admin123`)
- **Painel Administrativo do Dono**: `http://localhost:5173/admin`
  - *E-mail:* `admin@bullsburger.com.br`
  - *Senha:* `admin123`

---

## 🛡️ Bateria de Testes Automatizados de Segurança

Para rodar a suíte completa de segurança defensiva, concorrência e integridade:
```bash
cd server
node tests/security_and_system_tests.js
```

### Resultados Validados (17 / 17 Testes com Sucesso):
1. **Anti-Tamper de Preços**: Tentativas de injetar preços modificados pelo cliente são interceptadas e recalculadas.
2. **Opcionais Obrigatórios**: Bloqueio de pedidos que não informam o ponto da carne.
3. **Pedido Mínimo**: Bloqueio de pedidos com subtotal inferior a R$ 25,00.
4. **Isolamento RBAC**: Bloqueio de acesso não autorizado a rotas `/api/admin/*`.
5. **Motoboy Pendente**: Entregadores recém-cadastrados não conseguem acessar corridas até a aprovação.
6. **Autenticação PIN**: Validação dos 4 últimos dígitos do telefone como credencial rápida.
7. **Simulação de Concorrência Extrema (Race Condition)**: 10 motoboys disparando no mesmo milissegundo para aceitar a mesma corrida: exatamente **1 vence (200)** e os **9 recebem Conflito (409)**, preservando integridade 100%.
8. **Imunidade a SQL Injection**: Todas as queries são parametrizadas no SQLite via `better-sqlite3`.
9. **Horário Noturno**: Cálculo preciso de funcionamento em janelas que cruzam a meia-noite (19h às 04h/05h).

---

## 📄 Contrato de Fechamento de Site
O contrato formal de prestação de serviços foi gerado pelo template oficial com especificações do Bulls Burger em:
- Arquivo de Dados: `contrato_bulls_burger.json`
- PDF Final: `Contrato_Desenvolvimento_Bulls_Burger.pdf`
