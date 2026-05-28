import "server-only";

import {
  candidateSchema,
  candidateTotalSchema,
  committeeSchema,
  fecEnvelopeSchema,
  type Candidate,
  type CandidateTotal,
  type Committee,
} from "@/lib/fec/schemas";
import { fecGet } from "@/lib/fec/client";

export type CandidateScope = {
  candidate: Candidate;
  committees: Committee[];
  total: CandidateTotal | null;
  cycle: number;
  retrievedAt: string;
};

export async function searchCandidates(
  query: string,
  cycle: number,
): Promise<Candidate[]> {
  const response = await fecGet(
    "/candidates/search/",
    {
      q: query,
      cycle,
      per_page: 20,
      sort: "name",
    },
    fecEnvelopeSchema(candidateSchema),
  );

  return response.results;
}

export async function getCandidateScope(
  candidateId: string,
  cycle: number,
): Promise<CandidateScope> {
  const [candidateResponse, committeeResponse, totalResponse] =
    await Promise.all([
      fecGet(
        `/candidate/${encodeURIComponent(candidateId)}/`,
        { cycle, per_page: 1 },
        fecEnvelopeSchema(candidateSchema),
      ),
      fecGet(
        `/candidate/${encodeURIComponent(candidateId)}/committees/`,
        { cycle, per_page: 100 },
        fecEnvelopeSchema(committeeSchema),
      ),
      fecGet(
        `/candidate/${encodeURIComponent(candidateId)}/totals/`,
        { cycle, per_page: 1 },
        fecEnvelopeSchema(candidateTotalSchema),
      ),
    ]);

  const candidate = candidateResponse.results[0];

  if (!candidate) {
    throw new Error("No candidate record was returned for that candidate and cycle.");
  }

  const authorizedCommittees = committeeResponse.results.filter(
    (committee) =>
      committee.designation === "A" || committee.designation === "P",
  );

  return {
    candidate,
    committees: authorizedCommittees,
    total: totalResponse.results[0] ?? null,
    cycle,
    retrievedAt: new Date().toISOString(),
  };
}

