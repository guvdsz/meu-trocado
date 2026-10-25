# Meu Troco — planejamento do MVP

> Planejamento original. O dashboard, formulários e vínculo Google já foram implementados. Consulte [dashboard.md](dashboard.md) para o estado atual, incluindo a organização em `src/app/(private)` e as migrations aplicadas.

## Objetivo e escopo

Permitir que cada usuário autenticado registre entradas e saídas em reais, acompanhe seu saldo e informe manualmente o saldo real quando precisar fazer uma correção. O Clerk já existente continua responsável pela identidade; Neon/PostgreSQL e Drizzle pela persistência.

Decisões iniciais: uma carteira por usuário, moeda BRL, saldo inicial zero, saldo negativo permitido e movimentações efetivadas. Categorias, múltiplas contas, transferências, cartões, parcelas, recorrência, agendamento, importação bancária e orçamento ficam para versões posteriores. Edição e exclusão de movimentações também ficam fora desta primeira entrega: exigirão regras próprias para desfazer seus efeitos e preservar auditoria.

## Organização obrigatória

Manter a estrutura atual em `src/app`. Cada pasta de rota/segmento deve conter `_components` e `_actions`, inclusive segmentos de autenticação. Diretórios sem implementação ficam versionados com `.gitkeep`. Componentes compartilhados continuam em `src/app/_components/shared`.

Os schemas de validação ficam em **`/schemas`, na raiz do repositório**, com subpastas por entidade e importação por `@schemas/*`. O schema do banco permanece em `src/db/schema.ts`: são responsabilidades diferentes.

Estrutura alvo (arquivos marcados como planejados ainda serão implementados):

```text
schemas/
  account/adjust-balance.ts
  transaction/create-transaction.ts
  shared/money.ts
src/
  app/
    page.tsx                            # dashboard atual; substituir conteúdo depois
    _components/
      shared/loader.tsx                 # já existente
      balance-card.tsx                  # planejado
      balance-adjustment-form.tsx       # planejado
      monthly-summary.tsx               # planejado
    _actions/
      adjust-balance.ts                 # planejado
    transactions/                      # rota planejada
      page.tsx
      _components/
        transaction-form.tsx
        transaction-list.tsx
        transaction-filters.tsx
      _actions/
        create-transaction.ts
    auth/
      _components/
      _actions/
      sign-in/
        _components/
        _actions/
        [[...sign-in]]/
          page.tsx                     # preservar login existente
          _components/
          _actions/
  db/
    index.ts
    schema.ts
    queries/                           # leituras futuras, sempre por proprietário
      accounts.ts
      transactions.ts
    mutations/                         # SQL atômico futuro, somente servidor
      create-transaction.ts
      adjust-balance.ts
drizzle/                               # migrations geradas e versionadas
docs/planejamento-mvp.md
tests/financial-schemas.test.ts
```

Os `page.tsx` continuam Server Components. Apenas os formulários interativos usam `"use client"`. As actions ficam nos respectivos `_actions`, com `"use server"`, e exportam funções assíncronas. Leituras ficam fora de `_actions`. Não criar uma pasta global de actions para submits de rotas diferentes.

## Telas e fluxos

| Rota | Conteúdo | Submit |
| --- | --- | --- |
| `/` | Saldo atual, entradas e saídas do mês, movimentações recentes e acesso ao ajuste | `src/app/_actions/adjust-balance.ts` |
| `/transactions` | Lista paginada, filtros por período/tipo e formulário de nova entrada/saída | `src/app/transactions/_actions/create-transaction.ts` |
| `/auth/sign-in/[[...sign-in]]` | Login já existente com Clerk | Fluxo gerenciado pelo Clerk |

### Adicionar entrada ou saída

1. Preencher tipo, valor positivo, descrição e data de efetivação.
2. Validar com React Hook Form e `zodResolver(createTransactionSchema)`.
3. Executar a action, que autentica novamente com `auth()`, valida o payload e resolve a carteira pelo `userId` autenticado.
4. Persistir movimentação e atualização do saldo na mesma operação SQL atômica.
5. Revalidar `/` e `/transactions`, mostrar sucesso e limpar o formulário com uma nova chave de operação.

A data é um dia civil `YYYY-MM-DD`, armazenado como PostgreSQL `date`, sem conversão implícita para UTC. Na action, rejeitar datas posteriores ao dia atual em `America/Sao_Paulo`: agendamentos não pertencem ao MVP. O schema compartilhado valida o calendário; a regra temporal depende do relógio do servidor.

### Editar manualmente o saldo

1. Abrir formulário com saldo e `version` atuais, informando o **novo saldo absoluto** e o motivo.
2. Permitir valores positivos, negativos e zero.
3. Validar com `adjustBalanceSchema` no cliente e no servidor.
4. Se o valor já for o atual, retornar sucesso sem criar registro ou incrementar a versão.
5. Em uma única operação SQL, substituir o saldo, incrementar a versão e gravar saldo anterior, novo saldo e motivo em `balance_adjustments`.
6. Se outra operação tiver alterado a versão, devolver conflito e pedir que o usuário confira o saldo atualizado antes de reenviar. Não recalcular/repetir um ajuste absoluto automaticamente.

Exemplo: saldo de R$ 1.000,00, entrada de R$ 200,00 e saída de R$ 50,00 produzem R$ 1.150,00. Informar saldo real de R$ 1.100,00 gera um ajuste de -R$ 50,00. O resumo do período continua mostrando entrada de R$ 200,00 e saída de R$ 50,00; o ajuste aparece identificado no histórico, fora desses totais. O saldo de R$ 1.000,00 do exemplo também seria registrado como ajuste inicial.

## Modelo de dados implementado

### `accounts`

Uma carteira por identidade Clerk, garantida por `clerk_user_id UNIQUE`. UUID interno, moeda fixa BRL, `balance numeric(15,2)` com default `0.00`, `version` não negativa e timestamps com timezone. Não duplicar usuários/senhas em uma tabela local: o identificador Clerk é o vínculo externo, sem FK para um banco de autenticação.

### `transactions`

UUID, carteira com FK, `request_id UUID UNIQUE`, enum `income | expense`, valor estritamente positivo `numeric(15,2)`, descrição obrigatória de até 160 caracteres, dia de efetivação e timestamp de criação. O tipo determina o sinal aplicado ao saldo. Índices cobrem listagem por carteira/data e filtros por carteira/tipo/data. Paginação deve ordenar por `occurred_on`, `created_at` e `id`, usando os três no cursor para desempate.

### `balance_adjustments`

UUID, carteira com FK, `request_id UUID UNIQUE`, saldo anterior, novo saldo, motivo obrigatório de até 240 caracteres e timestamp. Check impede ajuste sem mudança. A diferença é calculada como `new_balance - previous_balance`; não armazenar uma terceira cópia do valor. Índice cobre histórico por carteira/data de criação/id.

As FKs usam `ON DELETE RESTRICT` para evitar apagar o histórico ao remover uma carteira. As tabelas de histórico são somente de inclusão no MVP, por regra da camada de aplicação; o DDL não instala triggers de imutabilidade nem políticas RLS. Exclusão de conta pessoal exige fluxo explícito futuro.

### Precisão, saldo e consistência

- Dinheiro trafega como string decimal. O Drizzle mantém `numeric` no modo string. Não usar `parseFloat`, `Number`, `valueAsNumber`, `z.coerce.number()` ou soma/subtração com ponto flutuante para valores monetários.
- Os schemas aceitam `125,50` e `125.50`, normalizando para `125.50`, sem arredondar. Rejeitam símbolos de moeda, separadores de milhar, notação científica e mais de duas casas decimais. A máscara do formulário deve fornecer essa representação, mantendo o valor como string.
- Limite de cada saldo/lançamento: R$ 9.999.999.999.999,99. Um ajuste pode cruzar de negativo a positivo; a diferença calculada usa a precisão aritmética do PostgreSQL, sem ser reduzida para `numeric(15,2)`.
- O saldo armazenado é uma projeção: `saldo = soma(income) - soma(expense) + soma(new_balance - previous_balance)`. Como o saldo começa em zero, a igualdade vale desde a criação. Entradas/saídas retroativas afetam o saldo atual; relatórios mensais usam `occurred_on`, enquanto ajustes representam correções feitas no instante `created_at`.
- Valores especiais como `NaN` são barrados pelos limites explícitos dos checks. No código, normalização e validação acontecem antes da persistência; a coluna `numeric` isoladamente arredondaria excesso de casas recebido por SQL direto.
- Os checks e FKs garantem regras locais de cada registro. A igualdade entre saldo e histórico precisa ser garantida pelas mutations atômicas; nunca executar um `insert` e um `update` independentes.

## Escrita atômica e concorrência

O projeto usa `drizzle-orm/neon-http`, que não oferece transações interativas com callback. Manter esse driver e implementar cada mutation com **uma instrução SQL parametrizada contendo CTE de escrita**. Não depender de `db.transaction(async tx => ...)` nesse adaptador.

Para uma movimentação, ler carteira/versão no servidor e usar um `UPDATE accounts SET balance = balance +/- amount, version = version + 1, updated_at = now() WHERE id = ... AND clerk_user_id = ... AND version = ... RETURNING ...` em uma CTE. O `INSERT INTO transactions ... SELECT ... FROM updated_account` só cria a movimentação quando o update retorna uma linha. Falha no insert reverte o update na mesma instrução. Se não retornar linha, tratar conflito; uma movimentação relativa pode ser repetida com leitura nova, com limite de tentativas.

Para ajuste, usar o mesmo padrão com a `expectedVersion` do formulário. O saldo anterior é o saldo lido para essa versão; ele só pode ser gravado se a versão ainda for a mesma. O cliente nunca fornece `previousBalance`, `accountId` ou `clerkUserId` como autoridade. Um ajuste de saldo não autoriza sobrescrever uma versão mais recente.

`requestId` deve ser criado uma vez por intenção de submit (`crypto.randomUUID()`), preservado em tentativas de rede e substituído após sucesso. Antes de escrever, buscar eventual resultado com a mesma chave **e com a carteira do usuário**. A constraint unique protege também a corrida entre duas requisições iguais: um conflito de unicidade deve reverter toda a instrução e ser seguido por uma consulta do resultado já confirmado. Conferir que o payload coincide; reutilizar chave com dados diferentes é erro. Não usar `ON CONFLICT DO NOTHING` apenas no insert depois de atualizar saldo, pois isso poderia atualizar o saldo duas vezes.

## Contrato dos formulários e actions

Usar o mesmo schema na UI e no servidor, com tipos de entrada/saída inferidos:

```tsx
const form = useForm<
    CreateTransactionInput,
    unknown,
    CreateTransactionData
>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
        requestId, // UUID estável da intenção atual; renovar após sucesso.
        type: "expense",
        amount: "",
        description: "",
        occurredOn: today, // Dia em America/Sao_Paulo fornecido pela página.
    },
});

// Em um componente com "use client", importar a action da rota e executar:
// <form onSubmit={form.handleSubmit(async (values) => { ... })}>
```

O callback aguarda a action para que `formState.isSubmitting` bloqueie o botão durante o envio. Retornar um resultado serializável discriminado: sucesso com identificador, ou erro com código (`validation`, `unauthenticated`, `conflict`, `unexpected`), mensagem e erros por campo. Aplicar `setError` nos campos e `root` para erros gerais; preservar os valores em falha. Revalidar cache apenas depois de confirmar a persistência.

Autenticar e autorizar dentro de **cada action**, mesmo com proteção em `proxy.ts`. Restringir todas as leituras e mutations ao proprietário autenticado. Nunca confiar em um `userId` enviado pelo formulário nem compartilhar resultados privados em cache público. Ao implementar a proteção de rotas, preservar as rotas públicas necessárias ao login Clerk. Erros retornados não devem expor SQL, credenciais ou dados pessoais.

## Etapas e critérios de aceite

1. **Base — entregue nesta alteração:** dependências React Hook Form/Zod/resolver; schemas por entidade; aliases; pastas privadas das rotas existentes; tabelas, constraints e índices; migration SQL local; scripts; testes de validação e este planejamento. A aplicação visual permanece na etapa atual.
2. **Persistência:** criar carteira sob demanda com `ON CONFLICT` no proprietário; implementar queries e mutations parametrizadas, concorrência e idempotência; integrar Clerk e proteção das páginas. Aplicar migration no ambiente escolhido antes de usar essas queries.
3. **Movimentações:** construir `/transactions`, formulário, tabela paginada, filtros, estados vazio/carregando/erro e action de criação.
4. **Dashboard e ajuste:** substituir conteúdo inicial de `/`; saldo, totais mensais, histórico e formulário de ajuste com controle de versão; revalidar telas após cada submit.
5. **Validação integrada:** testar com PostgreSQL de teste e duas sessões autenticadas; verificar entrada/saída, ajustes para zero/negativo, saldo sem mudança, limite numérico, data inválida/futura, histórico e isolamento entre usuários.

Testes de persistência necessários na etapa 5: erro no insert não muda saldo; duas movimentações concorrentes não perdem valores; dois ajustes na mesma versão não se sobrepõem; repetir `requestId` não duplica efeito; chave repetida com payload diferente falha; um usuário não acessa carteira/histórico de outro; saldo armazenado corresponde à soma das movimentações e diferenças dos ajustes. A base atual testa validação e integração do resolver, sem simular garantias de um banco real.

## Comandos

```sh
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm db:generate
pnpm db:check
pnpm db:migrate
pnpm dev
```

`db:generate` gera arquivos locais. `db:migrate` aplica mudanças no banco apontado por `DATABASE_URL`; não foi executado nesta alteração. A migration inicial pressupõe banco sem essas tabelas: verificar/baselinear antes de aplicar em um banco já existente.

Variáveis necessárias: `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` e configuração das URLs do Clerk de acordo com o ambiente. Manter segredos fora do Git.

Referências consultadas: guias locais do Next.js em `node_modules/next/dist/docs/01-app` (estrutura, mutations e forms), [Drizzle: constraints](https://orm.drizzle.team/docs/indexes-constraints), [Drizzle: tipos PostgreSQL](https://orm.drizzle.team/docs/column-types), [React Hook Form: resolvers](https://github.com/react-hook-form/resolvers) e [Zod: API](https://zod.dev/api).
