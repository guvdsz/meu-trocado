# Dashboard e autenticação — Meu Trocado

## Implementado

- Login em `/auth/sign-in` com a identidade visual Meu Trocado, layout responsivo e o componente oficial `SignIn` do Clerk. As opções de login disponíveis continuam sendo as configuradas no Clerk; a carteira exige uma conta Google vinculada.
- Dashboard em `/`, organizado no grupo `src/app/(private)`. Os parênteses mantêm esse segmento fora da URL.
- Saldo atual, totais por mês, comparativo dos últimos seis meses e resultado do período. O saldo atual independe do mês selecionado.
- Categorias predefinidas em entradas e saídas, com padrão Outros(as) no formulário, Zod e banco. A migration preenche transações anteriores com esse padrão; ajustes de saldo não têm categoria.
- Três gráficos Recharts/shadcn: entradas versus saídas nos seis meses até o período selecionado; despesas por categoria no mês; evolução do resultado mensal (entradas menos saídas, sem ajustes). Meses sem registros aparecem zerados. Valores exatos nos tooltips e tabelas para leitores de tela.
- Categoria com maior gasto e participação, maior despesa, diferença de gastos frente ao mês anterior e top 5 por valor numérico. Esses dados usam o mês selecionado e excluem ajustes de saldo. No mês em andamento, a comparação considera o total acumulado até então frente ao mês anterior completo.
- Última movimentação em card, com descrição, tipo, categoria, data e valor; ajustes também exibem o novo saldo. O componente genérico `UnavailableState` atende falhas do resumo e histórico, com botão para tentar novamente e layout responsivo.
- A visão geral mostra somente a última movimentação registrada. O histórico fica em `/transactions`, com paginação de 20 registros por página e filtros por mês, descrição e tipo aplicados no banco.
- Formulários com React Hook Form, Zod e validação repetida nas Server Actions dos respectivos `_actions`: ajustes na raiz privada e entradas/saídas em `transactions/_actions`.
- Componentes oficiais shadcn com Base UI em `src/app/_components/ui`, incluindo Dialog, Popover, Calendar, Sheet, Select, Skeleton e Toast. As cores e a identidade Meu Trocado continuam próprias.
- Sidebar persistente, drawer de navegação no celular com botão de menu e nome da página fixos em um cabeçalho flutuante, menu de conta com toda a área clicável e logout via `useClerk().signOut()`. O popover contém somente Gerenciar conta e Sair da conta. E-mails longos ficam truncados na sidebar.
- Inputs monetários usam máscara durante a digitação: `123456` vira `1.234,56`, com os dois últimos dígitos como centavos. O valor interno continua uma string decimal sem separadores de milhar, sem cálculos em ponto flutuante. O ajuste de saldo aceita sinal negativo, inclusive por botão no teclado móvel.
- Os cards compartilham as mesmas linhas de título e valor. Ajustar saldo permanece no card de saldo; o período fica na mesma faixa das ações de entrada e saída. No histórico móvel, descrição/tipo/data ficam agrupados e o valor permanece à direita.
- O histórico usa apenas seu `loading.tsx` como boundary de carregamento: o loading genérico da rota raiz e a Suspense redundante foram removidos. Cabeçalho e filtros do skeleton preservam as medidas da tela final.
- Loader animado, skeletons nas leituras e durante envios/atualizações, notificações temporárias e suporte a movimento reduzido. O formulário permanece montado durante o envio; a navegação lateral continua disponível.
- Entradas e saídas atualizam o saldo e criam o histórico de forma atômica. Ajustes manuais aceitam saldo negativo ou zero, guardam saldo anterior/novo e exigem motivo.
- Chaves de operação para evitar duplicação em reenvios, controle de versão para concorrência e erros de campo/feedback de envio.

## Proteção de rotas e propriedade

`src/proxy.ts` usa `clerkMiddleware`, `createRouteMatcher` e `auth.protect()`. Somente `/auth/sign-in(.*)` e os endpoints internos `/__clerk(.*)` ficam públicos entre os caminhos processados pelo proxy. O layout privado também verifica `auth()` e `auth.protect()`.

Cada action verifica novamente a sessão com `auth()` e obtém o usuário com `currentUser()`. O `googleId` vem exclusivamente de `externalAccounts[].providerUserId`, para os providers `google` ou `oauth_google`. Não usar `externalAccounts[].id`, `externalId`, e-mail ou o ID Clerk como substitutos do ID Google.

O ID Google é uma string: pode ser maior do que o limite inteiro seguro do JavaScript. Sem conta Google, ou com várias contas Google diferentes vinculadas, a aplicação pede que o usuário mantenha uma única conta Google no perfil antes de acessar as finanças. A opção Gerenciar conta do popover abre o perfil oficial do Clerk.

`accounts.google_id` é obrigatório e único. `transactions` e `balance_adjustments` carregam `google_id` e usam FK composta `(account_id, google_id) → accounts(id, google_id)`. Assim, o próprio banco impede relacionar um lançamento ao Google ID de outra carteira. O vínculo Clerk é conferido junto do ID Google em cada resolução de carteira e mutation. Uma alteração no vínculo Google não transfere automaticamente uma carteira já existente.

## Persistência e precisão

As mutations usam uma CTE de escrita com `UPDATE ... WHERE version = ... RETURNING`, seguida de `INSERT ... SELECT` na mesma instrução SQL. Uma falha no histórico reverte também o saldo. Atualizações relativas têm até três tentativas com leitura nova; um ajuste absoluto com versão antiga exige nova conferência do usuário.

Um mesmo `requestId` só é aceito como reenvio se os dados forem os mesmos. O conflito unique reverte a instrução inteira; não há `ON CONFLICT DO NOTHING` depois de alterar saldo. Ajustar para o saldo que já está salvo não gera histórico.

Dinheiro é `numeric(15,2)` no PostgreSQL e string decimal nos formulários, actions e consultas. Operações de apresentação usam centavos em `bigint`; percentuais são arredondados para uma casa decimal com esses inteiros. Somente a geometria SVG usa números de ponto flutuante; tooltips e totais preservam strings exatas. Datas civis e a regra de impedir movimentações futuras usam `America/Sao_Paulo`.

Totais, última movimentação, gráfico, saldo e versão do dashboard são consultados em uma única instrução para compartilhar o mesmo snapshot. A lista do histórico e sua contagem também compartilham uma instrução. Ajustes ficam fora dos totais de entrada/saída. Dados privados não usam cache público. IDs de proprietário não são enviados aos componentes de interface.

As migrations de MVP, propriedade Google e categorias foram aplicadas ao banco Neon configurado. A migration de categorias é aditiva e mantém os registros existentes com a categoria Outros(as). A migration original de propriedade Google pressupõe ausência de registros legados sem esse vínculo. Em outro banco que já tenha dados sem vínculo Google, preencher os IDs a partir das identidades verificadas antes de tornar as colunas obrigatórias; não inventar IDs de proprietário.

## Verificação

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm db:check
pnpm build
pnpm test:ui
```

Os testes com PostgreSQL embutido (PGlite) aplicam as migrations reais e verificam saldo exato, concorrência por versão, rollback de operação duplicada, isolamento de proprietários, FK composta, ajustes e consultas do dashboard. Os dados desses testes são fictícios e não são gravados no Neon.

`pnpm test:ui` compila a aplicação e usa Playwright/axe-core com fixtures isoladas de interface. No Windows, usa Edge em modo headless; em outros sistemas é preciso ter o Chromium do Playwright instalado. Os testes verificam o calendário, validação, skeletons, histórico paginado, sidebar móvel, teclado, menu/logout, e-mail longo e auditoria automática WCAG AA. O harness em `tests/ui` não acessa o banco, credenciais ou o OAuth real e não adiciona rotas de teste à aplicação.

Verificado por HTTP: `/` e caminhos privados redirecionam visitantes sem sessão para `/auth/sign-in`; o login retorna 200. Os testes isolados não substituem uma verificação completa do OAuth com a conta do usuário nem uma avaliação manual integral de acessibilidade.

## Fora desta entrega

Edição/exclusão de lançamentos, criação de categorias personalizadas, múltiplas carteiras, transações agendadas e importação bancária. A autenticação continua usando a configuração existente no Clerk, sem alteração de provedores ou credenciais.

Referências: [Clerk SignIn](https://clerk.com/docs/nextjs/reference/components/authentication/sign-in), [Clerk ExternalAccount](https://clerk.com/docs/reference/backend/types/backend-external-account) e documentação local da versão instalada do Next.js em `node_modules/next/dist/docs/`.
