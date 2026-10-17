"use client";

import { useState } from "react";
import { Fingerprint, Globe, Loader2, Mail } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { useAuthSession } from "@/app/hooks/useAuthSession";
import LegalLinks from "@/app/components/ui/LegalLinks";

export default function LoginPage() {
  const { lang, setLang, t, setCurrentView } = useAuth();
  const {
    loginIdentifier,
    setLoginIdentifier,
    loginPassword,
    setLoginPassword,
    handleLogin,
    isSubmitting,
    handleGoogleSignIn,
    isPasskeySupported,
    isPasskeyLoggingIn,
    passkeyLoginError,
    handlePasskeyLogin,
    forgotEmail,
    setForgotEmail,
    forgotSent,
    handleForgotPassword,
  } = useAuthSession();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  // The card itself rises in on load; the panel inside slides only when the
  // patient switches between login and forgot-password, not on first paint.
  const [hasSwitchedPanel, setHasSwitchedPanel] = useState(false);
  const switchPanel = (toForgot: boolean) => {
    setHasSwitchedPanel(true);
    setShowForgotPassword(toForgot);
  };
  const panelAnim = hasSwitchedPanel ? "animate-step-in" : "";

  return (
    <div
      className="relative min-h-dvh flex flex-col items-center justify-center p-4"
      style={{ background: "radial-gradient(120% 70% at 50% 0%, var(--bg-elevated) 0%, var(--bg-page) 62%), linear-gradient(180deg, var(--bg-elevated), var(--bg-page) 55%)" }}
      dir={lang === "he" ? "rtl" : "ltr"}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 45%), radial-gradient(circle at 85% 10%, color-mix(in srgb, var(--accent) 10%, transparent), transparent 40%)",
        }}
      ></div>
      <div className="on-light bg-surface backdrop-blur-xl p-8 md:p-12 rounded-[2rem] shadow-elevated w-full max-w-md relative z-10 border border-line animate-card-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-black text-fg">{t.login}</h2>
          <button
            onClick={() => setLang(lang === "he" ? "en" : "he")}
            className="on-light relative bg-surface-alt hover:bg-line text-fg px-3 py-1 rounded-full font-bold text-xs flex items-center gap-1 after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] transition-ui duration-150 ease-out active:scale-[0.97]"
          >
            <Globe size={14} /> {lang === "he" ? "English" : "עברית"}
          </button>
        </div>
        {showForgotPassword ? (
          forgotSent ? (
            <div key="forgot-sent" className={`${panelAnim} text-center py-4`}>
              <Mail className="mx-auto text-accent-fg mb-3" size={40} />
              <h3 className="text-lg font-bold text-fg mb-2">הקישור בדרך למייל</h3>
              <p className="text-sm text-muted mb-6">אם הכתובת {forgotEmail} רשומה במערכת, שלחנו אליה קישור לאיפוס הסיסמה.</p>
              <button onClick={() => switchPanel(false)} className="text-sm font-bold text-accent-fg hover:underline transition-colors">
                חזרה להתחברות
              </button>
            </div>
          ) : (
            <form key="forgot" onSubmit={handleForgotPassword} className={`${panelAnim} space-y-5`}>
              <p className="text-sm text-muted">מה כתובת המייל? נשלח אליה קישור לאיפוס הסיסמה.</p>
              <div>
                <label htmlFor="forgot-email" className="block text-xs font-bold text-muted mb-1.5">
                  אימייל
                </label>
                <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="אימייל"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full border-b-2 border-line-input p-3 bg-transparent focus:border-focus focus:ring-2 focus:ring-focus outline-none transition-colors"
                required
                />
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center bg-btn-primary text-btn-primary-fg py-4 rounded-xl font-bold hover:bg-btn-primary-hover active:bg-btn-primary-active transition-ui duration-150 ease-out active:scale-[0.97] mt-2">
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "שליחת קישור לאיפוס"}
              </button>
              <button
                type="button"
                onClick={() => switchPanel(false)}
                className="w-full text-center text-sm font-bold text-muted hover:text-fg transition-colors"
              >
                חזרה להתחברות
              </button>
            </form>
          )
        ) : (
          <div key="login" className={panelAnim}>
            {/* Real WebAuthn passwordless login — a usernameless/discoverable
                assertion ceremony (see app/actions/passkeyAuth.ts), only
                shown when this browser/device actually reports a platform
                authenticator. A returning patient who enabled a passkey from
                the post-login prompt skips the form entirely from here. */}
            {isPasskeySupported && (
              <>
                <button
                  type="button"
                  onClick={handlePasskeyLogin}
                  disabled={isPasskeyLoggingIn}
                  className="w-full flex items-center justify-center gap-2.5 bg-fg text-surface py-4 rounded-xl font-bold hover:bg-fg/90 transition-ui duration-150 ease-out active:scale-[0.97] disabled:bg-disabled disabled:text-disabled-fg"
                >
                  {isPasskeyLoggingIn ? <Loader2 size={20} className="animate-spin" /> : <Fingerprint size={20} />}
                  {isPasskeyLoggingIn ? "מתחברים..." : "כניסה עם Face ID / Touch ID"}
                </button>
                {passkeyLoginError && <p className="text-xs font-bold text-danger-fg text-center mt-2.5">{passkeyLoginError}</p>}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-line"></div>
                  <span className="text-xs font-bold text-muted">או כניסה עם סיסמה</span>
                  <div className="flex-1 h-px bg-line"></div>
                </div>
              </>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-muted mb-1.5">
                  אימייל
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="אימייל"
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  className="w-full border-b-2 border-line-input p-3 bg-transparent focus:border-focus focus:ring-2 focus:ring-focus outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-muted mb-1.5">
                  סיסמה
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="סיסמה"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full border-b-2 border-line-input p-3 bg-transparent focus:border-focus focus:ring-2 focus:ring-focus outline-none transition-colors"
                  required
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full flex items-center justify-center bg-btn-primary text-btn-primary-fg py-4 rounded-xl font-bold hover:bg-btn-primary-hover active:bg-btn-primary-active transition-ui duration-150 ease-out active:scale-[0.97] mt-2">
                {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : "כניסה"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-line"></div>
              <span className="text-xs font-bold text-muted">או</span>
              <div className="flex-1 h-px bg-line"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 border-2 border-btn-secondary text-accent-fg py-3.5 rounded-xl font-bold hover:bg-btn-secondary-hover transition-ui duration-150 ease-out active:scale-[0.97]"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path style={{ fill: "var(--brand-google-blue)" }} d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.7-3.86 2.7-6.62Z" />
                <path style={{ fill: "var(--brand-google-green)" }} d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z" />
                <path style={{ fill: "var(--brand-google-yellow)" }} d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.27-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z" />
                <path style={{ fill: "var(--brand-google-red)" }} d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
              </svg>
              המשך עם Google
            </button>

            <button
              onClick={() => switchPanel(true)}
              className="w-full text-center mt-6 text-accent-fg hover:underline font-bold transition-colors"
            >
              {t.forgot_pass}
            </button>
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-line">
              <button onClick={() => setCurrentView("landing")} className="text-sm font-bold text-muted hover:text-fg transition-colors">
                חזרה
              </button>
              <button onClick={() => setCurrentView("register")} className="text-sm font-black text-accent-fg hover:underline transition-colors">
                חדשים כאן? להרשמה
              </button>
            </div>
          </div>
        )}
      </div>
      <LegalLinks className="mt-6" />
    </div>
  );
}
