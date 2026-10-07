# 50 Boas Práticas de Desenvolvimento — Estrutura de Produção Bulls Burger

Guia técnico de referência das 50 práticas essenciais de arquitetura, segurança, performance e engenharia de software implementadas no sistema **Bulls Burger**.

---

### 🛡️ I. Segurança da Informação & OWASP (1 a 10)

1. **Preços Calculados Estritamente no Servidor**: O cliente nunca envia nem determina o preço final ou subtotal. O backend recalcula cada item e opcional diretamente da base de dados SQLite, anulando qualquer tentativa de manipulação de parâmetros (Parameter Tampering).
2. **Consultas 100% Parametrizadas contra SQL Injection**: Uso de `better-sqlite3` com declarações preparadas (`db.prepare('... WHERE id = ?')`), garantindo imunidade total contra injeções SQL.
3. **Atomicidade Contra Race Condition (UPDATE Condicional)**: Proteção na aceitação de corridas por motoboys através de `UPDATE pedidos SET motoboy_id = ?, status = 'em_entrega' WHERE id = ? AND motoboy_id IS NULL AND status = 'pronto'`. Se o número de linhas alteradas for zero, retorna HTTP 409 Conflict.
4. **Armazenamento de Senhas com Hash Seguro (Bcrypt)**: Senhas nunca salvas em texto plano, utilizando salt rounds modernos de bcrypt.
5. **Autenticação RBAC por Papéis (Role-Based Access Control)**: Separação estrita de privilégios entre Cliente Anônimo, Entregador (Motoboy) e Administrador (Dono/Cozinha).
6. **Controle de Sessão com Cookies HttpOnly e SameSite**: Prevenção contra roubo de tokens via Cross-Site Scripting (XSS).
7. **Rate Limiting Defensivo**: Proteção contra ataques de força bruta no login (`/api/auth/`) e spam/DoS de pedidos (`/api/pedidos`).
8. **Sanitização e Validação Rígida de Entradas**: Verificação de tipos, formatos de telefone com DDD brasileiro e comprimentos mínimos de dados.
9. **Isolamento de Entregadores Pendentes**: Motoboys recém-cadastrados entram com `status = 'pendente'` e não conseguem ler dados de entregas nem aceitar corridas até aprovação formal no painel do dono.
10. **Segurança de Headers com Helmet**: Configuração de headers HTTP seguros para mitigação de clickjacking e MIME-sniffing.

---

### ⚡ II. Desempenho & Banco de Dados (11 a 20)

11. **Valores Monetários em Centavos Inteiros**: Preços armazenados como `INTEGER` (ex: 4590 para R$ 45,90), eliminando erros de arredondamento inerentes a tipos de ponto flutuante (`FLOAT`).
12. **Índices Estratégicos no SQLite**: Criação de `idx_pedidos_disponiveis ON pedidos(status, motoboy_id)` e `idx_produtos_categoria ON produtos(categoria_id, ativo)` para consultas instantâneas.
13. **Modo WAL (Write-Ahead Logging)**: Configuração de `PRAGMA journal_mode = WAL` no SQLite para permitir leituras concorrentes sem bloquear operações de escrita.
14. **Integridade Referencial com Foreign Keys**: `PRAGMA foreign_keys = ON` ativado para garantir consistência de cascata entre pedidos, itens e opcionais.
15. **Transações Atômicas de Escrita**: Uso de `db.transaction()` para inserção conjunta de cliente, pedido, itens, opcionais e intenção de pagamento.
16. **Bundle Leve com Code Splitting**: Vite configurado para empacotar o React em chunks otimizados (CSS < 36 kB, JS principal enxuto).
17. **Carregamento Otimizado de Imagens (Lazy Loading)**: Imagens dos produtos com `loading="lazy"` e tratamento de fallback para evitar quebras visuais.
18. **Fontes de Alta Performance**: Tipografia Montserrat servida com `font-display: swap` para eliminar bloqueios de renderização.
19. **Cache Local no Navegador (LocalStorage)**: Carrinho de compras persistente que sobrevive ao fechamento da aba ou recarregamento.
20. **Limpeza de Conexões WebSocket Fechadas**: Gerenciamento de ciclo de vida de sockets com remoção automática de conexões inativas para evitar vazamentos de memória.

---

### 🎨 III. Engenharia de UI & Experiência do Usuário (21 a 30)

21. **Design Mobile-First Responsivo**: Layout construído primariamente para a experiência de toque no celular, adaptando-se com perfeição ao desktop.
22. **Navegação Sticky com Scrollspy**: Abas de categorias com rolagem horizontal suave e indicador ativo que acompanha o catálogo.
23. **Modal Bottom Sheet Tátil**: Gaveta inferior que sobe para customização de burgers com suporte a toques e fechamento intuitivo.
24. **Feedback Tátil e Micro-Interações**: Animação de pop na sacola (`bag-button-pop`) ao adicionar produtos.
25. **Validação Visual de Regras de Opcionais**: Bloqueio de avanço com mensagem clara caso o ponto da carne obrigatório não tenha sido selecionado.
26. **Seleção Visual Destacada de Meios de Pagamento**: Ícones oficiais de PIX, Débito, Crédito e Dinheiro com borda dourada ativa.
27. **Acompanhamento do Pedido em Tempo Real (Live Timeline)**: Linha do tempo visual de 5 etapas atualizada via WebSocket sem necessidade de recarregar a página.
28. **Deep Link Direto para o Google Maps**: Geração da rota exata até a casa do cliente para o motoboy com um único toque no celular.
29. **Barra de Progresso do Pedido Mínimo**: Indicador visual na sacola mostrando quanto falta para atingir o valor mínimo de entrega (R$ 25,00).
30. **Tratamento de Fallback de Imagens**: Manipulador `onError` automático para exibir avatar e capa padrão caso uma imagem de rede falhe.

---

### 🚀 IV. Arquitetura de Software & Manutenibilidade (31 a 40)

31. **Centralização de Dados e Regras de Negócio**: Tabela de configurações dinâmicas (horários, taxas, pedido mínimo, WhatsApp) em banco, sem valores hardcoded.
32. **Separação Limpa de Camadas (Separation of Concerns)**: Rotas, controladores, banco de dados, autenticação e tempo real desacoplados.
33. **Identificadores Amigáveis para Humanos**: Geração de códigos de exibição legíveis (`#BB-1001`) além do ID numérico de banco.
34. **Snapshot de Preços e Nomes nos Pedidos**: `pedido_itens` armazena o preço e nome no momento da compra; edições futuras no cardápio não alteram o histórico contábil.
35. **Suporte a Horários que Cruzam a Meia-Noite**: Cálculo inteligente de aberto/fechado considerando estabelecimentos noturnos (19h às 04h/05h).
36. **Hub Centralizado de Mudança de Status**: Função única `mudarStatusPedido(id, status)` que garante que toda alteração dispare o broadcast exato para todos os canais.
37. **Proxy Reverso Integrado no Vite**: Configuração de `/api` e `/ws` apontando para o backend, eliminando problemas de CORS no ambiente de desenvolvimento.
38. **Serviço Dual da SPA pelo Express**: Servidor Express capaz de servir os arquivos estáticos de produção do frontend diretamente na mesma porta.
39. **Documentação de Rotas e Payloads**: APIs com respostas padronizadas em JSON contendo status, códigos de erro legíveis e mensagens claras.
40. **Variáveis de Ambiente Configuráveis**: Suporte a portas dinâmicas e variáveis de infraestrutura (`PORT`, `NODE_ENV`).

---

### 🧪 V. Testes, Qualidade & Homologação (41 a 50)

41. **Bateria de Testes Automatizados**: Suíte de testes automatizados cobrindo autenticação, injeção de SQL, manipulação de valores e fluxos de negócio.
42. **Simulação de Estresse Concorrente (Race Condition Stress Test)**: Teste verificado com 10 motoboys disparando simultaneamente para a mesma corrida.
43. **Tratamento Global de Erros no Backend**: Middleware central interceptador de exceções evitando que o servidor caia ou vaze stack traces sensíveis.
44. **Login Híbrido com PIN para Agilidade Operacional**: Login por PIN dos 4 últimos dígitos do WhatsApp facilitando o uso do motoboy no trânsito.
45. **Contrato Formal de Entrega Gerado em PDF**: Documento jurídico de entrega gerado automaticamente via código com identificação das partes e escopo técnico.
46. **Métricas Financeiras em Tempo Real**: Totalizadores automáticos de faturamento do dia, corridas por entregador e tíquete médio.
47. **Design Tokens Padronizados**: Cores institucionais do Bulls Burger (dourado #f2c54b e grafite escuro #0f172a) aplicadas de forma uniforme.
48. **Acessibilidade e Usabilidade (WCAG)**: Contraste legível de fontes, áreas mínimas de clique (44px) e rótulos acessíveis.
49. **Botão Direto de Atendimento via WhatsApp**: Link contextualizado com mensagem pré-preenchida contendo o código do pedido para suporte instantâneo.
50. **Prontidão para Deploy em Nuvem**: Estrutura pronta para empacotamento em VPS ou deploy conteinerizado.
