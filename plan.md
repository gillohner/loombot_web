# Pubky Bot Configurator - Implementation Plan

## Overview

A Next.js web application for configuring Telegram bots built with `pubky_bot_builder_telegram`.
Allows users to authenticate via Pubky Ring, create/manage bot configurations, service configs, and
datasets - all stored on their Pubky homeserver.

## Data Path Structure

All data stored under the user's homeserver at:

```
/pub/bot_builder/
├── configs/
│   └── {config_id}.json          # Bot configuration files
├── service_configs/
│   └── {service_id}.json         # Service-specific configurations
└── datasets/
    └── {dataset_id}.json         # Reusable datasets
```

### Data Models

#### Service Config (`/pub/bot_builder/service_configs/{id}.json`) - **Primary Entity**

Service configs are the main reusable, shareable entities. Anyone can create a service config,
and anyone can include it in their bot configs. This enables a "marketplace" of configured services.

```typescript
interface ServiceConfig {
	id: string;
	// Service source info
	source: string; // Git URL to the service (e.g., github.com/user/repo/services/url-cleaner)
	sourceVersion?: string; // Pinned version/commit
	// Metadata
	name: string; // Human-readable name (e.g., "Privacy URL Cleaner")
	description?: string; // What this config does
	tags?: string[]; // For discovery (e.g., ["privacy", "links", "listener"])
	author?: string; // Creator's pubky public key
	// Service manifest (cached from source)
	manifest: {
		serviceId: string;
		kind: "single_command" | "command_flow" | "listener";
		command?: string; // Default command
		configSchema?: JSONSchema;
		datasetSchemas?: DatasetSchemas;
	};
	// Configuration
	config: Record<string, unknown>; // The actual service configuration
	datasets?: Record<string, string>; // name → pubky:// URI to dataset
	// Timestamps
	createdAt: string;
	updatedAt: string;
}
```

#### Bot Config (`/pub/bot_builder/configs/{id}.json`)

Bot configs are compositions of service configs. They define which services run on a specific bot,
with optional per-bot overrides.

```typescript
interface BotConfig {
	configId: string;
	name: string;
	description?: string;
	version: string;
	createdAt: string;
	updatedAt: string;
	// Services reference existing service configs by pubky:// URI
	services: ServiceReference[];
	listeners: ServiceReference[];
}

interface ServiceReference {
	// Reference to the service config
	serviceConfigUri: string; // pubky://{owner}/pub/bot_builder/service_configs/{id}
	// Per-bot overrides (optional)
	commandOverride?: string; // Use different command for this bot
	configOverrides?: Record<string, unknown>; // Override specific config fields
	datasetOverrides?: Record<string, string>; // Override datasets
	enabled?: boolean; // Enable/disable for this bot (default: true)
}
```

#### Dataset (`/pub/bot_builder/datasets/{id}.json`)

Datasets are also shareable entities that can be referenced by service configs.

```typescript
interface Dataset {
	id: string;
	// Metadata
	name: string;
	description?: string;
	tags?: string[]; // For discovery
	author?: string; // Creator's pubky public key
	// Schema info (for validation in UI)
	schemaSource?: string; // Git URL to service that defines the schema
	schemaDatasetName?: string; // Name of the dataset schema in that service
	// Data
	data: unknown; // The actual dataset content
	// Timestamps
	createdAt: string;
	updatedAt: string;
}
```

### Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         DISCOVERY                                │
│  Mini-indexer tracks all users' homeservers for:                │
│  - Service Configs (searchable by name, tags, source)           │
│  - Datasets (searchable by name, tags, schema)                  │
│  - Bot Configs (optional, for sharing complete bot setups)      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Service Config │◄───│    Bot Config    │    │     Dataset      │
│   (Reusable)     │    │   (Composition)  │    │    (Reusable)    │
├──────────────────┤    ├──────────────────┤    ├──────────────────┤
│ - Git source URL │    │ - References     │    │ - Schema info    │
│ - Config values  │    │   service configs│    │ - JSON data      │
│ - Dataset refs   │────┼─ - Per-bot       │    │ - Tags           │
│ - Tags           │    │   overrides      │    └──────────────────┘
└──────────────────┘    └──────────────────┘              ▲
         │                                                 │
         └─────────────────────────────────────────────────┘
                    (references datasets)
```

---

## Phase 1: Project Setup & Authentication

### 1.1 Initialize Next.js Project

- [ ] Create Next.js 15 app with TypeScript, Tailwind CSS, shadcn/ui
- [ ] Setup project structure following eventky patterns
- [ ] Add dependencies:
  - `@synonymdev/pubky` - Pubky SDK
  - `zustand` - State management
  - `react-hook-form` - Form handling
  - `@hookform/resolvers` + `zod` - Form validation
  - `qrcode` - QR code generation for Pubky Ring
  - `sonner` - Toast notifications
  - `lucide-react` - Icons

### 1.2 Authentication (Reference: eventky)

Copy and adapt from eventky:

- [ ] `stores/auth-store.ts` - Zustand store with persistence
  - `signin()` - Recovery file auth
  - `signinWithSession()` - Pubky Ring auth
  - `restoreSessionFromExport()` - Session restoration
  - `logout()`
- [ ] `lib/pubky/client.ts` - Pubky SDK wrapper
  - `signin(keypair)` - Create session
  - Storage read/write methods
- [ ] `components/providers/auth-provider.tsx` - React context
- [ ] `components/ui/pubky-auth-widget.tsx` - QR code widget
- [ ] `app/login/page.tsx` - Login page with:
  - Pubky Ring QR code auth (primary)
  - Recovery file upload (fallback)
  - Third-party cookie detection warning

### 1.3 Config for Environments

- [ ] `lib/config.ts` - Environment configuration
  - Homeserver URL
  - Relay URL for auth
  - Testnet vs mainnet toggle

---

## Phase 2: Core Storage Layer

### 2.1 Pubky Storage Abstraction

```typescript
// lib/storage/bot-builder-storage.ts
class BotBuilderStorage {
	// Configs
	async listConfigs(): Promise<BotConfig[]>;
	async getConfig(id: string): Promise<BotConfig | null>;
	async saveConfig(config: BotConfig): Promise<void>;
	async deleteConfig(id: string): Promise<void>;

	// Service Configs
	async listServiceConfigs(): Promise<ServiceConfig[]>;
	async getServiceConfig(id: string): Promise<ServiceConfig | null>;
	async saveServiceConfig(config: ServiceConfig): Promise<void>;
	async deleteServiceConfig(id: string): Promise<void>;

	// Datasets
	async listDatasets(): Promise<Dataset[]>;
	async getDataset(id: string): Promise<Dataset | null>;
	async saveDataset(dataset: Dataset): Promise<void>;
	async deleteDataset(id: string): Promise<void>;
}
```

### 2.2 React Hooks

- [ ] `hooks/use-bot-configs.ts` - CRUD for bot configs
- [ ] `hooks/use-service-configs.ts` - CRUD for service configs
- [ ] `hooks/use-datasets.ts` - CRUD for datasets
- [ ] `hooks/use-service-schema.ts` - Fetch schema from git URL

---

## Phase 3: Service Discovery & Schema Loading

### 3.1 Git URL Service Loader

```typescript
// lib/services/service-loader.ts
interface LoadedService {
	manifest: ServiceManifest;
	configSchema?: JSONSchema;
	datasetSchemas?: DatasetSchemas;
}

async function loadServiceFromGit(gitUrl: string): Promise<LoadedService>;
```

**Implementation approach:**

1. Parse git URL to identify repository and path
2. Fetch `mod.ts` or `service.ts` from the repository (raw file)
3. Extract manifest, configSchema, datasetSchemas from the module
4. Options:
   - **Option A:** Use a bundler/transpiler to parse the TypeScript
   - **Option B:** Require services to export a separate `schema.json`
   - **Option C:** Use dynamic import if CORS allows (unlikely for GitHub)
   - **Option D:** Backend API endpoint that fetches and parses

**Recommended: Option D** - Create an API route that:

- Clones/fetches the service file
- Bundles it with esbuild (like the bot does)
- Executes in a sandbox to extract manifest and schemas
- Returns the schema JSON to the frontend

### 3.2 API Route: `/api/services/load`

```typescript
// app/api/services/load/route.ts
export async function POST(req: Request) {
	const { gitUrl } = await req.json();
	// Fetch, bundle, extract schemas
	return Response.json({ manifest, configSchema, datasetSchemas });
}
```

---

## Phase 4: Schema-Driven Form Builder

### 4.1 JSON Schema → Form Component

```typescript
// components/forms/schema-form.tsx
interface SchemaFormProps {
	schema: JSONSchema;
	value: Record<string, unknown>;
	onChange: (value: Record<string, unknown>) => void;
	overrides?: Record<string, unknown>; // Optional overrides layer
}
```

**Field type mapping:**

| JSON Schema Type     | Component                                     |
| -------------------- | --------------------------------------------- |
| `string`             | `<Input />`                                   |
| `string` + `enum`    | `<Select />`                                  |
| `string` + `format`  | Specialized (URL input, date picker, etc.)   |
| `number` / `integer` | `<Input type="number" />`                     |
| `boolean`            | `<Switch />` or `<Checkbox />`                |
| `array`              | Dynamic list with add/remove                  |
| `object`             | Nested `<SchemaForm />` or collapsible section |

### 4.2 Form Components

- [ ] `components/forms/schema-form.tsx` - Main recursive form builder
- [ ] `components/forms/fields/string-field.tsx`
- [ ] `components/forms/fields/number-field.tsx`
- [ ] `components/forms/fields/boolean-field.tsx`
- [ ] `components/forms/fields/array-field.tsx`
- [ ] `components/forms/fields/object-field.tsx`
- [ ] `components/forms/fields/enum-field.tsx`

### 4.3 Override Support

Config form should support a "base + overrides" pattern:

```tsx
<SchemaForm
	schema={configSchema}
	value={baseConfig}
	onChange={setBaseConfig}
/>

<OverrideEditor
	schema={configSchema}
	baseValue={baseConfig}
	overrides={overrides}
	onOverridesChange={setOverrides}
/>
```

Override editor shows:

- Only fields that differ from base
- Add override button per field
- Clear override button to revert to base

---

## Phase 5: UI Pages & Navigation

### 5.1 Layout & Navigation

```
/                           # Dashboard / Home
/login                      # Authentication
/configs                    # List bot configs
/configs/new                # Create new bot config
/configs/[id]               # View/edit bot config
/configs/[id]/services      # Manage services in config
/service-configs            # List service configs
/service-configs/new        # Create service config
/service-configs/[id]       # View/edit service config
/datasets                   # List datasets
/datasets/new               # Create dataset
/datasets/[id]              # View/edit dataset
```

### 5.2 Page Components

#### Dashboard (`/`)

- [ ] Quick actions: Create config, Add service, Create dataset

#### Bot Configs List (`/configs`)

- [ ] Table/grid of **your** bot configs
- [ ] Create new button
- [ ] Search/filter
- [ ] Actions: Edit, Duplicate, Delete, Export

#### Bot Config Editor (`/configs/[id]`)

- [ ] Config name, description
- [ ] **Add Service** button → opens service search/discovery
- [ ] Services list showing:
  - Service config name + source
  - Current command (with override option)
  - Quick config override toggle
  - Enable/disable toggle
  - Remove button
- [ ] Listeners section (same as services)
- [ ] Export as JSON button
- [ ] Copy pubky:// URI button

#### Service Configs List (`/service-configs`)

- [ ] **Two tabs: "My Configs" and "Discover"**
- [ ] My Configs: Your created service configs
- [ ] Discover: Search all service configs across the network
  - Search by name, tags, source URL
  - Filter by service kind
  - Show author, usage count (if tracked)
- [ ] Create new button
- [ ] Actions: Edit, Duplicate, Delete, Fork (copy to your homeserver)

#### Service Config Editor (`/service-configs/[id]`)

- [ ] **Step 1:** Enter Git URL → loads service manifest + schemas
- [ ] **Step 2:** Fill in metadata (name, description, tags)
- [ ] **Step 3:** Configure service using schema-driven form
- [ ] **Step 4:** Attach/create datasets if needed
- [ ] Save / Publish
- [ ] Preview: Show JSON that would be stored

#### Dataset List (`/datasets`)

- [ ] **Two tabs: "My Datasets" and "Discover"**
- [ ] Similar to service configs
- [ ] Filter by schema/service type

#### Dataset Editor (`/datasets/[id]`)

- [ ] Name, description
- [ ] Schema selector (from known service schemas)
- [ ] If schema selected: Schema-driven data editor
- [ ] If no schema: Raw JSON editor (Monaco or similar)
- [ ] Save / Delete

---

## Phase 6: Discovery & Search

### 6.1 Mini-Indexer Architecture

Track all users who log in, then poll their homeservers for service configs and datasets.

```typescript
// lib/indexer/indexer.ts
interface IndexedEntity {
	uri: string; // pubky:// URI
	type: "service_config" | "dataset" | "bot_config";
	owner: string; // Public key
	name: string;
	description?: string;
	tags: string[];
	// Service config specific
	source?: string; // Git URL
	kind?: string; // single_command, command_flow, listener
	// Timestamps
	indexedAt: string;
	updatedAt: string;
}

class Indexer {
	// Called when user logs in
	async registerUser(publicKey: string): Promise<void>;

	// Background job: poll all registered homeservers
	async reindexAll(): Promise<void>;

	// Search
	async searchServiceConfigs(query: SearchQuery): Promise<IndexedEntity[]>;
	async searchDatasets(query: SearchQuery): Promise<IndexedEntity[]>;
}
```

### 6.2 Storage for Index

Use simple file-based or SQLite storage (not Nexus):

```
/data/
├── users.json           # List of registered public keys
└── index.json           # Indexed entities (or SQLite db)
```

### 6.3 Search UI

```tsx
<ServiceConfigSearch
	onSelect={(serviceConfig) => addToBot(serviceConfig)}
	filters={{ kind: "listener", tags: ["privacy"] }}
/>
```

---

## Phase 7: Add Service to Bot Flow

### 7.1 "Add Service" Flow (in Bot Config Editor)

1. User clicks "Add Service"
2. Opens search modal with:
   - Search input
   - Filter by kind, tags
   - Results from mini-indexer
3. User selects a service config
4. Shows preview: name, description, current config
5. Optional: Set command override, config overrides
6. Add to bot config as `ServiceReference`

### 7.2 "Create New Service Config" Flow

If user wants a custom config not available:

1. User clicks "Create New" in service search
2. Enters Git URL
3. System loads manifest + schemas
4. User fills config form
5. Saves to their homeserver
6. Automatically added to bot config
```

---

## Phase 8: Polish & UX

### 7.1 UI/UX Enhancements

- [ ] Loading states and skeletons
- [ ] Error handling and display
- [ ] Form validation feedback
- [ ] Autosave drafts (localStorage)
- [ ] Unsaved changes warning
- [ ] Mobile-responsive design
- [ ] Dark mode support

### 7.2 Export & Import

- [ ] Export bot config as JSON
- [ ] Export with embedded datasets
- [ ] Import from JSON file
- [ ] Share config via pubky:// URI

### 7.3 Service Registry (Optional Future)

- [ ] Browse known/popular services
- [ ] Service categories
- [ ] One-click install

---

## Technical Decisions

### State Management

- **Zustand** for auth state (persisted)
- **React Query / TanStack Query** for server state (configs, datasets)
- **React Hook Form** for form state

### Styling

- **Tailwind CSS** for utility styles
- **shadcn/ui** for components
- **Consistent with eventky** for brand coherence

### API Routes

- `/api/services/load` - Load service manifest from git URL
- `/api/indexer/search` - Search indexed service configs and datasets
- `/api/indexer/reindex` - Trigger reindex (admin/cron)
- Future: `/api/preview` - Preview bot config

---

## File Structure

```
pubky_bot_configurator/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Dashboard
│   ├── login/
│   │   └── page.tsx
│   ├── configs/                    # Bot Configs (your compositions)
│   │   ├── page.tsx                # List your bot configs
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx            # Edit bot config
│   ├── service-configs/            # Service Configs (reusable)
│   │   ├── page.tsx                # My configs + Discover tabs
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   ├── datasets/                   # Datasets (reusable)
│   │   ├── page.tsx                # My datasets + Discover tabs
│   │   ├── new/
│   │   │   └── page.tsx
│   │   └── [id]/
│   │       └── page.tsx
│   └── api/
│       ├── services/
│       │   └── load/
│       │       └── route.ts        # Load service from git
│       └── indexer/
│           ├── search/
│           │   └── route.ts        # Search indexed entities
│           └── reindex/
│               └── route.ts        # Trigger reindex
├── components/
│   ├── providers/
│   │   └── auth-provider.tsx
│   ├── ui/                         # shadcn components
│   ├── forms/
│   │   ├── schema-form.tsx         # JSON Schema → Form
│   │   └── fields/
│   ├── configs/
│   │   ├── bot-config-list.tsx
│   │   ├── bot-config-editor.tsx
│   │   └── service-reference-card.tsx
│   ├── service-configs/
│   │   ├── service-config-list.tsx
│   │   ├── service-config-editor.tsx
│   │   └── service-config-search.tsx  # Discovery search
│   ├── datasets/
│   │   ├── dataset-list.tsx
│   │   ├── dataset-editor.tsx
│   │   └── dataset-search.tsx
│   └── layout/
│       ├── sidebar.tsx
│       └── header.tsx
├── hooks/
│   ├── use-bot-configs.ts          # CRUD for bot configs
│   ├── use-service-configs.ts      # CRUD for service configs
│   ├── use-datasets.ts             # CRUD for datasets
│   ├── use-service-schema.ts       # Load schema from git
│   └── use-search.ts               # Search indexed entities
├── lib/
│   ├── config.ts
│   ├── pubky/
│   │   └── client.ts
│   ├── storage/
│   │   └── bot-builder-storage.ts
│   ├── services/
│   │   └── service-loader.ts
│   └── indexer/
│       ├── indexer.ts              # Indexing logic
│       └── storage.ts              # Index storage (SQLite/JSON)
├── stores/
│   └── auth-store.ts
├── types/
│   ├── auth.ts
│   ├── bot-config.ts
│   ├── service-config.ts
│   ├── dataset.ts
│   └── indexer.ts
└── data/                           # Indexer data (gitignored)
    ├── users.json
    └── index.db
```

---

## Implementation Order

### Sprint 1: Foundation (Week 1)

1. Project setup (Next.js, Tailwind, shadcn/ui)
2. Auth implementation (copy from eventky)
3. Basic layout and navigation
4. Auth-protected routes

### Sprint 2: Storage & CRUD (Week 2)

1. Pubky storage abstraction
2. React hooks for CRUD operations
3. **Service Config** list + create/edit (primary entity)
4. **Dataset** list + create/edit
5. Basic JSON editor (no schema yet)

### Sprint 3: Schema Forms (Week 3)

1. API route for loading service from git URL
2. JSON Schema form builder
3. Field components for all types
4. Service config editor with schema-driven form
5. Dataset editor with schema

### Sprint 4: Bot Configs (Week 4)

1. Bot config list + create/edit
2. Add service reference flow
3. Per-bot override UI
4. Export/import

### Sprint 5: Discovery (Week 5)

1. Mini-indexer implementation
2. User registration on login
3. Background polling of homeservers
4. Search API endpoint
5. Discovery UI in service-configs and datasets

### Sprint 6: Polish (Week 6)

1. Override support improvements
2. Error handling and validation
3. Mobile responsiveness
4. Testing
5. Documentation

---

## Questions to Resolve

1. **Git URL parsing**: Support GitHub, GitLab, others? Raw file URLs only?
2. **Caching**: Cache loaded service schemas? For how long?
3. **Validation**: Validate configs against schemas on save?
4. **Versioning**: Handle service version mismatches?
5. **Permissions**: All service configs public by default? Private option?
6. **Forking**: When user "forks" a service config, track original? Allow sync?
7. **Usage stats**: Track how many bots use each service config?
8. **Moderation**: How to handle spam/abuse in indexed service configs?

---

## Dependencies on pubky_bot_builder_telegram

The configurator needs the SDK types. Options:

1. **Publish SDK as npm package** (recommended for production)
2. **Git submodule** or monorepo link
3. **Copy types** into configurator (quick but maintenance burden)

Recommended: Start with option 3 (copy types), migrate to option 1 later.
