import Link from "next/link";
import { notFound } from "next/navigation";
import { parseCycle } from "@/lib/cycles";
import { getCandidateScope } from "@/lib/fec/candidates";
import { getOutsideSpendingSummary } from "@/lib/fec/outside-spending";
import { getCandidateReceiptAnalysis } from "@/lib/fec/receipts";
import {
  candidateLabel,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/lib/format";
import { PrintButton } from "./print-button";

type ReportPageProps = {
  params: Promise<{ candidateId: string }>;
  searchParams: Promise<{ cycle?: string }>;
};

export default async function ReportPage({
  params,
  searchParams,
}: ReportPageProps) {
  const { candidateId } = await params;
  const query = await searchParams;
  const cycle = parseCycle(query.cycle);
  let scope;
  let outsideSpending;
  let receiptAnalysis;

  try {
    scope = await getCandidateScope(candidateId, cycle);
    [outsideSpending, receiptAnalysis] = await Promise.all([
      getOutsideSpendingSummary(candidateId, cycle),
      getCandidateReceiptAnalysis(scope.committees, cycle),
    ]);
  } catch {
    notFound();
  }

  const { candidate, committees, total } = scope;
  const receiptCategories = [
    ["Individual contributions", total?.individual_contributions],
    ["Political committee contributions", total?.other_political_committee_contributions],
    ["Party committee contributions", total?.political_party_committee_contributions],
    ["Candidate contributions", total?.candidate_contribution],
    ["Loans", total?.loans],
    ["Transfers from other authorized committees", total?.transfers_from_other_authorized_committee],
    ["Other receipts", total?.other_receipts],
  ].filter((entry): entry is [string, number] => entry[1] !== null && entry[1] !== undefined);

  return (
    <div className="report-shell">
      <div className="report-actions no-print">
        <Link href={`/candidate/${candidateId}?cycle=${cycle}`}>
          Back to overview
        </Link>
        <PrintButton />
      </div>

      <article className="report">
        <header className="report-header">
          <p className="eyebrow">Candidate Funding Report</p>
          <h1>{candidateLabel(candidate.name)}</h1>
          <p>
            {cycle} election cycle · FEC candidate ID {candidate.candidate_id}
          </p>
          <p>
            Generated {formatDateTime(scope.retrievedAt)} ET from official
            OpenFEC records.
          </p>
        </header>

        <section>
          <h2>Campaign Financial Summary</h2>
          <div className="report-metrics">
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
          </div>
          <p className="caption">
            Coverage period: {formatDate(total?.coverage_start_date)} through{" "}
            {formatDate(total?.coverage_end_date)}.
          </p>
        </section>

        <section>
          <h2>Authorized Committee Scope</h2>
          <p>
            The next direct-funding analysis stage will retrieve reported
            receipts only for the authorized campaign committees below.
          </p>
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
                  <td>{committee.name ?? "Unnamed committee"}</td>
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
        </section>

        <section>
          <h2>Direct Funding Sources</h2>
          <p>
            These receipt categories are FEC financial-summary amounts for the
            candidate&apos;s campaign. Outside independent expenditures are not
            included in these figures.
          </p>
          <table>
            <thead>
              <tr>
                <th>Receipt category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {receiptCategories.map(([label, value]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td>{formatCurrency(value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="caption">
            Individual itemized contributions:{" "}
            {formatCurrency(total?.individual_itemized_contributions)}.
            Individual unitemized contributions:{" "}
            {formatCurrency(total?.individual_unitemized_contributions)}.
          </p>
          <h3>Top itemized committee and organization receipts</h3>
          {receiptAnalysis.committeeReceipts.length === 0 ? (
            <p className="caption">
              No itemized non-individual receipt rows were returned for the
              authorized committees.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Contributor</th>
                  <th>Type</th>
                  <th>Transactions</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {receiptAnalysis.committeeReceipts.map((receipt) => (
                  <tr
                    key={`${receipt.contributorId}:${receipt.contributorName}`}
                  >
                    <td>
                      {receipt.contributorName}
                      {receipt.contributorId && (
                        <span className="table-detail">
                          {receipt.contributorId}
                        </span>
                      )}
                    </td>
                    <td>{receipt.entityType}</td>
                    <td>{formatNumber(receipt.count)}</td>
                    <td>{formatCurrency(receipt.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>Itemized Individual Contribution Patterns</h2>
          <p>
            These are aggregate views of itemized Schedule A receipts for the
            authorized campaign committees. They do not include unitemized
            contributions.
          </p>
          <AggregateTable
            title="Top states"
            rows={receiptAnalysis.byState}
            labelFor={(row) => row.state_full ?? row.state ?? "Unknown state"}
          />
          <AggregateTable
            title="Top ZIP codes"
            rows={receiptAnalysis.byZip}
            labelFor={(row) => row.zip ?? "Unknown ZIP"}
          />
          <AggregateTable
            title="Top employers"
            rows={receiptAnalysis.byEmployer}
            labelFor={(row) => row.employer ?? "Unknown employer"}
          />
          <AggregateTable
            title="Top occupations"
            rows={receiptAnalysis.byOccupation}
            labelFor={(row) => row.occupation ?? "Unknown occupation"}
          />
          <AggregateTable
            title="Contribution amount bands"
            rows={receiptAnalysis.bySize}
            labelFor={(row) =>
              row.size === null || row.size === undefined
                ? "Unknown band"
                : String(row.size)
            }
          />
        </section>

        <section>
          <h2>Outside Spending</h2>
          <p>
            Independent expenditures reported as supporting or opposing the
            candidate. These figures are not money received or spent by the
            candidate&apos;s campaign.
          </p>
          <div className="report-metrics outside-metrics">
            <Metric
              label="Supporting candidate"
              value={formatCurrency(outsideSpending.support)}
            />
            <Metric
              label="Opposing candidate"
              value={formatCurrency(outsideSpending.oppose)}
            />
          </div>
          <h3>Top outside spending groups</h3>
          {outsideSpending.topSpenders.length === 0 ? (
            <p>No aggregated independent expenditures were returned.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Committee/filer</th>
                  <th>Position</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {outsideSpending.topSpenders.map((spender) => (
                  <tr key={`${spender.committeeId}:${spender.position}`}>
                    <td>
                      {spender.committeeName}
                      {spender.committeeId && (
                        <span className="table-detail">{spender.committeeId}</span>
                      )}
                    </td>
                    <td>{spender.position}</td>
                    <td>{formatCurrency(spender.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2>Methodology And Usage Notice</h2>
          <p>
            This report uses OpenFEC candidate, candidate committee, candidate
            totals, Schedule A receipt aggregates, and Schedule E by-candidate
            aggregate resources for the selected election cycle. FEC records
            may change as amended reports are processed. Schedule E totals are
            calculated independently from campaign receipt totals.
          </p>
          <p>
            FEC contributor information is provided for research and analysis
            and must not be used to solicit contributions or for commercial
            purposes.
          </p>
          <p className="caption">Methodology version: funding-report-v0.2</p>
        </section>
      </article>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p>{label}</p>
      <strong>{value}</strong>
    </div>
  );
}

function AggregateTable({
  title,
  rows,
  labelFor,
}: {
  title: string;
  rows: Array<{
    total?: number | null;
    count?: number | null;
    state?: string | null;
    state_full?: string | null;
    zip?: string | null;
    employer?: string | null;
    occupation?: string | null;
    size?: string | number | null;
  }>;
  labelFor: (row: {
    state?: string | null;
    state_full?: string | null;
    zip?: string | null;
    employer?: string | null;
    occupation?: string | null;
    size?: string | number | null;
  }) => string;
}) {
  return (
    <>
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <p className="caption">No aggregate rows were returned.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Group</th>
              <th>Transactions</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}:${labelFor(row)}:${index}`}>
                <td>{labelFor(row)}</td>
                <td>{formatNumber(row.count)}</td>
                <td>{formatCurrency(row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
