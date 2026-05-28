import Link from "next/link";
import { parseCycle, selectableCycles } from "@/lib/cycles";
import { FecApiError } from "@/lib/fec/client";
import { searchCommittees } from "@/lib/fec/committees";

type CommitteesPageProps = {
  searchParams: Promise<{
    q?: string;
    cycle?: string;
  }>;
};

export default async function CommitteesPage({
  searchParams,
}: CommitteesPageProps) {
  const input = await searchParams;
  const query = input.q?.trim() ?? "";
  const cycle = parseCycle(input.cycle);
  let results = null;
  let error = null;

  if (query) {
    try {
      results = await searchCommittees(query, cycle);
    } catch (caught) {
      error =
        caught instanceof FecApiError
          ? caught.message
          : "Committee search could not be completed.";
    }
  }

  return (
    <div className="page-shell">
      <div className="breadcrumbs">
        <Link href={`/?cycle=${cycle}`}>Search</Link>
        <span>/</span>
        <span>Committee lookup</span>
      </div>

      <section className="title-block">
        <p className="eyebrow">{cycle} election cycle</p>
        <h1>PAC and organization lookup</h1>
        <p className="lede">
          Search political committees, then inspect direct recipients and
          independent expenditures separately.
        </p>
      </section>

      <section className="panel search-panel">
        <form className="search-form" method="get">
          <label>
            Committee or organization name
            <input
              autoFocus
              defaultValue={query}
              name="q"
              placeholder="e.g. Raytheon PAC"
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
          <button type="submit">Search committees</button>
        </form>
      </section>

      {error && <p className="alert">{error}</p>}

      {results && (
        <section className="panel results">
          <div className="section-title">
            <h2>Committee records</h2>
            <p>
              {results.length} result{results.length === 1 ? "" : "s"} for{" "}
              <strong>{query}</strong>
            </p>
          </div>
          {results.length === 0 ? (
            <p>No committees matched that search.</p>
          ) : (
            <ul className="candidate-list">
              {results.map((committee) => (
                <li key={committee.committee_id}>
                  <div>
                    <h3>{committee.name ?? "Unnamed committee"}</h3>
                    <p>
                      {committee.committee_type_full ??
                        committee.committee_type ??
                        "Committee type unavailable"}
                      {committee.designation_full
                        ? ` · ${committee.designation_full}`
                        : ""}
                      {committee.state ? ` · ${committee.state}` : ""}
                    </p>
                    <p className="id">{committee.committee_id}</p>
                  </div>
                  <Link
                    className="action-link"
                    href={`/committee/${committee.committee_id}?cycle=${cycle}`}
                  >
                    Analyze
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
