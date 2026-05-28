import "server-only";

import { fecGet } from "@/lib/fec/client";
import {
  electionSchema,
  fecEnvelopeSchema,
  type Election,
} from "@/lib/fec/schemas";

export type RaceLookup = {
  elections: Election[];
  retrievedAt: string;
};

export async function searchElections(filters: {
  cycle: number;
  zip?: string;
  office?: string;
  state?: string;
  district?: string;
}): Promise<RaceLookup> {
  const response = await fecGet(
    "/elections/search/",
    {
      cycle: filters.cycle,
      zip: filters.zip,
      office: electionOffice(filters.office),
      state: filters.state,
      district: filters.district,
      per_page: 100,
      sort: "state",
    },
    fecEnvelopeSchema(electionSchema),
  );

  return {
    elections: response.results,
    retrievedAt: new Date().toISOString(),
  };
}

function electionOffice(office: string | undefined): string | undefined {
  if (office === "H") {
    return "house";
  }

  if (office === "S") {
    return "senate";
  }

  if (office === "P") {
    return "president";
  }

  return office;
}
