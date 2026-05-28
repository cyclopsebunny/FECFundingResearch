import { z } from "zod";

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();

export const candidateSchema = z
  .object({
    candidate_id: z.string(),
    name: nullableString,
    office: nullableString,
    office_full: nullableString,
    state: nullableString,
    district: nullableString,
    party: nullableString,
    party_full: nullableString,
    incumbent_challenge: nullableString,
    incumbent_challenge_full: nullableString,
    election_years: z.array(z.number()).optional(),
    cycles: z.array(z.number()).optional(),
  })
  .passthrough();

export const committeeSchema = z
  .object({
    committee_id: z.string(),
    name: nullableString,
    designation: nullableString,
    designation_full: nullableString,
    committee_type: nullableString,
    committee_type_full: nullableString,
    party: nullableString,
    cycles: z.array(z.number()).optional(),
  })
  .passthrough();

export const candidateTotalSchema = z
  .object({
    candidate_id: nullableString,
    cycle: z.number().optional(),
    receipts: nullableNumber,
    disbursements: nullableNumber,
    last_cash_on_hand_end_period: nullableNumber,
    last_debts_owed_by_committee: nullableNumber,
    contributions: nullableNumber,
    individual_contributions: nullableNumber,
    individual_itemized_contributions: nullableNumber,
    individual_unitemized_contributions: nullableNumber,
    other_political_committee_contributions: nullableNumber,
    political_party_committee_contributions: nullableNumber,
    candidate_contribution: nullableNumber,
    loans: nullableNumber,
    other_receipts: nullableNumber,
    transfers_from_other_authorized_committee: nullableNumber,
    coverage_start_date: nullableString,
    coverage_end_date: nullableString,
    last_report_year: nullableNumber,
  })
  .passthrough();

export const outsideSpendingAggregateSchema = z
  .object({
    candidate_id: z.string(),
    candidate_name: nullableString,
    committee_id: nullableString,
    committee_name: nullableString,
    support_oppose_indicator: nullableString,
    total: nullableNumber,
    count: nullableNumber,
    cycle: z.number().optional(),
  })
  .passthrough();

export const fecEnvelopeSchema = <T extends z.ZodTypeAny>(resultSchema: T) =>
  z
    .object({
      results: z.array(resultSchema),
      pagination: z
        .object({
          count: z.number().optional(),
          pages: z.number().optional(),
          per_page: z.number().optional(),
          page: z.number().optional(),
        })
        .passthrough()
        .optional(),
    })
    .passthrough();

export type Candidate = z.infer<typeof candidateSchema>;
export type Committee = z.infer<typeof committeeSchema>;
export type CandidateTotal = z.infer<typeof candidateTotalSchema>;
export type OutsideSpendingAggregate = z.infer<
  typeof outsideSpendingAggregateSchema
>;
