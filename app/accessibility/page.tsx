import type { Metadata } from "next";
import { LegalBox, LegalList, LegalPage, LegalSection } from "@/app/components/legal/LegalPage";

// הצהרת נגישות — required by תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות
// נגישות לשירות), התשע"ג-2013, תקנה 35. Its own route (not a currentView of
// the app/page.tsx router) so it has a stable URL that can be linked from
// every screen, logged in or not. Keep LAST_UPDATED and the lists below in
// step with the app: the statement must describe what is actually accessible.

export const metadata: Metadata = {
  title: "הצהרת נגישות — Eccentric",
  description: "הצהרת הנגישות של אפליקציית Eccentric · Optimal Motion",
};

const LAST_UPDATED = "15 באוקטובר 2026";

// TODO before launch: real contact details. A formal רכז נגישות is only
// mandatory from 25 employees; below that, a named contact person suffices.
const CONTACT = {
  name: "[שם איש/אשת הקשר]",
  phone: "[טלפון]",
  email: "[אימייל]",
};

const DONE = [
  "ניווט מלא באמצעות המקלדת, עם סימון פוקוס בולט על הרכיב הפעיל.",
  "חלונות קופצים ומסכים מלאים (מידע על תרגיל, אימון, שאלונים) מעבירים את הפוקוס לתוכנם, שומרים אותו בתוכם, וניתן לסגור אותם במקש Esc.",
  "תוויות טקסט לכפתורים, לשדות הטפסים ולאייקונים, לשימוש עם קוראי מסך.",
  "הודעות מערכת (שגיאות ואישורים) מוקראות אוטומטית לקוראי מסך.",
  "ניגודיות צבעים העומדת ביחס הנדרש ברמה AA, במצב הכהה ובמצב הבהיר.",
  "אפשרות להגדלת התצוגה (זום) בכל המסכים.",
  "כיבוד הגדרת \"הפחתת תנועה\" של מערכת ההפעלה — אנימציות וסרטון הרקע מושבתים.",
  "בחירת אזורי כאב לפני אימון אפשרית גם מרשימת כפתורים, ולא רק בלחיצה על איור הגוף.",
  "ממשק בעברית מימין לשמאל, עם אפשרות מעבר לאנגלית.",
];

const LIMITATIONS = [
  "סרטוני ההדגמה של התרגילים הם ללא קול ואין להם תיאור קולי; לכל תרגיל מוצגים לצדם הסבר כתוב, דגשי ביצוע וטעויות נפוצות.",
  "כניסה באמצעות Google מתבצעת בממשק של Google, שהנגישות שלו באחריותה.",
];

export default function AccessibilityPage() {
  return (
    <LegalPage title="הצהרת נגישות" updated={LAST_UPDATED}>
      <section>
        <p>
          אנו ב-Eccentric · Optimal Motion רואים חשיבות רבה במתן שירות שוויוני ונגיש לכל המשתמשים, ובכלל זה לאנשים עם
          מוגבלות. השקענו מאמצים להנגיש את האפליקציה כך שתהיה נוחה וזמינה לשימוש לכולם.
        </p>
      </section>

      <LegalSection id="a11y-level" title="רמת הנגישות">
        <p>
          האפליקציה הונגשה בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג-2013,
          ולתקן הישראלי ת&quot;י 5568, המבוסס על הנחיות WCAG ברמה AA. הנגישות נבדקה בכלי בדיקה אוטומטיים ובבדיקה ידנית של
          ניווט במקלדת. האפליקציה מותאמת לדפדפנים העדכניים (Chrome, Safari, Edge, Firefox) במחשב ובנייד.
        </p>
      </LegalSection>

      <LegalSection id="a11y-done" title="מה הונגש">
        <LegalList items={DONE} />
      </LegalSection>

      <LegalSection id="a11y-limits" title="חלקים שאינם נגישים במלואם">
        <p>למרות מאמצינו, ייתכן שחלקים מסוימים אינם נגישים עדיין במלואם. ידוע לנו על המגבלות הבאות:</p>
        <LegalList items={LIMITATIONS} />
      </LegalSection>

      <LegalSection id="a11y-contact" title="נתקלתם בבעיה? פנו אלינו">
        <p>
          אם נתקלתם בקושי בשימוש באפליקציה, או שיש לכם הצעה לשיפור הנגישות, נשמח לשמוע. כדי שנוכל לטפל בפנייה, אנא ציינו
          את המסך שבו נתקלתם בבעיה, תיאור קצר שלה, והדפדפן או המכשיר שבהם השתמשתם. נשיב לפנייה בהקדם.
        </p>
        <LegalBox>
          <p className="font-black">איש/אשת קשר לנושאי נגישות: {CONTACT.name}</p>
          <p>
            טלפון: <a href={`tel:${CONTACT.phone}`} className="text-accent-fg font-bold hover:underline" dir="ltr">{CONTACT.phone}</a>
          </p>
          <p>
            אימייל: <a href={`mailto:${CONTACT.email}`} className="text-accent-fg font-bold hover:underline" dir="ltr">{CONTACT.email}</a>
          </p>
        </LegalBox>
      </LegalSection>
    </LegalPage>
  );
}
