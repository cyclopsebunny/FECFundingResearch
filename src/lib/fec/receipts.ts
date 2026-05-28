import "server-only";

import { fecGet } from "@/lib/fec/client";
import {
  fecEnvelopeSchema,
  receiptAggregateSchema,
  scheduleAReceiptSchema,
  type Committee,
  type ReceiptAggregate,
  type ScheduleAReceipt,
} from "@/lib/fec/schemas";

export type CandidateReceiptAnalysis = {
  byState: ReceiptAggregate[];
  byZip: ReceiptAggregate[];
  byEmployer: ReceiptAggregate[];
  byOccupation: ReceiptAggregate[];
  bySize: ReceiptAggregate[];
  committeeReceipts: CommitteeReceipt[];
};

export type CommitteeReceipt = {
  contributorId: string | null | undefined;
  contributorName: string;
  entityType: string;
  amount: number;
  count: number;
};

export async function getCandidateReceiptAnalysis(
  committees: Committee[],
  cycle: number,
): Promise<CandidateReceiptAnalysis> {
  const committeeIds = committees.map((committee) => committee.committee_id);

  if (committeeIds.length === 0) {
    return emptyAnalysis();
  }

  const [byState, byZip, byEmployer, byOccupation, bySize, committeeReceipts] =
    await Promise.all([
      getAggregate("/schedules/schedule_a/by_state/", committeeIds, cycle),
      getAggregate("/schedules/schedule_a/by_zip/", committeeIds, cycle),
      getAggregate("/schedules/schedule_a/by_employer/", committeeIds, cycle),
      getAggregate("/schedules/schedule_a/by_occupation/", committeeIds, cycle),
      getAggregate("/schedules/schedule_a/by_size/", committeeIds, cycle),
      getTopCommitteeReceipts(committeeIds, cycle),
    ]);

  return {
    byState,
    byZip,
    byEmployer,
    byOccupation,
    bySize,
    committeeReceipts,
  };
}

async function getAggregate(
  path: string,
  committeeIds: string[],
  cycle: number,
): Promise<ReceiptAggregate[]> {
  try {
    const response = await fecGet(
      path,
      {
        committee_id: committeeIds,
        cycle,
        per_page: 10,
        sort: "-total",
        hide_null: true,
      },
      fecEnvelopeSchema(receiptAggregateSchema),
    );

    return response.results;
  } catch {
    return [];
  }
}

async function getTopCommitteeReceipts(
  committeeIds: string[],
  cycle: number,
): Promise<CommitteeReceipt[]> {
  try {
    const response = await fecGet(
      "/schedules/schedule_a/",
      {
        committee_id: committeeIds,
        cycle,
        is_individual: false,
        per_page: 100,
        sort: "-contribution_receipt_amount",
      },
      fecEnvelopeSchema(scheduleAReceiptSchema),
    );

    return summarizeCommitteeReceipts(response.results);
  } catch {
    return [];
  }
}

function summarizeCommitteeReceipts(rows: ScheduleAReceipt[]): CommitteeReceipt[] {
  const receipts = new Map<string, CommitteeReceipt>();

  for (const row of rows) {
    const entityType =
      row.entity_type_desc ?? row.contributor_type_full ?? row.entity_type ?? "Unknown";
    const contributorName = row.contributor_name ?? "Unnamed contributor";
    const key = `${row.contributor_id ?? contributorName}:${entityType}`;
    const prior = receipts.get(key);

    receipts.set(key, {
      contributorId: row.contributor_id,
      contributorName,
      entityType,
      amount:
        (prior?.amount ?? 0) + (row.contribution_receipt_amount ?? 0),
      count: (prior?.count ?? 0) + 1,
    });
  }

  return [...receipts.values()]
    .sort((left, right) => right.amount - left.amount)
    .slice(0, 10);
}

function emptyAnalysis(): CandidateReceiptAnalysis {
  return {
    byState: [],
    byZip: [],
    byEmployer: [],
    byOccupation: [],
    bySize: [],
    committeeReceipts: [],
  };
}
