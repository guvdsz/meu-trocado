# Meu Trocado

Aplicação de controle financeiro com Next.js, Clerk, Neon/PostgreSQL e Drizzle.

O dashboard em `/` reúne saldo, entradas, saídas, resumo mensal, última movimentação e ajuste manual de saldo. O histórico paginado fica em `/transactions`. As telas privadas ficam em `src/app/(private)`, protegidas pelo Clerk. Os dados são vinculados ao ID Google recebido pelo Clerk no servidor.

A implementação e as regras de autenticação/persistência estão em [docs/dashboard.md](docs/dashboard.md). O [planejamento original](docs/planejamento-mvp.md) registra as decisões iniciais do MVP.

Os formulários usam React Hook Form e Zod, com validações em `/schemas`, Server Actions nas rotas e schema Drizzle em `src/db/schema.ts`. A interface usa shadcn/Base UI com estilos próprios, calendário, popovers, navegação móvel e skeletons.

```sh
pnpm install
pnpm dev
```

Validação: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm db:check` e `pnpm test:ui` (testes visuais/acessibilidade com dados fictícios, sem banco ou conta Google).

Banco: `pnpm db:generate` gera migrations locais; `pnpm db:migrate` aplica no banco configurado em `DATABASE_URL`. Configure também as chaves do Clerk no `.env`.

## Instalar o aplicativo

O Meu Trocado é uma PWA. Com o site publicado em HTTPS, a instalação pode ser feita pelo menu do próprio navegador. A interface da aplicação não exibe avisos, botões ou instruções de instalação.

O manifesto está em `src/app/manifest.ts`. A logo usa as três moedas da marca existente; o SVG original fica em `public/brand/icon.svg`. `pnpm icons:generate` recria o favicon ICO (16/32/48 px), o SVG de aba, o ícone Apple (180 px) e os ícones PWA (192/512 px, incluindo maskable).

Não há modo offline nem registro de service worker em novas instalações. Quando a conexão cai com a aplicação aberta, um aviso pede para verificar a internet e desaparece quando a conexão volta. Consultar e alterar dados exige internet. O arquivo `public/sw.js` existe apenas para desativar workers de versões anteriores e limpar seu cache; ele não intercepta requisições nem armazena conteúdo. A aplicação também remove caches antigos dessa versão ao abrir.

Para testar a instalação no computador, use `pnpm build && pnpm start` em `localhost`. No celular, acessar pelo IP local exige HTTPS. `pnpm test:pwa` verifica os arquivos públicos, tamanhos dos ícones e remoção do worker/cache antigo contra o servidor de produção, sem conta Google ou acesso ao banco. `pnpm test:ui` também cobre o aviso de conexão.
