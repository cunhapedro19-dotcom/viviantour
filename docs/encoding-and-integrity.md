# Codificação, integridade e recuperação

## Política

Todo texto de fonte, configuração, documentação, SQL, templates e testes usa UTF-8 sem BOM e LF. `.editorconfig`, `.gitattributes` e `.vscode/settings.json` orientam editores e Git. Não converter acentos para ASCII. Não remover ou substituir emojis para contornar o verificador.

O projeto usa Next.js 14.2.15, React 18.3.1 e TypeScript. Não houve atualização de framework nesta recuperação. ESLint é uma dependência de desenvolvimento compatível com essa versão do Next.

## Diagnóstico confirmado em 26/11/2026

- `79fd293` introduziu 124 caracteres U+FFFD em cadastro, administração, formulário de propriedade, curadoria e migração de curadoria. Os arquivos eram UTF-8 válido, mas seu conteúdo já tinha perdido caracteres. Também havia controles U+001A e U+001B nas duas telas existentes.
- O stash `25426c96b109b902ead91ab833a40f108f3d9e48` preservava versões corretas desses arquivos, com funcionalidades compatíveis com o estado atual. A recuperação comparou essas versões com os conflitos e com HEAD antes de reconstruir os arquivos.
- O README continha 14 bytes NUL em um trecho UTF-16LE concatenado a UTF-8 desde `e1b16ed`, primeiro commit do repositório. Esse trecho foi decodificado e mantido em UTF-8.
- O ambiente consultado usa Windows PowerShell 5.1 e console configurado como UTF-8. Isso não comprova qual comando criou a corrupção. Conversões anteriores com perda são compatíveis com os bytes encontrados, mas o processo e a ferramenta exatos não foram confirmados pelo histórico Git.
- O verificador anterior já detectava U+FFFD nas telas e de fato bloqueou o deployment `ad83e58`. Não era uma garantia de correção dos arquivos: não havia testes, SQL estava fora da seleção, controles eram ignorados e o próprio script era excluído para evitar falsos positivos de exemplos literais. Regex limitada também não cobria parte da pontuação Windows-1252.
- O dashboard Vercel mostrou o deploy de `ad83e58` com erro no comando de build e o de `72be047` pronto. Não confundir o último push com a versão publicada.

O inventário `integrity/encoding-inventory.json` registra 140 ocorrências individuais em seis arquivos no working tree inicial: inclui os controles e os 14 NUL, além dos caracteres U+FFFD. As strings originais estão escapadas em JSON para não reintroduzir corrupção literal. São dados de auditoria, não textos da interface.

## Verificações disponíveis

```powershell
rtk proxy npm run check:encoding
rtk proxy node scripts/check-text-encoding.mjs --json
rtk proxy python scripts/audit-encoding.py
rtk proxy npm run lint
rtk proxy npm run typecheck
rtk proxy npm test
rtk proxy npm run validate
rtk proxy npm run build
```

O verificador JavaScript faz decodificação UTF-8 estrita, rejeita BOM, caracteres de substituição, controles inesperados e conflitos residuais. Reconstrói sequências completas UTF-8 interpretadas como Windows-1252/Latin-1, incluindo camadas sucessivas, pontuação e emoji. Capitais legítimas como Ã e Â e português corretamente acentuado continuam válidos. Sequências menos conclusivas e entidades HTML duplamente escapadas produzem avisos para revisão. O comando não escreve nos arquivos e retorna erro diante de corrupção confirmada.

A seleção inclui arquivos rastreados e novos não ignorados, SQL, scripts, documentação e dotfiles relevantes. As exclusões expressas no script abrangem dependências, builds, caches, worktrees antigos, backups locais e material baixado de imóveis. Nenhuma pasta do código ativo `src/` é excluída. Arquivos `.env` privados ficam fora da análise de conteúdo e nunca devem aparecer em logs ou commits.

Strings JavaScript/TypeScript e JSON com escapes Unicode/hexadecimais também são analisadas depois de decodificadas pelo parser TypeScript. Somente a análise dos literais decodificados tem exceções exatas para o teste de codificação, o mapeamento do próprio verificador e o inventário histórico; seus bytes e textos literais continuam incluídos na auditoria normal.

`scripts/audit-encoding.py` percorre o filesystem sem importar o verificador JavaScript e sem depender do índice Git. Usa codecs Python estritos, categorias Unicode e padrões independentes. Permite comparar dois mecanismos. Ambos validam os bytes de fixtures; as strings intencionalmente corrompidas só são materializadas em memória durante os testes.

`tests/encoding.test.mjs` cobre os casos reais do inventário, bytes inválidos, UTF-16, BOM, U+FFFD, controles, pontuação, emojis, quatro camadas de corrupção, casos negativos e arquivos novos/SQL. `tests/integrity.test.cjs` testa WhatsApp, redirecionamentos, seleção de organização e estado da consulta de disponibilidade com mocks. `tests/calendar.test.cjs` mantém as regressões de iCal existentes.

Os testes SQL e os scripts em `tests/security/` exigem bancos fictícios isolados e não fazem parte do teste padrão sem essa preparação. Nunca apontá-los para produção. A migração local de permissões organizacionais e seus artefatos anteriores continuam pendentes de sua operação própria; esta recuperação não os aplica nem os publica.

## Barreiras de publicação

`npm run build` executa `npm run validate` antes de `next build`. Assim, codificação, lint, typecheck e testes são obrigatórios também no build Vercel. A configuração anterior `ignoreDuringBuilds` foi removida.

O workflow `.github/workflows/integrity.yml` executa instalação reprodutível, validação e build em push e pull request. O build CI usa demonstração sem credenciais de produção. O build Vercel continua usando o ambiente existente. Nenhum segredo precisa ser adicionado ao GitHub para esse workflow.

Não foram alteradas proteções remotas de branch. Para torná-las obrigatórias, o responsável pode abrir GitHub → Settings → Rules → Rulesets, selecionar `main`, exigir pull request e o check `integrity`, impedir force push e exclusão e salvar, quando o plano permitir. Testar a regra antes de depender dela. Sem proteção remota obrigatória, a barreira no próprio build permanece ativa; mudanças futuras no pipeline ainda precisam de revisão.

## Escrita segura no Windows

Para Python: `Path.read_text(encoding="utf-8")` e `Path.write_text(text, encoding="utf-8", newline="\n")`. Para Node: `readFileSync(path, "utf8")` e `writeFileSync(path, text, "utf8")`. Para validar bytes, usar decodificação estrita, sem `errors="replace"`.

No PowerShell 5.1, os padrões de leitura, `Set-Content`, `Out-File` e `>` podem divergir. Não usar pipelines de leitura e escrita para converter fontes. UTF-8 no console não corrige bytes previamente corrompidos. Preferir patches ou APIs explícitas; conferir diff e executar o verificador imediatamente após escrever.

`tsconfig.json` cobre `src/`, configuração Tailwind e tipos Next; cópias antigas em diretórios temporários não são entradas do compilador da aplicação.

## Recuperação e conflitos

1. Registrar `status`, referências, stashes, reflog, staged/unstaged e arquivos novos antes de editar.
2. Preservar o working tree e o arquivo `.git/index` em cópia local, inclusive quando há conflitos. Criar também `git bundle create <arquivo> --all`, conferir `git bundle verify` e hashes do arquivo e das entradas do backup.
3. Preservar segredos apenas em armazenamento local apropriado quando necessário; nunca enviá-los ao GitHub. O backup desta operação cobre fontes rastreadas e arquivos novos não ignorados; não inclui `.env.local`, que permaneceu intacto.
4. Criar branch dedicada; comparar versões base, atual, remota e stash por arquivo. Um stash pode conter arquivos não rastreados no terceiro pai, além da árvore principal.
5. Recuperar a lógica válida e textos originais; não reaplicar cegamente um stash parcialmente integrado. Não apagar os originais.
6. Executar as duas auditorias, resolver conflitos no índice, revisar diff e concluir todas as barreiras.

Para restaurar o backup, extrair `working-tree.zip` em diretório separado e conferir `manifest.json`; consultar `history.bundle` com `git bundle list-heads`. Para recuperar o índice em conflito, usar `git/index` somente numa cópia com o mesmo HEAD e objetos do bundle. Não substituir o working tree atual inteiro. Os patches, referências e reflog auxiliam a reconstrução manual.

## Publicação e rollback

Atualizar referências remotas e comparar com `origin/main`. Publicar somente arquivos revisados, sem `git add .` sobre trabalho pendente de outras operações. Integrar a recuperação a `main` de forma não destrutiva, enviar e acompanhar o CI e o deployment do SHA exato no projeto `viviantour` existente.

Confirmar o estado Ready, commit, ambiente Production e domínios no dashboard. Fazer requisições HTTP, conferir DOM desktop/mobile, erros de console, acentuação e WhatsApp. Validar rotas sem criar cadastros, reservas, alterações de calendário ou anúncios reais.

Rollback preferido de código: criar um novo commit com `git revert` dos commits da recuperação, revisar e executar as barreiras antes de publicar. Os commits antigos têm corrupção conhecida e o verificador não deve ser desligado para aceitá-los. Em emergência operacional, o responsável pode promover no dashboard uma publicação previamente verificada do mesmo projeto e depois reconciliar o Git. A Vercel pode suspender atribuição automática após rollback; confirmar essa configuração antes da publicação seguinte. Nenhum rollback de banco é necessário nesta operação, pois não são aplicadas migrações nem alterações de dados.

## Supabase e limitações

Consultas somente leitura confirmaram `UTF8` no servidor e cliente, 31 tabelas públicas com RLS habilitado e bucket `media` existente. A busca agregada por coluna em todas as 31 tabelas não encontrou os padrões de corrupção investigados. Ela não prova a ortografia de cada texto nem substitui revisão editorial de dados.

Os nomes de duas políticas já aplicadas da curadoria contêm caracteres de substituição; os predicados não foram alterados. O arquivo de migração foi corrigido para instalações futuras; uma política existente não é renomeada automaticamente. Renomeá-la em produção depende de autorização específica para alterar políticas. Não reexecutar a migração histórica para tentar corrigir nomes.

Avisos preexistentes dos advisors de segurança exigem análise própria de funções SECURITY DEFINER, search_path, extensões e proteção de senhas. Não alterar grants, funções ou RLS apenas para silenciar avisos nesta operação. A avaliação de saúde retornou sem alertas. Consultas e testes desta recuperação não mudam usuários, anúncios, preços, reservas, calendários, domínios ou propriedade.
