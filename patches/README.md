# Patch do Clerk UI

`@clerk__ui@1.41.2.patch` retorna a Promise do envio de senha nas duas versões
do componente do Clerk. Isso mantém o botão em carregamento até a resposta e
impede novos envios durante a autenticação.

O patch é aplicado pelo pnpm durante a instalação. Inclua esta pasta no Git
junto com `pnpm-workspace.yaml` e `pnpm-lock.yaml`; a Vercel precisa do arquivo
no checkout para instalar as dependências. `.gitattributes` preserva suas
quebras de linha para manter o mesmo hash no Windows e no Linux.

Ao atualizar `@clerk/ui`, confira se a correção já existe no pacote oficial.
Nesse caso, remova a referência em `patchedDependencies`, o patch e regenere o
lockfile. O teste `tests/pwa/sign-in-password-loading.spec.ts` verifica o loader
de senha sem enviar credenciais ao Clerk.
