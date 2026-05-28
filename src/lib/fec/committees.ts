import "server-only";

import { fecGet } from "@/lib/fec/client";
import {
  committeeSchema,
  committeeNameSearchSchema,
  committeeTotalSchema,
  fecEnvelopeSchema,
  outsideSpendingAggregateSchema,
  scheduleAReceiptSchema,
  scheduleBDisbursementSchema,
  scheduleBRecipientSchema,
  type Committee,
  type CommitteeNameSearch,
  type CommitteeTotal,
  type OutsideSpendingAggregate,
  type ScheduleAReceipt,
  type ScheduleBDisbursement,
  type ScheduleBRecipient,
} from "@/lib/fec/schemas";
import { type OutsideSpender } from "@/lib/fec/outside-spending";

export type CommitteeProfile = {
  committee: Committee;
  total: CommitteeTotal | null;
  topReceipts: CommitteeTransaction[];
  topDisbursements: CommitteeTransaction[];
  directRecipients: CommitteeRecipient[];
  outsideTargets: OutsideSpender[];
  cycle: number;
  retrievedAt: string;
};

export type CommitteeRecipient = {
  recipientId: string | null | undefined;
  recipientName: string;
  candidateIds: string[];
  committeeType: string | null | undefined;
  amount: number;
  count: number;
};

export type CommitteeTransaction = {
  linkedCommitteeId: string | null | undefined;
  name: string;
  type: string;
  description: string;
  date: string | null | undefined;
  amount: number;
};

export async function searchCommittees(
  query: string,
  cycle: number,
): Promise<Committee[]> {
  const response = await fecGet(
    "/names/committees/",
    {
      q: query,
      cycle,
      per_page: 20,
    },
    fecEnvelopeSchema(committeeNameSearchSchema),
  );

  return response.results.map(committeeFromNameSearch);
}

export async function getCommitteeProfile(
  committeeId: string,
  cycle: number,
): Promise<CommitteeProfile> {
  const [
    committeeResponse,
    totalResponse,
    topReceipts,
    topDisbursements,
    directRecipients,
    outsideTargets,
  ] =
    await Promise.all([
      fecGet(
        `/committee/${encodeURIComponent(committeeId)}/`,
        { per_page: 1 },
        fecEnvelopeSchema(committeeSchema),
      ),
      getCommitteeTotal(committeeId, cycle),
      getTopReceipts(committeeId, cycle),
      getTopDisbursements(committeeId, cycle),
      getDirectRecipients(committeeId, cycle),
      getOutsideTargets(committeeId, cycle),
    ]);

  const committee = committeeResponse.results[0];

  if (!committee) {
    throw new Error("No committee record was returned for that committee and cycle.");
  }

  return {
    committee,
    total: totalResponse,
    topReceipts,
    topDisbursements,
    directRecipients,
    outsideTargets,
    cycle,
    retrievedAt: new Date().toISOString(),
  };
}

async function getTopReceipts(
  committeeId: string,
  cycle: number,
): Promise<CommitteeTransaction[]> {
  try {
    const response = await fecGet(
      "/schedules/schedule_a/",
      {
        committee_id: committeeId,
        cycle,
        is_individual: false,
        per_page: 25,
        sort: "-contribution_receipt_amount",
      },
      fecEnvelopeSchema(scheduleAReceiptSchema),
    );

    return response.results.map(receiptFromRow);
  } catch {
    return [];
  }
}

async function getTopDisbursements(
  committeeId: string,
  cycle: number,
): Promise<CommitteeTransaction[]> {
  try {
    const response = await fecGet(
      "/schedules/schedule_b/",
      {
        committee_id: committeeId,
        cycle,
        per_page: 25,
        sort: "-disbursement_amount",
      },
      fecEnvelopeSchema(scheduleBDisbursementSchema),
    );

    return response.results.map(disbursementFromRow);
  } catch {
    return [];
  }
}

async function getCommitteeTotal(
  committeeId: string,
  cycle: number,
): Promise<CommitteeTotal | null> {
  try {
    const response = await fecGet(
      `/committee/${encodeURIComponent(committeeId)}/totals/`,
      { cycle, per_page: 1 },
      fecEnvelopeSchema(committeeTotalSchema),
    );

    return response.results[0] ?? null;
  } catch {
    return null;
  }
}

async function getDirectRecipients(
  committeeId: string,
  cycle: number,
): Promise<CommitteeRecipient[]> {
  try {
    const response = await fecGet(
      "/schedules/schedule_b/by_recipient_id/",
      {
        committee_id: committeeId,
        cycle,
        per_page: 100,
        sort: "-total",
      },
      fecEnvelopeSchema(scheduleBRecipientSchema),
    );

    return response.results.map(recipientFromRow).slice(0, 25);
  } catch {
    return [];
  }
}

async function getOutsideTargets(
  committeeId: string,
  cycle: number,
): Promise<OutsideSpender[]> {
  try {
    const response = await fecGet(
      "/schedules/schedule_e/by_candidate/",
      {
        committee_id: committeeId,
        cycle,
        per_page: 100,
        sort: "-total",
      },
      fecEnvelopeSchema(outsideSpendingAggregateSchema),
    );

    return summarizeOutsideTargets(response.results);
  } catch {
    return [];
  }
}

function recipientFromRow(row: ScheduleBRecipient): CommitteeRecipient {
  return {
    recipientId: row.recipient_id ?? row.recipient_committee?.committee_id,
    recipientName:
      row.recipient_name ??
      row.recipient_committee?.name ??
      "Unnamed recipient",
    candidateIds: row.recipient_committee?.candidate_ids ?? [],
    committeeType: row.recipient_committee?.committee_type_full,
    amount: row.total ?? 0,
    count: row.count ?? 0,
  };
}

function receiptFromRow(row: ScheduleAReceipt): CommitteeTransaction {
  return {
    linkedCommitteeId: row.contributor_id ?? row.contributor?.committee_id,
    name:
      row.contributor_name ??
      row.contributor?.name ??
      row.committee_name ??
      "Unnamed contributor",
    type:
      row.contributor_type_full ??
      row.contributor?.committee_type_full ??
      row.entity_type_desc ??
      "Receipt",
    description: "Itemized receipt",
    date: row.contribution_receipt_date,
    amount: row.contribution_receipt_amount ?? 0,
  };
}

function disbursementFromRow(row: ScheduleBDisbursement): CommitteeTransaction {
  return {
    linkedCommitteeId: row.recipient_id ?? row.recipient_committee?.committee_id,
    name:
      row.recipient_name ??
      row.recipient_committee?.name ??
      "Unnamed payee",
    type:
      row.entity_type_desc ??
      row.recipient_committee?.committee_type_full ??
      "Disbursement",
    description:
      row.disbursement_description ??
      row.line_number_label ??
      row.disbursement_type_description ??
      row.disbursement_purpose_category ??
      "Itemized disbursement",
    date: row.disbursement_date,
    amount: row.disbursement_amount ?? 0,
  };
}

function committeeFromNameSearch(row: CommitteeNameSearch): Committee {
  return {
    committee_id: row.id,
    name: row.name,
    designation: undefined,
    designation_full: row.is_active === false ? "Inactive" : undefined,
    committee_type: undefined,
    committee_type_full: undefined,
    party: undefined,
  };
}

function summarizeOutsideTargets(
  rows: OutsideSpendingAggregate[],
): OutsideSpender[] {
  const targets = new Map<string, OutsideSpender>();

  for (const row of rows) {
    const position = row.support_oppose_indicator === "S"
      ? "Support"
      : row.support_oppose_indicator === "O"
        ? "Oppose"
        : "Other";
    const key = `${row.candidate_id}:${position}`;
    const prior = targets.get(key);

    targets.set(key, {
      committeeId: row.candidate_id,
      committeeName: row.candidate_name ?? "Unnamed candidate",
      position,
      amount: (prior?.amount ?? 0) + (row.total ?? 0),
    });
  }

  return [...targets.values()]
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 25);
}
