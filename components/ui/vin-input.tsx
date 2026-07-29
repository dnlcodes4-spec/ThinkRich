"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { sanitizeVin, VIN_LENGTH, VIN_HINT } from "@/lib/vin";

// Voter card number field (CR-0009 §3.2).
//
// The client asked for three things at the field: strip spaces and punctuation,
// force uppercase, and cap the length at 19. All three happen here as the user
// types, so what they see is exactly what will be stored.
//
// This is a convenience, NOT the control. The Server Action re-runs the same
// normalisation before writing, because a value that reached the database
// unsanitised would break `voter_ids.vin` being a primary key.
//
// Note the cap is applied to the SANITISED value. Putting maxLength={19} on the
// raw input instead would truncate "90F5B-05EEB-1234567AB" to 19 characters
// INCLUDING the dashes, silently costing the user the last two.
export function VinInput({
  name = "vin",
  label = "Voter's card number (VIN)",
  defaultValue = "",
  error,
  required = true,
}: {
  name?: string;
  label?: string;
  defaultValue?: string;
  error?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(sanitizeVin(defaultValue));

  return (
    <Input
      label={label}
      name={name}
      value={value}
      onChange={(e) => setValue(sanitizeVin(e.target.value))}
      hint={`${VIN_HINT} ${value.length}/${VIN_LENGTH}`}
      error={error}
      required={required}
      autoComplete="off"
      autoCapitalize="characters"
      spellCheck={false}
      inputMode="text"
    />
  );
}
