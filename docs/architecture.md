# Voice of Customer Copilot — Architecture

> Technical architecture for a web-based product discovery tool that transforms raw customer feedback into evidence-backed product insights.

---

## 1. Architecture Overview

The application follows a **client-heavy single-page application (SPA)** architecture with a Node.js backend. The frontend handles all UI interactions and state management, while the backend manages data persistence, CSV processing, and AI-powered analysis via external APIs.

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (SPA)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Dashboard │ │ Feedback │ │  Themes  │ │Prioritize │  │
│  │   View   │ │  Import  │ │  Review  │ │   View    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────┐ ┌──────────────────────────────────────┐  │
│  │  Export   │ │        State Management Layer        │  │
│  │   View   │ │                                      │  │
│  └──────────┘ └──────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ REST API
┌────────────────────────┴────────────────────────────────┐
│                    BACKEND (Node.js)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │   API    │ │   CSV    │ │  AI/NLP  │ │  Export   │  │
│  │  Routes  │ │ Parser   │ │  Engine  │ │  Service  │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Data Access Layer                    │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                   DATA LAYER                            │
│  ┌──────────────┐  ┌─────────────┐  ┌───────────────┐  │
│  │   SQLite     │  │   File      │  │   External    │  │
│  │   Database   │  │   Storage   │  │   AI API      │  │
│  └──────────────┘  └─────────────┘  └───────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend

| Technology | Purpose | Rationale |
|-----------|---------|-----------|
| **HTML5 + CSS3** | Structure & Styling | Standards-compliant, no build dependency for styling |
| **Vanilla JavaScript (ES6+)** | Logic & Interactivity | Lightweight, no framework overhead for an MVP |
| **Vite** | Dev Server & Bundler | Fast HMR, minimal config, modern tooling |
| **Chart.js** | Data Visualization | Lightweight charting for frequency/priority views |

### Backend

| Technology | Purpose | Rationale |
|-----------|---------|-----------|
| **Node.js** | Runtime | JavaScript end-to-end, large ecosystem |
| **Express.js** | HTTP Framework | Minimal, well-documented, flexible |
| **SQLite (better-sqlite3)** | Database | Zero-config, file-based, perfect for MVP |
| **Multer** | File Upload | Handles multipart CSV uploads |
| **PapaParse** | CSV Parsing | Robust CSV parsing with edge case handling |

### AI / NLP Layer

| Technology | Purpose | Rationale |
|-----------|---------|-----------|
| **Google Gemini API** | Theme extraction, classification, deduplication | Powerful text understanding, generous free tier |
| **Gemini Embeddings** | Semantic similarity for grouping | Groups semantically similar feedback |

### Infrastructure (MVP)

| Technology | Purpose |
|-----------|---------|
| **Local Development** | Vite dev server + Express backend |
| **SQLite file** | `data/voc.db` — single database file |
| **File System** | Uploaded CSVs stored in `uploads/` |

---

## 3. Data Model

### Core Entities

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│   feedback_item  │       │      theme       │       │  theme_feedback  │
├─────────────────┤       ├──────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)          │       │ theme_id (FK)   │
│ source          │       │ name             │       │ feedback_id (FK)│
│ raw_text        │       │ description      │       │ confidence      │
│ normalized_text │       │ frequency_count  │       │ assigned_by     │
│ user_segment    │       │ severity         │       │ created_at      │
│ sentiment       │       │ confidence       │       └─────────────────┘
│ is_duplicate    │       │ status           │
│ duplicate_of_id │       │ merged_into_id   │
│ metadata_json   │       │ missing_evidence │
│ import_batch_id │       │ follow_up_notes  │
│ created_at      │       │ created_at       │
│ updated_at      │       │ updated_at       │
└─────────────────┘       └──────────────────┘

┌─────────────────┐       ┌──────────────────┐
│  import_batch   │       │  export_report   │
├─────────────────┤       ├──────────────────┤
│ id (PK)         │       │ id (PK)          │
│ filename        │       │ title            │
│ row_count       │       │ content_json     │
│ processed_count │       │ selected_themes  │
│ duplicate_count │       │ format           │
│ status          │       │ created_at       │
│ created_at      │       └──────────────────┘
└─────────────────┘

┌─────────────────┐
│   user_action   │
├─────────────────┤
│ id (PK)         │
│ action_type     │
│ target_type     │
│ target_id       │
│ details_json    │
│ created_at      │
└─────────────────┘
```

### Entity Relationships

- **feedback_item** → **theme**: Many-to-many via `theme_feedback` join table
- **feedback_item** → **import_batch**: Many-to-one (each feedback belongs to an import batch)
- **feedback_item** → **feedback_item**: Self-referencing for duplicate tracking (`duplicate_of_id`)
- **theme** → **theme**: Self-referencing for merge tracking (`merged_into_id`)
- **export_report** → **theme**: References selected themes via `selected_themes` JSON array

### Key Field Details

| Field | Values / Format |
|-------|----------------|
| `feedback_item.source` | `csv_import`, `manual_entry` |
| `theme.status` | `auto_generated`, `user_confirmed`, `user_rejected`, `merged` |
| `theme.severity` | `low`, `medium`, `high`, `critical` |
| `theme_feedback.assigned_by` | `ai`, `user` |
| `user_action.action_type` | `theme_edit`, `theme_merge`, `theme_reject`, `feedback_reassign`, `flag_incorrect` |

---

## 4. API Design

### Endpoints

#### Import & Feedback

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/import/csv` | Upload and process a CSV file |
| `GET` | `/api/import/batches` | List all import batches |
| `GET` | `/api/feedback` | List feedback items (paginated, filterable) |
| `GET` | `/api/feedback/:id` | Get a single feedback item with linked themes |
| `PATCH` | `/api/feedback/:id` | Update feedback metadata |

#### Themes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/themes` | List all themes with counts |
| `GET` | `/api/themes/:id` | Get theme detail with all linked feedback |
| `PATCH` | `/api/themes/:id` | Edit theme name, description, severity |
| `POST` | `/api/themes/:id/merge` | Merge this theme into another |
| `POST` | `/api/themes/:id/reject` | Reject/flag a theme as incorrect |
| `POST` | `/api/themes/:id/confirm` | Confirm an auto-generated theme |

#### Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Trigger AI analysis on imported feedback |
| `GET` | `/api/analyze/status` | Check analysis progress |

#### Prioritization & Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prioritize` | Get prioritized themes list |
| `POST` | `/api/export` | Generate a product discovery summary |
| `GET` | `/api/export/:id` | Download an export report |

#### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/stats` | Get summary statistics |

---

## 5. AI Processing Pipeline

The AI analysis follows a **multi-stage pipeline** to ensure traceability and quality:

```
Stage 1: NORMALIZATION
   CSV Raw Text → Clean, standardized text
   • Fix encoding issues
   • Remove PII (basic)
   • Standardize terminology

Stage 2: DEDUPLICATION
   Normalized Text → Unique feedback items
   • Generate embeddings for each item
   • Compute cosine similarity
   • Flag items above similarity threshold (>0.92)
   • Link duplicates via duplicate_of_id

Stage 3: THEME EXTRACTION
   Unique Feedback → Candidate themes
   • Cluster embeddings using similarity
   • Generate theme name + description via Gemini
   • Assign confidence score per classification
   • Identify missing evidence / ambiguity

Stage 4: ENRICHMENT
   Themes → Enriched themes with metadata
   • Calculate frequency count per theme
   • Extract user segments per theme
   • Estimate severity based on language signals
   • Generate follow-up research suggestions

Stage 5: PRIORITIZATION SCORING
   Enriched Themes → Priority-ranked list
   • Score = f(frequency, severity, user_impact, confidence)
   • Frequency ≠ automatic priority (per product requirements)
   • Flag low-confidence themes for human review
```

### AI Guardrails

| Guardrail | Implementation |
|-----------|---------------|
| **Traceability** | Every theme links back to exact feedback items |
| **Confidence scores** | Each classification includes a 0-1 confidence value |
| **Human override** | Users can reject, edit, merge, or re-classify any AI output |
| **Uncertainty surfacing** | Low-confidence themes are visually flagged |
| **No fabrication** | AI cannot create supporting statements; only quotes from actual feedback |

---

## 6. Frontend Architecture

### Page / View Structure

```
App
├── Dashboard View
│   ├── Stats Cards (total feedback, themes, pending review)
│   ├── Theme Distribution Chart
│   └── Recent Activity Feed
│
├── Import View
│   ├── CSV Upload Dropzone
│   ├── Column Mapping Interface
│   ├── Import Progress Indicator
│   └── Import History Table
│
├── Feedback Explorer View
│   ├── Search & Filter Bar
│   ├── Feedback List (paginated)
│   ├── Feedback Detail Panel
│   └── Theme Assignment Tags
│
├── Themes View
│   ├── Theme Cards Grid
│   ├── Theme Detail Modal
│   │   ├── Theme Name & Description (editable)
│   │   ├── Supporting Feedback List
│   │   ├── Confidence Indicator
│   │   ├── Missing Evidence Section
│   │   └── Action Buttons (confirm / reject / merge)
│   └── Merge Interface
│
├── Prioritization View
│   ├── Priority Matrix (severity × frequency)
│   ├── Ranked Theme List
│   ├── Scoring Controls
│   └── Filter by Segment
│
└── Export View
    ├── Theme Selection Checklist
    ├── Summary Preview
    └── Download Options (Markdown / JSON)
```

### State Management

The frontend uses a **simple pub-sub store pattern** (no framework dependencies):

```javascript
// Core state structure
{
  feedbackItems: [],       // All imported feedback
  themes: [],              // Generated and confirmed themes
  importBatches: [],       // Import history
  analysisStatus: null,    // Current analysis progress
  activeFilters: {},       // Current filter/search state
  selectedThemes: [],      // Themes selected for export
  dashboardStats: {},      // Summary metrics
  userActions: []          // Undo/redo history
}
```

---

## 7. Security & Privacy Considerations (MVP)

| Concern | Approach |
|---------|----------|
| **Data storage** | SQLite database is local-only; no cloud sync in MVP |
| **PII in feedback** | Basic PII detection and optional redaction before AI processing |
| **API keys** | Stored in `.env`, never committed to source control |
| **File uploads** | Validate file type, size limits (10MB max), sanitize filenames |
| **AI data handling** | Clearly document that feedback text is sent to Google Gemini API |

---

## 8. Directory Structure

```
voice-of-customer-copilot/
├── docs/
│   ├── context.md
│   ├── architecture.md
│   └── implementation-plan.md
│
├── src/
│   ├── client/                    # Frontend
│   │   ├── index.html
│   │   ├── css/
│   │   │   ├── index.css          # Design system & tokens
│   │   │   ├── components.css     # Component styles
│   │   │   └── views.css          # View-specific styles
│   │   ├── js/
│   │   │   ├── app.js             # App initialization & routing
│   │   │   ├── store.js           # State management
│   │   │   ├── api.js             # Backend API client
│   │   │   ├── router.js          # Client-side routing
│   │   │   ├── components/        # Reusable UI components
│   │   │   │   ├── navbar.js
│   │   │   │   ├── sidebar.js
│   │   │   │   ├── modal.js
│   │   │   │   ├── dropzone.js
│   │   │   │   ├── chart.js
│   │   │   │   ├── toast.js
│   │   │   │   └── card.js
│   │   │   └── views/             # Page-level views
│   │   │       ├── dashboard.js
│   │   │       ├── import.js
│   │   │       ├── feedback.js
│   │   │       ├── themes.js
│   │   │       ├── prioritize.js
│   │   │       └── export.js
│   │   └── assets/
│   │       ├── icons/
│   │       └── images/
│   │
│   └── server/                    # Backend
│       ├── index.js               # Express server entry
│       ├── config.js              # Configuration
│       ├── db/
│       │   ├── connection.js      # SQLite connection
│       │   ├── schema.sql         # Database schema
│       │   ├── migrations/        # Schema migrations
│       │   └── seed.js            # Sample data seeder
│       ├── routes/
│       │   ├── import.js
│       │   ├── feedback.js
│       │   ├── themes.js
│       │   ├── analyze.js
│       │   ├── prioritize.js
│       │   ├── export.js
│       │   └── dashboard.js
│       ├── services/
│       │   ├── csv-parser.js      # CSV parsing & validation
│       │   ├── normalizer.js      # Text normalization
│       │   ├── deduplicator.js    # Duplicate detection
│       │   ├── theme-extractor.js # AI theme extraction
│       │   ├── prioritizer.js     # Priority scoring
│       │   └── exporter.js        # Report generation
│       ├── ai/
│       │   ├── client.js          # Gemini API client
│       │   ├── prompts.js         # Prompt templates
│       │   └── embeddings.js      # Embedding utilities
│       └── middleware/
│           ├── error-handler.js
│           └── validator.js
│
├── data/                          # Runtime data
│   ├── voc.db                     # SQLite database
│   └── sample/                    # Sample datasets
│       └── sample-feedback.csv
│
├── uploads/                       # Uploaded CSV files
├── .env.example                   # Environment variable template
├── .gitignore
├── package.json
├── vite.config.js
└── README.md
```

---

## 9. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **SPA vs MPA** | SPA with client-side routing | Smooth interactions for review workflows |
| **Database** | SQLite | Zero-config, portable, sufficient for MVP scale |
| **AI Provider** | Google Gemini API | Powerful text understanding, generous free tier, configurable to swap later |
| **Styling** | Vanilla CSS with design tokens | No build dependencies, full control |
| **Bundler** | Vite | Fast development, modern defaults |
| **State Management** | Custom pub-sub store | No framework overhead, fits MVP scope |
| **Export Format** | Markdown + JSON | Universal, readable, importable |

---

## 10. Scalability Path (Post-MVP)

These are **not in the MVP** but the architecture accommodates future growth:

- **Database migration** — SQLite → PostgreSQL (same query patterns)
- **Real-time updates** — WebSocket layer for collaborative review
- **Multiple AI providers** — Abstract AI client interface
- **Authentication** — JWT-based auth layer
- **API integrations** — Webhook-based ingestion from Intercom, Zendesk, etc.
- **Caching layer** — Redis for expensive AI results
