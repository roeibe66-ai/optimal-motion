// Hebrew form of address (patients.address_form, chosen in the onboarding
// questionnaire): the app's copy is written in the masculine singular; a
// patient who chose "בלשון נקבה" gets it in the feminine. "m", "n" (no
// preference) and unknown keep the copy as written.
//
// Word-level: only the second-person words the app actually uses. Apply it
// to text that addresses the patient — never to impersonal phrases like
// "צריך לפחות אימון אחד", which this would wrongly change. Words whose
// subject isn't the patient stay out of the table ("כשתשויך לך תוכנית" is
// the program being assigned, not "you").

export type AddressForm = "m" | "f" | "n" | null | undefined;

const FEMININE: Record<string, string> = {
  // imperatives
  "בחר": "בחרי",
  "סמן": "סמני",
  "לחץ": "לחצי",
  "הוסף": "הוסיפי",
  "התחל": "התחילי",
  "שמור": "שמרי",
  "בנה": "בני",
  "בדוק": "בדקי",
  "נסה": "נסי",
  "חזור": "חזרי",
  "צור": "צרי",
  "עדכן": "עדכני",
  "פתח": "פתחי",
  "עקוב": "עקבי",
  "ועקוב": "ועקבי",
  "שאל": "שאלי",
  "גלה": "גלי",
  "תעד": "תעדי",
  // future / modal
  "תוכל": "תוכלי",
  "שתוכל": "שתוכלי",
  "כשתוסיף": "כשתוסיפי",
  // pronoun
  "אתה": "את",
  "כשאתה": "כשאת",
  // adjectives / participles
  "יכול": "יכולה",
  "מרגיש": "מרגישה",
  "מוכן": "מוכנה",
};

const WORD = /[֐-׿]+/g;

export function feminize(text: string): string {
  return text.replace(WORD, (word) => FEMININE[word] ?? word);
}

export function addressed(form: AddressForm, text: string): string {
  return form === "f" ? feminize(text) : text;
}
