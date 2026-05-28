import "server-only";

import { fecGet } from "@/lib/fec/client";
import {
  fecEnvelopeSchema,
  outsideSpendingAggregateSchema,
  type OutsideSpendingAggregate,
} from "@/lib/fec/schemas";

export type OutsideSpender = {
  committeeId: string | null | undefined;
  committeeName: string;
  position: "Support" | "Oppose" | "Other";
  amount: number;
};

export type OutsideSpendingSummary = {
  support: number;
  oppose: number;
  other: number;
  topSpenders: OutsideSpender[];
};

export async function getOutsideSpendingSummary(
  candidateId: string,
  cycle: number,
): Promise<OutsideSpendingSummary> {
  const firstPage = await getPage(candidateId, cycle, 1);
  const pageCount = firstPage.pagination?.pages ?? 1;
  const laterPages =
    pageCount > 1
      ? await Promise.all(
          Array.from({ length: pageCount - 1 }, (_, index) =>
            getPage(candidateId, cycle, index + 2),
          ),
        )
      : [];

  return summarizeOutsideSpending([
    ...firstPage.results,
    ...laterPages.flatMap((page) => page.results),
  ]);
}

async function getPage(candidateId: string, cycle: number, page: number) {
  return fecGet(
    "/schedules/schedule_e/by_candidate/",
    {
      candidate_id: candidateId,
      cycle,
      page,
      per_page: 100,
    },
    fecEnvelopeSchema(outsideSpendingAggregateSchema),
  );
}

function summarizeOutsideSpending(
  rows: OutsideSpendingAggregate[],
): OutsideSpendingSummary {
  const spenders = new Map<string, OutsideSpender>();
  let support = 0;
  let oppose = 0;
  let other = 0;

  for (const row of rows) {
    const amount = row.total ?? 0;
    const position = positionLabel(row.support_oppose_indicator);

    if (position === "Support") {
      support += amount;
    } else if (position === "Oppose") {
      oppose += amount;
    } else {
      other += amount;
    }

    const key = `${row.committee_id ?? row.committee_name ?? "unknown"}:${position}`;
    const prior = spenders.get(key);

    spenders.set(key, {
      committeeId: row.committee_id,
      committeeName: row.committee_name ?? "Unnamed filer",
      position,
      amount: (prior?.amount ?? 0) + amount,
    });
  }

  return {
    support,
    oppose,
    other,
    topSpenders: [...spenders.values()]
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 10),
  };
}

function positionLabel(
  indicator: string | null | undefined,
): OutsideSpender["position"] {
  if (indicator === "S") {
    return "Support";
  }

  if (indicator === "O") {
    return "Oppose";
  }

  return "Other";
}

