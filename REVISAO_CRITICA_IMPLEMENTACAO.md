# Revisão crítica — implementação Bulls Burger vs. plano

Auditoria linha a linha do código que a outra IA aplicou (`server/` e `web/`),
comparado com `PLANO_IMPLEMENTACAO.md`, mais teste do link publicado
(`bulls-burguer.vercel.app`). Não é opinião — cada item abaixo tem o arquivo e
a linha onde eu vi o problema.

## Veredito rápido

**O site publicado não existe.** `https://bulls-burguer.vercel.app` retorna
`404: NOT_FOUND`. Conferi na sua conta Vercel (mesma conta de `a7chaves`,
`mat-tech` etc.) e não há projeto nenhum chamado `bulls-burguer` — ou seja,
isso nunca foi implantado de fato, apesar do README dizer "sistema completo,
testado, pronto". O código local é bem mais avançado do que o que está no ar:
o trabalho existe, só não foi publicado.

E mais importante: **mesmo publicando como está, metade do sistema não vai
funcionar**, porque a arquitetura foi construída para um servidor Node
permanente (sessão em memória, arquivo SQLite local, WebSocket nativo) e a
Vercel roda funções serverless efêmeras — as três coisas centrais do sistema
não sobrevivem nesse modelo. Detalho tudo na seção 1.

---

## 1. Por que "só sobe na Vercel" não resolve (bloqueador)

Três decisões de arquitetura, todas corretas para um servidor tradicional,
quebram em serverless:

| Peça | Onde está | Por que quebra na Vercel |
|---|---|---|
| Sessão de login (dono e motoboy) | `server/auth/sessao.js:5` — `const sessoes = new Map()` | Cada invocação da função pode cair numa instância diferente, sem essa `Map` na memória. Login vira uma loteria: às vezes funciona, às vezes a sessão "não existe" no request seguinte. |
| Banco SQLite | `server/db/db.js:9` — `path.resolve(__dirname, 'bulls.db')`, aberto em modo escrita | O sistema de arquivos da função é somente-leitura (exceto `/tmp`, que é descartado a cada cold start). O primeiro `INSERT` de pedido real provavelmente falha ou, na melhor hipótese, grava num arquivo que desaparece no próximo deploy. |
| WebSocket (`ws`) | `server/realtime/hub.js` | Funções serverless não mantêm conexão aberta. O KDS da cozinha, a lista de entregas do motoboy e o acompanhamento do cliente — tudo que é "tempo real" no plano — simplesmente não dispara. |

Isso não é um ajuste de configuração (`vercel.json`) — é reescrever a base.
Dois caminhos possíveis, cada um com seu preço:

- **A. Trocar as três peças por versões hospedadas**: Postgres (Supabase, que
  já está disponível pra mim nesta sessão) no lugar do SQLite, Supabase
  Realtime no lugar do `ws`, e sessão via cookie assinado sem estado (JWT) em
  vez da `Map`. Continua tudo na Vercel. É a opção que eu recomendo, mas é
  trabalho de reescrita real, não é rápido.
- **B. Manter o Node/Express/SQLite exatamente como está**, e hospedar o
  `server/` num lugar que roda processo persistente (Railway, Render, Fly.io
  — todos têm camada grátis pra esse volume). A Vercel fica só com o
  `web/dist` (frontend), apontando pra API nesse outro host. Migração de
  hospedagem, não de código.

Não escolhi nenhuma sozinho porque muda custo e prazo. Preciso que você
decida antes de eu mexer em mais alguma coisa de infra.

## 2. Dado inventado que não devia existir (grave)

**Cascavel foi assumido como a cidade do Bulls Burger sem confirmação.** Isso
está errado por construção: na nossa conversa, eu pesquisei ativamente (Maps,
bases locais, WhatsApp do Instagram) e não consegui confirmar a cidade — te
perguntei explicitamente e a pergunta ficou sem resposta antes de você mandar
a especificação do sistema de pedidos. A outra IA seguiu como se Cascavel
fosse fato dado, e construiu em cima disso:

- `server/db/seed.sql:98` → `('cidade', 'Cascavel')`
- `server/db/schema.sql:141-152` → tabela inteira `ruas_cascavel` só pra essa
  cidade
- `scripts/baixar_ruas_cascavel.js` e `scripts/gerar_base_cascavel.js` → um
  scraper e um gerador de base só existem pra alimentar essa tabela
- `web/src/loja/CheckoutModal.jsx:221-223` → selo fixo "Cascavel - PR" na tela
  de checkout, visível pro cliente
- `web/src/routes/motoboy/index.js:30` → toda rota do Google Maps pro motoboy
  concatena `, Cascavel - PR` no fim do endereço

Se o Bulls Burger não for de Cascavel, o autocomplete de rua nunca vai
encontrar nada (a base é só de lá), o selo na tela do cliente vai estar
errado, e a rota do motoboy no Maps sai com a cidade errada grudada no
endereço — o app manda o motoboy pra um lugar inexistente. É bastante
trabalho de engenharia (uma base de dados inteira) construído sobre uma
suposição que eu já tinha sinalizado como não confirmada. **Preciso que você
confirme a cidade antes de eu mexer em mais nada** — é a mesma pergunta que
ficou em aberto lá atrás.

## 3. Foto promocional usada como foto de produto (visível pro cliente)

`server/db/seed.sql:32-46` amarra as imagens que eu raspei do Instagram aos
produtos. O problema é que várias das imagens usadas como foto principal são
**artes promocionais com texto e preço desenhados em cima**, não fotos reais
do produto:

- Produto 1 ("Combo 2x Bull's Egg") usa `baixada-11.jpg` — é o flyer com bull
  neon e "**2 BULL'S EGG POR R$ 45,50**" escrito na imagem. O preço real
  cadastrado no banco pra esse produto é **R$ 45,90**. Ou seja, o cliente vê
  duas informações de preço diferentes na mesma tela — uma na foto, outra no
  valor cobrado.
- Produto 3 ("Super Combo da Quarta") usa `baixada-3.jpg` — é a foto dos dois
  reboques à noite com o texto "Projeto saindo do papel..." sobreposto.
- Produto 7 ("Hot Dog Bulls Especial") usa `baixada-12.jpg` — é o post de
  domingo com o texto "Domingão chegou daquele jeito!" sobreposto.

Isso é exatamente o problema que qualquer revisão de UI pega: arte de
Instagram com CTA e preço embutido, servindo como se fosse fotografia de
produto. Fica visivelmente amador e, no caso do produto 1, tecnicamente
enganoso (dois preços diferentes na mesma tela).

**Adicional:** os produtos 9 e 10 (Batata Rústica, Batata Frita) apontam pra
arquivos que não existem —
`/imagens/origem/instagram/Batata-com-Cheddar-e-Bacon-1024x736.jpg` e
`porcao-de-batata-frita-grande-300g-normal.jpg` nunca foram baixados nem
estão em `web/public/imagens/origem/instagram/` (conferi, só existe
`baixada-1.jpg` até `baixada-12.jpg`). Essas duas fotos quebram no navegador.

**E as 5 bebidas** (Coca lata, Coca zero, Coca 2L, Guaraná 2L, Heineken) usam
todas a mesma imagem genérica sem nome
(`/images/34d4b0edc0b5a9fd45d5dc69f3d6d9dd`) — o cliente vê a mesma latinha
pra tudo, inclusive pra cerveja. Isso contradiz o que você pediu
especificamente na sua especificação (imagens de banco compatíveis com cada
produto: refrigerante, água, Fanta, uva etc.).

## 4. Segurança — o que funciona de verdade e o que só parece

**Funciona bem, de verdade** (não é elogio fácil, testei a lógica):
- A trava de concorrência do motoboy (`server/routes/motoboy/index.js:43-47`)
  está correta: `UPDATE ... WHERE motoboy_id IS NULL AND status = 'pronto'`
  num único comando SQL. Isso é exatamente o que o plano pedia, e resolve a
  corrida de verdade — não é só aparência.
- O preço de cada pedido é recalculado inteiramente a partir do banco em
  `server/routes/pedidos.js:100-175`; o valor que o navegador manda é
  ignorado. Isso é a defesa certa contra um cliente adulterando preço no
  DevTools.
- Senhas com bcrypt, cookies `httpOnly`, rate limit por rota.

**Parece corrigido mas não está:**
- `server/routes/pedidos.js:316-358` (`GET /api/pedidos/:id`) mascara o
  telefone do cliente (`mascararTelefone`) e o commit até menciona "anti-IDOR"
  — mas **nome completo e endereço completo continuam expostos**, e o pedido
  é buscável por ID sequencial (`/api/pedidos/1`, `/api/pedidos/2`...) sem
  nenhuma autenticação. Qualquer pessoa consegue varrer IDs e coletar
  nome + endereço de casa de todo cliente que já pediu. A proteção foi
  aplicada só num campo; o vazamento real (endereço residencial) continua
  aberto.
- CORS em `server/server.js:41-47` aceita **qualquer origem** e ainda manda
  `credentials: true` — isso permite que um site malicioso qualquer, aberto
  no navegador de um admin logado, dispare requisição autenticada pro painel
  usando o cookie dele. `credentials: true` com origem aberta anula a
  proteção que o cookie `httpOnly` deveria dar.
- Cookie de sessão sai com `secure: false` fixo, com comentário `// em dev
  local` (`server/routes/auth-dono.js:32` e `auth-motoboy.js:76`) — ou seja,
  o próprio código admite que é config de desenvolvimento, e foi assim que
  ficou. Em produção isso deveria virar `secure: true` condicionado ao
  ambiente.
- O token de sessão completo é devolvido no corpo da resposta JSON do login
  (`token` em `auth-dono.js:38` e `auth-motoboy.js:82`), além do cookie
  `httpOnly`. Isso existe porque o WebSocket precisa do token como query
  param (`?token=...` em `hub.js:21`) — mas o efeito colateral é que o
  front-end precisa guardar esse token em algum lugar acessível a JavaScript,
  o que anula parte do motivo de o cookie ser `httpOnly` (proteção contra
  XSS). Dá pra resolver com um "ticket" de curta duração só pro WebSocket, em
  vez de reusar o token da sessão inteira.
- `server/db/bulls.db` **está commitado no Git** (`git ls-files` confirma).
  Isso inclui o hash de senha do admin de seed. Banco de dados binário não
  deveria ir pro controle de versão — quando alguém rodar de novo localmente,
  o `.db` de outra pessoa entra em conflito binário, e qualquer dado de
  pedido real gerado em teste fica no histórico do repositório pra sempre
  (mesmo que apague depois, `git log` guarda).
- A senha documentada bate errado entre dois arquivos: `seed.sql:90` diz que
  a senha do motoboy de teste é `moto123`, mas o hash usado é **idêntico** ao
  do admin (linha 88), e o `README.md:48` diz que o PIN "ou senha `admin123`"
  também abre a conta do motoboy. Ou seja, `moto123` documentado não
  corresponde ao hash real gravado — quem for testar vai apanhar com uma
  senha que não funciona.

## 5. O que o plano previa e não foi implementado

- **Notificação push (seção 12 do plano, e pedido explícito seu)**: não existe
  `web-push` no `package.json`, não existe pasta `server/push/`, não existe
  service worker em `web/public`. O toggle de "motoboy liga/desliga
  notificação fora do expediente" também não existe na tela do entregador.
  Isso é 100% do requisito de push que ficou de fora, não uma versão
  simplificada — está ausente.
- **Upload/edição de imagem pelo dono** (você pediu explicitamente: "trocar
  imagens, reutilizar imagens antigas... sem precisar alterar código"): não
  existe nenhuma rota em `server/routes/admin/index.js` que escreva em
  `produto_imagens`. O CRUD de produto edita nome/preço/descrição, mas a
  imagem só muda editando `seed.sql` na mão — exatamente o que você pediu
  pra evitar.
- **CRUD de categorias no admin**: o plano previa; só existe leitura
  (categorias vêm prontas do cardápio), não há rota para criar, renomear ou
  reordenar categoria.
- **Cadastro de motoboy pelo dono**: hoje só existe autocadastro
  (`/api/auth/motoboy/cadastro`, o próprio motoboy se cadastra e fica
  pendente). Não há uma rota do dono cadastrando um motoboy diretamente.

## 6. Coisas que foram além do plano — nem todas ruins

- **Pagamento em dinheiro com troco** (`CheckoutModal.jsx:397-430`,
  `pedidos.js:196-209`): sua especificação pedia só PIX e cartão. Adicionar
  dinheiro com cálculo de troco é uma adição sensata pra um delivery de
  verdade, mas é uma decisão que nem eu nem você tomamos — vale confirmar se
  fica.
- **Autocomplete de endereço offline** (seção 2): útil como ideia, mal
  colocado porque partiu de uma cidade não confirmada (seção 2 acima).
- **Tela de apresentação executiva e contrato em PDF**: fora do escopo do
  sistema de pedidos, aparentemente gerados por outra automação (a skill de
  contrato). Não avaliei o conteúdo do contrato, mas ele cita a cidade — vale
  conferir se carrega a mesma suposição da seção 2.
- **Tailwind no front-end**: o plano dizia explicitamente que eu não uso
  Tailwind (é a convenção que sigo nos seus outros projetos, puxada da minha
  skill de criar site — CSS puro com tokens). A implementação inteira do
  `web/` foi feita em Tailwind. Funciona, mas quebra o padrão que os outros
  projetos seus seguem; se isso importa pra manutenção futura, é bom saber
  agora, antes de crescer mais.

## 7. Testes — o que os "17/17" realmente cobrem

Os testes em `server/tests/security_and_system_tests.js` são de quem escreveu
o código testando o que decidiu escrever — não houve auditoria externa até
agora. A simulação de concorrência do motoboy (10 disparos simultâneos, 1
vence) é um teste real e vale o que promete, conferi a lógica que ela testa.
Só que a suíte não cobre nenhum dos problemas estruturais desta revisão:
não testa CORS aberto, não testa o vazamento de nome/endereço por ID
sequencial, não testa o que acontece com o banco fora do disco local, não
testa upload de imagem (porque a rota não existe). "17/17 passou" é verdade e
é pouco ao mesmo tempo — mede o que o próprio autor pensou em medir.

## 8. Ordem sugerida de correção

1. **Decidir arquitetura de hospedagem** (seção 1) — trava tudo que vem
   depois, incluindo o "sobe o site".
2. **Confirmar a cidade real** (seção 2) — trava o seed de endereço, o
   autocomplete e a rota do motoboy.
3. Trocar as fotos com texto embutido por fotos reais ou tirar o preço da
   arte (seção 3); corrigir os dois caminhos de imagem quebrados; usar uma
   imagem por bebida.
4. Fechar o vazamento de nome/endereço em `GET /api/pedidos/:id` — exigir um
   token curto gerado na criação do pedido, não o ID cru.
5. Travar CORS pra origem conhecida; corrigir `secure` do cookie por
   ambiente; parar de devolver o token de sessão completo no JSON de login.
6. Implementar upload/reaproveitamento de imagem no admin — é o requisito que
   mais te afeta no dia a dia depois de entregar.
7. Implementar push notification (seção 12 original) ou negociar tirar do
   escopo desta fase, mas como decisão explícita, não como esquecimento.
8. Tirar `bulls.db` do Git, adicionar ao `.gitignore`, e trocar a senha de
   seed antes de qualquer dado real entrar no banco.

---

Isso cobre "crítico com evidência" — cada item tem arquivo e linha pra você
ou pra outra IA conferir sem precisar confiar na minha palavra. O que eu
preciso de volta pra continuar: a decisão da seção 1 (A ou B) e a cidade da
seção 2.
