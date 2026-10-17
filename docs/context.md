# Voice of Customer Copilot — Product Context

> A product discovery tool that helps teams move from raw customer feedback to evidence-backed product opportunities.

---

## 1. Product Context

Product teams receive feedback from many sources — customer interviews, app reviews, support conversations, surveys, community discussions, and sales calls. The information is often **fragmented**, **repetitive**, and **difficult to turn into a clear product decision**.

A team may know that customers are unhappy without knowing:
- Which problem is most common
- Which users are affected
- What evidence supports the conclusion
- What should be prioritized next

**Voice of Customer Copilot** bridges this gap by transforming unstructured feedback into structured, evidence-backed insights that drive better product decisions.

---

## 2. Problem Statement

Product managers spend considerable time **manually reviewing** customer feedback:
- Identifying recurring themes
- Distinguishing isolated complaints from persistent problems
- Translating findings into roadmap decisions

### The Opportunity

Reduce this manual effort **without losing**:
- The original customer context
- The ability to verify AI-generated conclusions against source data

> **IMPORTANT:** AI-generated assumptions must never become unquestioned product facts. Every insight must be traceable to original feedback.

---

## 3. Target Users

| User Type | Description |
|-----------|-------------|
| **Primary** | Product managers at small and mid-sized software companies |
| **Secondary** | Founders, product researchers, customer success teams, and support leads |

### Key Persona

A PM who receives customer feedback from multiple sources but **does not have a dedicated research or analytics team**. They need a tool that reduces manual analysis time while preserving the ability to verify and correct AI-generated conclusions.

---

## 4. Core Hypothesis

> If product managers can quickly identify recurring feedback themes and inspect the original evidence behind every insight, they will spend less time organizing feedback and more time deciding what to investigate or improve.

**Note:** This is a hypothesis to validate, not an established result. The product must be built with measurement in mind from day one.

---

## 5. Proposed MVP Features

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Feedback Import** | Import feedback using CSV or a small sample dataset |
| 2 | **Normalization** | Normalize feedback and remove obvious duplicates |
| 3 | **Theme Grouping** | Group similar feedback into themes automatically |
| 4 | **Quantification** | Show the number of relevant feedback items and affected user segments |
| 5 | **Evidence Linking** | Link every generated insight to its original feedback |
| 6 | **User Correction** | Allow users to correct themes, merge groups, and flag incorrect classifications |
| 7 | **Prioritization View** | Simple prioritization based on frequency, severity, and user impact |
| 8 | **Export** | Export selected insights into a product discovery summary |

---

## 6. What Makes This More Than an AI Summarizer?

The product should help a PM **make a better decision**, not merely generate a paragraph.

Each insight must include:

| Component | Purpose |
|-----------|---------|
| **Theme / Problem** | The core issue identified |
| **Supporting Statements** | Actual customer quotes and feedback |
| **Frequency** | How often the theme appears in the supplied dataset |
| **Segment / Context** | Relevant user segment or context, when available |
| **Confidence Level** | Degree of certainty in the classification |
| **Missing Evidence** | Gaps in data and recommended follow-up research |

> **WARNING:** Frequency should **not** automatically determine priority. A rare but severe problem can matter more than a common minor complaint.

---

## 7. PM Decisions to Demonstrate

These are the key product management decisions that must be addressed:

1. Which feedback sources belong in the first release?
2. Should themes be generated automatically or require user confirmation?
3. How should contradictory feedback be handled?
4. What evidence is sufficient to call something a "recurring problem"?
5. How should severity and frequency affect prioritization?
6. Which AI errors are acceptable, and which could mislead a product decision?

---

## 8. Success Metrics

### North-Star Metric

**Time required to produce a reviewed, evidence-backed set of product insights from a feedback dataset.**

### Supporting Metrics

| Metric | What It Measures |
|--------|-----------------|
| Theme acceptance rate | % of generated themes accepted or edited by users |
| Classification accuracy | Accuracy of feedback-to-theme classification vs. manually reviewed sample |
| Evidence validity | % of insights with valid supporting evidence |
| Review efficiency | Time taken to review and organize a fixed dataset |
| User retention | Number of users who return to review or update insights |

> **CAUTION:** Do not claim time savings or accuracy improvements until you measure them against real user behavior.

---

## 9. Initial Validation Plan

Before building the complete application:

1. **Collect** a small, clearly sourced sample of feedback
2. **Manually group** the feedback into themes (baseline)
3. **Interview** a few PMs or founders about their current feedback analysis workflow
4. **Compare** their existing workflow with a simple AI-assisted prototype
5. **Record** incorrect themes, missing context, and unsupported conclusions

---

## 10. Out of Scope for MVP

| Excluded Feature | Reason |
|-----------------|--------|
| Continuous ingestion from every social platform | Scope creep; focus on CSV import first |
| Complex enterprise integrations | Not needed for initial validation |
| Automatic roadmap creation | Beyond MVP; requires validated prioritization first |
| Fully autonomous prioritization | Humans must remain in the decision loop |
| Sentiment scores as objective truth | Misleading without proper calibration |

---

## 11. Portfolio Outcome

The case study should demonstrate:

- **Problem discovery process** — How the problem was identified and validated
- **User evidence** — Real feedback and research data
- **Prioritization framework** — How decisions were made about what to build
- **Prototype** — The working product and its evolution
- **AI evaluation method** — How AI quality was assessed
- **Iteration history** — Changes made based on feedback
- **Results impact** — What the results changed about the product direction

---

## 12. PM Working Checklist

> Project readiness: **0/10**

- [ ] Define the target user and problem statement
- [ ] Conduct initial user research or problem validation
- [ ] Write the product hypothesis and assumptions
- [ ] Define MVP scope and explicit non-goals
- [ ] Select success metrics and how to measure them
- [ ] Create user flows and a low-fidelity prototype
- [ ] Define AI evaluation cases and failure handling
- [ ] Build and test the smallest useful version
- [ ] Review results and prioritize the next iteration
- [ ] Publish an honest PM case study

---

> **PM Perspective:** This is a strong project because you can demonstrate discovery and decision-making, not just AI integration. It also gives you a clear way to evaluate quality using a manually labeled dataset.
