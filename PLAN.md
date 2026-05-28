# FEC Candidate Funding Research Tool

## Product Decision Record

This project is a private, single-user research application for analyzing federal
candidate funding using Federal Election Commission (FEC) data.

Decisions fixed for the initial build:

- The tool is private research software, not a public or commercial donor
  directory.
- Reports cover both direct campaign funding and outside spending, displayed as
  separate analyses.
- Reports are available as an interactive web view and as a PDF export.
- The FEC API key is stored server-side and is never exposed to the browser.

## Goal

Given a federal candidate and election cycle, generate a sourced report that
answers:

1. How much has the candidate's campaign raised and spent?
2. What types of receipts account for the campaign's money?
3. What itemized individual contribution patterns are visible by geography,
   employer, occupation, and contribution size?
4. Which committees contribute directly to the candidate's authorized
   committees?
5. How much independent spending supports or opposes the candidate, and which
   outside groups account for it?

## Non-Goals For MVP

- State or local campaign-finance data.
- Multi-user accounts, sharing, or public publishing.
- Political predictions, donor influence scoring, or inferred affiliations.
- A generated narrative that states conclusions not directly supported by FEC
  aggregates.
- Bulk export of named individual contributors.

## Research And Usage Boundaries

FEC contributor data carries usage restrictions. Even though this version is
private, the software should be built so it does not become an accidental donor
solicitation or commercial list product.

MVP rules:

- Analyze individual contributions primarily through aggregates.
- Do not produce a report appendix listing named individual donors.
- Named political committees and independent expenditure groups may appear when
  needed to explain committee activity or outside spending.
- Display this notice in each report:
  "FEC contributor information is provided for research and analysis and must
  not be used to solicit contributions or for commercial purposes."
- Store retrieval timestamps, report cycle, and methodology version with each
  saved report.

## Core User Workflow

1. Search for a candidate by name.
2. Select the correct candidate record and two-year election cycle.
3. Fetch or refresh FEC data.
4. View an overview page with campaign totals and committee relationships.
5. Review direct funding sources and outside spending in separate sections.
6. Generate a report with charts, tables, methodology, caveats, and source
   links.
7. Export the displayed report as PDF.

## MVP Screens

| Route | Purpose |
| --- | --- |
| `/` | Search candidate records and select a cycle. |
| `/candidate/[candidateId]?cycle=2026` | Campaign overview and committee identification. |
| `/candidate/[candidateId]/funding?cycle=2026` | Direct receipts analysis. |
| `/candidate/[candidateId]/outside-spending?cycle=2026` | Independent expenditure analysis. |
| `/candidate/[candidateId]/report?cycle=2026` | Print-ready sourced report and PDF export. |

## Report Specification

### 1. Header And Scope

- Candidate name, office, state/district, party, FEC candidate ID.
- Election cycle and data retrieval time.
- Authorized committees included in direct-funding analysis.
- Clear labels for "Campaign receipts" and "Outside spending."

### 2. Campaign Financial Summary

- Total receipts.
- Total disbursements.
- Cash on hand.
- Debts/loans where supplied by the relevant summary data.
- Coverage period and filing caveat.

### 3. Direct Funding Sources

Direct funding means receipts reported by the candidate's authorized campaign
committees. It must not include independent expenditures.

- Receipt totals by source category exposed by FEC summary data.
- Itemized individual contributions, shown as an analytical subset and labeled
  accordingly.
- Committee contributions to the candidate, showing contributing committee
  name, committee type when available, and aggregate amount.
- Contributions by amount band.
- Itemized individual contributions by state.
- Employer and occupation aggregates with a warning that free-text values can
  be inconsistent.

### 4. Outside Spending

Outside spending means independent expenditures reported in support of or
opposition to the candidate and is not money received by the campaign.

- Total supporting independent expenditures.
- Total opposing independent expenditures.
- Top outside spending filers/groups.
- Support/oppose designation and coverage period.
- Statement that these expenditures are not contributions to or spending by
  the candidate.

### 5. Methodology And Sources

- OpenFEC endpoints and request parameters used for the report.
- Retrieved-at timestamp.
- Methodology version.
- Treatment of amended filings and FEC aggregate endpoints.
- Limitations: reporting lag, itemized vs. unitemized contributions,
  inconsistent free-text employer/occupation fields, conduits/earmarks, and
  outside-spending scope.
- Link to the FEC candidate/committee source pages when available.

## Data Semantics And Guardrails

These rules should be encoded as application logic and covered by tests:

1. Keep direct campaign receipts and outside spending in different data models,
   charts, and totals.
2. Identify authorized candidate committees for the selected cycle before
   querying campaign receipts.
3. Prefer FEC summary/aggregate values for headline totals instead of summing
   arbitrary raw transactions.
4. Use Schedule A receipt records or receipt aggregates only for breakdowns
   that cannot be obtained from headline summary totals.
5. Use Schedule E independent expenditure aggregates for support/oppose totals;
   do not add Schedule E amounts to campaign receipts.
6. Record all committee IDs included in a generated report to make the
   computation reproducible.
7. Treat employer and occupation groupings as reported-text analyses until a
   documented normalization layer is built.
8. Label analysis of itemized individual contributions so it is not presented
   as the complete funding base.

## Official Data Integration Plan

Base service: `https://api.open.fec.gov/v1/`

The application should use the official OpenFEC Swagger documentation during
implementation to lock endpoint query parameter types and response schemas.
The required resource categories are:

| Need | OpenFEC resource area | Use in app |
| --- | --- | --- |
| Candidate selection | Candidate search and candidate detail endpoints | Resolve candidate ID and metadata. |
| Authorized committees | Candidate committee relationship endpoints | Establish direct-receipt scope for the cycle. |
| Headline campaign totals | Candidate/committee financial totals endpoints | Summary cards and headline figures. |
| Direct receipt breakdowns | Schedule A receipt endpoints and aggregates | Source, state, employer, occupation, and amount analyses. |
| Outside spending | Schedule E independent expenditure endpoints/aggregates | Support/oppose totals and top spending groups. |
| Audit trail | Filing/source record metadata | Methodology and links when a result requires source inspection. |

API operating assumptions:

- OpenFEC data is updated nightly.
- A registered API key permits 1,000 calls per hour, with a 100-record page
  limit per request under the documented standard limit.
- The server should cache successful requests and avoid fetching the same
  candidate-cycle analysis on every page load.
- The `.env` value `FEC_API_KEY` is used only in server-side code.

## Architecture Recommendation

Because this is initially private and single-user, start with a local-first
full-stack application and avoid production infrastructure until the research
workflow is proven.

| Area | MVP Choice | Reason |
| --- | --- | --- |
| App framework | Next.js with TypeScript | One codebase for server routes, UI, and report pages. |
| UI styling | Tailwind CSS | Fast report-oriented layouts and print styling. |
| Charts | Recharts | Simple web and print-friendly charts. |
| Persistence | SQLite with Drizzle ORM | Minimal setup for a private local application. |
| Data validation | Zod | Validate FEC API responses at the server boundary. |
| PDF | Playwright print-to-PDF from report route | PDF mirrors the verified web report. |
| Testing | Vitest plus Playwright smoke test | Protect calculation rules and PDF route flow. |

Upgrade path:

- Move SQLite to PostgreSQL if deployment, shared access, or larger cached data
  sets become requirements.
- Add authentication only before the tool is accessible outside a trusted local
  environment.

## Proposed Internal Data Model

Store normalized aggregates and fetch provenance, not a general-purpose donor
database.

| Entity | Important fields |
| --- | --- |
| `candidates` | `candidate_id`, name, office, state, district, party, timestamps |
| `committees` | `committee_id`, name, type, designation, timestamps |
| `candidate_committees` | candidate ID, committee ID, cycle, relationship/designation |
| `fetch_runs` | endpoint category, request parameters, retrieved time, response status, cache key |
| `funding_snapshots` | candidate ID, cycle, included committee IDs, financial totals JSON, direct-funding aggregates JSON, outside-spending aggregates JSON, retrieved time, methodology version |
| `reports` | report ID, snapshot ID, created time, title, PDF path, methodology version |

Do not persist named individual contributor transaction detail in the first
iteration unless a later research use case requires it.

## Server Modules

Suggested source organization:

```text
src/
  app/
    page.tsx
    candidate/[candidateId]/
      page.tsx
      funding/page.tsx
      outside-spending/page.tsx
      report/page.tsx
    api/
      candidates/search/route.ts
      candidate/[candidateId]/refresh/route.ts
      report/[reportId]/pdf/route.ts
  lib/
    fec/
      client.ts
      schemas.ts
      candidate.ts
      receipts.ts
      outside-spending.ts
    analysis/
      funding-summary.ts
      outside-spending-summary.ts
      methodology.ts
    db/
      schema.ts
      queries.ts
    reports/
      build-report.ts
      pdf.ts
```

## Delivery Plan

### Milestone 0: Project Foundation

Deliverables:

- Scaffold Next.js/TypeScript project.
- Add SQLite/Drizzle persistence.
- Configure `FEC_API_KEY` through `.env.local` with a documented
  `.env.example`.
- Add server-side FEC client with rate-limit/error handling and response
  validation.
- Add a methodology version constant and request provenance logging.

Acceptance checks:

- Application boots locally.
- A server-side health/test request can call an OpenFEC endpoint without
  exposing the API key to browser code.
- A failed API call produces a usable error state.

### Milestone 1: Candidate Lookup And Scope

Deliverables:

- Candidate search screen.
- Cycle selector.
- Candidate profile page.
- Authorized committee lookup for the selected cycle.

Acceptance checks:

- Searching a known candidate returns selectable results.
- Selecting a candidate shows candidate metadata and the committee IDs used for
  analysis.
- Refresh operations are cached by candidate and cycle.

### Milestone 2: Campaign Receipts Analysis

Deliverables:

- Campaign headline totals.
- Direct receipt source sections.
- Itemized individual analyses by amount range and state.
- Employer/occupation reported-text tables.
- Committee contribution table.

Acceptance checks:

- Every card and chart labels whether it represents summary totals or itemized
  receipt analysis.
- Direct receipt calculations use only authorized committee scope.
- Unit tests assert that outside-spending data cannot enter direct receipt
  totals.

### Milestone 3: Outside Spending Analysis

Deliverables:

- Schedule E support and opposition totals.
- Top outside spender table.
- Dedicated outside-spending page and report section.

Acceptance checks:

- Support and oppose amounts are calculated and displayed separately.
- UI explicitly states that outside spending is not received by the campaign.
- Tests ensure these figures remain excluded from campaign funding totals.

### Milestone 4: Reports And PDF Export

Deliverables:

- Print-ready report page.
- PDF generation endpoint.
- Source/methodology appendix and usage notice.
- Saved report metadata tied to a snapshot.

Acceptance checks:

- Web and PDF reports show matching figures.
- PDF includes data retrieval time, cycle, included committees, methodology,
  FEC attribution, and usage notice.
- Generating a PDF does not refetch or silently alter the underlying snapshot.

### Milestone 5: Reliability

Deliverables:

- Loading, empty, stale-cache, FEC rate-limit, and unavailable-data handling.
- Calculation and schema tests.
- PDF/report smoke test.
- README usage/setup documentation.

Acceptance checks:

- The tool behaves clearly with partial or missing FEC data.
- Cached snapshots identify when data was retrieved and allow manual refresh.
- Automated checks cover the core direct-vs-outside-spending separation.

## Recommended First Build Slice

The first implementation session should produce a vertical slice:

1. Scaffold the Next.js application and local database.
2. Add server-only OpenFEC API access using `FEC_API_KEY`.
3. Build candidate search, candidate selection, and cycle selection.
4. Display candidate metadata and authorized committees.
5. Generate a basic report page that lists its FEC data scope and retrieval
   timestamp, before complex funding charts are added.

This tests the riskiest early issue: reliably resolving which FEC candidate and
committee records a later funding analysis should use.

## Sources

- OpenFEC API documentation: <https://api.open.fec.gov/developers/>
- FEC browse-data landing page: <https://www.fec.gov/data/browse-data/>
- FEC guidance on sale or use of contributor information:
  <https://www.fec.gov/updates/sale-or-use-contributor-information/>

