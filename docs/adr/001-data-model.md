# 001 — Flag отдельно от FlagState

**Статус:** accepted  
**Дата:** 2026-08-19

## Контекст

У флага один ключ на workspace (`buy-one-click`), но значения разные в `dev` и `prod`. Targeting (rules), `enabled` и `version` тоже per-environment: в prod можно выключить то, что в dev включено.

## Решение

- `Flag` — идентичность: ключ, тип, описание, archive.
- `FlagState` — runtime на окружение: `enabled`, `defaultValue`, `version`, `Rule[]`.
- Snapshot в Redis собирается из `FlagState` одного `Environment`, не из всего workspace.

## Последствия

Toggle и rollout не плодят копии ключа. Evaluate и SDK всегда читают один env. Общий ключ нельзя переименовать только в prod — это ключ флага, не состояния.
