// Version of the terms of use + privacy policy (/terms, /privacy) — the date
// they last changed in substance. Patients store the version they accepted
// (patients.terms_version); bumping this asks every patient to accept again
// (ConsentGate), so bump it only for a real change, and update the pages'
// "עודכן לאחרונה" date with it.
export const LEGAL_VERSION = "2026-10-16";
export const LEGAL_UPDATED_LABEL = "16 באוקטובר 2026";

// TODO before launch: the business's real details (required in the privacy
// policy and terms, and by consumer-protection law once payments start).
export const BUSINESS = {
  name: "[שם העסק / שם בעל העסק]",
  id: "[מספר עוסק / ח.פ.]",
  address: "[כתובת]",
  email: "[אימייל לפניות]",
  phone: "[טלפון]",
};
