# Flare — Product & Architecture Brief

**Статус:** ideation / pre-MVP  
**Дата:** 2026-08-19  
**Тип:** modular monolith (Express API + React admin), не микросервисы  
**Цель:** realtime feature flags / kill-switch, который можно показать, заселить и продать как self-hosted или cloud lite

---

## 1. Для чего это приложение

Flare — это **пульт с тумблерами для функций продукта**.

В админке включают или выключают фичу. Сайт и API сразу начинают себя вести по-новому. **Деплой для этого не нужен.**

Само по себе Flare не продаёт товары и не принимает заказы. Оно только хранит тумблеры и отвечает другим программам: «эта фича сейчас включена» или «выключена».

### Три сценария

1. **Kill-switch.** Новая кнопка «Купить в 1 клик» ломается в проде. В админке выключаете флаг — кнопка пропадает у всех за секунду.
2. **Постепенный rollout.** Сначала 10% пользователей видят новую выдачу, потом 20%, потом все. Плохо — процент крутите назад.
3. **Один конфиг для бэка и фронта.** И сервер, и интерфейс читают одни и те же флаги. Не бывает ситуации, когда UI уже новый, а API ещё старый.

Без Flare обычно делают `if` в коде, переменную в `.env` или строку в Postgres. Чтобы поменять поведение, нужен деплой или ждут, пока кэш протухнет. Нет истории «кто выключил и когда».

---

## 2. Одна фраза (для резюме / лендинга)

Flare — платформа **realtime feature flags**: Postgres как source of truth, Redis как hot cache и pub/sub, WebSocket как канал доставки в SDK, Express как низколатентный evaluate API, React как админка.

---

## 3. Проблема

Команды выкатывают фичи быстрее, чем умеют их выключать. LaunchDarkly дорогой и тяжёлый. Самописный boolean в Postgres требует рестарта или polling.

| Боль | Как делают сейчас | Что ломается |
|------|-------------------|--------------|
| Выключить фичу в проде | деплой / env / ручной SQL | минуты, риск, нет аудита |
| Постепенный rollout | `if (userId % 100)` | нет дашборда, нельзя остановить |
| Один конфиг для API и UI | два источника правды | фронт и бэк расходятся |
| Кто нажал toggle и когда | Slack / память | нет audit log, нет rollback |

---

## 4. Кто платит

**Primary:** product-команда 3–20 инженеров на Node/React. Нужен kill-switch и % rollout без контракта LaunchDarkly. Покупает tech lead, пользуется каждый разработчик каждый день.

**Wedge:** self-host для команд, которые не отдадут targeting в чужой SaaS (EU, fintech). Канал — `docker compose`.

---

## 5. Стек (решение)

Лучший стек — тот, где путь «включён флаг или нет» короткий.

### Берём

| Технология | Роль | Если убрать |
|------------|------|-------------|
| TypeScript + Node.js | один язык в API, админке и SDK | — |
| **Express** | ingest + evaluate API | Nest на hot path лишний |
| **React + Vite** | админка: toggle, % bar, audit, live connections | нет покупаемого UX |
| **PostgreSQL + Prisma** | flags, rules, env, audit, tenancy | нет истории и мульти-тенанта |
| **Redis** | snapshot флагов, pub/sub, rate limit, presence SDK | каждый SDK бьёт в Postgres — продукт мёртв |
| **WebSocket (`ws`)** | push snapshot во все клиенты | останется polling |
| Zod | валидация входа | — |
| Docker Compose | демо и self-host одной командой | не продаётся разработчикам |
| npm workspaces | `apps/api`, `apps/web`, `packages/sdk-*` | как в ApproveFlow |

### Не берём в этом проекте

- **NestJS** — оставляем ApproveFlow и Relaykit.
- **BullMQ / очереди** — для тумблера хватает Redis pub/sub.
- **Socket.IO** — оба конца свои, fallback long-polling не нужен.
- **Next.js** — это админка, не публичный сайт.
- **Mongo, GraphQL, Kafka, микросервисы** — рано и вредно.

---

## 6. Архитектура MVP

Modular monolith. Hot path **не касается Prisma**.

```text
Admin (React)
    │  toggle
    ▼
API (Express)
    ├─ PostgreSQL  (source of truth, audit)
    └─ Redis SET snapshot + PUBLISH flags:{env}
              │
              ▼
         WS gateway  ──►  SDK (@flare/node, @flare/react)
              │
              └── evaluate: Redis GET, без Postgres
```

| Поток | Шаги |
|-------|------|
| Toggle в UI | React → Express → Prisma write → Redis SET snapshot → PUBLISH `flags:{env}` |
| SDK онлайн | WS subscribe → сразу полный snapshot из Redis → дальше только delta |
| Evaluate | in-process SDK или HTTP: Redis GET, без Postgres |
| Reconnect | SDK просит snapshot по version; если stale — полный resync |

Процессы в Compose: `api`, `web`, `postgres`, `redis`. Отдельный worker в v1 не нужен.

---

## 7. Доменная модель

| Сущность | Назначение |
|----------|------------|
| **Workspace** | multi-tenant корень |
| **User / Membership** | доступ в админку |
| **Environment** | `dev` / `prod` |
| **Flag** | ключ, тип (boolean / percentage / string), описание |
| **Rule** | all, %, userId allow/deny |
| **AuditEvent** | кто, когда, старое → новое значение |
| **SdkConnection** | live presence (в Redis, не обязательно в Postgres) |

Семантика: последнее записанное состояние побеждает. SDK должен переживать краткий разрыв WS и сделать resync.

---

## 8. MVP scope

### In scope (v1)

1. Auth + workspace + environments (`dev` / `prod`)
2. Boolean / percentage / string flags
3. Targeting: all, %, userId allow/deny
4. Redis snapshot + pub/sub
5. WS gateway для SDK и админки
6. npm SDK: `@flare/node` + `@flare/react`
7. Audit log + rollback последнего toggle
8. Live: сколько SDK подключено сейчас
9. `docker compose up`
10. Демо: два браузера + маленький Node-скрипт, toggle без reload

### Out of MVP (v2+)

- Multivariate / JSON remote config
- Сегменты (country, plan)
- Slack-алерт на kill-switch
- Stripe seats
- Approvals на prod flags (мост к ApproveFlow)
- SSO

---

## 9. Монетизация (черновик, не для кода MVP)

LaunchDarkly часто $10–20+ за seat. Flare продаёт **workspace**, не человека.

| План | Цена | Лимит | Зачем покупают |
|------|------|-------|----------------|
| Free / self-host OSS core | $0 | 2 env, 10 flags | привычка, GitHub |
| Cloud Pro | ~$12 / workspace | 50k client connections | не хостить Redis самим |
| Team | ~$29 / workspace | audit export, позже SSO | агентства и продуктовые команды |

---

## 10. Конкуренты — где щель

| Игрок | Сильная сторона | Щель для Flare |
|-------|-----------------|----------------|
| LaunchDarkly | enterprise, experimentation | цена, сложность, overkill |
| Unleash / GrowthBook | OSS, self-host | UX и realtime push слабее |
| ConfigCat / Flagsmith | hosted easy | мало «instant WS», слабый Node DX |
| Самопис в Postgres | бесплатно | нет push, нет SDK, нет аудита |

---

## 11. Критерий «можно показывать и продавать»

- Стек поднимается одной командой `docker compose up` меньше трёх минут.
- Открыты два браузера и маленький Node-скрипт.
- Toggle в админке — React-кнопка и API-ветка меняются без reload.
- В Redis виден snapshot, в UI — число живых SDK.

---

## 12. Целевая структура репозитория

```text
flare/
├── docs/PRODUCT.md      ← этот файл
├── README.md
├── apps/
│   ├── api/             ← Express HTTP + WS
│   └── web/             ← React + Vite админка
├── packages/
│   ├── sdk-node/        ← @flare/node
│   └── sdk-react/       ← @flare/react
├── docker-compose.yml
└── docs/adr/            ← когда дойдём до кода
```

---

## 13. Текст для резюме (черновик)

> Built Flare — a realtime feature-flag platform (Express, Redis, WebSockets, PostgreSQL): kill-switches and percentage rollouts pushed to Node and React SDKs in <100ms. Postgres as source of truth, Redis as hot cache/pub-sub; evaluate path never hits the database. Dockerized self-host; modular monolith.

---

*Документ фиксирует договорённости по Flare на старте. Код ещё не пишем, пока явно не попросили. При существенных изменениях scope — обновлять этот файл.*
