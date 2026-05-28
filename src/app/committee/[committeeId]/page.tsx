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

type BreakdownRow = [string, number | null | undefined];
type DisplayBreakdownRow = [string, number];

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

  const {
    committee,
    total,
    topReceipts,
    topDisbursements,
    directRecipients,
    outsideTargets,
  } = profile;
  const receiptBreakdown = filterBreakdownRows([
    ["Transfers from affiliated party committees", total?.transfers_from_affiliated_party],
    ["Individual contributions", total?.individual_contributions],
    ["Transfers from nonfederal account", total?.transfers_from_nonfed_account],
    ["Other political committee contributions", total?.other_political_committee_contributions],
    ["Political party committee contributions", total?.political_party_committee_contributions],
    ["Offsets to operating expenditures", total?.offsets_to_operating_expenditures],
  ]);
  const disbursementBreakdown = filterBreakdownRows([
    ["Operating expenditures", total?.operating_expenditures],
    ["Transfers to affiliated committees", total?.transfers_to_affiliated_committee],
    ["Contribution refunds", total?.contribution_refunds],
    ["Independent expenditures", total?.independent_expenditures],
    ["Coordinated party expenditures", total?.coordinated_expenditures_by_party_committee],
    ["Candidate contributions", total?.contributions_to_candidates],
    ["Other disbursements", total?.other_disbursements],
  ]);

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
          <h2>Where the money came from</h2>
          <p>
            FEC summary categories explain the full receipt total. The itemized
            table below lists non-individual committee and organization receipts.
          </p>
        </div>
        <BreakdownTable rows={receiptBreakdown} />
        <h3>Top itemized non-individual receipts</h3>
        {topReceipts.length === 0 ? (
          <p>No itemized non-individual receipts were returned for this cycle.</p>
        ) : (
          <TransactionTable
            cycle={cycle}
            entityLabel="Contributor"
            transactions={topReceipts}
          />
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Where the money went</h2>
          <p>
            These FEC categories include operating expenses, transfers, refunds,
            and political spending. They are broader than recipient-committee
            transfers.
          </p>
        </div>
        <BreakdownTable rows={disbursementBreakdown} />
        <h3>Top itemized disbursements</h3>
        {topDisbursements.length === 0 ? (
          <p>No itemized disbursements were returned for this cycle.</p>
        ) : (
          <TransactionTable
            cycle={cycle}
            entityLabel="Payee"
            transactions={topDisbursements}
          />
        )}
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Direct recipient committees</h2>
          <p>
            Schedule B disbursements grouped by recipient. Candidate IDs are
            shown when the recipient committee is associated with a candidate.
            This is a thread-following view, not the full disbursement total.
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
                    <CommitteeNameLink
                      committeeId={recipient.recipientId}
                      cycle={cycle}
                      name={recipient.recipientName}
                    />
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

function BreakdownTable({ rows }: { rows: DisplayBreakdownRow[] }) {
  if (rows.length === 0) {
    return <p>No summary category amounts were returned.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td>{label}</td>
            <td>{formatCurrency(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TransactionTable({
  cycle,
  entityLabel,
  transactions,
}: {
  cycle: number;
  entityLabel: string;
  transactions: Array<{
    linkedCommitteeId: string | null | undefined;
    name: string;
    type: string;
    description: string;
    date: string | null | undefined;
    amount: number;
  }>;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>{entityLabel}</th>
          <th>Type / purpose</th>
          <th>Date</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((transaction, index) => (
          <tr key={`${transaction.linkedCommitteeId}:${transaction.name}:${index}`}>
            <td>
              <CommitteeNameLink
                committeeId={transaction.linkedCommitteeId}
                cycle={cycle}
                name={transaction.name}
              />
              {transaction.linkedCommitteeId && (
                <span className="table-detail">
                  {transaction.linkedCommitteeId}
                </span>
              )}
            </td>
            <td>
              {transaction.description}
              <span className="table-detail">{transaction.type}</span>
            </td>
            <td>{formatDate(transaction.date)}</td>
            <td>{formatCurrency(transaction.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function isMeaningfulAmount(
  entry: BreakdownRow,
): entry is DisplayBreakdownRow {
  return entry[1] !== null && entry[1] !== undefined && entry[1] !== 0;
}

function filterBreakdownRows(rows: BreakdownRow[]): DisplayBreakdownRow[] {
  return rows.filter(isMeaningfulAmount);
}

function CommitteeNameLink({
  committeeId,
  cycle,
  name,
}: {
  committeeId: string | null | undefined;
  cycle: number;
  name: string;
}) {
  if (!isCommitteeId(committeeId)) {
    return name;
  }

  return (
    <Link className="text-link" href={`/committee/${committeeId}?cycle=${cycle}`}>
      {name}
    </Link>
  );
}

function isCommitteeId(value: string | null | undefined): value is string {
  return Boolean(value?.startsWith("C"));
}
