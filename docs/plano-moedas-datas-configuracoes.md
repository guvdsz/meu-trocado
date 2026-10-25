# Plano de moedas, datas e configurações

Data: 25/10/2026. Plano atualizado durante a implementação. Por solicitação posterior do usuário, as movimentações continuam sem hora; a exibição ganha somente ano e dia da semana.

## Objetivo e escopo

Permitir que cada usuário utilize uma única moeda em sua carteira, com configuração obrigatória antes de usar a aplicação. A primeira versão oferecerá BRL, USD, EUR, GBP, CAD e AUD, conforme escolha do usuário. Todas usam duas casas decimais e são compatíveis com o modelo monetário atual.

A aplicação terá uma aba **Configurações**, fuso horário persistido por usuário/carteira e movimentações com dia da semana, dia, mês e ano. A interface poderá continuar em português; moeda, idioma de exibição e fuso serão preferências independentes. Não haverá conversão cambial nem mistura de moedas na mesma carteira.

## Diagnóstico do código atual

Este diagnóstico registra a estrutura encontrada durante o planejamento. A migração de SQL puro para o query builder do Drizzle está em andamento; caminhos e funções abaixo são referências de responsabilidade, não uma exigência de preservar a organização atual. Antes da implementação, revisar o resultado dessa migração e trabalhar sobre a camada de persistência consolidada.

- `src/db/schema.ts`: `accounts.currency` já existe, é obrigatória, tem padrão `BRL` e a constraint `accounts_currency_brl` impede qualquer outra moeda. Reutilizar essa coluna.
- `src/db/queries/account.ts`: `getAccount()` cria a carteira com os padrões do banco e também processa recorrências. A simples leitura já pode alterar dados financeiros.
- `src/lib/financial.ts`: `formatMoney()` fixa `R$`; `localToday()` fixa `America/Sao_Paulo`; `formatDay()` mostra apenas dia e mês.
- `src/lib/money-input.ts` e `src/app/_components/ui/money-input.tsx`: símbolo, separadores e leitura de valores estão ligados ao real e à formatação brasileira.
- `transactions.occurredOn` é uma data civil, sem hora. `createdAt` registra o instante de cadastro, que pode ser diferente da data e hora da movimentação.
- `src/db/queries/history-sql.ts`: o dia dos ajustes é calculado em São Paulo. Dashboard e histórico agrupam transações por `occurred_on`.
- `src/app/api/cron/recurrences/route.ts`: usa um único “hoje” em São Paulo para todas as carteiras. O cron atual roda diariamente às 06:00 UTC; abrir telas financeiras também recupera vencimentos pendentes.
- `app-shell.tsx` ainda não tem uma página de configurações da aplicação; “Gerenciar conta” abre o perfil do Clerk.

## Decisões de produto

### Configuração obrigatória

1. Sem moeda explicitamente confirmada, mostrar um modal obrigatório em qualquer rota privada, inclusive acessos diretos a `/transactions`, `/recurrences` e `/settings`.
2. O modal terá seletor de moeda, prévia de valor e confirmação do fuso sugerido pelo navegador. Não selecionar uma moeda silenciosamente com base em país, idioma, IP ou moeda padrão do banco.
3. Não permitir fechar por X, Escape, clique externo, cancelamento ou navegação. O fundo ficará inacessível por mouse, teclado e tecnologias assistivas. Recarregar ou abrir outra rota continuará mostrando o modal.
4. Só liberar o uso depois da confirmação persistida no servidor. Falha de rede mantém o modal, a seleção e a possibilidade de tentar novamente.
5. Antes da configuração, permitir somente o fluxo necessário para configurar e sair da sessão. Bloquear consultas financeiras, lançamentos, ajustes, filtros e gestão de recorrências. A criação do registro de identidade/carteira pendente é parte do fluxo de configuração.
6. O bloqueio será aplicado no servidor e no banco, além da interface. Um POST direto, outra aba, o cron ou um componente renderizado em paralelo não poderá movimentar uma carteira pendente.

### Aba Configurações

- Criar `/settings` e item **Configurações** no menu de desktop e celular, com título e estado ativo próprios.
- Começar com uma seção **Preferências financeiras**: moeda e fuso horário. Prever uma seção **Formato de exibição** para localidade, por exemplo `pt-BR` ou `en-US`, independente da moeda.
- Exibir código e nome completos: “USD — Dólar americano”, “CAD — Dólar canadense”, etc. Evitar `$` sem identificação quando houver ambiguidade.
- Detectar o fuso no navegador apenas como sugestão inicial. Persistir a escolha e usá-la em todos os dispositivos, no servidor, em consultas e no cron.
- Trocar apenas a localidade ou o fuso não apaga valores. Datas civis de entradas, saídas e recorrências permanecem intactas; o dia local de um ajuste depende do fuso.

### Troca de moeda e exclusão

Somente uma mudança real de código de moeda provoca exclusão. Salvar novamente a mesma moeda não apaga dados.

Mostrar confirmação antes de executar, com as moedas de origem/destino e texto equivalente a:

> Ao trocar de BRL para USD, todas as entradas, saídas, ajustes de saldo e recorrências desta carteira serão excluídos e o saldo será zerado. Os valores não serão convertidos. Esta ação não pode ser desfeita pela aplicação.

O botão destrutivo será **Excluir dados e trocar moeda**. Cancelar preserva a moeda e todos os dados. Desabilitar reenvios enquanto a operação estiver em andamento.

Apagar também as recorrências e os ajustes é uma decisão deste plano: preservá-los poderia gerar novas saídas ou exibir saldos na moeda antiga. A exclusão deve abranger somente a carteira do usuário autenticado.

Casos de primeira confirmação:

| Situação | Comportamento |
| --- | --- |
| Carteira nova e vazia, sem moeda | Configurar a moeda, sem etapa destrutiva. |
| Carteira antiga em BRL; usuário confirma BRL | Preservar saldo, movimentações, ajustes e recorrências. |
| Carteira antiga em BRL; usuário escolhe outra moeda | Exigir o aviso e a confirmação de exclusão antes de liberar. |
| Carteira com dados e moeda de origem desconhecida | Não reinterpretar valores; exigir reinício explícito com o mesmo aviso destrutivo. |

## Modelo de dados e persistência

### Drizzle como padrão e compatibilidade com a migração

- Usar o query builder do Drizzle para consultas, cadastros, alterações e exclusões, com as tabelas e tipos do schema: `db.select()`, `db.insert()`, `db.update()` e `db.delete()`.
- Reservar pequenos trechos parametrizados de `sql` para expressões específicas, como aritmética decimal, agregações e conversões de fuso que não tenham equivalente adequado no builder. Não introduzir consultas completas em SQL puro como padrão para esta entrega.
- Implementar preferências, configuração inicial e troca de moeda na mesma arquitetura de persistência resultante da migração. Não criar uma camada paralela que volte ao SQL puro nem exigir arquivos `*-sql.ts` novos.
- Preservar consistência do dashboard: saldo, preferências, totais e gráficos devem refletir a mesma visão dos dados. Preferir uma instrução composta pelo builder; se forem necessárias várias consultas, utilizar uma transação com isolamento que mantenha a mesma visão entre elas. Apenas agrupar chamadas, usar `Promise.all()` ou abrir uma transação com isolamento inadequado não garante essa consistência.
- Preservar atomicidade de lançamento + saldo, ajuste + histórico e exclusão + troca de moeda. O uso do builder não substitui verificações de proprietário, versões, idempotência, travas e constraints.
- Recorrências podem manter funções PostgreSQL existentes enquanto sua migração não estiver concluída. Reutilizar o serviço consolidado; migrar essas funções somente quando houver alternativa com as mesmas garantias de calendário, concorrência e duplicidade. SQL de migrations para funções que permanecerem no banco continua permitido.

A leitura inicial encontrou `drizzle-orm/neon-http`. A migração consolidada passou a utilizar `drizzle-orm/neon-serverless` com conexão por requisição, permitindo implementar a troca com transações interativas do Drizzle. Dashboard, histórico e recorrências leem preferências e dados em uma mesma transação com isolamento `repeatable read`; as mutações travam a carteira antes de validar versões e escrever.

Não presumir que uma API de lote equivale a uma transação interativa: a troca exige validar o estado depois da trava e interromper toda a operação em caso de conflito. Zero linhas atualizadas também deve impedir exclusões e demais efeitos, sem concluir parcialmente a solicitação. Se o driver atual não atender a essas necessidades, avaliar o driver transacional adotado na migração; manter uma função PostgreSQL delimitada é uma alternativa técnica a justificar, não a solução obrigatória do plano.

### Carteira e preferências

- Manter `accounts.currency` como fonte única da moeda financeira. Remover o padrão `BRL`, permitir `NULL` enquanto pendente e substituir a constraint por uma lista validada de BRL/USD/EUR/GBP/CAD/AUD.
- Adicionar `currencyConfiguredAt`, inicialmente `NULL`, inclusive para carteiras antigas. Estar configurada exige moeda válida e confirmação persistida; ter `BRL` pelo padrão antigo não prova uma escolha do usuário.
- Adicionar `timeZone` com identificador IANA, por exemplo `America/Sao_Paulo`, `America/New_York` ou `America/Los_Angeles`, e `locale` validada separadamente. Preservar São Paulo/pt-BR para dados legados até a confirmação das preferências.
- Adicionar `settingsVersion` monotônica, separada de `accounts.version`, para identificar a versão das preferências que originou um formulário. Incrementar ao mudar moeda, fuso ou localidade; nunca zerar no reinício da carteira.
- Validar no servidor o catálogo de moedas, localidade e fuso. Não aceitar valores financeiros ou a moeda da carteira com base apenas no cliente.
- Manter `numeric(15,2)`, strings decimais e aritmética exata com `bigint`. Não converter valores persistidos em ponto flutuante para cálculos ou formatação. Novas moedas com zero ou três casas exigirão uma evolução explícita desse modelo.

### Operação atômica de troca

Implementar um serviço de configuração/troca chamado por Server Action, usando o query builder do Drizzle e o mecanismo transacional validado na migração. O contrato da operação é:

1. Localizar a carteira pelo UUID interno do usuário e adquirir trava da conta (`FOR UPDATE`), na mesma ordem usada pelas funções de recorrência.
2. Verificar idempotência da solicitação, `settingsVersion`, moeda de origem e confirmação explícita da exclusão.
3. Para mudança real, excluir `transactions` primeiro, depois `balance_adjustments` e `recurring_expenses`, respeitando as chaves estrangeiras atuais.
4. Zerar saldo, salvar moeda/preferências/confirmação e incrementar as versões pertinentes na mesma transação.
5. Registrar a solicitação concluída em um registro mínimo de alterações de configuração, com `requestId` único, proprietário e resultado. Uma repetição por falha de rede deve retornar o resultado anterior, sem apagar lançamentos feitos depois da troca.
6. Revalidar `/`, `/transactions`, `/recurrences` e `/settings`; atualizar a interface com o estado retornado do servidor.

Se qualquer etapa falhar, a transação inteira deve ser revertida. A primeira configuração também deve ser atômica e idempotente.

### Concorrência e bloqueio efetivo

- Separar a obtenção/criação da carteira e leitura de preferências do processamento de recorrências. Ler preferências para abrir o modal nunca gera lançamentos.
- Criar uma verificação central de carteira configurada na camada de acesso a dados. Consultas financeiras e mutações devem chamá-la antes de buscar dados ou realizar efeitos colaterais.
- Nas mutações, repetir a condição de configuração e a comparação de `settingsVersion` dentro da operação transacional, sob a trava/condição atômica apropriada, usando os predicados do builder e as constraints do banco.
- Todos os formulários financeiros enviarão a versão das preferências que exibiram. Uma aba com formulário em BRL aberto antes da troca para USD receberá conflito e precisará atualizar; não poderá salvar o valor antigo na nova moeda.
- O retry atual de `createTransaction()` não poderá recarregar a nova carteira e reaplicar automaticamente uma solicitação com preferências antigas. Revisar também o retorno por `findExisting()` e a gestão de recorrências.
- O cron verifica configuração depois de adquirir a trava e não reaproveita dados de recorrências lidos antes de uma troca. Ele não processa carteiras pendentes.
- O layout serve à experiência do modal; não é a única barreira. As páginas e funções de dados devem tratar o estado pendente de forma consistente, sem executar consultas/processamento financeiro ao fundo.

## Datas, horas e fusos

### Datas de calendário e datas de ajustes

- Preservar `transactions.occurredOn` como data civil (`YYYY-MM-DD`), sem capturar hora nem criar `occurredAt`. A data escolhida continua igual em qualquer fuso, inclusive após uma alteração de preferências.
- Exibir dia da semana por extenso, dia, mês e ano no histórico, na última movimentação e nas listas de despesas, por exemplo **domingo, 25 de out. de 2026**. A localidade de exibição é independente da moeda.
- Formatar datas civis explicitamente em UTC a partir dos componentes da data, sem deslocamento pelo fuso do navegador ou servidor.
- `createdAt` continua sendo o instante de cadastro. Para ajustes de saldo, derivar sua data usando o fuso da carteira; não exibir hora.
- Recorrências mantêm o vencimento civil mesmo quando o cron registra a saída com atraso.
- Calcular “hoje”, mês atual e validação de datas futuras com o fuso persistido. Compartilhar as mesmas preferências entre consultas, servidor e cliente.
- Ordenar o histórico por data civil, cadastro e desempate estável. A seção **Última movimentação registrada** continua ordenada por cadastro.
- Atualizar as telas ao atravessar a meia-noite local, retomar a aba ou receber uma alteração de preferências em outra aba. O servidor rejeita formulários antigos.
- Usar catálogo estável de fusos na interface para manter HTML inicial e hidratação iguais, e validar o identificador no servidor.

### Recorrências por fuso

O cron deve selecionar carteiras configuradas e verificar vencimentos usando a data local de cada conta. O processamento transacional deve recalcular esse “hoje” com o fuso persistido após travar a carteira, evitando uma data fornecida pelo cliente ou calculada antes de uma alteração de preferências. Aplicar a mesma regra na recuperação ao abrir telas. Essa regra vale tanto para o serviço migrado para Drizzle quanto para funções PostgreSQL que ainda forem mantidas.

Preservar as regras de fim de mês, ano bissexto, frequência e idempotência por recorrência/data. Mudar fuso não reabre ocorrências já processadas nem altera seus vencimentos civis registrados.

O agendamento diário atual pode registrar um vencimento depois da meia-noite local. Esta entrega garante data contábil correta e recuperação ao abrir a aplicação; execução automática próxima da meia-noite em todos os países exigiria maior frequência e validação dos limites da hospedagem.

## Organização da implementação

| Etapa | Entrega e pontos principais |
| --- | --- |
| 1. Persistência, banco e contratos | Revisar a migração para Drizzle e validar driver, transações e isolamento; nova migration aditiva; schema de preferências; idempotência da configuração. Atualizar em nova migration somente as funções PostgreSQL que permanecerem em uso. Não modificar migrations históricas nem repetir o reset global presente no histórico. |
| 2. Regras no servidor | Separar leitura da conta e efeitos colaterais; bloquear carteira pendente; aplicar versões de preferências nas mutações; serviço atômico de configuração/troca com Drizzle como padrão. |
| 3. Interface obrigatória | Modal global, estados de carregamento/erro, página `/settings`, navegação desktop/celular e confirmação destrutiva com escopo completo. |
| 4. Moedas | Parametrizar formatadores e inputs por `currency` e `locale`; transportar preferências em dashboard/histórico/recorrências; atualizar saldo, cartões, gráficos, tooltips, ajustes e mensagens. |
| 5. Datas | consultas e DTOs consistentes; exibição completa; localToday por conta; cron e processamento de recorrências por fuso, integrados à persistência migrada. |
| 6. Verificação e publicação | Testar migrations e fluxos completos; validar produção em ambiente de teste; publicar banco e aplicação de maneira coordenada; atualizar README com as novas regras. |

Arquivos novos sugeridos: `schemas/settings/account-settings.ts`, `src/lib/currency.ts`, `src/lib/date-time.ts`, `src/db/mutations/settings.ts`, `src/app/(private)/settings/page.tsx` e componentes de formulário/modal de configurações. Ajustar a organização à camada de persistência resultante da migração; não é necessário criar `settings-sql.ts`. Reutilizar os componentes Base UI, React Hook Form, Zod e padrões visuais existentes.

A transição deve prever que o banco passa a aceitar moeda nula: publicar com janela controlada ou estratégia em etapas que impeça a aplicação antiga e o cron antigo de criarem carteiras ou movimentarem dados sem confirmação. Uma reversão para código que fixa BRL não é compatível com carteiras que já usam USD.

## Critérios de aceite e testes

1. Usuário novo e usuário antigo sem confirmação veem o modal obrigatório em todas as rotas privadas. Escape, clique externo, voltar/recarregar e navegação direta não liberam ações. Erro ao salvar mantém o bloqueio e permite tentar novamente.
2. Server Actions, serviços de persistência e cron recusam operações antes da configuração; funções PostgreSQL mantidas também verificam esse estado. Testar as entradas reais do servidor; o preview visual com dados fictícios não comprova esse bloqueio.
3. Confirmar BRL em conta antiga preserva os dados. Trocar para USD exige consentimento, apaga apenas os registros daquela carteira e zera o saldo. A mesma moeda, cancelamento e falha transacional preservam tudo.
4. Repetição da solicitação de troca não apaga novos dados; operações concorrentes e formulários antigos não reaplicam valores na nova moeda. Confirmar rollback e isolamento entre dois usuários no PostgreSQL.
5. As seis moedas funcionam em toda a aplicação, com símbolo/código e separadores coerentes com a localidade. Testar entrada, colagem, cursor, negativos em ajustes, limites e soma exata `0.10 + 0.20`.
6. Datas civis permanecem iguais em São Paulo, Nova York, Los Angeles e UTC+14. “Hoje”, ajustes e vencimentos usam o fuso correto, inclusive em mudanças de dia, mês, ano e horário de verão.
7. Histórico, última movimentação, despesas e gráficos concordam sobre datas e meses. Registros legados preservam sua data; nenhuma movimentação exibe ou exige horário.
8. Recorrências vencem pela data da conta, sem antecipação por um “hoje” global; não duplicam em mudanças de horário de verão, troca de fuso ou recuperação após atraso. Carteira pendente não recebe saídas automáticas.
9. Testar teclado, foco preso no modal, leitor de tela, celular e atualização das preferências em outra aba. Clientes desatualizados devem receber conflito mesmo quando ainda não atualizaram visualmente.
10. Estender os testes existentes com Node/PGlite e Playwright. Executar `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm db:check`, `pnpm test:ui` e a regressão PWA pertinente antes da entrega funcional.
11. Exercitar as consultas e mutações construídas pelo Drizzle, preservando resultados, filtros, paginação, calendário e regras financeiras durante a migração. Testar leituras do dashboard sob escritas concorrentes, conflitos de versão e rollback completo da troca de moeda.
12. Validar o mecanismo transacional com o driver realmente utilizado, em banco de teste isolado. Os testes com PGlite cobrem regras PostgreSQL, mas não comprovam por si só as garantias de transporte, lote e transação do driver Neon usado em produção.

## Guias locais consultados

O planejamento considera os guias desta instalação de Next.js em `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`, `03-layouts-and-pages.md` e `01-app/02-guides/authentication.md`. Eles exigem verificação dentro das Server Actions e junto ao acesso a dados; esconder filhos no layout não impede sua execução nem protege os endpoints.

## Validação local da implementação

- 44 testes de regras/persistência passaram com Node, Drizzle e PGlite, incluindo migration legada, bloqueio antes da configuração, isolamento, rollback, idempotência, conflito entre alterações e vencimentos por fuso.
- Os 27 cenários de interface passaram ao longo das execuções: a regressão existente foi executada e os cenários corrigidos de datas/configurações foram repetidos. O teste adicional com navegador em Los Angeles confirmou a sugestão do fuso e sua persistência sem escolher moeda automaticamente.
- TypeScript, ESLint e `drizzle-kit check` passaram. Os comandos utilizaram executáveis locais em `node_modules`, pois o Corepack tentou baixar uma versão de pnpm indisponível na rede do sandbox.
- A compilação com `next build --webpack` passou. O build padrão com Turbopack encontrou um erro interno ao iniciar o processo de transformação de CSS; essa limitação permanece neste ambiente.
- Para os testes visuais, o CSS foi compilado diretamente pelo loader `@tailwindcss/turbopack` já configurado no projeto. Na regressão de produção/PWA, esse CSS também foi aplicado aos artefatos locais do build alternativo, pois webpack não executa as regras de CSS configuradas somente para Turbopack. Não houve alteração na configuração de build do projeto.
- A regressão de produção/PWA passou nos cenários de manifesto, worker, proteção das rotas e login; o teste de estabilidade visual do login em desktop falhou numa execução completa e passou na repetição isolada. O código de login não foi alterado nesta implementação.
- A migration nova foi validada no banco isolado dos testes. Ela não foi aplicada ao banco configurado no ambiente e nenhum dado desse banco foi excluído. A publicação exige aplicar a migration e coordenar a atualização de aplicação e cron.
