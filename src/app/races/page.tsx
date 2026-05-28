import Link from "next/link";
import { parseCycle, selectableCycles } from "@/lib/cycles";
import { FecApiError } from "@/lib/fec/client";
import { listCandidates } from "@/lib/fec/candidates";
import { searchElections } from "@/lib/fec/elections";
import { candidateLabel, formatDateTime } from "@/lib/format";
import type { Candidate, Election } from "@/lib/fec/schemas";

type RacesPageProps = {
  searchParams: Promise<{
    cycle?: string;
    zip?: string;
    office?: string;
    state?: string;
    district?: string;
  }>;
};

export default async function RacesPage({ searchParams }: RacesPageProps) {
  const input = await searchParams;
  const cycle = parseCycle(input.cycle);
  const zip = clean(input.zip);
  const office = clean(input.office);
  const state = clean(input.state)?.toUpperCase();
  const district = clean(input.district);
  const hasSearch = Boolean(zip || office || state || district);
  let elections: Election[] = [];
  let candidates: Candidate[] = [];
  let retrievedAt: string | null = null;
  let error: string | null = null;

  if (hasSearch) {
    try {
      const electionLookup = await searchElections({
        cycle,
        zip,
        office,
        state,
        district,
      });
      elections = electionLookup.elections;
      retrievedAt = electionLookup.retrievedAt;

      const candidateFilters = firstCandidateLookup({ elections, office, state, district });

      if (candidateFilters) {
        candidates = await listCandidates({
          cycle,
          ...candidateFilters,
        });
      }
    } catch (caught) {
      error =
        caught instanceof FecApiError
          ? caught.message
          : "Race lookup could not be completed.";
    }
  }

  return (
    <div className="page-shell">
      <div className="breadcrumbs">
        <Link href={`/?cycle=${cycle}`}>Search</Link>
        <span>/</span>
        <span>Race lookup</span>
      </div>

      <section className="title-block">
        <p className="eyebrow">{cycle} election cycle</p>
        <h1>Race and ZIP lookup</h1>
        <p className="lede">
          Resolve a federal race from geography, then open candidate funding
          reports from the matching candidate records.
        </p>
      </section>

      <section className="panel search-panel">
        <form className="search-form race-form" method="get">
          <label>
            ZIP code
            <input defaultValue={zip} inputMode="numeric" name="zip" />
          </label>
          <label>
            Office
            <select defaultValue={office ?? ""} name="office">
              <option value="">Any office</option>
              <option value="P">President</option>
              <option value="S">Senate</option>
              <option value="H">House</option>
            </select>
          </label>
          <label>
            State
            <input defaultValue={state} maxLength={2} name="state" />
          </label>
          <label>
            District
            <input defaultValue={district} name="district" />
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
          <button type="submit">Find races</button>
        </form>
      </section>

      {error && <p className="alert">{error}</p>}

      {hasSearch && !error && (
        <>
          <section className="panel">
            <div className="section-title">
              <h2>Matched races</h2>
              <p>
                {elections.length} result{elections.length === 1 ? "" : "s"}
                {retrievedAt ? ` · retrieved ${formatDateTime(retrievedAt)} ET` : ""}
              </p>
            </div>
            {elections.length === 0 ? (
              <p>No election records matched those filters.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Race</th>
                    <th>Office</th>
                    <th>State</th>
                    <th>District</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {elections.map((election, index) => (
                    <tr key={`${raceKey(election)}:${index}`}>
                      <td>{raceName(election)}</td>
                      <td>{election.office_full ?? election.office ?? "Any"}</td>
                      <td>{election.state ?? "National"}</td>
                      <td>{election.district_full ?? election.district ?? "Statewide"}</td>
                      <td>
                        {election.office && election.state ? (
                          <Link className="text-link" href={raceHref(election, cycle)}>
                            View candidates
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel">
            <div className="section-title">
              <h2>Candidate records</h2>
              <p>
                {candidates.length} candidate{candidates.length === 1 ? "" : "s"}
                {state ? ` in ${state}` : ""}
                {district ? `-${district}` : ""}
              </p>
            </div>
            {candidates.length === 0 ? (
              <p>Choose a race above or add office/state filters to list candidates.</p>
            ) : (
              <ul className="candidate-list">
                {candidates.map((candidate) => (
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
        </>
      )}
    </div>
  );
}

function firstCandidateLookup(input: {
  elections: Election[];
  office?: string;
  state?: string;
  district?: string;
}) {
  if (input.office || input.state || input.district) {
    return {
      office: input.office,
      state: input.state,
      district: input.district,
    };
  }

  const race = input.elections.find((election) => election.office && election.state);

  if (!race) {
    return null;
  }

  return {
    office: candidateOffice(race.office),
    state: race.state ?? undefined,
    district: race.district ?? undefined,
  };
}

function raceHref(election: Election, cycle: number): string {
  const params = new URLSearchParams({
    cycle: String(cycle),
    office: candidateOffice(election.office) ?? "",
    state: election.state ?? "",
  });

  if (election.district) {
    params.set("district", election.district);
  }

  return `/races?${params}`;
}

function raceName(election: Election): string {
  const state = election.state ?? "U.S.";
  const district = election.district ? `-${election.district}` : "";
  return `${state}${district} ${election.office_full ?? election.office ?? "race"}`;
}

function raceKey(election: Election): string {
  return [
    election.cycle ?? election.election_year,
    election.office,
    election.state,
    election.district,
  ].join(":");
}

function candidateOffice(office: string | null | undefined): string | undefined {
  if (office === "house") {
    return "H";
  }

  if (office === "senate") {
    return "S";
  }

  if (office === "president") {
    return "P";
  }

  return office ?? undefined;
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
