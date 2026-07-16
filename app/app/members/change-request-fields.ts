// The member-correctable fields (must match the DB check on change_requests).
// Never structural: no nin, membership number, geography, or status.
export const CHANGE_FIELDS = {
  full_name: { label: "Full name", type: "text" },
  date_of_birth: { label: "Date of birth", type: "date" },
  vin: { label: "Voter's ID (VIN)", type: "text" },
  email: { label: "Email", type: "email" },
  account_number: { label: "Account number", type: "text" },
  account_name: { label: "Account name", type: "text" },
  bank_name: { label: "Bank name", type: "text" },
} as const;

export type ChangeField = keyof typeof CHANGE_FIELDS;
export const CHANGE_FIELD_KEYS = Object.keys(CHANGE_FIELDS) as ChangeField[];

export function isChangeField(v: string): v is ChangeField {
  return (CHANGE_FIELD_KEYS as string[]).includes(v);
}

export function fieldLabel(field: string): string {
  return isChangeField(field) ? CHANGE_FIELDS[field].label : field;
}
