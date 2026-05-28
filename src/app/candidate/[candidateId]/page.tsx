import Link from "next/link";
import { notFound } from "next/navigation";
import { parseCycle } from "@/lib/cycles";
import { getCandidateScope } from "@/lib/fec/candidates";
import { FecApiError } from "@/lib/fec/client";
import {
  candidateLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/format";

type CandidatePageProps = {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ cycle?: string }>;
};

export default async function CandidatePage({
  params,
  searchParams,
}: CandidatePageProps) {
  const { candidateId } = await params;
  const query = await searchParams;
  const cycle = parseCycle(query.cycle);
  let scope;

  try {
    scope = await getCandidateScope(candidateId, cycle);
  } catch (caught) {
    if (!(caught instanceof FecApiError)) {
      notFound();
    }

    return (
      <div className="page-shell">
        <p className="alert">{caught.message}</p>
        <Link className="text-link" href={`/?cycle=${cycle}`}>
          Return to candidate search
        </Link>
      </div>
    );
  }

  const { candidate, committees, total } = scope;

  return (
    <div className="page-shell">
      <div className="breadcrumbs no-print">
        <Link href={`/?cycle=${cycle}`}>Candidate search</Link>
        <span>/</span>
        <span>Overview</span>
      </div>

      <section className="title-block">
        <p className="eyebrow">{cycle} election cycle</p>
        <h1>{candidateLabel(candidate.name)}</h1>
        <p className="lede">
          {candidate.party_full ?? candidate.party ?? "Party unavailable"} ·{" "}
          {candidate.office_full ?? candidate.office ?? "Office unavailable"}{" "}
          {candidate.state ? `· ${candidate.state}` : ""}
          {candidate.district ? `-${candidate.district}` : ""}
        </p>
        <p className="id">FEC candidate ID: {candidate.candidate_id}</p>
      </section>

      <section className="metrics" aria-label="Campaign totals">
        <Metric label="Total receipts" value={formatCurrency(total?.receipts)} />
        <Metric
          label="Total disbursements"
          value={formatCurrency(total?.disbursements)}
        />
        <Metric
          label="Cash on hand"
          value={formatCurrency(total?.last_cash_on_hand_end_period)}
        />
        <Metric
          label="Debts owed"
          value={formatCurrency(total?.last_debts_owed_by_committee)}
        />
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Direct campaign scope</h2>
          <p>
            Authorized committees identified for this candidate and cycle.
            Direct receipt analysis will be limited to these committees.
          </p>
        </div>
        {committees.length === 0 ? (
          <p>No authorized committees were returned for this cycle.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Committee</th>
                <th>FEC ID</th>
                <th>Designation</th>
              </tr>
            </thead>
            <tbody>
              {committees.map((committee) => (
                <tr key={committee.committee_id}>
                  <td>
                    <Link
                      className="text-link"
                      href={`/committee/${committee.committee_id}?cycle=${cycle}`}
                    >
                      {committee.name ?? "Unnamed committee"}
                    </Link>
                  </td>
                  <td className="id">{committee.committee_id}</td>
                  <td>
                    {committee.designation_full ??
                      committee.designation ??
                      "Unavailable"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel metadata">
        <h2>Data status</h2>
        <p>
          FEC coverage period: {formatDate(total?.coverage_start_date)} through{" "}
          {formatDate(total?.coverage_end_date)}.
        </p>
        <p>Retrieved from OpenFEC: {formatDateTime(scope.retrievedAt)} ET.</p>
      </section>

      <div className="actions no-print">
        <Link
          className="button-link"
          href={`/candidate/${candidate.candidate_id}/report?cycle=${cycle}`}
        >
          Generate basic report
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}
