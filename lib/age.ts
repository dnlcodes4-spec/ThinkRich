// Age helpers. Kept out of any "use server" module so it can be a plain (sync)
// export and unit-tested directly.

/** True when `dob` (a YYYY-MM-DD string) is at least 18 years ago. */
export function isAdult(dob: string): boolean {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return d <= cutoff;
}
