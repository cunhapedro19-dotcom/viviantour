# Manutenção do Vivian Tourr

## Ambiente e codificação

- Neste ambiente, prefixar comandos de terminal com `rtk`; usar `rtk proxy` quando necessário.
- Arquivos textuais devem ser UTF-8 sem BOM, com finais de linha LF. Preservar português brasileiro, pontuação e emojis.
- Nunca converter fontes para Windows-1252, ISO-8859-1 ou ASCII. Leituras e escritas devem declarar UTF-8 explicitamente.
- No Windows PowerShell 5.1, não usar `Get-Content | Set-Content`, `Out-File`, redirecionamentos ou substituições em massa para regravar fontes. Usar patches ou APIs de arquivo com UTF-8 explícito.
- Diferenciar bytes inválidos, texto já corrompido, exibição do terminal, dados do banco e versão antiga em produção. Não substituir acentos por letras sem acento.
- Não excluir fontes difíceis do verificador. Exemplos corrompidos de testes devem usar escapes Unicode ou ser construídos em memória.

## Preservação e Git

- Antes de editar: inspecionar branch, remoto, staged, unstaged, conflitos, arquivos novos e todos os stashes relevantes.
- Preservar alterações existentes. Se houver conflito, fazer backup do working tree, índice, referências e histórico; verificar sua recuperação antes de modificar.
- Comparar base, versão local, remota e stash individualmente; reconstruir as mudanças legítimas. Não selecionar `ours` ou `theirs` indiscriminadamente.
- Não apagar stashes ou backups automaticamente, nem usar force push, `reset --hard` ou `clean -fd`.
- Não publicar cópias temporárias, arquivos de ambiente, credenciais ou migrações pendentes de outras operações.
- Revisar o diff completo e buscar mudanças remotas antes do commit e da publicação.

## Desenvolvimento e testes

- Preservar funcionalidades, identidade visual, regras, preços, anúncios e integrações existentes.
- Investigar a causa e adicionar regressões pertinentes ao corrigir falhas. Nunca desabilitar verificações ou enfraquecer testes para publicar.
- Não criar, editar ou excluir dados reais para testar. Usar mocks, fixtures e ambientes isolados.
- Não aplicar migrações, alterar RLS, permissões, propriedade, DNS ou integrações sem autorização específica compatível com a operação.
- Mudanças de texto: executar `rtk proxy npm run check:encoding`; antes de concluir a recuperação, executar também `rtk proxy python scripts/audit-encoding.py` como verificação independente.

## Fluxo obrigatório de publicação

1. Inspecionar Git e preservar trabalho existente.
2. Implementar somente o escopo solicitado.
3. Executar `rtk proxy npm run validate` (codificação, lint, typecheck e testes).
4. Executar `rtk proxy npm run build`; o build deve passar pelas mesmas barreiras.
5. Revisar diff, segredos, funcionalidades preservadas e mudanças remotas.
6. Criar commits, enviar ao GitHub e integrar de forma não destrutiva à branch de produção.
7. Confirmar o CI e o deployment no projeto Vercel existente, associando o SHA exato.
8. Verificar HTTP, DOM, textos, metadados e principais rotas desktop/mobile em produção.
9. Registrar evidências e limitações. Push, build local ou site online isoladamente não comprovam deploy.

Instruções e recuperação: `docs/encoding-and-integrity.md`. Auditoria e relatório desta operação: `docs/integrity/`.
