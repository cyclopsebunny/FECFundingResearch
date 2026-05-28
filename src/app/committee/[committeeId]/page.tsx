import Link from "next/link";
import { notFound } from "next/navigation";
import { parseCycle } from "@/lib/cycles";
import { FecApiError } from "@/lib/fec/client";
import { getCommitteeProfile } from "@/lib/fec/committees";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/lib/format";

type CommitteePageProps = {
  params: Promise<{ committeeId: string }>;
  searchParams: Promise<{ cycle?: string }>;
};

export default async function CommitteePage({
  params,
  searchParams,
}: CommitteePageProps) {
  const { committeeId } = await params;
  const query = await searchParams;
  const cycle = parseCycle(query.cycle);
  let profile;

  try {
    profile = await getCommitteeProfile(committeeId, cycle);
  } catch (caught) {
    if (!(caught instanceof FecApiError)) {
      notFound();
    }

    return (
      <div className="page-shell">
        <p className="alert">{caught.message}</p>
        <Link className="text-link" href={`/committees?cycle=${cycle}`}>
          Return to committee search
        </Link>
      </div>
    );
  }

  const { committee, total, directRecipients, outsideTargets } = profile;

  return (
    <div className="page-shell">
      <div className="breadcrumbs">
        <Link href={`/committees?cycle=${cycle}`}>Committee search</Link>
        <span>/</span>
        <span>Profile</span>
      </div>

      <section className="title-block">
        <p className="eyebrow">{cycle} election cycle</p>
        <h1>{committee.name ?? "Unnamed committee"}</h1>
        <p className="lede">
          {committee.committee_type_full ??
            committee.committee_type ??
            "Committee type unavailable"}
          {committee.designation_full ? ` · ${committee.designation_full}` : ""}
          {committee.organization_type_full
            ? ` · ${committee.organization_type_full}`
            : ""}
        </p>
        <p className="id">FEC committee ID: {committee.committee_id}</p>
      </section>

      <section className="metrics" aria-label="Committee totals">
        <Metric label="Receipts" value={formatCurrency(total?.receipts)} />
        <Metric
          label="Disbursements"
          value={formatCurrency(total?.disbursements)}
        />
        <Metric
          label="Candidate contributions"
          value={formatCurrency(total?.contributions_to_candidates)}
        />
        <Metric
          label="Independent expenditures"
          value={formatCurrency(total?.independent_expenditures)}
        />
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Direct recipient committees</h2>
          <p>
            Schedule B disbursements grouped by recipient. Candidate IDs are
            shown when the recipient committee is associated with a candidate.
          </p>
        </div>
        {directRecipients.length === 0 ? (
          <p>No grouped recipient records were returned for this committee.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Candidate IDs</th>
                <th>Transactions</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {directRecipients.map((recipient) => (
                <tr key={`${recipient.recipientId}:${recipient.recipientName}`}>
                  <td>
                    {recipient.recipientName}
                    {recipient.recipientId && (
                      <span className="table-detail">{recipient.recipientId}</span>
                    )}
                    {recipient.committeeType && (
                      <span className="table-detail">{recipient.committeeType}</span>
                    )}
                  </td>
                  <td>
                    {recipient.candidateIds.length === 0
                      ? "Not linked"
                      : recipient.candidateIds.map((candidateId) => (
                          <Link
                            className="tag-link"
                            href={`/candidate/${candidateId}?cycle=${cycle}`}
                            key={candidateId}
                          >
                            {candidateId}
                          </Link>
                        ))}
                  </td>
                  <td>{formatNumber(recipient.count)}</td>
                  <td>{formatCurrency(recipient.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Independent expenditure targets</h2>
          <p>
            Schedule E spending grouped by candidate and support/oppose
            position. These amounts are not contributions to the campaign.
          </p>
        </div>
        {outsideTargets.length === 0 ? (
          <p>No grouped independent expenditures were returned for this committee.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Position</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {outsideTargets.map((target) => (
                <tr key={`${target.committeeId}:${target.position}`}>
                  <td>
                    {target.committeeId ? (
                      <Link
                        className="text-link"
                        href={`/candidate/${target.committeeId}?cycle=${cycle}`}
                      >
                        {target.committeeName}
                      </Link>
                    ) : (
                      target.committeeName
                    )}
                    {target.committeeId && (
                      <span className="table-detail">{target.committeeId}</span>
                    )}
                  </td>
                  <td>{target.position}</td>
                  <td>{formatCurrency(target.amount)}</td>
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
        <p>Retrieved from OpenFEC: {formatDateTime(profile.retrievedAt)} ET.</p>
      </section>
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
