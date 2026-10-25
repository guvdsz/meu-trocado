# Meu Trocado

Aplicação de controle financeiro com Next.js, Clerk, Neon/PostgreSQL e Drizzle.

O dashboard em `/` reúne saldo, entradas, saídas, resumo mensal, última movimentação e ajuste manual de saldo. O histórico paginado fica em `/transactions`. As telas privadas ficam em `src/app/(private)`, protegidas pelo Clerk. O login usa e-mail e senha. Os dados financeiros são vinculados ao UUID interno de `users`, com o ID externo do Clerk somente em `users.providerId` (coluna SQL `provider_id`).

A implementação e as regras de autenticação/persistência estão em [docs/dashboard.md](docs/dashboard.md). O [planejamento original](docs/planejamento-mvp.md) registra as decisões iniciais do MVP.

Os formulários usam React Hook Form e Zod, com validações em `/schemas`, Server Actions nas rotas e schema Drizzle em `src/db/schema.ts`. A interface usa shadcn/Base UI e Tailwind, com calendário, popovers, navegação móvel e skeletons.

Os estilos ficam nos componentes; `src/app/globals.css` contém apenas o tema, estilos base e preferências de acessibilidade. Layouts repetidos ficam em `_components/finance-layout.tsx` e `_components/ui/form-layout.tsx`, e os estados dos inputs em `_components/ui/control-styles.ts`. As classes sem utilitários, como `finance-summary`, identificam regiões nos testes e em variantes locais do Tailwind; não dependem de regras no CSS global. A personalização interna do Clerk continua na API `appearance`, e os gráficos usam estilos dinâmicos apenas para valores calculados em execução.

```sh
pnpm install
pnpm dev
```

Validação: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm db:check` e `pnpm test:ui` (testes visuais/acessibilidade com dados fictícios, sem banco ou conta autenticada).

Banco: `pnpm db:generate` gera migrations locais; `pnpm db:migrate` aplica no banco configurado em `DATABASE_URL`. Configure também as chaves do Clerk no `.env`. No painel do Clerk, habilite e-mail e senha, com senha obrigatória no cadastro, e desabilite conexões sociais e acesso sem senha. O formulário oficial oferece cadastro, recuperação de senha e verificações de segurança.

A migration `users-ownership-reset` limpa as tabelas financeiras do ambiente de desenvolvimento antes de alterar as relações. Os dados antigos não são migrados. As migrations anteriores permanecem no repositório apenas como histórico.

## Saídas recorrentes

Ao adicionar uma saída, escolha **Repetição**: mensal, anual, semestral ou quinzenal (a cada 15 dias). O primeiro lançamento pode ser hoje ou uma data futura. O saldo só muda quando o vencimento chega. Os próximos vencimentos e as ações de editar/encerrar ficam em `/recurrences`.

As datas mensal, semestral e anual preservam o dia original. Se o mês não tiver esse dia, usa-se seu último dia: 31/jan → 28/fev → 31/mar. Editar altera valor, descrição e categoria dos próximos lançamentos; para mudar a frequência ou o dia, encerre e crie outra recorrência. Encerrar preserva o histórico, inclusive vencimentos já devidos.

A rotina da Vercel está em `vercel.json`, uma vez por dia às 06:00 UTC. Para ativar em produção:

1. Aplique `pnpm db:migrate` ao banco usado no ambiente de produção.
2. Cadastre `CRON_SECRET` nas variáveis de ambiente **Production** da Vercel, com um segredo aleatório de pelo menos 32 caracteres. Não use o prefixo `NEXT_PUBLIC_` nem exponha esse segredo no cliente.
3. Faça o deploy. Confira a execução em **Settings → Cron Jobs** na Vercel.

O endpoint `/api/cron/recurrences` exige `Authorization: Bearer <CRON_SECRET>` e não exige sessão Clerk. Todas as rotas privadas e ações continuam protegidas pelo Clerk e pelo UUID interno do usuário. A Vercel pode executar em qualquer momento da hora agendada no plano Hobby; a rotina usa a data de São Paulo, não promete um horário exato. [Documentação dos cron jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

O banco registra cada ocorrência e debita o saldo na mesma transação, com trava por carteira e unicidade por recorrência/data. Chamadas repetidas não duplicam despesas. Ao abrir uma tela financeira, o app também recupera vencimentos pendentes se o cron atrasar. O processamento não antecipa despesas; datas futuras não entram nos gráficos. Falhas por limite de saldo revertem toda a operação e precisam de correção antes de tentar novamente.

As regras de recorrência ficam em `src/db/mutations/recurrence-operations.ts`, usando o calendário de `src/lib/recurrence.ts`. A migration `20261025185910_orm-recurrences` remove as antigas funções PostgreSQL, sem alterar registros ou tabelas. As migrations anteriores são mantidas como histórico; as regras atuais não dependem dessas funções. Os testes em PostgreSQL local (PGlite) executam as operações Drizzle reais e cobrem calendário, idempotência, limites, isolamento de proprietário e histórico.

## Acesso ao banco

As consultas usam o query builder do Drizzle e as tabelas tipadas de `src/db/schema.ts`. Trechos de `sql` ficam restritos a expressões, como somas, conversões de data e incrementos; não há consultas completas escritas manualmente no código da aplicação.

Lançamentos e ajustes executam a alteração do saldo e o registro do histórico na mesma transação. Recorrências travam a carteira antes de gerar cobranças, editar ou encerrar regras. Permanecem as verificações de proprietário, versão e unicidade por operação/recorrência. Dashboard e histórico usam transações de leitura com isolamento `repeatable read`, para que suas consultas compartilhem a mesma visão dos dados.

O driver é `drizzle-orm/neon-serverless`, com conexões WebSocket abertas e encerradas em cada chamada a `withDatabase`. Isso permite transações com etapas dependentes, não suportadas pelo antigo driver `neon-http`. Use **Node.js 22 ou superior** localmente e na Vercel para ter WebSocket nativo; `DATABASE_URL` permanece a mesma. [Documentação do driver Neon](https://neon.com/docs/serverless/serverless-driver).

## Instalar o aplicativo

O Meu Trocado é uma PWA. Com o site publicado em HTTPS, a instalação pode ser feita pelo menu do próprio navegador. A interface da aplicação não exibe avisos, botões ou instruções de instalação.

O manifesto está em `src/app/manifest.ts`. A logo usa as três moedas da marca existente; o SVG original fica em `public/brand/icon.svg`. `pnpm icons:generate` recria o favicon ICO (16/32/48 px), o SVG de aba, o ícone Apple (180 px) e os ícones PWA (192/512 px, incluindo maskable).

Não há modo offline nem registro de service worker em novas instalações. Quando a conexão cai com a aplicação aberta, um aviso pede para verificar a internet e desaparece quando a conexão volta. Consultar e alterar dados exige internet. O arquivo `public/sw.js` existe apenas para desativar workers de versões anteriores e limpar seu cache; ele não intercepta requisições nem armazena conteúdo. A aplicação também remove caches antigos dessa versão ao abrir.

Para testar a instalação no computador, use `pnpm build && pnpm start` em `localhost`. No celular, acessar pelo IP local exige HTTPS. `pnpm test:pwa` verifica os arquivos públicos, tamanhos dos ícones e remoção do worker/cache antigo contra o servidor de produção, sem conta autenticada ou acesso ao banco. `pnpm test:ui` também cobre o aviso de conexão.

## Moedas, configurações e fusos

Cada carteira usa uma moeda: BRL, USD, EUR, GBP, CAD ou AUD. A aplicação exige confirmação explícita da moeda antes de liberar consultas e operações financeiras, inclusive para contas antigas que receberam BRL automaticamente. Confirmar a mesma moeda preserva os dados.

Em **Configurações** (`/settings`), o usuário escolhe moeda, fuso IANA e formato brasileiro ou americano de números/datas. Moeda e localidade são independentes. Trocar realmente de moeda exige confirmar a exclusão de entradas, saídas, ajustes e recorrências e zera o saldo; não há conversão cambial. A operação usa transação Drizzle, trava da carteira e chave idempotente. Formulários de outras abas que usam preferências antigas são rejeitados.

As movimentações continuam sem hora e exibem dia da semana, dia, mês e ano. As datas civis de entradas/saídas não mudam com o fuso. O dia atual, as datas de ajustes e o processamento de recorrências utilizam o fuso persistido. O cron diário mantém seu horário UTC e pode registrar vencimentos depois da meia-noite local; abrir o app também recupera pendências.

Antes de executar esta versão, aplique **`pnpm db:migrate`** ao banco do ambiente. A migration `20261025190954_account-preferences` preserva os registros existentes e deixa a confirmação de moeda pendente. Publique aplicação e migration de forma coordenada, suspendendo escritores/cron antigos durante a transição. Não reverta para versões que formatam todos os valores como BRL depois de permitir carteiras em outras moedas.

O planejamento e os critérios de aceite estão em [docs/plano-moedas-datas-configuracoes.md](docs/plano-moedas-datas-configuracoes.md). Testes adicionais de persistência e interface ficam em `tests/settings.test.ts` e `tests/ui/settings.spec.ts`.
