-- Data change (requested 2026-10-10): Jump Rope, a low-amplitude,
-- high-frequency plyometric. Uses the new `jump_rope` equipment id
-- (EQUIPMENT_LIST in app/constants/catalog.ts). Skipped if an exercise with
-- this name_en already exists, so it is safe to re-run.

insert into public.exercises
  (name_en, name_he, name_display_preference, categories, admin_tags, equipment, difficulty_level,
   target_muscle, secondary_muscles, prime_movers, synergists,
   description, description_en, patient_cues, cues_en, common_mistake, mistakes_en, clinical_notes)
select v.* from (values
  (
    'Jump Rope', 'קפיצה בחבל', 'he',
    array['פליומטרי'], 'plyometrics', array['jump_rope'], 'beginner',
    'calves', 'soleus,tibialis-anterior,quadriceps,forearm-flexors',
    array['calves', 'soleus'], array['tibialis-anterior', 'quadriceps', 'forearm-flexors'],
    'קפיצות קטנות ומהירות על כריות כפות הרגליים בזמן שהחבל מסתובב מתחת לרגליים. התרגיל מחזק את התאומים ואת גיד אכילס, משפר קואורדינציה, קצב וזריזות, ומעלה את הדופק. מתאים כחימום, כתחנה באימון מעגלי או כאימון סיבולת קצר.',
    'Small, quick hops on the balls of the feet while the rope passes under them. Builds calf and Achilles stiffness, coordination, rhythm and footwork, and raises the heart rate. Works as a warm-up, a circuit station or a short conditioning block.',
    E'אורך החבל: כשעומדים במרכזו, הידיות מגיעות בערך לגובה בתי השחי.\nקפיצות נמוכות, 2–3 ס״מ מהרצפה מספיקים.\nנחיתה רכה על כריות כפות הרגליים, העקבים לא נוגעים ברצפה.\nברכיים רכות, לא נעולות.\nמרפקים צמודים לגוף, הסיבוב מגיע מפרקי כף היד ולא מהכתפיים.\nמבט קדימה וגוף זקוף.\nמתחילים בסטים קצרים (20–30 שניות) ומאריכים בהדרגה.',
    E'Rope length: standing on its middle, the handles reach about armpit height.\nJump low, 2–3 cm off the floor is enough.\nLand softly on the balls of the feet, heels stay off the floor.\nKeep the knees soft, not locked.\nElbows close to the body, turn the rope from the wrists, not the shoulders.\nEyes forward, body tall.\nStart with short sets (20–30 seconds) and build up gradually.',
    E'קפיצות גבוהות מדי שמעייפות מהר ומגדילות את העומס בנחיתה.\nנחיתה על העקבים או על רגליים ישרות.\nסיבוב החבל מהכתפיים עם ידיים רחוקות מהגוף.\nקפיצה כפולה בכל סיבוב (קפיצת ביניים) במקום קפיצה אחת לכל סיבוב.\nחבל ארוך או קצר מדי.\nקפיצה על משטח קשה מאוד (בטון) בנפח גבוה.',
    E'Jumping too high, which tires you quickly and increases landing load.\nLanding on the heels or with straight legs.\nTurning the rope from the shoulders with the hands far from the body.\nAdding a double bounce per turn instead of one jump per turn.\nA rope that is too long or too short.\nHigh volume on a very hard surface (concrete).',
    E'עומס פליומטרי נמוך-אמפליטודה ובתדירות גבוהה (מחזור מתיחה-קיצור קצר), בעיקר על מתחם התאומים-סוליאוס, גיד אכילס והפציה הפלנטרית.\nשימושי לשלב ביניים בחזרה לריצה ולקפיצות, ולבניית סבולת עומס בגיד אכילס — במינון הדרגתי ובהתאם לתגובת הכאב ב-24 השעות שאחרי.\nזהירות או דחייה: טנדינופתיה של אכילס או פלנטר פאשיאיטיס בשלב מגיב, שבר מאמץ בשוק/בכף הרגל, נקע קרסול טרי, ופרק זמן מוקדם אחרי ניתוח בגפה התחתונה.\nרגרסיה: עליות עקבים, קפיצות במקום בלי חבל או "פוגו" עם תמיכה. פרוגרסיה: קפיצה על רגל אחת, ריצה במקום עם החבל, Double Under.\nלהעדיף משטח עם בלימה (פרקט, גומי) ונעליים סגורות.'
  )
) as v(name_en, name_he, name_display_preference, categories, admin_tags, equipment, difficulty_level,
       target_muscle, secondary_muscles, prime_movers, synergists,
       description, description_en, patient_cues, cues_en, common_mistake, mistakes_en, clinical_notes)
where not exists (select 1 from public.exercises e where e.name_en = v.name_en);
