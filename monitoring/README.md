# Part B — Hospital Monitoring System

AdonisJS 7 application (server-rendered Edge views + Alpine.js, SQLite through Lucid,
live updates through Server-Sent Events with Transmit).

## Getting started

Requires Node.js 24 (see `.nvmrc`).

```bash
npm install
cp .env.example .env
node ace generate:key
node ace migration:run
npm run dev
```

Open http://localhost:3333 — the home page checks the server, the database and the live channel.

## Scripts

| Command                                           | Purpose                                               |
| ------------------------------------------------- | ----------------------------------------------------- |
| `npm run dev`                                     | Dev server with hot reload                            |
| `npm test`                                        | Unit + functional tests (Japa)                        |
| `npm run test:coverage`                           | Tests with coverage report (`coverage/`)              |
| `npm run lint` / `npm run format`                 | ESLint / Prettier                                     |
| `npm run typecheck`                               | TypeScript check                                      |
| `node ace adc:simulate --id=ADC-01 --interval=15` | Fake ADC unit for demos (Ctrl+C = communication loss) |

A pre-commit hook (Husky + lint-staged) lints and formats staged files. CI runs lint, typecheck
and tests on every pull request touching `monitoring/`.

## Database and scheduler

SQLite files live in `tmp/`: `db.sqlite3` for development, `test.sqlite3` for the tests
(migrated at the start of `npm test`, each test in a transaction rolled back afterwards).
Dates go through Lucid's default `datetime` columns, to the second (D-34); values given to
`where` must be formatted the way Lucid stores them (see `toColumn` in the history module).

`start/scheduler.ts` (web server only) runs the periodic operations of the modules: the
purge of expired records (`history.purgeExpired`, at start-up then every 24 h, FR-HIS-09).

## Code organization

Business logic lives in `app/modules/`, one folder per module of the D2 modular design
(docs/part-b/deliverable-2/modular-design-and-interfaces.md). Each module exposes a single
service (its interface, with pre-conditions and effects in doc comments), its exported
types in `types.ts` and its exceptions in `errors.ts` (a module storing data also has a
`models/` folder with its Lucid models, never imported from outside), and hides one anticipated change
(Parnas-style information hiding):

| Module              | Hides                                                           |
| ------------------- | --------------------------------------------------------------- |
| `clock`             | Where the current time comes from (swapped in tests)            |
| `history`           | Storage technology and retention                                |
| `users`             | Role → permission mapping                                       |
| `alarms`            | Alarm lifecycle and presentation rules                          |
| `cabinet_health`    | ADC state machine and offline timeouts                          |
| `inventory`         | Low-stock thresholds and alternative sources                    |
| `adc_communication` | ADC ↔ Monitoring protocol, message format and ADC addresses     |
| `reporting`         | Report formats and exports, patient identifier filtering        |
| `dashboard`         | Page layout and delivery to the browser (only user of Transmit) |

`app/modules/shared/` is not a module: it only holds the types and exceptions the module
interfaces are written in. `app/controllers/` belongs to the dashboard (pages) and to
`adc_communication` (ADC routes) and only adapts HTTP requests to module services. Modules
are imported through the `#modules/*` alias (e.g. `#modules/alarms/alarms_service`).
