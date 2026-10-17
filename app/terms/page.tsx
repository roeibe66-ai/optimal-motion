import type { Metadata } from "next";
import Link from "next/link";
import { LegalBox, LegalList, LegalPage, LegalSection } from "@/app/components/legal/LegalPage";
import { BUSINESS, LEGAL_UPDATED_LABEL } from "@/app/constants/legal";

// תנאי שימוש, including the medical disclaimer. Accepted together with
// /privacy (one LEGAL_VERSION, app/constants/legal.ts). Clauses that deprive
// the user unfairly can be voided under חוק החוזים האחידים — keep limits of
// liability "to the extent permitted by law". DRAFT — to be reviewed by a
// lawyer before launch.

export const metadata: Metadata = {
  title: "תנאי שימוש — Eccentric",
  description: "תנאי השימוש באפליקציית Eccentric · Optimal Motion",
};

export default function TermsPage() {
  return (
    <LegalPage title="תנאי שימוש" updated={LEGAL_UPDATED_LABEL}>
      <section className="flex flex-col gap-3">
        <p>
          ברוכים הבאים לאפליקציית Eccentric · Optimal Motion (&quot;האפליקציה&quot;), המופעלת על ידי {BUSINESS.name}{" "}
          (&quot;אנחנו&quot;). השימוש באפליקציה כפוף לתנאים אלו ול
          <Link href="/privacy" className="text-accent-fg font-bold underline">
            מדיניות הפרטיות
          </Link>
          . ההרשמה לאפליקציה מהווה הסכמה להם. התנאים מנוסחים בלשון זכר מטעמי נוחות בלבד, ופונים לכל המגדרים.
        </p>
      </section>

      <LegalSection id="t-service" title="השירות">
        <p>
          האפליקציה מציעה תוכניות אימון, שיקום וכושר, מעקב אחר אימונים, ומאמן מבוסס בינה מלאכותית (AI). חלק מהתוכניות נבנות
          על ידי מטפל עבורך באופן אישי, וחלקן כלליות.
        </p>
      </LegalSection>

      <LegalSection id="t-medical" title="הבהרה רפואית — חשוב לקרוא">
        <LegalBox>
          <p className="font-black">האפליקציה אינה תחליף לייעוץ, אבחון או טיפול רפואי.</p>
        </LegalBox>
        <LegalList
          items={[
            "לפני תחילת תוכנית אימונים — ובמיוחד אם יש לך מחלת לב, לחץ דם גבוה, סוכרת, הריון, פציעה, ניתוח או מצב רפואי אחר — יש להתייעץ עם רופא.",
            "התוכן הכללי באפליקציה (תוכניות, סרטונים, הסברים) אינו מותאם למצבך הרפואי האישי.",
            "יש להפסיק מיד את האימון אם מופיעים כאב חד או מחמיר, סחרחורת, קוצר נשימה חריג, כאב או לחץ בחזה, או כל תסמין מדאיג — ולפנות לגורם רפואי.",
            "האחריות לביצוע התרגילים בטכניקה נכונה, בעומס מתאים ובסביבה בטוחה היא שלך.",
          ]}
        />
        <p className="font-bold">במצב חירום רפואי יש להתקשר מיד למד&quot;א בטלפון 101.</p>
      </LegalSection>

      <LegalSection id="t-ai" title="מאמן ה-AI">
        <p>
          מאמן ה-AI הוא תוכנה ממוחשבת ולא אדם. התשובות שלו נוצרות אוטומטית, עלולות להיות שגויות או לא מתאימות לך, ואינן
          ייעוץ רפואי או מקצועי. אין להסתמך עליהן בהחלטות הנוגעות לבריאותך, ואין לפנות אליו במצב חירום. הודעות שהמערכת
          מזהה כמצב דחוף מועברות למטפל, אך איננו מתחייבים שכל מצב כזה יזוהה או שתתקבל מענה בזמן מסוים.
        </p>
      </LegalSection>

      <LegalSection id="t-account" title="החשבון שלך">
        <LegalList
          items={[
            "השימוש מיועד לבני 18 ומעלה. קטין רשאי להשתמש באפליקציה רק בהסכמת הורה או אפוטרופוס.",
            "עליך למסור פרטים נכונים ולשמור על סודיות הסיסמה. אתה אחראי לכל שימוש שנעשה בחשבון שלך.",
            "אפשר להפסיק להשתמש באפליקציה ולבקש את מחיקת החשבון בכל עת.",
          ]}
        />
      </LegalSection>

      <LegalSection id="t-use" title="שימוש אסור">
        <p>אין להשתמש באפליקציה באופן שאינו חוקי, לנסות לחדור למערכות או למידע של משתמשים אחרים, להעתיק או להפיץ את התכנים, או לשבש את פעילות האפליקציה. נוכל להשעות או לסגור חשבון שנעשה בו שימוש כזה.</p>
      </LegalSection>

      <LegalSection id="t-ip" title="קניין רוחני">
        <p>
          כל התכנים באפליקציה — תוכניות האימון, הסרטונים, התמונות, הטקסטים והעיצוב — שייכים לנו או למי שהעניק לנו רישיון
          להשתמש בהם, ומוגנים בזכויות יוצרים. מותר להשתמש בהם לצורך אישי בלבד, במסגרת האפליקציה.
        </p>
      </LegalSection>

      <LegalSection id="t-paid" title="שירותים בתשלום">
        <p>
          אם יוצעו באפליקציה מסלולים או שירותים בתשלום, יפורטו לפני הרכישה המחיר, תנאי התשלום, משך ההתקשרות ותנאי הביטול,
          בהתאם לחוק הגנת הצרכן.
        </p>
      </LegalSection>

      <LegalSection id="t-liability" title="אחריות">
        <p>
          האפליקציה ניתנת לשימוש כפי שהיא (&quot;AS IS&quot;). אנו פועלים כדי שתהיה זמינה, מדויקת ובטוחה, אך איננו מתחייבים שתפעל
          ללא תקלות או הפסקות. במידה המרבית המותרת על פי דין, לא נישא באחריות לנזק שנגרם כתוצאה משימוש באפליקציה שלא בהתאם
          לתנאים אלו ולהבהרה הרפואית שלמעלה. אין באמור כדי לגרוע מאחריות שלא ניתן להגביל על פי דין.
        </p>
      </LegalSection>

      <LegalSection id="t-changes" title="שינויים בתנאים ובשירות">
        <p>
          אנו רשאים לעדכן את האפליקציה ואת התנאים. שינוי מהותי בתנאים יובא לידיעתך, ותתבקש לאשר את הנוסח החדש בכניסה הבאה
          לאפליקציה.
        </p>
      </LegalSection>

      <LegalSection id="t-law" title="דין וסמכות שיפוט">
        <p>על תנאים אלו יחולו דיני מדינת ישראל, וסמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים בישראל.</p>
      </LegalSection>

      <LegalSection id="t-contact" title="יצירת קשר">
        <LegalBox>
          <p className="font-black">{BUSINESS.name}</p>
          <p>{BUSINESS.id}</p>
          <p>{BUSINESS.address}</p>
          <p>
            אימייל: <a href={`mailto:${BUSINESS.email}`} className="text-accent-fg font-bold hover:underline" dir="ltr">{BUSINESS.email}</a>
          </p>
          <p>
            טלפון: <a href={`tel:${BUSINESS.phone}`} className="text-accent-fg font-bold hover:underline" dir="ltr">{BUSINESS.phone}</a>
          </p>
        </LegalBox>
      </LegalSection>
    </LegalPage>
  );
}
