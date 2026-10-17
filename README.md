# Voice of Customer Copilot

> A product discovery tool that helps product managers move from raw customer feedback to evidence-backed, verifiable product opportunities.

---

## 🌟 Key Features

1. **Intelligent CSV Ingestion**: Drag-and-drop feedback upload with automatic column detection (feedback text, source channels, user segments, timestamps).
2. **PII Redaction & Normalization**: Cleans whitespace, standardizes encoding artifacts, and redacts emails and phone numbers before analysis.
3. **Evidence-Linked Theme Discovery**: Extracts recurring problems and groups them with direct, verifiable customer quotes. Frequency never dictates priority alone.
4. **Interactive PM Human-in-the-Loop**:
   - **Confirm** themes to establish product ground truths.
   - **Reject / Flag** misleading or hallucinated AI patterns.
   - **Merge** overlapping theme groups with feedback transference.
   - **Edit** theme names, descriptions, and severities directly.
5. **Multi-Factor Opportunity Prioritization**: Dynamic scoring balancing Problem Severity (35%), Mention Frequency (25%), Segment Breadth (25%), and Evidence Confidence (15%) with real-time slider controls.
6. **Executive Discovery Summary Export**: Generates slide-ready Markdown and structured JSON summaries complete with audit trail, customer quotes, and follow-up research questions.
7. **Gemini AI & Offline Demo Mode**: Connect your Google Gemini API key or run completely offline with built-in heuristic NLP.

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Configure Environment (Optional)

Create or edit `.env`:

```env
# Optional: Add your Google Gemini API key to enable live AI analysis
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
DB_PATH=./data/voc.db
```

*Note: If no API key is provided, the application automatically runs in **Demo Mode** using built-in heuristic NLP and rule-based clustering.*

### 3. Seed Sample Dataset

```bash
npm run seed
```

This populates the database with 51 diverse customer feedback items spanning Enterprise, Startup, Mid-Market, and Freelancers, with duplicate pairs and contradictory feedback.

### 4. Run Development Server

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

---

## 📁 Project Architecture

```
├── docs/
│   ├── context.md               # Product context, problem statement & PM checklist
│   ├── architecture.md          # Technical architecture, schema & API specifications
│   └── implementation-plan.md   # Phased delivery plan & risk mitigation
│
├── src/
│   ├── client/                  # Single Page Application
│   │   ├── index.html
│   │   ├── css/                 # Modern Dark-Mode Design System & Utilities
│   │   └── js/                  # SPA Router, Views, and Store
│   │
│   └── server/                  # Node.js + Express Backend
│       ├── ai/                  # Google Gemini API & Embeddings client
│       ├── db/                  # SQLite schema & database connection
│       ├── services/            # CSV parsing, normalizer, deduplicator, prioritizer
│       └── routes/              # RESTful API endpoints
│
└── data/
    └── sample/
        └── sample-feedback.csv  # 51-item real-world feedback sample
```

---

## 🌐 Live Demo & Deployment

- **Live Web Application (GitHub Pages)**: [https://shiwani-thakur-work.github.io/voice-of-customer-copilot/](https://shiwani-thakur-work.github.io/voice-of-customer-copilot/)
- **Repository**: [https://github.com/Shiwani-Thakur-Work/voice-of-customer-copilot](https://github.com/Shiwani-Thakur-Work/voice-of-customer-copilot)

---

## 📄 Documentation

- [Product Context & Vision](./docs/context.md)
- [System Architecture](./docs/architecture.md)
- [Implementation Plan](./docs/implementation-plan.md)

