# 🚀 GUIA DE IMPLANTAÇÃO EXPRESS (30 MINUTOS) — NOVO PROJETO DELIVERY

> **ATENÇÃO, AGENTE ANTIGRAVITY (NOVA SESSÃO):**  
> Você acabou de ser iniciado em um novo workspace contendo a base completa de um sistema profissional de delivery, KDS de cozinha, portal de entregadores motoboy, mapas em tempo real e impressão térmica.  
> O seu objetivo é entregar este projeto configurado para a nova empresa do cliente em **menos de 30 minutos**. Siga à risca os passos abaixo!

---

## 📋 PASSO 1: Cumprimente o Usuário e Solicite os Dados da Nova Empresa

Na sua primeira resposta ao usuário, **NÃO faça perguntas complicadas nem perda tempo**. Apenas diga:

> *"Olá! Já estou com a estrutura completa e pronta do sistema de delivery. Para personalizarmos e colocarmos no ar nos próximos 20 a 30 minutos, por favor me envie:*  
> *1. **Nome da Nova Empresa / Hamburgueria** e Cidade/Estado.*  
> *2. **Prints ou Fotos do Cardápio** (pode colar os prints aqui ou colocar fotos dos lanches e logo na pasta do projeto).*  
> *3. **Número de WhatsApp** para pedidos e chave PIX.*  
> *Assim que você me mandar, eu analiso cada foto, extraio os lanches com preços e coloco o site no ar!"*

---

## 📸 PASSO 2: Como Analisar as Fotos e Prints Enviados

Quando o usuário enviar os prints ou colocar as imagens na pasta:
1. Use `view_file` para inspecionar cada imagem.
2. Identifique os itens:
   - **Nome do Burger/Porção/Bebida**
   - **Descrição e Ingredientes**
   - **Preço** (converta para centavos, ex: R$ 38,90 = `3890`)
   - **Opcionais e Adicionais** (ex: Ponto da Carne, Bacon Extra)
3. Atualize o arquivo central:
   👉 [`web/src/empresa.config.js`](web/src/empresa.config.js)
4. Mova ou salve as imagens renomeadas de forma limpa em:
   👉 `web/public/imagens/produtos/`

---

## 🔑 PASSO 3: Geração Automática de E-mails e Credenciais

Com base no nome da nova empresa informado pelo usuário:
1. Gere o slug da empresa (apenas letras minúsculas sem acentos):
   - Exemplo: `"Texas Smash Burger"` ➔ Slug: `texassmash`
2. Configure as credenciais no arquivo [`web/src/empresa.config.js`](web/src/empresa.config.js):
   - **E-mail do Admin**: `admin@texassmash.com.br`
   - **Senha do Admin**: `texassmash2026`
   - **Usuário do Motoboy**: `carlos@texassmash.com.br`
   - **Senha do Motoboy**: `motoboy2026`
   - **PIN do Motoboy**: `4321`
3. As telas de login (`/admin` e `/entregador`) **já possuem botão de preenchimento rápido** sincronizado com essas variáveis, facilitando o teste imediato do cliente!

---

## 🗄️ PASSO 4: Banco de Dados — Execução em 1 Minuto

O backend já está preparado para funcionar tanto em **banco local SQLite nativo** (para testes imediatos) quanto em **PostgreSQL / Supabase** (para produção na nuvem):

### Opção A — Banco Local SQLite (Sem precisar criar nada na nuvem agora):
Execute no terminal dentro da pasta `server`:
```bash
node scripts/popular_nova_empresa.js --nome "Nome da Empresa" --cidade "Sua Cidade"
```
Isso cria instantaneamente o banco `server/db/local_delivery.sqlite` com as categorias, lanches e os acessos de administrador e entregador prontos!

### Opção B — Produção com Supabase / PostgreSQL:
1. Crie um projeto gratuito no [Supabase](https://supabase.com).
2. Abra o **SQL Editor** do Supabase, cole e execute o conteúdo de:
   👉 [`server/db/schema.sql`](server/db/schema.sql)
3. No arquivo `server/.env`, adicione a string de conexão:
   ```env
   DATABASE_URL=postgresql://postgres:[SUA_SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   SUPABASE_URL=https://[SEU_PROJETO].supabase.co
   SUPABASE_ANON_KEY=[SUA_CHAVE_ANON]
   ```
4. No arquivo `web/.env`, adicione:
   ```env
   VITE_SUPABASE_URL=https://[SEU_PROJETO].supabase.co
   VITE_SUPABASE_ANON_KEY=[SUA_CHAVE_ANON]
   ```
5. Rode o script de povoamento:
   ```bash
   node server/scripts/popular_nova_empresa.js
   ```

---

## 🚀 PASSO 5: Subir no GitHub e Deploy no Vercel (Últimos 5 Minutos)

Quando os dados e imagens estiverem ajustados:

1. **Subir no GitHub**:
```powershell
git init
git add -A
git commit -m "feat: lancamento oficial delivery [Nome da Empresa]"
gh repo create [slug-empresa]-delivery --public --source=. --push
```

2. **Deploy no Vercel**:
```powershell
cd web
vercel --prod
```
*(Ou conecte o repositório criado no painel da Vercel apontando para o diretório `web`).*

---

## 📁 Estrutura Rápida de Pastas do Projeto

- **`web/`**: Frontend React + Vite + Tailwind CSS.
  - `web/src/empresa.config.js`: **Arquivo mestre de personalização** (nome, cores, telefone, whatsapp, horário).
  - `web/src/loja/`: Cardápio público do cliente, sacola, cupons e acompanhamento de pedido.
  - `web/src/admin/`: Painel KDS da Cozinha, métricas de faturamento, impressão térmica P&B e simulador de pedidos.
  - `web/src/entregador/`: Portal do Motoboy com cálculo de KM, rota preview e moto animada (OpenStreetMap).
- **`server/`**: API Node.js + Express + WebSocket / Supabase Realtime.
  - `server/db/schema.sql`: Schema completo de tabelas (categorias, produtos, pedidos, motoboys).
  - `server/scripts/popular_nova_empresa.js`: Script de seed automático.
  - `INICIAR_IMPRESSORA_AUTOMATICA.bat`: Script de 1 clique para impressão térmica contínua no caixa.

---
**Tudo pronto! Peça as fotos e o nome da empresa ao usuário e entregue o projeto voando!**
