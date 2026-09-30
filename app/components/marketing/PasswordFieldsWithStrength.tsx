"use client";

import { Check, X } from "lucide-react";
import { passwordCriteria } from "@/app/utils/validation";

interface PasswordFieldsWithStrengthProps {
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  passwordPlaceholder?: string;
  confirmPlaceholder?: string;
  passwordLabel?: string;
  confirmLabel?: string;
}

// Shared by RegisterPage and ResetPasswordPage — same password-strength
// rule, same live checklist, same confirm-match UX in both places.
export default function PasswordFieldsWithStrength({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  passwordPlaceholder = "בחר סיסמה",
  confirmPlaceholder = "אימות סיסמה",
  passwordLabel = "סיסמה",
  confirmLabel = "אימות סיסמה",
}: PasswordFieldsWithStrengthProps) {
  const meetsMinLength = passwordCriteria.minLength(password);
  const hasLetter = passwordCriteria.hasLetter(password);
  const hasNumber = passwordCriteria.hasNumber(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <>
      <div>
        <label htmlFor="pw-strength-password" className="block text-xs font-bold text-on-light-muted mb-1.5">
          {passwordLabel}
        </label>
        <input
          id="pw-strength-password"
          type="password"
          placeholder={passwordPlaceholder}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border-b-2 border-line-input p-3 bg-transparent focus:border-focus-on-light focus:ring-2 focus:ring-focus-on-light outline-none transition-colors"
          required
        />
      </div>

      {password.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 -mt-2 mb-1">
          <CriterionRow met={meetsMinLength} label="8 תווים לפחות" />
          <CriterionRow met={hasLetter} label="אות אחת לפחות" />
          <CriterionRow met={hasNumber} label="מספר אחד לפחות" />
        </div>
      )}

      <div>
        <label htmlFor="pw-strength-confirm" className="block text-xs font-bold text-on-light-muted mb-1.5">
          {confirmLabel}
        </label>
        <input
          id="pw-strength-confirm"
          type="password"
          placeholder={confirmPlaceholder}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`w-full border-b-2 p-3 bg-transparent outline-none transition-colors focus:ring-2 ${
            confirmPassword.length > 0
              ? passwordsMatch
                ? "border-accent-on-light focus:ring-focus-on-light"
                : "border-danger focus:ring-danger"
              : "border-line-input focus:border-focus-on-light focus:ring-focus-on-light"
          }`}
          required
        />
      </div>
      {confirmPassword.length > 0 && !passwordsMatch && <p className="text-xs text-danger font-medium -mt-2">הסיסמאות אינן תואמות</p>}
    </>
  );
}

function CriterionRow({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${met ? "text-accent-on-light" : "text-on-light-muted"}`}>
      {met ? <Check size={13} /> : <X size={13} />}
      {label}
    </span>
  );
}
