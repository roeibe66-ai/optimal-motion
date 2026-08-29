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
}: PasswordFieldsWithStrengthProps) {
  const meetsMinLength = passwordCriteria.minLength(password);
  const hasLetter = passwordCriteria.hasLetter(password);
  const hasNumber = passwordCriteria.hasNumber(password);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  return (
    <>
      <input
        type="password"
        placeholder={passwordPlaceholder}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border-b-2 border-stone-200 p-3 bg-transparent focus:border-teal-500 outline-none transition-colors"
        required
      />

      {password.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 -mt-2 mb-1">
          <CriterionRow met={meetsMinLength} label="8 תווים לפחות" />
          <CriterionRow met={hasLetter} label="אות אחת לפחות" />
          <CriterionRow met={hasNumber} label="מספר אחד לפחות" />
        </div>
      )}

      <input
        type="password"
        placeholder={confirmPlaceholder}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className={`w-full border-b-2 p-3 bg-transparent outline-none transition-colors ${
          confirmPassword.length > 0 ? (passwordsMatch ? "border-teal-500" : "border-red-400") : "border-stone-200 focus:border-teal-500"
        }`}
        required
      />
      {confirmPassword.length > 0 && !passwordsMatch && <p className="text-xs text-red-500 font-medium -mt-2">הסיסמאות אינן תואמות</p>}
    </>
  );
}

function CriterionRow({ met, label }: { met: boolean; label: string }) {
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${met ? "text-teal-600" : "text-stone-400"}`}>
      {met ? <Check size={13} /> : <X size={13} />}
      {label}
    </span>
  );
}
