# Pubky Bot Configurator

A Next.js web UI for creating and managing Pubky Bot Builder configurations. Users authenticate with their Pubky identity, then create service configs, bot configs, and datasets stored on their Pubky homeserver.

## Quick Reference

- **Framework:** Next.js 16 (App Router) + React 19
- **Runtime:** Node.js
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4 + shadcn/ui (Radix primitives)
- **State:** Zustand (auth) + TanStack React Query (server state) + React Hook Form (forms)
- **Storage:** Pubky homeserver (decentralized, no backend database)
- **Testing:** Vitest + React Testing Library
- **Dev:** `npm run dev`
- **Build:** `npm run build`
- **Test:** `npm run test:run`

## Architecture

```
User (Pubky Ring QR or Recovery File)
    ↓
Auth Store (Zustand + localStorage persistence)
    ↓
PubkyClient (SDK wrapper for read/write/list/delete)
    ↓
BotBuilderStorage (CRUD abstraction)
    ↓
Pubky Homeserver
    /pub/bot_builder/configs/{id}.json         → Bot Configs
    /pub/bot_builder/service_configs/{id}.json  → Service Configs
    /pub/bot_builder/datasets/{id}.json         → Datasets
```

### Data Flow
- **Auth:** Pubky Ring (QR code) or recovery file → session → Zustand store → localStorage
- **CRUD:** React Query hooks → BotBuilderStorage → PubkyClient → homeserver
- **Discovery:** Mini-indexer polls registered users' homeservers → file-based index
- **Schema loading:** Git URL → `/api/services/load` → parse TypeScript → extract manifest

## Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout with providers
│   ├── page.tsx                      # Dashboard (stats + quick actions)
│   ├── login/page.tsx                # Auth page (Ring QR + recovery file)
│   ├── configs/
│   │   ├── page.tsx                  # Bot config list
│   │   ├── new/page.tsx              # Create bot config
│   │   └── [id]/page.tsx             # Edit bot config
│   ├── service-configs/
│   │   ├── page.tsx                  # Service config list + discovery tab
│   │   ├── new/page.tsx              # Create service config
│   │   └── [id]/page.tsx             # Edit service config
│   ├── datasets/
│   │   ├── page.tsx                  # Dataset list
│   │   ├── new/page.tsx              # Create dataset
│   │   └── [id]/page.tsx            # Edit dataset
│   └── api/
│       ├── services/load/route.ts    # Load service manifest from Git URL
│       └── indexer/
│           ├── register/route.ts     # Register user for discovery
│           ├── search/route.ts       # Search indexed entities
│           └── reindex/route.ts      # Trigger full reindex
├── components/
│   ├── auth/                         # PubkyAuthWidget, RecoveryFileAuth
│   ├── configs/                      # BotConfigList, BotConfigEditor
│   ├── service-configs/              # ServiceConfigList, ServiceConfigEditor
│   ├── datasets/                     # DatasetList, DatasetEditor
│   ├── forms/
│   │   ├── schema-form.tsx           # JSON Schema → React form (recursive)
│   │   └── fields/                   # StringField, NumberField, BooleanField, etc.
│   ├── layout/                       # AppLayout, Sidebar, Header
│   ├── providers/                    # AuthProvider, QueryProvider
│   └── ui/                           # shadcn/ui primitives
├── hooks/
│   ├── use-bot-configs.ts            # CRUD hook for bot configs
│   ├── use-service-configs.ts        # CRUD hook for service configs
│   ├── use-datasets.ts              # CRUD hook for datasets
│   ├── use-service-schema.ts        # Load manifest from Git URL
│   └── use-search.ts               # Discovery search hooks
├── lib/
│   ├── config.ts                     # Environment config (testnet/staging/prod)
│   ├── pubky/client.ts              # Pubky SDK wrapper (read/write/delete/list)
│   ├── storage/bot-builder-storage.ts # CRUD abstraction for all entities
│   ├── services/service-loader.ts    # Git URL parsing, config validation
│   └── indexer/indexer.ts           # Mini-indexer for discovery
├── stores/
│   └── auth-store.ts                # Zustand auth state with persistence
├── types/
│   ├── service-config.ts            # ServiceConfig, ServiceManifest
│   ├── bot-config.ts                # BotConfig, ServiceReference
│   └── dataset.ts                   # Dataset type
└── __tests__/                       # Vitest test files

data/                                 # Indexer file storage (gitignored)
├── users.json                       # Registered user public keys
└── index.json                       # Indexed entities
```

## Key Data Models

### ServiceConfig (primary reusable entity)
```typescript
{
  configId: string;
  source: { type: "github"; location: string; entry?: string; version?: string };
  command: string;
  kind: "single_command" | "command_flow" | "listener";
  name: string;
  description?: string;
  tags?: string[];
  manifest: { serviceId, kind, command?, configSchema?, datasetSchemas? };
  config: Record<string, unknown>;      // actual service configuration
  datasets?: Record<string, string>;    // name → pubky:// URI
  createdAt: string;
  updatedAt: string;
}
```

### BotConfig (composition of service references)
```typescript
{
  configId: string;
  name: string;
  description?: string;
  version: string;
  services: ServiceReference[];        // command services
  listeners: ServiceReference[];       // listener services
  createdAt: string;
  updatedAt: string;
}

// ServiceReference
{
  serviceConfigRef: string;            // pubky:// URI to a ServiceConfig
  overrides?: { command?, config?, datasets? };
  adminOnly?: boolean;
  enabled?: boolean;
}
```

### Dataset
```typescript
{
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  schema?: JSONSchema;
  data: unknown;                       // the actual dataset content
  createdAt: string;
  updatedAt: string;
}
```

## Authentication

Two methods, both via `@synonymdev/pubky` SDK:

1. **Pubky Ring** (primary) — QR code scanned by mobile app, returns session (no keypair access)
2. **Recovery File** (fallback) — Upload `.pubky` file + passphrase, returns full keypair + session

Session is exported and persisted in localStorage. Auto-restored on app reload (8s timeout).

## Schema-Driven Forms

The `SchemaForm` component recursively renders JSON Schema as React forms:
- `string` → text input (or select if enum)
- `number/integer` → number input
- `boolean` → switch
- `array` → dynamic list with add/remove
- `object` → nested fieldset

Schemas come from service manifests loaded via the `/api/services/load` endpoint.

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/services/load` | POST | Fetch & parse service manifest from Git URL |
| `/api/indexer/register` | POST | Register user public key for discovery |
| `/api/indexer/search` | POST | Search indexed service configs & datasets |
| `/api/indexer/reindex` | GET/POST | Stats or trigger full reindex |

## Environment Variables

```bash
NEXT_PUBLIC_PUBKY_ENV          # testnet | staging | production
NEXT_PUBLIC_APP_NAME           # Display name
NEXT_PUBLIC_APP_VERSION        # Version string
NEXT_PUBLIC_PKARR_RELAYS       # Comma-separated relay URLs
NEXT_PUBLIC_PUBKY_HOMESERVER   # Homeserver public key
NEXT_PUBLIC_PUBKY_HOMESERVER_URL # Homeserver URL
NEXT_PUBLIC_PUBKY_RELAY        # Relay URL
DATA_DIR                       # Indexer data dir (default: ./data)
```

## Companion Project

The **Pubky Bot Builder** (`../pubky_bot_builder_telegram/`) is the Deno-based Telegram bot that reads configs created by this UI from users' Pubky homeservers at runtime.

**Data flow:** Configurator writes → Pubky homeserver → Bot fetches via `resolveModularBotConfig()` → Builds snapshot → Runs services in sandbox

**Service source code** lives in the bot builder repo under `packages/core_services/` (e.g., event-creator) and `packages/demo_services/`. The configurator loads manifests from these sources via GitHub raw URLs.

**Config resolution chain:** When the bot loads a modular config, it:
1. Fetches the `BotConfig` from the user's homeserver
2. For each `ServiceReference`, fetches the `ServiceConfig` (also from homeserver)
3. Merges overrides (command, config, datasets)
4. Enriches config (e.g., fetches calendar names from Pubky)
5. Builds routing snapshot with bundled service code

## Service Manifest Loading

The `/api/services/load` route fetches raw TypeScript from GitHub, parses it to extract the service manifest:

1. Fetches raw `.ts` file from GitHub (converts to `raw.githubusercontent.com` URL)
2. Parses TypeScript using regex to find `defineService()` or `PubkyServiceSpec` object
3. Extracts `serviceId`, `kind`, `command`, `configSchema`, `datasetSchemas`

**Known issues:**
- Parser must handle constant references (e.g., `kind: SERVICE_KIND` → resolve from `const SERVICE_KIND = "command_flow"`)
- `items` in array schemas may not resolve constant references (e.g., `items: CALENDAR_OPTION_SCHEMA`) — the schema arrives without `items`, causing SchemaForm to render bare string arrays instead of object arrays

## Important Patterns

- **`configId` vs `serviceId`:** `configId` in stored configs is a randomly generated ID (e.g., `1719234567-abc1234`), NOT the service ID. `manifest.serviceId` comes from the source code.
- **React Query cache:** `invalidateQueries` serves stale cache first then refetches in background. For forms that initialize from props via `useState`, use `removeQueries` instead to force fresh fetch + loading state.
- **Calendar config format:** Web configurator stores calendars as `CalendarOption[]` objects (`{ uri, name, description, isDefault }`). The bot also handles plain URI strings for backwards compatibility.

## Development Notes

- UI components use shadcn/ui conventions — add new ones with `npx shadcn@latest add <component>`
- All data is on Pubky homeserver — there is no backend database
- The mini-indexer stores state in `data/` directory (file-based, gitignored)
- Service manifest loading happens server-side (API route) to avoid CORS issues
- React Query handles caching and invalidation for all CRUD operations
- Forms use react-hook-form with Zod validation for local form state
- **JSON config mutations are not a concern** — services are not deployed yet, so breaking changes to config schemas, data models, or stored formats can be made freely without migration worries
