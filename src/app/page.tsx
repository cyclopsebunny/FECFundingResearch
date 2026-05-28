import Link from "next/link";
import { FecApiError } from "@/lib/fec/client";
import { searchCandidates } from "@/lib/fec/candidates";
import { candidateLabel } from "@/lib/format";
import { parseCycle, selectableCycles } from "@/lib/cycles";

type HomeProps = {
  searchParams: Promise<{
    q?: string;
    cycle?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const input = await searchParams;
  const query = input.q?.trim() ?? "";
  const cycle = parseCycle(input.cycle);
  let results = null;
  let error = null;

  if (query) {
    try {
      results = await searchCandidates(query, cycle);
    } catch (caught) {
      error =
        caught instanceof FecApiError
          ? caught.message
          : "Candidate search could not be completed.";
    }
  }

  return (
    <div className="page-shell">
      <section className="hero">
        <p className="eyebrow">Federal Election Commission data</p>
        <h1>Research a candidate&apos;s funding</h1>
        <p className="lede">
          Find a federal candidate, define the authorized committee scope, and
          generate a sourced campaign-finance report.
        </p>
      </section>

      <section className="panel search-panel">
        <form className="search-form" method="get">
          <label>
            Candidate name
            <input
              autoFocus
              defaultValue={query}
              name="q"
              placeholder="e.g. Warnock, Raphael"
              required
              type="search"
            />
          </label>
          <label>
            Election cycle
            <select defaultValue={cycle} name="cycle">
              {selectableCycles().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Search FEC records</button>
        </form>
      </section>

      <section className="lookup-grid">
        <form className="panel stacked-form" action="/races" method="get">
          <div className="section-title">
            <h2>Race or ZIP lookup</h2>
            <p>Find federal candidates by office, state, district, or ZIP.</p>
          </div>
          <div className="form-grid">
            <label>
              ZIP code
              <input name="zip" inputMode="numeric" placeholder="e.g. 30303" />
            </label>
            <label>
              Office
              <select name="office" defaultValue="">
                <option value="">Any office</option>
                <option value="P">President</option>
                <option value="S">Senate</option>
                <option value="H">House</option>
              </select>
            </label>
            <label>
              State
              <input name="state" maxLength={2} placeholder="e.g. GA" />
            </label>
            <label>
              District
              <input name="district" placeholder="e.g. 05" />
            </label>
            <label>
              Election cycle
              <select defaultValue={cycle} name="cycle">
                {selectableCycles().map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button type="submit">Find races</button>
        </form>

        <form className="panel stacked-form" action="/committees" method="get">
          <div className="section-title">
            <h2>PAC or organization lookup</h2>
            <p>Search committees and view recipients and outside spending.</p>
          </div>
          <label>
            Committee or organization name
            <input name="q" placeholder="e.g. Raytheon PAC" required />
          </label>
          <label>
            Election cycle
            <select defaultValue={cycle} name="cycle">
              {selectableCycles().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Search committees</button>
        </form>
      </section>

      {error && <p className="alert">{error}</p>}

      {results && (
        <section className="panel results">
          <div className="section-title">
            <h2>Candidate records</h2>
            <p>
              {results.length} result{results.length === 1 ? "" : "s"} for{" "}
              <strong>{query}</strong> in the {cycle} cycle
            </p>
          </div>
          {results.length === 0 ? (
            <p>No candidates matched that search.</p>
          ) : (
            <ul className="candidate-list">
              {results.map((candidate) => (
                <li key={candidate.candidate_id}>
                  <div>
                    <h3>{candidateLabel(candidate.name)}</h3>
                    <p>
                      {candidate.party_full ?? candidate.party ?? "Party unavailable"} ·{" "}
                      {candidate.office_full ?? candidate.office ?? "Office unavailable"}{" "}
                      {candidate.state ? `· ${candidate.state}` : ""}
                      {candidate.district ? `-${candidate.district}` : ""}
                    </p>
                    <p className="id">{candidate.candidate_id}</p>
                  </div>
                  <Link
                    className="action-link"
                    href={`/candidate/${candidate.candidate_id}?cycle=${cycle}`}
                  >
                    Analyze
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="disclaimer">
        <strong>Usage notice.</strong> FEC contributor information is provided
        for research and analysis and must not be used to solicit contributions
        or for commercial purposes.
      </section>
    </div>
  );
}
