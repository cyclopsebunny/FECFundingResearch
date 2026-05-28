const EARLIEST_CYCLE = 1980;

export function currentElectionCycle(): number {
  const year = new Date().getFullYear();
  return year % 2 === 0 ? year : year + 1;
}

export function parseCycle(value: string | undefined): number {
  const parsed = Number(value);
  const current = currentElectionCycle();

  if (
    Number.isInteger(parsed) &&
    parsed >= EARLIEST_CYCLE &&
    parsed <= current &&
    parsed % 2 === 0
  ) {
    return parsed;
  }

  return current;
}

export function selectableCycles(): number[] {
  const current = currentElectionCycle();
  const years: number[] = [];

  for (let year = current; year >= 2000; year -= 2) {
    years.push(year);
  }

  return years;
}

