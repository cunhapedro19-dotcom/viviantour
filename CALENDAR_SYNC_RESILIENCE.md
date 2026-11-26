# Fase 5 — proteção da sincronização de calendários

Branch independente `fix/calendar-sync-resilience`, criada de `main` em worktree separado. O checkout `fix/security-organization-permissions`, seus arquivos não commitados e os backups anteriores foram preservados. Nenhum calendário ou dado de produção foi alterado.

## Falha no código anterior

`finish_calendar_sync` excluía imediatamente todo UID ausente do payload. Um feed iCal sintaticamente válido mas vazio, ou parcialmente retornado pela origem, podia remover todos ou parte dos bloqueios importados e liberar datas. Mudanças de datas para um mesmo UID também sobrescreviam o intervalo antigo na primeira leitura. O parser já rejeitava HTML, dados inválidos e recorrências problemáticas, mas isso não protege contra snapshots válidos porém incompletos.

## Correção local

A migração `20261125194922_protect_calendar_sync_deletions.sql` mantém a função RPC em uma transação, com o lock/token existente. Ela rejeita payload não array, UIDs repetidos/vazios e intervalos inválidos. Feed vazio só é aceito quando o calendário ainda não possui eventos. Se um snapshot remover ou alterar um bloqueio antigo, a primeira leitura preserva as datas antigas e adiciona novas ocupações; eventos movidos bloqueiam a união dos intervalos. Uma segunda leitura com o mesmo conjunto de UID/intervalos/status, após no mínimo seis horas, confirma a liberação. O ciclo diário existente permanece inalterado. `property_blocks` e reservas não são tocados.

O painel mostra `Alteração aguardando confirmação` e informa que os bloqueios anteriores continuam ativos. `imported_count` passa a refletir os eventos armazenados, inclusive os retidos por segurança. A leitura nova é registrada, mas o status não aparece como sincronização concluída enquanto houver liberação pendente.

## Testes

Banco local `vivian_calendar_phase5`, clonado do schema de referência validado na Fase 4, sem dados reais. A migração completa executou com `psql -X -v ON_ERROR_STOP=1 -f` e código 0. O teste `tests/calendar-sync-resilience.sql` usa exclusivamente usuário, organização, imóvel, calendário e bloqueio fictícios e encerra com `ROLLBACK`; código 0. Cobre importação inicial, feed vazio indevido, remoção parcial, repetição antes/depois de seis horas, mudança de intervalo com bloqueio conservador, UID duplicado, calendário novo vazio, token expirado e preservação de bloqueio manual. Testa execução da RPC sob `service_role` e revogação de `EXECUTE` para `anon`/`authenticated`.

Os 13 testes existentes de parser/URL/SSRF passaram. Typecheck e build local passaram usando dependências já instaladas por meio de junction local `node_modules` no worktree; não houve instalação. O build foi executado antes de um último ajuste apenas no texto exibido no painel; o typecheck final foi repetido após esse ajuste.

## Riscos e implantação futura

- Duas leituras iguais de um feed **persistentemente errado** podem confirmar uma liberação depois de seis horas. A medida reduz liberação por falha transitória, mas não prova a verdade do calendário de origem. Um feed totalmente vazio com bloqueios existentes nunca limpa automaticamente; exige investigação/manual para evitar falso livre.
- A confirmação pode deixar datas indisponíveis por mais um ciclo diário. Isso privilegia evitar dupla reserva. Não alteramos a frequência do cron nem calendários reais.
- O botão de desconectar calendário continua uma ação explícita separada que pode remover eventos por cascata. Não foi modificado nesta fase; precisa de confirmação de produto antes de mudar esse fluxo.
- Testes locais usam PostgreSQL, não Auth/Storage Supabase real; a homologação completa segue pendente por limite gratuito de projetos. A migração não deve ser enviada por `db push` até a reconciliação das migrações e a aprovação do procedimento de implantação.
- Em caso de falha após implantação futura, não restaurar automaticamente a função antiga, pois ela volta a liberar datas em um snapshot incompleto. Contenção preferencial: suspender a sincronização automática e preservar eventos existentes até corrigir incrementalmente a função.
