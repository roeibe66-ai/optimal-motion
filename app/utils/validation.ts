// Named individually so RegisterPage's live strength indicator checks the
// exact same rules isStrongPassword enforces, instead of a second
// hand-maintained copy that could drift out of sync.
export const passwordCriteria = {
  minLength: (password: string) => password.length >= 8,
  hasLetter: (password: string) => /[a-zA-Z]/.test(password),
  hasNumber: (password: string) => /[0-9]/.test(password),
};

export const isStrongPassword = (password: string) =>
  passwordCriteria.minLength(password) && passwordCriteria.hasLetter(password) && passwordCriteria.hasNumber(password);

export const isPasswordConfirmed = (password: string, confirmPassword: string) => confirmPassword.length > 0 && password === confirmPassword;
