import { z } from "zod";

const nullableString = z.string().nullable().optional();
const nullableNumber = z.number().nullable().optional();
const nullableStringArray = z.array(z.string()).nullable().optional();
const nullableStringOrNumber = z
  .union([z.string(), z.number()])
  .nullable()
  .optional();

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
    organization_type: nullableString,
    organization_type_full: nullableString,
    affiliated_committee_name: nullableString,
    state: nullableString,
    party: nullableString,
    cycles: z.array(z.number()).optional(),
  })
  .passthrough();

export const committeeNameSearchSchema = z
  .object({
    id: z.string(),
    name: nullableString,
    is_active: z.boolean().nullable().optional(),
  })
  .passthrough();

export const committeeTotalSchema = z
  .object({
    committee_id: nullableString,
    cycle: z.number().optional(),
    receipts: nullableNumber,
    disbursements: nullableNumber,
    independent_expenditures: nullableNumber,
    coordinated_expenditures_by_party_committee: nullableNumber,
    contributions_to_candidates: nullableNumber,
    transfers_to_other_authorized_committee: nullableNumber,
    individual_contributions: nullableNumber,
    political_party_committee_contributions: nullableNumber,
    other_political_committee_contributions: nullableNumber,
    last_cash_on_hand_end_period: nullableNumber,
    coverage_start_date: nullableString,
    coverage_end_date: nullableString,
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

export const electionSchema = z
  .object({
    cycle: z.number().optional(),
    election_year: z.number().optional(),
    office: nullableString,
    office_full: nullableString,
    state: nullableString,
    district: nullableString,
    district_full: nullableString,
    zip: nullableString,
  })
  .passthrough();

export const receiptAggregateSchema = z
  .object({
    committee_id: nullableString,
    cycle: z.number().optional(),
    total: nullableNumber,
    count: nullableNumber,
    state: nullableString,
    state_full: nullableString,
    zip: nullableString,
    employer: nullableString,
    occupation: nullableString,
    size: nullableStringOrNumber,
  })
  .passthrough();

export const scheduleAReceiptSchema = z
  .object({
    contributor_id: nullableString,
    contributor_name: nullableString,
    contributor_type: nullableString,
    contributor_type_full: nullableString,
    entity_type: nullableString,
    entity_type_desc: nullableString,
    committee_id: nullableString,
    committee_name: nullableString,
    contribution_receipt_amount: nullableNumber,
    contribution_receipt_date: nullableString,
    cycle: z.number().optional(),
  })
  .passthrough();

export const scheduleBRecipientSchema = z
  .object({
    recipient_id: nullableString,
    recipient_name: nullableString,
    total: nullableNumber,
    count: nullableNumber,
    cycle: z.number().optional(),
    recipient_committee: z
      .object({
        committee_id: nullableString,
        name: nullableString,
        candidate_ids: nullableStringArray,
        committee_type: nullableString,
        committee_type_full: nullableString,
      })
      .passthrough()
      .nullable()
      .optional(),
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
export type CommitteeNameSearch = z.infer<typeof committeeNameSearchSchema>;
export type CommitteeTotal = z.infer<typeof committeeTotalSchema>;
export type CandidateTotal = z.infer<typeof candidateTotalSchema>;
export type OutsideSpendingAggregate = z.infer<
  typeof outsideSpendingAggregateSchema
>;
export type Election = z.infer<typeof electionSchema>;
export type ReceiptAggregate = z.infer<typeof receiptAggregateSchema>;
export type ScheduleAReceipt = z.infer<typeof scheduleAReceiptSchema>;
export type ScheduleBRecipient = z.infer<typeof scheduleBRecipientSchema>;
