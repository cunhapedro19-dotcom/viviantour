# Vivian Tourr — backup de leitura (2026-11-25)

## Destino confirmado

- Projeto Supabase: `ytyzmjrfyokctxnkbybe` (`viviantour`)
- Estado: `ACTIVE_HEALTHY`
- Região: `us-west-2`
- PostgreSQL: 17.11
- Operação: somente leitura via Supabase MCP; nenhuma escrita remota executada.

## Inventário verificado

| Objeto | Quantidade |
|---|---:|
| profiles | 4 |
| organizations | 2 |
| properties | 21 |
| property_photos | 280 |
| services | 12 |
| service_media | 67 |
| combos | 5 |
| external_calendars | 14 |
| calendar_events | 871 |
| storage.objects | 366 |

As duas contas administrativas foram preservadas e confirmadas por leitura. Os cinco combos foram identificados, sem alteração de `booking_whatsapp`.

## Migrations remotas observadas

O histórico remoto termina em `20261120163709_combo_price_options_and_whatsapp`. As migrations candidatas `20261125212000_mvp_admin_only_containment.sql` e `20261125213000_informational_calendar_state.sql` ainda não estão remotas.

## Código preservado

- Versão publicada: estado anterior à branch candidata, preservado no repositório.
- Candidato: `33a1db7646e331f3c7f136bb0ee3910dc1cc7555`.
- Fase 5: `7ad0c64840955c3e711a7a0f8872d5066ed2e262`.
- Contenção local: `d761d9a516f43b3f0ed1ae74005c9c385d7f0476`.

## Limite do backup desta etapa

O conector autorizado fornece inventário e consultas SQL de leitura, mas não expõe exportação física `pg_dump`, blobs do Storage nem chaves/segredos. Portanto este arquivo é um manifesto verificável do snapshot remoto; o dump físico completo de banco, Auth e Storage deve ser obtido pelo procedimento operacional do painel/CLI antes da implantação. Nenhuma credencial foi registrada.
