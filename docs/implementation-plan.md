# Voice of Customer Copilot — Implementation Plan

> Step-by-step implementation plan organized into phases, with clear deliverables, dependencies, and acceptance criteria for each task.

---

## Plan Overview

| Phase | Name | Duration | Focus |
|-------|------|----------|-------|
| **0** | Project Setup | Day 1 | Tooling, structure, configuration |
| **1** | Data Foundation | Days 2-3 | Database, CSV import, normalization |
| **2** | AI Analysis Pipeline | Days 4-6 | Theme extraction, deduplication, enrichment |
| **3** | Frontend Core | Days 7-10 | Dashboard, feedback explorer, themes view |
| **4** | Prioritization & Export | Days 11-12 | Priority scoring, export functionality |
| **5** | Polish & Integration | Days 13-14 | End-to-end testing, UI polish, sample data |

---

## Phase 0: Project Setup

### Task 0.1 — Initialize Project

**Description:** Set up Node.js project with Vite frontend and Express backend.

**Steps:**
1. Initialize `package.json` with project metadata
2. Install dependencies:
   - **Frontend:** `vite`, `chart.js`
   - **Backend:** `express`, `better-sqlite3`, `multer`, `papaparse`, `cors`, `dotenv`
   - **AI:** `@google/generative-ai`
   - **Dev:** `nodemon`, `concurrently`
3. Configure `vite.config.js` with proxy to backend
4. Create npm scripts: `dev`, `dev:server`, `dev:client`, `build`

**Acceptance Criteria:**
- [ ] `npm run dev` starts both frontend (Vite) and backend (Express) concurrently
- [ ] Frontend proxies API requests to backend on port 3001
- [ ] Hot module reload works for frontend changes

---

### Task 0.2 — Create Directory Structure

**Description:** Create the full directory structure as defined in the architecture document.

**Steps:**
1. Create all directories under `src/client/` and `src/server/`
2. Create `data/`, `data/sample/`, `uploads/` directories
3. Create `.env.example` with `OPENAI_API_KEY`, `PORT`, `DB_PATH` variables
4. Create `.gitignore` (node_modules, .env, data/*.db, uploads/)

**Acceptance Criteria:**
- [ ] All directories exist as specified in architecture
- [ ] `.env.example` documents all required environment variables
- [ ] `.gitignore` properly excludes sensitive and generated files

---

### Task 0.3 — Design System & CSS Foundation

**Description:** Build the CSS design system with tokens, utilities, and base styles.

**Steps:**
1. Define CSS custom properties (colors, spacing, typography, shadows, radii)
2. Create dark-mode color scheme as default
3. Set up Google Font (Inter or similar)
4. Create base element resets and typography scale
5. Build utility classes for layout (flex, grid), spacing, and text
6. Create animation keyframes for micro-interactions

**Acceptance Criteria:**
- [ ] `index.css` contains complete design token system
- [ ] Dark mode is the default theme
- [ ] Base typography renders with the chosen Google Font
- [ ] Smooth transitions are defined for interactive elements

---

## Phase 1: Data Foundation

### Task 1.1 — Database Schema & Connection

**Description:** Set up SQLite database with the schema defined in the architecture.

**Steps:**
1. Create `schema.sql` with all tables: `feedback_item`, `theme`, `theme_feedback`, `import_batch`, `export_report`, `user_action`
2. Implement `connection.js` that initializes the database and runs the schema
3. Enable WAL mode for better concurrent read performance
4. Create database utility functions (runQuery, getAll, getOne)

**Acceptance Criteria:**
- [ ] Database file is created at `data/voc.db` on first run
- [ ] All tables are created with proper constraints and indexes
- [ ] Foreign key constraints are enforced
- [ ] Connection module exports reusable query helpers

---

### Task 1.2 — CSV Import Service

**Description:** Build the CSV upload and parsing pipeline.

**Steps:**
1. Create `POST /api/import/csv` route with Multer file handling
2. Implement `csv-parser.js` service:
   - Parse CSV with PapaParse
   - Detect and map columns (text, source, segment, date)
   - Validate required fields
   - Return structured feedback items
3. Create `GET /api/import/batches` to list past imports
4. Insert parsed rows into `feedback_item` table with batch tracking

**Acceptance Criteria:**
- [ ] Upload a CSV and receive a parsed result with batch ID
- [ ] Handles common CSV edge cases (quoted fields, encoding, empty rows)
- [ ] Column mapping is flexible (detects common column names)
- [ ] Import batch tracks row count and processing status

---

### Task 1.3 — Text Normalization Service

**Description:** Clean and normalize raw feedback text for consistent processing.

**Steps:**
1. Implement `normalizer.js` service:
   - Trim whitespace, fix encoding artifacts
   - Normalize casing (lowercase for comparison, preserve original)
   - Remove URLs, email addresses (basic PII reduction)
   - Strip excessive punctuation and special characters
   - Store both `raw_text` and `normalized_text`
2. Integrate normalization into the import pipeline (runs after CSV parsing)

**Acceptance Criteria:**
- [ ] Raw text is preserved unchanged in `raw_text` field
- [ ] Normalized version is stored in `normalized_text`
- [ ] Common encoding issues are handled (UTF-8 BOM, smart quotes)
- [ ] Basic PII (emails, phone numbers) is redacted from normalized text

---

### Task 1.4 — Sample Dataset

**Description:** Create a realistic sample feedback CSV for development and testing.

**Steps:**
1. Create `data/sample/sample-feedback.csv` with 50-80 feedback entries
2. Include multiple themes (performance, UX, pricing, onboarding, mobile, support)
3. Include some near-duplicates for deduplication testing
4. Include varied segments (enterprise, startup, freelancer)
5. Include contradictory feedback for the same features
6. Create `seed.js` that imports the sample data automatically

**Acceptance Criteria:**
- [ ] Sample dataset has realistic, varied feedback covering 5+ themes
- [ ] Dataset includes duplicates, contradictions, and varied segments
- [ ] `npm run seed` imports the sample data into a fresh database
- [ ] Sample data is sufficient to demonstrate all MVP features

---

### Task 1.5 — Feedback API Routes

**Description:** Build CRUD endpoints for feedback items.

**Steps:**
1. `GET /api/feedback` — List with pagination, search, and filter by segment/source/theme
2. `GET /api/feedback/:id` — Single item with linked themes
3. `PATCH /api/feedback/:id` — Update metadata (segment, custom fields)
4. Implement query builder with flexible filtering

**Acceptance Criteria:**
- [ ] Feedback list supports pagination (limit/offset)
- [ ] Search queries match against normalized text
- [ ] Filtering works by source, segment, theme, and duplicate status
- [ ] Individual feedback item includes all linked themes

---

## Phase 2: AI Analysis Pipeline

### Task 2.1 — Gemini Client Setup

**Description:** Create a configurable Google Gemini API client with error handling.

**Steps:**
1. Implement `ai/client.js` with retry logic and rate limiting using `@google/generative-ai`
2. Create `ai/prompts.js` with prompt templates for each analysis stage
3. Implement `ai/embeddings.js` for text embedding generation using Gemini embedding model
4. Add cost tracking (log token usage per request)
5. Create a fallback mode that uses mock responses when no API key is present

**Acceptance Criteria:**
- [ ] Client handles API errors gracefully with retries
- [ ] Prompt templates are externalized and easily editable
- [ ] Embedding generation works for batch processing
- [ ] Application runs in demo mode without an API key (using mock data)

---

### Task 2.2 — Deduplication Service

**Description:** Detect and link duplicate/near-duplicate feedback items.

**Steps:**
1. Implement `deduplicator.js`:
   - Generate embeddings for all feedback items
   - Compute pairwise cosine similarity
   - Flag pairs above threshold (>0.92) as duplicates
   - Keep the first occurrence as primary, link others via `duplicate_of_id`
2. Expose deduplication results in the import response
3. Allow users to override duplicate decisions (via PATCH endpoint)

**Acceptance Criteria:**
- [ ] Near-identical feedback items are correctly flagged as duplicates
- [ ] Original item is preserved; duplicates are linked, not deleted
- [ ] Duplicate count is tracked per import batch
- [ ] Similarity threshold is configurable

---

### Task 2.3 — Theme Extraction Service

**Description:** AI-powered extraction of themes from feedback clusters.

**Steps:**
1. Implement `theme-extractor.js`:
   - Cluster feedback embeddings by similarity
   - For each cluster, generate a theme name and description via GPT-4
   - Assign each feedback item to one or more themes
   - Calculate confidence score per assignment
   - Identify missing evidence and suggested follow-ups
2. Store results in `theme` and `theme_feedback` tables
3. Mark all AI-generated themes with status `auto_generated`

**Acceptance Criteria:**
- [ ] Themes are generated with name, description, and confidence
- [ ] Each theme links to specific supporting feedback items
- [ ] Confidence scores range from 0 to 1
- [ ] Missing evidence and follow-up suggestions are populated
- [ ] All generated themes are marked `auto_generated` (not yet confirmed)

---

### Task 2.4 — Analysis Orchestration

**Description:** Create the main analysis endpoint that orchestrates the full pipeline.

**Steps:**
1. Implement `POST /api/analyze`:
   - Accept batch ID or run on all unprocessed feedback
   - Execute pipeline: normalize → deduplicate → extract themes → enrich
   - Track progress and update status
2. Implement `GET /api/analyze/status` for progress tracking
3. Make the pipeline idempotent (re-running doesn't create duplicate themes)

**Acceptance Criteria:**
- [ ] Analysis runs the full pipeline in sequence
- [ ] Progress is trackable via status endpoint
- [ ] Re-running analysis on the same data doesn't duplicate themes
- [ ] Errors in one stage don't crash the entire pipeline

---

### Task 2.5 — Theme Management API

**Description:** Build endpoints for human review and correction of themes.

**Steps:**
1. `GET /api/themes` — List all themes with feedback counts
2. `GET /api/themes/:id` — Theme detail with all supporting feedback
3. `PATCH /api/themes/:id` — Edit name, description, severity
4. `POST /api/themes/:id/confirm` — Confirm an auto-generated theme
5. `POST /api/themes/:id/reject` — Reject a theme (flag as incorrect)
6. `POST /api/themes/:id/merge` — Merge two themes together
7. Log all user actions in `user_action` table for audit trail

**Acceptance Criteria:**
- [ ] All CRUD operations work for themes
- [ ] Merging preserves all feedback links from both themes
- [ ] Rejecting a theme doesn't delete it (keeps it for reference)
- [ ] Every user action is logged with timestamp and details

---

## Phase 3: Frontend Core

### Task 3.1 — App Shell & Routing

**Description:** Build the main application shell with navigation and client-side routing.

**Steps:**
1. Create `index.html` with app shell structure
2. Implement `router.js` with hash-based routing
3. Build `navbar.js` component with navigation links and active state
4. Build `sidebar.js` component with contextual actions
5. Create view mounting/unmounting lifecycle
6. Implement `api.js` — fetch wrapper with error handling

**Acceptance Criteria:**
- [ ] Navigation between views works without page reload
- [ ] Active route is visually highlighted in navbar
- [ ] View transitions are smooth with fade animations
- [ ] API client handles errors and shows toast notifications

---

### Task 3.2 — Dashboard View

**Description:** Build the main dashboard with summary statistics and charts.

**Steps:**
1. Implement `dashboard.js` view:
   - Stats cards: Total feedback, themes generated, pending review, confirmed themes
   - Theme distribution chart (bar or donut chart via Chart.js)
   - Recent activity feed (last 10 user actions)
   - Quick action buttons (import, analyze, export)
2. Implement `GET /api/dashboard/stats` backend endpoint
3. Create card component with animated counters

**Acceptance Criteria:**
- [ ] Dashboard shows accurate real-time statistics
- [ ] Chart renders theme distribution visually
- [ ] Activity feed shows recent user actions
- [ ] Stats cards animate on load
- [ ] Empty state shows helpful onboarding prompts

---

### Task 3.3 — Import View

**Description:** Build the CSV import interface with drag-and-drop upload.

**Steps:**
1. Implement `import.js` view:
   - Drag-and-drop dropzone component
   - File validation (CSV only, max 10MB)
   - Column preview and mapping interface
   - Import progress bar
   - Import history table
2. Create `dropzone.js` component with visual states (idle, hovering, uploading, complete)

**Acceptance Criteria:**
- [ ] Drag-and-drop upload works with visual feedback
- [ ] File type and size are validated before upload
- [ ] Column preview shows first few rows before import
- [ ] Progress indicator shows during processing
- [ ] Import history lists all past imports with counts

---

### Task 3.4 — Feedback Explorer View

**Description:** Build the searchable, filterable feedback list with detail panel.

**Steps:**
1. Implement `feedback.js` view:
   - Search bar with debounced input
   - Filter chips for segment, source, theme, duplicate status
   - Paginated feedback list with cards
   - Expandable detail panel showing full text, linked themes, metadata
   - Theme assignment tags (clickable to view theme)
2. Highlight search terms in results

**Acceptance Criteria:**
- [ ] Search filters feedback in real-time (debounced)
- [ ] Multiple filters can be combined
- [ ] Feedback cards show preview text, source, segment
- [ ] Detail panel shows full text with linked themes
- [ ] Pagination loads smoothly

---

### Task 3.5 — Themes View

**Description:** Build the theme review interface where users confirm, edit, or reject AI-generated themes.

**Steps:**
1. Implement `themes.js` view:
   - Theme cards grid with key info (name, count, severity, confidence)
   - Status badges (auto-generated, confirmed, rejected)
   - Theme detail modal:
     - Editable name and description
     - Supporting feedback list with original quotes
     - Confidence indicator (visual gauge)
     - Missing evidence section
     - Severity selector
     - Action buttons: Confirm, Reject, Merge, Edit
   - Merge interface (select target theme, preview combined result)
   - Filter by status, severity, confidence range
2. Create `modal.js` reusable component with overlay and close behavior

**Acceptance Criteria:**
- [ ] Theme cards display all key information at a glance
- [ ] Modal shows complete theme detail with supporting evidence
- [ ] Users can edit theme name and description inline
- [ ] Confirm/reject/merge actions update the theme immediately
- [ ] Confidence is displayed visually (not just a number)
- [ ] Low-confidence themes are visually flagged

---

## Phase 4: Prioritization & Export

### Task 4.1 — Prioritization Engine

**Description:** Build the scoring algorithm and prioritization view.

**Steps:**
1. Implement `prioritizer.js` service:
   - Scoring formula: `score = (w1 × frequency) + (w2 × severity) + (w3 × user_impact) + (w4 × confidence)`
   - Default weights: frequency=0.25, severity=0.35, user_impact=0.25, confidence=0.15
   - Weights are adjustable by the user
   - Only confirmed and auto-generated themes are included (not rejected)
2. Implement `GET /api/prioritize` endpoint
3. Implement `prioritize.js` view:
   - Priority matrix visualization (severity × frequency 2D chart)
   - Ranked theme list with scores
   - Adjustable weight sliders
   - Filter by segment

**Acceptance Criteria:**
- [ ] Themes are scored and ranked by priority
- [ ] Users can adjust scoring weights and see re-ranked results
- [ ] Priority matrix visually shows theme positions
- [ ] Frequency alone does not dominate priority (per product requirements)
- [ ] Rejected themes are excluded from prioritization

---

### Task 4.2 — Export Service

**Description:** Generate downloadable product discovery summaries.

**Steps:**
1. Implement `exporter.js` service:
   - Generate Markdown summary with selected themes
   - Include: theme name, description, frequency, severity, confidence, supporting quotes
   - Include prioritization ranking
   - Include metadata (date, dataset size, analysis parameters)
2. Implement `POST /api/export` and `GET /api/export/:id`
3. Implement `export.js` view:
   - Theme selection checklist
   - Summary preview (rendered Markdown)
   - Download button (Markdown and JSON formats)

**Acceptance Criteria:**
- [ ] Users can select which themes to include in the export
- [ ] Preview shows the formatted summary before download
- [ ] Markdown export is well-structured and readable
- [ ] JSON export contains structured data for further processing
- [ ] Export includes evidence trail (linked feedback quotes)

---

## Phase 5: Polish & Integration

### Task 5.1 — Toast Notifications & Error Handling

**Description:** Implement global notification system and consistent error handling.

**Steps:**
1. Create `toast.js` component with success/error/warning/info variants
2. Integrate with API client for automatic error toasts
3. Add loading states for all async operations
4. Implement error boundary for unhandled errors

**Acceptance Criteria:**
- [ ] All API errors show user-friendly toast messages
- [ ] Success actions (import, save, export) confirm with toast
- [ ] Loading spinners appear during async operations
- [ ] Unhandled errors show a recovery message

---

### Task 5.2 — Empty States & Onboarding

**Description:** Design empty states for first-time users and guide them through the workflow.

**Steps:**
1. Create empty state illustrations/messages for each view
2. Dashboard empty state guides user to import data first
3. Themes empty state prompts user to run analysis
4. Add tooltips or help text for complex features

**Acceptance Criteria:**
- [ ] Every view has a meaningful empty state (not blank)
- [ ] Empty states include actionable CTAs (e.g., "Import your first CSV")
- [ ] First-time flow is self-explanatory without documentation

---

### Task 5.3 — Responsive Design & UI Polish

**Description:** Ensure the application looks great on all screen sizes and add final visual polish.

**Steps:**
1. Add responsive breakpoints for tablet and mobile
2. Ensure all modals and dropdowns work on small screens
3. Add micro-animations: card hover effects, button press feedback, page transitions
4. Fine-tune color palette, spacing, and shadows
5. Test dark mode consistency across all views

**Acceptance Criteria:**
- [ ] Application is usable on screens ≥768px width
- [ ] All interactive elements have hover/focus states
- [ ] Animations are smooth (60fps) and not distracting
- [ ] Dark mode is consistent across all views and components

---

### Task 5.4 — End-to-End Testing with Sample Data

**Description:** Verify the complete workflow using the sample dataset.

**Steps:**
1. Run the full workflow: Import → Analyze → Review → Prioritize → Export
2. Verify deduplication correctly identifies duplicates in sample data
3. Verify theme extraction produces sensible themes
4. Test user correction flow (edit, merge, reject themes)
5. Verify export contains accurate, traceable insights
6. Test error scenarios (invalid CSV, missing API key, network errors)

**Acceptance Criteria:**
- [ ] Full workflow completes without errors using sample data
- [ ] Generated themes are reasonable for the sample feedback
- [ ] All user correction actions work correctly
- [ ] Export accurately reflects user's curation decisions
- [ ] Application handles errors gracefully in all scenarios

---

## Dependency Map

```
Phase 0 ─── Setup ─────────────────────────────────────────►
              │
Phase 1 ─── Data Foundation ──────────────────────────────►
              │                 │
              │          Task 1.4 (Sample Data)
              │                 │
Phase 2 ─── AI Pipeline ─────────────────────────────────►
              │   (depends on Phase 1 data layer)
              │
Phase 3 ─── Frontend Core ───────────────────────────────►
              │   (depends on Phase 1 & 2 API routes)
              │
Phase 4 ─── Prioritization & Export ──────────────────────►
              │   (depends on Phase 2 themes + Phase 3 UI)
              │
Phase 5 ─── Polish & Integration ─────────────────────────►
                  (depends on all previous phases)
```

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| AI generates poor-quality themes | Medium | High | Mock/demo mode; human review required; confidence scores |
| Gemini API rate limits or costs | Medium | Medium | Batch processing; caching; mock mode for dev |
| CSV format variations | High | Low | Flexible column detection; preview before import |
| SQLite performance at scale | Low (for MVP) | Medium | Design queries for future PostgreSQL migration |
| Scope creep beyond MVP | High | High | Strict adherence to "Out of Scope" list in context doc |

---

## Definition of Done (MVP)

- [ ] User can import a CSV of customer feedback
- [ ] Feedback is normalized and duplicates are flagged
- [ ] AI generates themes with confidence scores and supporting evidence
- [ ] User can review, edit, confirm, reject, and merge themes
- [ ] Prioritization view ranks themes by configurable scoring
- [ ] User can export a product discovery summary
- [ ] Every insight links back to original customer feedback
- [ ] Application runs locally with a single `npm run dev` command
- [ ] Sample dataset demonstrates all features end-to-end
