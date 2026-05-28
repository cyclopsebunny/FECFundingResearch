# FEC Funding Research

Private research web app for looking up federal candidates and producing a
sourced funding report from official OpenFEC data.

## Current Capabilities

- Search federal candidate records by name and election cycle.
- Display headline receipts, disbursements, cash, debt, and authorized campaign
  committee scope.
- Generate a report with direct receipt summary categories.
- Aggregate Schedule E independent expenditures into supporting, opposing, and
  top outside spending group sections.
- Export the report to PDF through the report page's print control.

Direct campaign receipts and outside spending are deliberately calculated and
displayed separately.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` from `.env.example` and provide an OpenFEC API key:

   ```dotenv
   FEC_API_KEY=your_key_here
   ```

3. Run the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

## Validation

```bash
npm run typecheck
npm run lint
npm run build
```

## Data And Usage Notice

The app retrieves OpenFEC candidate, committee, financial summary, and
Schedule E aggregate data server-side. The API credential is sent as an
`X-Api-Key` header and is not placed in browser-visible request URLs.

FEC contributor information is provided for research and analysis and must not
be used to solicit contributions or for commercial purposes.

See [PLAN.md](./PLAN.md) for the expanded product roadmap and methodology.
