-- Data change (approved 2026-10-14): Hebrew content and muscle review of the
-- exercise library — EXERCISE-REVIEW.xlsx, every row approved. Rewrites
-- description / patient_cues / common_mistake where they were missing ('לא צוין'),
-- one run-on line, used English or jargon, or were wrong; fixes target_muscle /
-- prime_movers / synergists (what the muscle map shows) where they were
-- anatomically wrong or incomplete. secondary_muscles (the legacy fallback) is
-- kept equal to synergists wherever synergists changed. English fields untouched.
update public.exercises set synergists = array['front-deltoids', 'serratus-anterior', 'biceps']::text[], secondary_muscles = 'front-deltoids,serratus-anterior,biceps' where id = '8d67bd86-43f7-416b-a190-66af99ac4f78';
update public.exercises set description = 'כפיפת פלג הגוף העליון מהרצפה עד שהשכמות מתרוממות: מחזקת את שרירי הבטן הישרים.', patient_cues = 'תנוחת התחלה: שכיבה על הגב, ברכיים כפופות וכפות רגליים על הרצפה.
ידיים: תומכות בראש מאחור, בלי למשוך אותו.
צוואר: ניטרלי, כאילו יש תפוז בין הסנטר לחזה.
טווח: עלו רק עד שהשכמות מתנתקות מהרצפה (כ-30 מעלות).', common_mistake = 'משיכת הראש בידיים: מעמיסה על הצוואר.
תנופה: מורידה את העבודה מהבטן.
עלייה גבוהה מדי: מעבירה את העבודה לכופפי הירך.' where id = 'ab2872a1-79a6-4e12-a4ed-0ad5be9c9fd5';
update public.exercises set target_muscle = 'trapezius', prime_movers = array['trapezius', 'lats']::text[], synergists = array['rhomboids', 'forearm-flexors']::text[], secondary_muscles = 'rhomboids,forearm-flexors' where id = 'e75dcd6a-b1dc-4c19-ab21-1890726f6fb2';
update public.exercises set synergists = array['hip-flexors', 'gluteal', 'abs']::text[], secondary_muscles = 'hip-flexors,gluteal,abs' where id = '473e933c-4c69-428b-ac34-8735bf42dd7a';
update public.exercises set synergists = array['chest', 'biceps', 'erector-spinae']::text[], secondary_muscles = 'chest,biceps,erector-spinae' where id = '58eb9000-cbb2-4345-861c-39fb78cdde41';
update public.exercises set synergists = array['back-deltoids', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,triceps,abs' where id = '30933075-d994-4afd-9122-2003db347757';
update public.exercises set synergists = array['back-deltoids', 'trapezius', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,trapezius,triceps,abs' where id = '147ae955-8945-4c78-9518-7e3b12494e71';
update public.exercises set description = 'שכיבה על הגב עם שכמות מורמות, ונגיעה לסירוגין בעקב ימין ושמאל: מחזקת את השרירים האלכסוניים בבטן.', patient_cues = 'תנוחה: ברכיים כפופות, כפות רגליים על הרצפה, שכמות מורמות לאורך כל התרגיל.
תנועה: כפיפה צידית של הגו לעבר העקב, בלי לסובב את הגב.
צוואר: ניטרלי, המבט קדימה ולמעלה.', common_mistake = 'הורדת השכמות לרצפה בין החזרות: מורידה את המתח מהבטן.
משיכת הצוואר קדימה: מעמיסה על הצוואר במקום על הבטן.
תנועה מהירה ומטולטלת: מורידה את העבודה מהאלכסונים.' where id = '1e6df363-7f65-4fea-8469-57881b874172';
update public.exercises set synergists = array['trapezius', 'gluteal', 'hamstring', 'back-deltoids', 'side-deltoids']::text[], secondary_muscles = 'trapezius,gluteal,hamstring,back-deltoids,side-deltoids' where id = '9571bf8e-5210-48e0-8d2e-6b8e1296dad0';
update public.exercises set target_muscle = 'rhomboids', prime_movers = array['rhomboids', 'trapezius']::text[], synergists = array['lats', 'back-deltoids', 'biceps', 'forearm-flexors']::text[], secondary_muscles = 'lats,back-deltoids,biceps,forearm-flexors' where id = '304adc25-34e7-4cb9-8f1f-ac801a5524b9';
update public.exercises set target_muscle = 'lats', prime_movers = array['lats']::text[], synergists = array['biceps', 'brachialis', 'rhomboids', 'trapezius', 'back-deltoids', 'forearm-flexors']::text[], secondary_muscles = 'biceps,brachialis,rhomboids,trapezius,back-deltoids,forearm-flexors' where id = '6cd81f56-df26-40e1-9b1b-45a9b391d2b0';
update public.exercises set synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = '8dd18e40-1e81-4cde-a551-cd41edfd90d3';
update public.exercises set target_muscle = 'trapezius', prime_movers = array['trapezius', 'lats']::text[], synergists = array['rhomboids', 'forearm-flexors']::text[], secondary_muscles = 'rhomboids,forearm-flexors' where id = 'c4a0c1e8-8fab-40c5-9f7a-76539321dda5';
update public.exercises set description = 'מתח במכשיר עם משקל נגד שמרים אותך: מאפשר לבנות כוח במתח לפני שמצליחים לבצע אותו לבד. מחזק בעיקר את הגב הרחב ואת הביצפס.', patient_cues = 'משקל הסיוע: ככל שמוסיפים משקל במכשיר התרגיל נעשה קל יותר — הפוך משאר המכונות.
תנוחה: ברכיים על הכרית, אחיזה ברוחב הכתפיים או מעט יותר.
תנועה: משכו עד שהסנטר מעל הידיות, ורדו לאט עד יישור מלא של הידיים.
שכמות: הורידו את השכמות לפני שמתחילים למשוך.', common_mistake = 'חצי טווח: עצירה לפני יישור הידיים בירידה.
הרמת הכתפיים לאוזניים בתחילת המשיכה.
ירידה מהירה: מאבדים את שלב הירידה, שבונה כוח.', target_muscle = 'lats', prime_movers = array['lats']::text[], synergists = array['biceps', 'brachialis', 'rhomboids', 'trapezius', 'back-deltoids']::text[], secondary_muscles = 'biceps,brachialis,rhomboids,trapezius,back-deltoids' where id = 'cda1a2c2-8aad-4198-8328-83c875786a5a';
update public.exercises set synergists = array['chest', 'biceps', 'erector-spinae']::text[], secondary_muscles = 'chest,biceps,erector-spinae' where id = '4589a9f0-2276-4542-97b2-42dce2d0d835';
update public.exercises set synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = '616dc2fa-8a59-445a-87a6-4992c5125601';
update public.exercises set target_muscle = 'lats', prime_movers = array['lats']::text[], synergists = array['biceps', 'brachialis', 'rhomboids', 'trapezius', 'back-deltoids', 'forearm-flexors']::text[], secondary_muscles = 'biceps,brachialis,rhomboids,trapezius,back-deltoids,forearm-flexors' where id = '045dbd84-0bd3-4a54-b663-7976532a2bb8';
update public.exercises set description = 'לחיצת מוט מעל הראש מגובה עצם הבריח עד יישור מלא של הידיים: מחזקת את הכתפיים ואת הטרייספס.', patient_cues = 'אחיזה: מעט רחבה מרוחב הכתפיים, מרפקים מתחת למוט.
תנוחת התחלה: המוט נח על החזה העליון, ליד עצם הבריח.
מסלול: המוט עולה קרוב לפנים ומסיים מעל אמצע הראש.
ליבה: בטן וישבן מכווצים, בלי להתקמר לאחור.', common_mistake = 'מוט רחוק מהגוף: מעמיס על הכתפיים והגב התחתון.
קימור הגב התחתון: הופך את התרגיל ללחיצת חזה עליון ומעמיס על הגב.
מרפקים בורחים לאחור: מאבדים את הקו הישר של הלחיצה.', target_muscle = 'front-deltoids', prime_movers = array['front-deltoids', 'triceps']::text[], synergists = array['side-deltoids', 'trapezius', 'serratus-anterior']::text[], secondary_muscles = 'side-deltoids,trapezius,serratus-anterior' where id = '218e8dcc-c8de-456a-bbf2-4f57300297a0';
update public.exercises set description = 'צעד ארוך וירידה עם הברך האחורית לכיוון הרצפה: מחזק את הירך הקדמית והישבן. אפשר לבצע במקום, קדימה, אחורה, הצידה או בהליכה.', patient_cues = 'אורך הצעד: ארוך מספיק כך ששתי הברכיים מגיעות לכ-90 מעלות בתחתית.
גו: זקוף, המבט קדימה.
ברך קדמית: בקו האצבע השנייה, לא קורסת פנימה.
ירידה: אנכית, הברך האחורית יורדת כמעט עד הרצפה.', common_mistake = 'צעד קצר מדי: הברך הקדמית יוצאת הרבה מעבר לאצבעות והעקב מתרומם.
רכינה קדימה עם כל הגוף בירידה.
קריסת הברך הקדמית פנימה.', prime_movers = array['quadriceps', 'gluteal']::text[], synergists = array['hamstring', 'adductors', 'calves']::text[], secondary_muscles = 'hamstring,adductors,calves' where id = '4c0bffd2-5927-42d2-af89-8778aff3f6ca';
update public.exercises set description = 'ירידה לסקוואט עם מוט על הגב העליון, בכיפוף הירכיים, הברכיים והקרסוליים, ועלייה חזרה: מחזק את הירך הקדמית והישבן.', patient_cues = 'עמידה: ברוחב הכתפיים או מעט יותר, אצבעות מעט החוצה.
מוט: מונח על הטרפז העליון, לא על הצוואר.
גב: חזה מורם וגב מכווץ לאורך כל התנועה.
משקל: על כל כף הרגל, העקבים לא מתרוממים.
ברכיים: נעות בקו האצבעות.', common_mistake = 'הרמת העקבים: המשקל עובר לבהונות ומעמיס על הברכיים.
רכינת יתר של הגו קדימה: מעבירה את העומס לגב התחתון.
קריסת הברכיים פנימה.', prime_movers = array['quadriceps', 'gluteal']::text[], synergists = array['hamstring', 'adductors', 'erector-spinae']::text[], secondary_muscles = 'hamstring,adductors,erector-spinae' where id = 'e85a83cc-6676-4307-b96d-852e8f617f5a';
update public.exercises set description = 'הרמת מוט קרוב לגוף מגובה הירכיים עד גובה החזה, כשהמרפקים מובילים: מחזקת את הכתף האמצעית והטרפז.', patient_cues = 'אחיזה: צרה, בערך ברוחב הכתפיים. מוט W נוח יותר לפרקי הידיים.
מסלול: המוט צמוד לגוף לאורך כל התנועה.
מרפקים: מובילים את התנועה ונשארים גבוהים מכפות הידיים.
גובה: עד גובה החזה. מעל גובה הכתפיים עלול לגרום לצביטה בכתף.', common_mistake = 'אחיזה צרה מדי: מעמיסה על פרקי הידיים ועל הכתף.
הרמה מעל גובה הכתפיים: עלולה לגרום לכאב בכתף.
כפיפת מרפקים בלבד בלי הרמה מהכתף: הופכת את התרגיל לכפיפת ביצפס.' where id = 'bdc7c933-b22a-47ab-b69a-a5edc0114051';
update public.exercises set patient_cues = 'גובה המושב: בית השחי צמוד לחלק העליון של הכרית.
גב: ישר, לא מתעגל קדימה.
תנועה: כפפו את המרפקים עד למעלה, ויישרו בשליטה כמעט עד הסוף.', common_mistake = 'מושב גבוה מדי: הכתפיים עולות והתרגיל מאבד יציבות.
ישיבה בגב עגול.
יישור מהיר ומלא בבת אחת: מעמיס על המרפק.', synergists = array['brachialis']::text[], secondary_muscles = 'brachialis' where id = '554fd682-9ac5-48f9-bc27-4434cd953c28';
update public.exercises set patient_cues = 'ראש: נתמך בידיים בלי למשוך אותו.
תנועה: מרפק אחד נע לעבר הברך הנגדית, והרגל השנייה מתיישרת — כמו דיווש.
שכמות: מורמות מהרצפה לאורך כל התרגיל.', common_mistake = 'משיכת הצוואר בידיים.
תנועה מהירה ומטולטלת: מורידה את העבודה מהבטן.
סיבוב המרפק בלבד בלי סיבוב של הגו.' where id = '5aed2f10-6bd2-4c3a-af1e-2c2ec0aa3d7c';
update public.exercises set target_muscle = 'rhomboids', prime_movers = array['rhomboids', 'trapezius']::text[], synergists = array['lats', 'back-deltoids', 'biceps', 'forearm-flexors']::text[], secondary_muscles = 'lats,back-deltoids,biceps,forearm-flexors' where id = '7ce1e0d5-535b-4b1f-aebd-345f09f29129';
update public.exercises set description = 'סקוואט על רגל אחת כשכף הרגל האחורית מונחת על ספסל: מחזק את הירך הקדמית והישבן, ומשפר שיווי משקל.', patient_cues = 'מיקום: רגל קדמית כצעד ארוך לפני הספסל, גב כף הרגל האחורית מונח על הספסל.
ירידה: אנכית, עד שהירך הקדמית מקבילה לרצפה.
דגש: גו זקוף מדגיש את הירך הקדמית; הטיה קלה קדימה מדגישה את הישבן.
ברך קדמית: בקו האצבעות, לא קורסת פנימה.', common_mistake = 'רגל קדמית קרובה מדי לספסל: העקב מתרומם והברך מועמסת.
רגל קדמית רחוקה מדי: התנועה הופכת למתיחה ואיבוד יציבות.
דחיפה מהרגל האחורית: העבודה צריכה לבוא מהרגל הקדמית.', prime_movers = array['quadriceps', 'gluteal']::text[], synergists = array['hamstring', 'adductors', 'glute-medius']::text[], secondary_muscles = 'hamstring,adductors,glute-medius' where id = 'e73365f0-be44-41af-b38c-4e2ad97185dc';
update public.exercises set common_mistake = 'אמות על הראש: מעמיסות על הצוואר ומורידות את עבודת הכתפיים.
ברכיים קורסות פנימה: שמרו אותן בקו עם האצבעות.' where id = '20cefdec-1766-4146-8b92-ee7c7f6b7be4';
update public.exercises set target_muscle = 'hip-flexors', prime_movers = array['hip-flexors']::text[], synergists = array['abs', 'glute-medius']::text[], secondary_muscles = 'abs,glute-medius' where id = '24cbe354-153f-499e-b67c-deeef0d3634c';
update public.exercises set target_muscle = 'adductors', prime_movers = array['adductors']::text[], synergists = array['glute-medius']::text[], secondary_muscles = 'glute-medius' where id = 'ccc694e9-b121-458f-b4d5-b31a247889f8';
update public.exercises set synergists = array['hamstring', 'abs']::text[], secondary_muscles = 'hamstring,abs' where id = '9ecefcce-6281-4eb1-973b-f91fbc589941';
update public.exercises set description = 'הרמת היד הצידה עד גובה הכתף בכבל מהפולי התחתון: מחזקת את הכתף האמצעית.', patient_cues = 'עמידה: צעד אחד הצידה מהפולי, היד הרחוקה אוחזת בידית.
התחלה: הידית מול הירך הנגדית, כדי להגדיל את טווח התנועה.
תנועה: הרימו הצידה עד גובה הכתף, מרפק בכיפוף קל וקבוע.
גוף: יציב, בלי נדנוד.', common_mistake = 'תנופה מהגב: מורידה את העבודה מהכתף.
כיפוף מרפק גדול: הופך את התרגיל לחתירה.
הרמה מעל גובה הכתף: מעבירה את העבודה לטרפז.', synergists = array['front-deltoids', 'back-deltoids', 'trapezius', 'serratus-anterior']::text[], secondary_muscles = 'front-deltoids,back-deltoids,trapezius,serratus-anterior' where id = '0d3e3289-a1f5-40de-acf5-68e12e369fcc';
update public.exercises set description = 'פשיטת מרפקים מעל הראש בכבל, כשהגב לפולי: מחזקת את הטרייספס, בעיקר את הראש הארוך.', patient_cues = 'גובה הפולי: מעט מעל הראש.
עמידה: צעד קדימה מהפולי, גו מוטה מעט קדימה, גב ניטרלי.
תנועה: מתחילים כשהידיים מאחורי הראש, ודוחפים קדימה ולא למטה.
מרפקים: נשארים במקום, רק האמה זזה.', common_mistake = 'מרפקים נפתחים לצדדים: מורידים את העבודה מהטרייספס.
תנועה מהכתף במקום מהמרפק.
קימור הגב התחתון.', synergists = '{}'::text[], secondary_muscles = '' where id = '6266eb01-36b7-43f2-8778-d782b1b4a16c';
update public.exercises set description = 'פתיחת הידיים לצדדים בגובה הכתף בכבלים מוצלבים: מחזקת את הכתף האחורית ואת הגב העליון.', patient_cues = 'גובה הפוליים: בגובה הכתפיים.
אחיזה מוצלבת: יד ימין בכבל השמאלי, יד שמאל בכבל הימני.
תנועה: פתחו לצדדים בקו הכתפיים, מרפקים בכיפוף קל.
שכמות: נשארות למטה, בלי הרמת כתפיים.', common_mistake = 'הרמת הכתפיים לאוזניים: מעבירה את העבודה לטרפז העליון.
כיפוף מרפקים גדול: הופך את התרגיל לחתירה.
נדנוד הגוף אחורה.', synergists = array['rhomboids', 'trapezius']::text[], secondary_muscles = 'rhomboids,trapezius' where id = '1c57a34c-f2f0-41be-b756-04c43723267f';
update public.exercises set patient_cues = 'עמידה: קרוב לפולי.
אחיזה: בערך ברוחב הכתפיים.
מרפקים: מובילים את התנועה ונשארים גבוהים מכפות הידיים.
גובה: עד גובה החזה. מעל גובה הכתפיים עלול לגרום לצביטה בכתף.', common_mistake = 'אחיזה צרה מאוד: מעמיסה על פרקי הידיים והכתף.
עמידה רחוקה מהפולי: הכבל מושך את הגוף קדימה.
כפיפת מרפקים בלבד בלי הרמה מהכתף.' where id = 'ec88b983-c34b-4d22-aa59-da7fc8913599';
update public.exercises set description = 'עלייה על כריות כפות הרגליים, עם משקל או במכונה: מחזקת את שריר התאומים בשוק.', patient_cues = 'מדרגה: כריות כפות הרגליים על הקצה, העקבים באוויר, להגדלת הטווח.
ברכיים: ישרות לאורך כל התרגיל.
תנועה: עלו גבוה ככל האפשר, החזיקו שנייה, ורדו לאט עד מתיחה.', common_mistake = 'קפיצות במקום תנועה מבוקרת.
טווח חלקי: לא יורדים עד המתיחה.
כיפוף הברכיים: מעביר את העבודה לסוליאוס.', synergists = array['soleus']::text[], secondary_muscles = 'soleus' where id = 'cb5f6522-f6cf-47e4-8de6-fed30cc060b4';
update public.exercises set patient_cues = 'השענות: אמות יציבות על הכריות, כתפיים רחוקות מהאוזניים.
תנועה: הרימו את הברכיים לחזה תוך גלגול האגן לאחור.
ירידה: לאט, בלי נדנוד.', common_mistake = 'הרמת ברכיים בלי גלגול האגן: התנועה מגיעה בעיקר מכופפי הירך.
נדנוד הרגליים לתנופה.
הרמת הכתפיים לאוזניים.', synergists = array['obliques', 'hip-flexors']::text[], secondary_muscles = 'obliques,hip-flexors' where id = '3fd1b796-b37a-4b28-8fe7-5199a4bec5ea';
update public.exercises set target_muscle = 'erector-spinae', prime_movers = array['erector-spinae']::text[], synergists = array['abs']::text[], secondary_muscles = 'abs' where id = '5608f0fb-fff8-4035-ae77-f19e5f94ed93';
update public.exercises set target_muscle = 'erector-spinae', prime_movers = array['erector-spinae']::text[], synergists = array['abs', 'obliques']::text[], secondary_muscles = 'abs,obliques' where id = '14dde12c-af25-4353-9909-577b1eb56ef6';
update public.exercises set synergists = array['lats', 'transverse-abdominis']::text[], secondary_muscles = 'lats,transverse-abdominis' where id = '6dd23a3c-045c-49e7-b47e-fcfe46c40218';
update public.exercises set synergists = array['lats', 'transverse-abdominis']::text[], secondary_muscles = 'lats,transverse-abdominis' where id = '47c35d18-f069-471e-a106-4943a4da75f1';
update public.exercises set description = 'לחיצת חזה במוט באחיזה צרה: מעבירה את רוב העבודה לטרייספס.', patient_cues = 'אחיזה: ברוחב הכתפיים.
הורדה: לחלק התחתון של החזה, ליד עצם החזה.
מרפקים: צמודים לגוף, האמות אנכיות בתחתית.', common_mistake = 'הורדה נמוכה מדי (לבטן) או גבוהה מדי (לעצם הבריח).
מרפקים בורחים החוצה: מעבירים את העבודה לחזה ומעמיסים על הכתף.
אחיזה צרה מדי: מעמיסה על פרקי הידיים.', synergists = array['chest', 'front-deltoids']::text[], secondary_muscles = 'chest,front-deltoids' where id = '24fe60e2-8b7d-4601-9764-17fcee047a18';
update public.exercises set patient_cues = 'אחיזה: המשקולות מקבילות, כפות ידיים פונות זו לזו.
הורדה: לחלק התחתון של החזה.
מרפקים: צמודים לגוף, האמות אנכיות בתחתית.', common_mistake = 'מרפקים בורחים החוצה: מעבירים את העבודה לחזה ומעמיסים על הכתף.
הורדה לגובה עצם הבריח במקום לחלק התחתון של החזה.', synergists = array['chest', 'front-deltoids']::text[], secondary_muscles = 'chest,front-deltoids' where id = '22d3ba77-7efd-4796-9583-8cb39efc9cbc';
update public.exercises set patient_cues = 'ידיים: מתחת לכתפיים או מעט צר יותר, אצבעות קדימה.
מרפקים: צמודים לגוף בירידה, לא נפתחים לצדדים.
גוף: קו ישר מהראש לעקבים, בטן וישבן מכווצים.
טווח: חזה כמעט עד הרצפה, ויישור מלא למעלה.', common_mistake = 'מרפקים נפתחים לצדדים: מורידים את העבודה מהטרייספס ומעמיסים על הכתף.
קימור הגב התחתון: מעמיס על הגב.
כאב בפרקי הידיים: אפשר להיעזר בידיות אחיזה או לבצע על אגרופים.' where id = 'a5019796-dd28-4d92-bbc4-1f4d38ebaf24';
update public.exercises set description = 'לחיצת חזה צרה במכונת סמית'': המוט נע במסלול קבוע, והעבודה עוברת לטרייספס.', patient_cues = 'מיקום הספסל: כך שהמוט יורד לחלק התחתון של החזה.
אחיזה: ברוחב הכתפיים.
מרפקים: צמודים לגוף, האמות אנכיות בתחתית.', common_mistake = 'ספסל לא במקום: המוט יורד לבטן או לצוואר.
מרפקים בורחים החוצה.
אחיזה צרה מדי: מעמיסה על פרקי הידיים.', synergists = array['chest', 'front-deltoids']::text[], secondary_muscles = 'chest,front-deltoids' where id = '4fd78edd-5a61-434d-87fa-7a11916f5e20';
update public.exercises set target_muscle = 'rotator-cuff', prime_movers = array['rotator-cuff']::text[], synergists = array['back-deltoids']::text[], secondary_muscles = 'back-deltoids' where id = '11ac61e2-5eb1-44ce-a063-ebe2e2cc82c4';
update public.exercises set patient_cues = 'ישיבה: רגליים בפיסוק, הטיה קלה קדימה.
מרפק: נשען על החלק הפנימי של הירך.
תנועה: כפפו עד למעלה ורדו לאט כמעט עד יישור מלא.', common_mistake = 'מרפק על הירך במקום בחלקה הפנימי: מגביל את הטווח.
סיבוב הגו כדי להרים את המשקולת.', synergists = array['brachialis']::text[], secondary_muscles = 'brachialis' where id = '203828a4-e1b3-4979-9a89-7cb503749a86';
update public.exercises set prime_movers = array['back-deltoids', 'triceps']::text[], synergists = array['gluteal', 'abs']::text[], secondary_muscles = 'gluteal,abs' where id = '5246c9a1-7f96-4ff6-8d5e-e146c2cc3c62';
update public.exercises set description = 'סיבוב הכתף כלפי חוץ נגד גומייה או כבל, מרפק צמוד לגוף: מחזק את מסובבי הכתף ומייצב אותה.', patient_cues = 'מרפק: צמוד לגוף בזווית 90 מעלות לאורך כל התנועה. אפשר מגבת קטנה בין המרפק לגוף.
תנועה: סובבו את האמה החוצה, כמו דלת שנפתחת.
קצב: לאט ובשליטה, בלי לנדנד את הגוף.', common_mistake = 'המרפק מתרחק מהגוף: התנועה עוברת לכתף האחורית.
סיבוב הגו במקום הכתף.
התנגדות כבדה מדי: התרגיל לחיזוק ויציבות, לא לכוח מקסימלי.', prime_movers = array['rotator-cuff']::text[], synergists = array['back-deltoids']::text[], secondary_muscles = 'back-deltoids' where id = 'c3426f0a-9ad9-4d00-9009-506bf675ff29';
update public.exercises set description = 'סיבוב הכתף כלפי פנים נגד גומייה או כבל, מרפק צמוד לגוף: מחזק את מסובבי הכתף ומייצב אותה.', patient_cues = 'מרפק: צמוד לגוף בזווית 90 מעלות לאורך כל התנועה.
תנועה: סובבו את האמה פנימה לעבר הבטן.
קצב: לאט ובשליטה.', common_mistake = 'המרפק מתרחק מהגוף.
סיבוב הגו במקום הכתף.
התנגדות כבדה מדי.', prime_movers = array['rotator-cuff']::text[], synergists = array['chest', 'lats', 'front-deltoids']::text[], secondary_muscles = 'chest,lats,front-deltoids' where id = 'bdf884e8-8e6f-41dd-8fd9-8a69b0a9942a';
update public.exercises set synergists = array['hamstring', 'gluteal']::text[], secondary_muscles = 'hamstring,gluteal' where id = '244ddce7-4382-4862-9154-adc7f6fa3cd6';
update public.exercises set description = 'הרמת מוט מהרצפה עד עמידה זקופה, בתנועה שמתחילה מהירכיים: מחזקת את הישבן, הירך האחורית והגב.', patient_cues = 'עמידה: ברוחב האגן, המוט מעל אמצע כף הרגל וקרוב מאוד לשוקיים.
גב: ישר וקשיח, שכמות משוכות לאחור ולמטה.
הרמה: דחפו את הרצפה ברגליים, המוט צמוד לגוף לאורך כל הדרך.
סיום: עמידה זקופה עם כיווץ ישבן, בלי להישען לאחור.
ירידה: האגן אחורה והמוט מחליק על הירכיים.', common_mistake = 'עיגול הגב: מעמיס על הגב התחתון.
מוט רחוק מהגוף: מגדיל את העומס על הגב.
ירידה עמוקה מדי עם ברכיים כפופות, כמו בסקוואט.
הישענות לאחור בסיום: מעמיסה על הגב התחתון.', prime_movers = array['gluteal', 'hamstring']::text[], synergists = array['quadriceps', 'erector-spinae', 'trapezius', 'forearm-flexors']::text[], secondary_muscles = 'quadriceps,erector-spinae,trapezius,forearm-flexors' where id = '6b470272-4d30-4172-b09f-47c6b6f6381e';
update public.exercises set description = 'לחיצת מוט בספסל בשיפוע שלילי (כ-15–30 מעלות): מדגישה את החלק התחתון של החזה.', patient_cues = 'אחיזה: מעט רחבה מרוחב הכתפיים, אגודל סוגר על המוט.
הורדה: לחלק התחתון של החזה.
מרפקים: מעט מתחת לקו הכתפיים, לא פתוחים לגמרי לצדדים.
פרקי ידיים: ישרים מעל המרפקים.', common_mistake = 'פרקי ידיים מתכופפים לאחור: מעמיסים על פרק כף היד.
הורדה לצוואר או לחזה העליון.
קפיצת המוט מהחזה.', synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = '9a2ad7e3-363b-420b-b773-cabe90ac36ff';
update public.exercises set description = 'פתיחת הידיים לצדדים וסגירה מעל החזה, על ספסל בשיפוע שלילי: מדגישה את החלק התחתון של החזה.', patient_cues = 'מרפקים: בכיפוף קל שנשאר קבוע לאורך כל התנועה.
ירידה: מבוקרת, עד שהזרוע בערך מקבילה לרצפה.
סגירה: חבקו קשת רחבה עד שהמשקולות מעל החזה.', common_mistake = 'כיפוף מרפקים גדול: הופך את התרגיל ללחיצה.
ירידה עמוקה מדי: מעמיסה על הכתף.
המשקולות בורחות לכיוון הראש.', synergists = array['front-deltoids', 'biceps']::text[], secondary_muscles = 'front-deltoids,biceps' where id = '4dffc4fa-6231-4e94-83bc-886d296a3686';
update public.exercises set description = 'לחיצת משקולות על ספסל בשיפוע שלילי (כ-15–30 מעלות): מדגישה את החלק התחתון של החזה.', patient_cues = 'התחלה: משקולות מעל הכתפיים, ידיים ישרות.
הורדה: בקשת קלה לחלק התחתון של החזה.
תחתית: האמות אנכיות לרצפה.', common_mistake = 'שיפוע קטן מדי: התרגיל הופך ללחיצה רגילה.
פתיחה רחבה מדי בירידה: מעמיסה על הכתף.
הקשת המשקולות זו בזו למעלה.', synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = '4715e7f2-3df0-4260-a525-6a72b1766c22';
update public.exercises set common_mistake = 'עיגול הגב בהושטה: מוריד מהסיבוב בגב העליון.
הרמת העקבים: פוגעת ביציבות הסקוואט.
הושטה חטופה: לאט ובשליטה.', synergists = array['obliques', 'adductors']::text[], secondary_muscles = 'obliques,adductors' where id = 'e7f981c7-8cbd-43dd-8f27-7d6be1ee76e2';
update public.exercises set synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = '54aa7692-6a65-4560-b2f8-7dcab43fa2a6';
update public.exercises set description = 'מקבילים באחיזה רחבה עם הטיה קדימה: מדגישים את החזה.', patient_cues = 'הטיה: הגו נוטה מעט קדימה לאורך כל התנועה.
מרפקים: נפתחים מעט לצדדים בירידה, לא יותר מ-45 מעלות.
טווח: רדו עד שהזרוע מקבילה לרצפה, לא עמוק יותר.', common_mistake = 'ירידה עמוקה מדי: מעמיסה על קדמת הכתף.
הרמת הכתפיים לאוזניים.
מרפקים פתוחים לגמרי לצדדים: מערערים את הכתף.', synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = '6f8195a1-7d5c-41ec-b022-dcab80714dc4';
update public.exercises set description = 'מקבילים עם גו זקוף, במכשיר עם סיוע או בלעדיו: מדגישים את הטרייספס.', patient_cues = 'גו: זקוף ככל האפשר.
מרפקים: צמודים לגוף לאורך כל התנועה.
טווח: רדו עד שהזרוע מקבילה לרצפה, לא עמוק יותר.
סיוע: במכשיר הגרביטון, יותר משקל = יותר עזרה.', common_mistake = 'ירידה עמוקה מדי: מעמיסה על קדמת הכתף.
מרפקים נפתחים לצדדים: מעבירים את העבודה לחזה.
הרמת הכתפיים לאוזניים.', synergists = array['chest', 'front-deltoids']::text[], secondary_muscles = 'chest,front-deltoids' where id = 'bda0b24a-c650-4c10-bcfc-11fc84866e30';
update public.exercises set synergists = array['hamstring']::text[], secondary_muscles = 'hamstring' where id = '85a25d67-e95e-4346-bbe4-437b56c938ee';
update public.exercises set target_muscle = 'front-deltoids', prime_movers = array['front-deltoids']::text[], synergists = array['triceps', 'abs', 'hamstring']::text[], secondary_muscles = 'triceps,abs,hamstring' where id = '1189413a-9f28-453a-8e06-884e26f8ed71';
update public.exercises set patient_cues = 'עמוד שדרה: ניטרלי לאורך כל התרגיל.
הרמה: יד ורגל נגדיות עד קו הגוף, לא גבוה יותר.
החזקה: 2–3 שניות בסוף התנועה.', common_mistake = 'הרמת הרגל גבוה מדי: מגדילה את הקימור בגב התחתון.
סיבוב האגן לצד הרגל המורמת.
תנועה מהירה בלי החזקה.', synergists = array['abs', 'obliques', 'gluteal']::text[], secondary_muscles = 'abs,obliques,gluteal' where id = 'e0e9d6c5-6a2b-4673-8163-ce648c7cddb0';
update public.exercises set description = 'לחיצת משקולות מהחזה עד יישור הידיים, בשכיבה על ספסל: מחזקת את החזה.', patient_cues = 'התחלה: משקולות מעל הכתפיים, ידיים ישרות.
הורדה: בקשת קלה לכיוון אמצע החזה.
תחתית: המשקולות לצד החזה, האמות אנכיות, המרפקים מעט מתחת לקו הכתפיים.', common_mistake = 'פתיחה רחבה מדי בירידה: מעמיסה על הכתף.
טווח חלקי: עצירה כשהזרוע מקבילה לרצפה.
הקשת המשקולות זו בזו למעלה.', synergists = array['triceps', 'front-deltoids', 'serratus-anterior']::text[], secondary_muscles = 'triceps,front-deltoids,serratus-anterior' where id = 'a69cc9f4-81ce-4e9f-8978-dfb2266d4b21';
update public.exercises set patient_cues = 'תמיכה: יד ורגל נגדיות על הספסל, גב ניטרלי.
זרוע: צמודה לגוף ומקבילה לרצפה, לא זזה.
תנועה: יישרו את המרפק עד הסוף לאחור, ורדו בשליטה.', common_mistake = 'תנועה בכתף: הזרוע מתנדנדת במקום שרק האמה תזוז.
עיגול הגב.' where id = '34bd26fb-b4cc-4476-bbf9-9a6a42345990';
update public.exercises set description = 'הרמת משקולות לצדדים עד גובה הכתף: מחזקת את הכתף האמצעית.', patient_cues = 'עמידה: בפיסוק קל, גו יציב.
מרפקים: בכיפוף קל וקבוע.
גובה: עד גובה הכתפיים.
מרפקים מובילים: המרפקים עולים לפני כפות הידיים.', common_mistake = 'תנופה מהגב: מורידה את העבודה מהכתף.
כיפוף מרפקים גדול כדי להקל.
הרמת הכתפיים לאוזניים: מעבירה את העבודה לטרפז.', synergists = array['front-deltoids', 'back-deltoids', 'trapezius', 'serratus-anterior']::text[], secondary_muscles = 'front-deltoids,back-deltoids,trapezius,serratus-anterior' where id = '4ed0c8d3-e64c-4811-9cf5-4c5f7e1086e4';
update public.exercises set patient_cues = 'אחיזה: משקולת אחת בשתי הידיים, אגודלים סביב הידית.
התחלה: ידיים ישרות מעל החזה.
ירידה: לאט מעבר לראש, ידיים כמעט ישרות, עד מתיחה נוחה.
רגליים: על הרצפה או על הספסל.', common_mistake = 'כיפוף מרפקים: הופך את התרגיל לפשיטת טרייספס.
ירידה מעבר לטווח הנוח: מעמיסה על הכתף.
העברת המשקולת עד הבטן בעלייה: מאבדת את המתח.' where id = '2a9d4d69-541e-49e6-9fe3-ac3ae74c2da2';
update public.exercises set description = 'כפיפת הגו הצידה וחזרה לעמידה, עם משקולת ביד אחת: מחזקת את השרירים האלכסוניים ואת צד הגב התחתון.', patient_cues = 'משקולת: ביד אחת בלבד.
תנועה: התכופפו לצד המשקולת, וחזרו לעמידה בעזרת הצד הנגדי.
גו: בלי להתכופף קדימה או אחורה.', common_mistake = 'משקולת בכל יד: המשקלות מאזנים זה את זה ומבטלים את ההתנגדות.
הטיה קדימה או אחורה במקום הצידה.
תנועה מהירה ומטולטלת.', target_muscle = 'obliques', prime_movers = array['obliques']::text[], synergists = array['erector-spinae']::text[], secondary_muscles = 'erector-spinae' where id = '753abf8a-7a90-488d-8eea-af48755276a6';
update public.exercises set description = 'חתירה במוט או במשקולות מתוך רכינה: מחזקת את הגב הרחב והגב האמצעי.', patient_cues = 'רכינה: ברכיים מעט כפופות, גו מוטה קדימה, גב ניטרלי.
אחיזה: מעט רחבה מרוחב הכתפיים.
משיכה: לכיוון החלק התחתון של הבטן, המרפקים צמודים לגוף.
שכמות: קרבו אותן בסוף המשיכה.', common_mistake = 'עיגול הגב: מעמיס על הגב התחתון.
הזדקפות הגו במהלך המשיכה כדי להיעזר בתנופה.
משיכה לחזה במקום לבטן.', prime_movers = array['lats', 'rhomboids']::text[], synergists = array['trapezius', 'back-deltoids', 'biceps']::text[], secondary_muscles = 'trapezius,back-deltoids,biceps' where id = '35e64f1f-4ad6-44c0-bd98-f5589017017e';
update public.exercises set description = 'לחיצת מוט מהחזה עד יישור הידיים, בשכיבה על ספסל ישר: מחזקת את החזה, הטרייספס והכתף הקדמית.', patient_cues = 'שכיבה: העיניים בערך מתחת למוט.
רגליים: על הרצפה בפיסוק רחב ליציבות.
אחיזה: מעט רחבה מרוחב הכתפיים, כך שהאמות אנכיות בתחתית. אגודל סוגר על המוט.
הורדה: לאמצע החזה, בערך בקו הפטמות.', common_mistake = 'שכיבה רחוקה מדי מהמוט: המוט פוגע בווים בהוצאה.
פרקי ידיים מתכופפים לאחור: מעמיסים על פרק כף היד.
מרפקים פתוחים לגמרי לצדדים: מעמיסים על הכתף.', synergists = array['triceps', 'front-deltoids', 'serratus-anterior']::text[], secondary_muscles = 'triceps,front-deltoids,serratus-anterior' where id = 'b6f61b1e-d35c-4d80-be13-7df426010dbb';
update public.exercises set description = 'פתיחת הידיים לצדדים וסגירה מעל החזה, בשכיבה על ספסל: מחזקת את החזה.', patient_cues = 'התחלה: משקולות מעל הכתפיים, מרפקים כמעט ישרים.
ירידה: בקשת רחבה, בכיפוף מרפק קל שנשאר קבוע, עד שהזרוע בערך מקבילה לרצפה.
סגירה: חבקו קשת רחבה חזרה מעל החזה.', common_mistake = 'כיפוף מרפק גדול: הופך את התרגיל ללחיצה.
ירידה עמוקה מדי: מעמיסה על קדמת הכתף.
המשקולות בורחות לכיוון הראש: מסובבות את הכתף.', synergists = array['front-deltoids', 'biceps', 'serratus-anterior']::text[], secondary_muscles = 'front-deltoids,biceps,serratus-anterior' where id = '02378447-586d-4ca3-81d8-48cbc0371840';
update public.exercises set target_muscle = 'rhomboids', prime_movers = array['rhomboids', 'trapezius']::text[], synergists = array['lats', 'back-deltoids', 'biceps', 'forearm-flexors']::text[], secondary_muscles = 'lats,back-deltoids,biceps,forearm-flexors' where id = '22aaa62f-04eb-47e2-94d3-a6192960f6db';
update public.exercises set target_muscle = 'tibialis-anterior', prime_movers = array['tibialis-anterior']::text[], synergists = array['calves', 'peroneus-longus']::text[], secondary_muscles = 'calves,peroneus-longus' where id = '40b9b221-37ac-4009-9fa8-06c58ecbe624';
update public.exercises set synergists = array['peroneus-longus']::text[], secondary_muscles = 'peroneus-longus' where id = '0f21f707-71be-4912-9cde-0c185309aa17';
update public.exercises set synergists = array['peroneus-longus', 'quadriceps']::text[], secondary_muscles = 'peroneus-longus,quadriceps' where id = 'aa05ba4a-31e6-4733-b04d-67613acfbefd';
update public.exercises set synergists = array['peroneus-longus']::text[], secondary_muscles = 'peroneus-longus' where id = 'e210a8a1-d013-4311-8398-455cf5d4e8a9';
update public.exercises set description = 'נדנוד קדימה ואחורה עם ברכיים פתוחות לצדדים: משפר ניידות בירכיים.' where id = '20a41617-f3c2-4632-987d-183e6ef22194';
update public.exercises set description = 'משיכת הגוף עד שהסנטר מעל המוט: מחזקת את הגב הרחב והביצפס. אחיזה רחבה מדגישה את הגב, אחיזה צרה והפוכה (סנטר) מדגישה את הביצפס.', patient_cues = 'התחלה: תלייה בידיים ישרות, שכמות מורדות.
משיכה: ישרה למעלה, עד שהסנטר מעל המוט.
ירידה: לאט, עד יישור מלא של הידיים.
גוף: יציב, רגליים צמודות.', common_mistake = 'תנופה ובעיטות ברגליים: מקלות על התנועה ומעמיסות על הכתפיים.
חצי טווח: עצירה לפני יישור הידיים.
הרמת הכתפיים לאוזניים בתחילת המשיכה.', synergists = array['biceps', 'brachialis', 'rhomboids', 'trapezius', 'back-deltoids', 'forearm-flexors']::text[], secondary_muscles = 'biceps,brachialis,rhomboids,trapezius,back-deltoids,forearm-flexors' where id = 'ae8ff1b2-5d26-4e9f-bbfd-566fcec67497';
update public.exercises set synergists = array['chest', 'biceps', 'erector-spinae']::text[], secondary_muscles = 'chest,biceps,erector-spinae' where id = '49e0d138-12c3-4ed2-b417-a01d8673b855';
update public.exercises set synergists = array['back-deltoids', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,triceps,abs' where id = '2abdd7c5-9058-4629-ab14-ba1e61e3e644';
update public.exercises set common_mistake = 'כיפוף המרפקים: מוריד את העבודה מהגב הרחב. ידיים ישרות.
כיפוף באגן: שמרו על גוף ישר ונוקשה.
שימוש בתנופה: מוריד את עבודת השרירים. לאט ובשליטה.', synergists = array['back-deltoids', 'trapezius', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,trapezius,triceps,abs' where id = '9c0ac016-08d7-4bfe-b05c-3da87d9adbe5';
update public.exercises set synergists = array['triceps', 'front-deltoids', 'serratus-anterior', 'abs', 'obliques']::text[], secondary_muscles = 'triceps,front-deltoids,serratus-anterior,abs,obliques' where id = '44c3c109-150a-40c8-8d0c-81a0787ed6c3';
update public.exercises set target_muscle = 'rhomboids', prime_movers = array['rhomboids', 'trapezius']::text[], synergists = array['lats', 'back-deltoids', 'biceps', 'forearm-flexors']::text[], secondary_muscles = 'lats,back-deltoids,biceps,forearm-flexors' where id = 'c995ca7f-eb76-4b90-87c2-aac7a3e197fa';
update public.exercises set synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = 'a9cc38c0-4e21-4078-8850-dc965cfb5ce0';
update public.exercises set target_muscle = 'rhomboids', prime_movers = array['rhomboids', 'trapezius']::text[], synergists = array['lats', 'back-deltoids', 'biceps', 'forearm-flexors']::text[], secondary_muscles = 'lats,back-deltoids,biceps,forearm-flexors' where id = '49883f36-d79c-46ac-a74c-d9e768967b06';
update public.exercises set target_muscle = 'rhomboids', prime_movers = array['rhomboids', 'trapezius']::text[], synergists = array['lats', 'back-deltoids', 'biceps', 'forearm-flexors']::text[], secondary_muscles = 'lats,back-deltoids,biceps,forearm-flexors' where id = 'f9500b0d-4c2e-4f1c-a6a8-8f90d4a47497';
update public.exercises set synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = '6633441c-4084-4d20-a464-6d6639098d69';
update public.exercises set synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = '60b5548c-f97e-4205-bab2-98d125101973';
update public.exercises set description = 'דחיפת האגן למעלה כשהגב העליון נשען על ספסל, עם מוט על האגן: מחזקת את הישבן.', patient_cues = 'ספסל: בגובה הברך בערך, קצה השכמות נשען עליו.
מוט: על קפל הירך, עם כרית מרופדת.
סיום: הירכיים והגו בקו אחד, מקבילים לרצפה, הברכיים ב-90 מעלות.
ראש: המבט קדימה ולמטה, הסנטר מקופל.
כיווץ: החזיקו שנייה למעלה עם ישבן מכווץ.', common_mistake = 'קימור הגב התחתון בסיום: מעביר את העבודה מהישבן לגב.
כפות רגליים רחוקות מדי: מעבירות את העבודה לירך האחורית.
דחיפה מהבהונות במקום מהעקבים.', synergists = array['hamstring', 'adductors']::text[], secondary_muscles = 'hamstring,adductors' where id = '1f21c4d9-e674-4a8f-9e67-069cef0546ea';
update public.exercises set description = 'לחיצת מוט בספסל בשיפוע חיובי (כ-30 מעלות): מדגישה את החלק העליון של החזה.', patient_cues = 'אחיזה: מעט רחבה מרוחב הכתפיים, אגודל סוגר על המוט.
הורדה: לחלק העליון של החזה, מעט מתחת לעצם הבריח.
מרפקים: מעט מתחת לקו הכתפיים בירידה.
פרקי ידיים: ישרים מעל המרפקים.', common_mistake = 'פרקי ידיים מתכופפים לאחור: מעמיסים על פרק כף היד.
שיפוע גבוה מדי: מעביר את העבודה לכתפיים.
קימור הגב התחתון והרמת האגן מהספסל.', synergists = array['triceps', 'front-deltoids', 'serratus-anterior']::text[], secondary_muscles = 'triceps,front-deltoids,serratus-anterior' where id = 'b5e9635c-2634-4af9-a3ba-e1a00c6f0c8f';
update public.exercises set description = 'כפיפת מרפקים בישיבה על ספסל משופע לאחור: הידיים מתחילות מאחורי קו הגוף, מה שמותח את הביצפס ומקשה את התחתית.', patient_cues = 'ספסל: בשיפוע של כ-45–60 מעלות, גב צמוד לספסל.
ידיים: תלויות ישר למטה, מאחורי קו הגוף.
תנועה: רק המרפק זז, הזרוע לא נעה קדימה.
ירידה: לאט, עד יישור מלא.', common_mistake = 'תנועה מהכתף: הזרוע נעה קדימה כדי לעזור.
ירידה חלקית: מבטלת את היתרון של התרגיל.
הרמת הראש והכתפיים מהספסל.' where id = '6a8151cc-6e08-4b2f-8f44-7eaa1a86c9d3';
update public.exercises set description = 'פתיחת הידיים לצדדים וסגירה מעל החזה, על ספסל בשיפוע חיובי (כ-30 מעלות): מדגישה את החלק העליון של החזה.', patient_cues = 'התחלה: משקולות מעל הכתפיים, מרפקים כמעט ישרים.
ירידה: בקשת רחבה, בכיפוף מרפק קל שנשאר קבוע, עד שהזרוע בערך מקבילה לרצפה.
סגירה: חבקו קשת רחבה חזרה.', common_mistake = 'שיפוע גבוה מדי (45 מעלות ומעלה): מעביר את העבודה לכתפיים.
כיפוף מרפק גדול: הופך את התרגיל ללחיצה.
המשקולות בורחות לכיוון הראש.', synergists = array['front-deltoids', 'biceps', 'serratus-anterior']::text[], secondary_muscles = 'front-deltoids,biceps,serratus-anterior' where id = 'a3eaec53-af6f-481d-829f-f09147430e43';
update public.exercises set patient_cues = 'ספסל: בשיפוע של כ-30 מעלות.
התחלה: משקולות מעל הכתפיים, ידיים ישרות.
הורדה: בקשת קלה לחלק העליון של החזה, האמות אנכיות בתחתית.', common_mistake = 'שיפוע גבוה מדי (45 מעלות ומעלה): מעביר את העבודה לכתפיים.
פתיחה רחבה מדי בירידה: מעמיסה על הכתף.
הקשת המשקולות זו בזו למעלה.', synergists = array['triceps', 'front-deltoids', 'serratus-anterior']::text[], secondary_muscles = 'triceps,front-deltoids,serratus-anterior' where id = '893cfb78-e8e4-4479-ad0f-4444863e472e';
update public.exercises set description = 'הרמת משקולות קדימה עד גובה הכתפיים, בישיבה על ספסל משופע: מחזקת את הכתף הקדמית.', patient_cues = 'ספסל: בשיפוע של כ-45 מעלות, גב צמוד.
אחיזה: אגודלים כלפי מעלה, כך שהעבודה מתרכזת בכתף הקדמית.
תנועה: הרימו קדימה עד גובה הכתפיים, מרפקים כמעט ישרים.
ירידה: לאט ובשליטה.', common_mistake = 'תנופה מהגו.
הרמה מעל גובה הכתפיים: מעבירה את העבודה לטרפז.
הרמת הכתפיים לאוזניים.' where id = '7ba916e3-964a-479e-a2bc-56ec6f21754c';
update public.exercises set prime_movers = array['quadriceps', 'gluteal']::text[], synergists = array['adductors', 'hamstring', 'abs']::text[], secondary_muscles = 'adductors,hamstring,abs' where id = '2bd6e216-e97c-484d-8b5c-b5f5eb07c085';
update public.exercises set description = 'כפיפת הגו כלפי מטה מול כבל מהפולי העליון, בכריעה על הברכיים: מחזקת את שרירי הבטן.', patient_cues = 'תנוחה: כריעה על הברכיים מתחת לפולי, החבל ליד הראש.
תנועה: עגלו את הגב העליון והביאו את המרפקים לכיוון הירכיים.
אגן: נשאר במקום, התנועה רק בגב.', common_mistake = 'תנועה מהירכיים: הישיבה על העקבים מעבירה את העבודה מהבטן.
משיכה בידיים במקום בבטן.
משקל כבד מדי שמושך את הגוף למעלה.' where id = '931fea30-afc6-4f61-92e4-ab25a54e9e8f';
update public.exercises set description = 'פשיטת מרפקים בשכיבה עם משקולות יד: מחזקת את הטרייספס.', patient_cues = 'אחיזה: כפות הידיים פונות זו לזו.
זרועות: אנכיות לרצפה ולא זזות, רק המרפקים מתכופפים.
ירידה: המשקולות יורדות לצד הראש, עד גובה הכתפיים.', common_mistake = 'תנועה מהכתף: הזרועות נעות קדימה ואחורה.
מרפקים נפתחים לצדדים.', synergists = '{}'::text[], secondary_muscles = '' where id = '7c8a9213-5f24-4ca7-979c-689943635e24';
update public.exercises set description = 'פשיטת מרפקים בשכיבה עם מוט, כשהמוט יורד לכיוון המצח: מחזקת את הטרייספס.', patient_cues = 'אחיזה: ברוחב הכתפיים.
זרועות: אנכיות לרצפה ולא זזות, רק המרפקים מתכופפים.
ירידה: המוט יורד לחלק העליון של המצח, לאט ובשליטה.', common_mistake = 'תנועה מהכתף: הזרועות נעות קדימה ואחורה.
מרפקים נפתחים לצדדים.
ירידה מהירה: עלולה לפגוע בראש.', synergists = '{}'::text[], secondary_muscles = '' where id = '93bb56bb-1a05-4fd0-8188-8b942704879f';
update public.exercises set synergists = array['trapezius', 'rhomboids']::text[], secondary_muscles = 'trapezius,rhomboids' where id = '383fab31-7d19-4d50-a11e-15ad383046f2';
update public.exercises set target_muscle = 'rhomboids', prime_movers = array['rhomboids', 'trapezius']::text[], synergists = array['lats', 'back-deltoids', 'biceps', 'forearm-flexors']::text[], secondary_muscles = 'lats,back-deltoids,biceps,forearm-flexors' where id = '80178e45-dc27-43c6-97f6-29dc714b81ae';
update public.exercises set synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = '43a68a51-e7e5-4abf-bfb0-05d98f49c288';
update public.exercises set target_muscle = 'rhomboids', prime_movers = array['rhomboids', 'trapezius']::text[], synergists = array['lats', 'back-deltoids', 'biceps', 'forearm-flexors']::text[], secondary_muscles = 'lats,back-deltoids,biceps,forearm-flexors' where id = 'a65a3975-4a98-49d3-940f-a293f94dac88';
update public.exercises set target_muscle = 'rhomboids', prime_movers = array['rhomboids', 'trapezius']::text[], synergists = array['lats', 'back-deltoids', 'biceps', 'forearm-flexors']::text[], secondary_muscles = 'lats,back-deltoids,biceps,forearm-flexors' where id = '77847f33-1cf9-41e8-9bb9-969a3efd53f4';
update public.exercises set synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = 'f639fd08-efe9-4e8b-a4ce-4139dacf4601';
update public.exercises set name_he = 'מעבר ממכרע לפיסטול בכריעה', synergists = array['quadriceps', 'gluteal']::text[], secondary_muscles = 'quadriceps,gluteal' where id = '11395b61-be64-4406-b0fc-b81a29b17417';
update public.exercises set description = 'חתירה עם משקולות יד בשכיבה על הבטן על ספסל משופע: מחזקת את הגב בלי עומס על הגב התחתון.', patient_cues = 'ספסל: בשיפוע של כ-30 מעלות, החזה כולו נתמך.
ראש: מחוץ לספסל, בהמשך לעמוד השדרה.
משיכה: המרפקים צמודים לגוף, ובסוף האמה אנכית לרצפה.
שכמות: קרבו אותן בסוף המשיכה.', common_mistake = 'שיפוע גבוה מדי: מקטין את טווח התנועה.
משיכה רחוקה מהגוף.
משיכה בעיקר מהמרפק בלי קירוב שכמות.', synergists = array['rhomboids', 'trapezius', 'back-deltoids', 'biceps']::text[], secondary_muscles = 'rhomboids,trapezius,back-deltoids,biceps' where id = 'c6cb1278-b7de-4c51-b318-bcc13a5c6c13';
update public.exercises set description = 'חתירה רחבה בשכיבה על ספסל משופע, כשהמרפקים פתוחים בקו הכתפיים: מחזקת את הכתף האחורית ואת הגב העליון.', patient_cues = 'ספסל: בשיפוע של כ-30 מעלות, המבט למטה.
מרפקים: פתוחים לצדדים בגובה הכתפיים.
סיום: האמה אנכית לרצפה.
במוט: אחיזה רחבה מרוחב הכתפיים.', common_mistake = 'משיכת המרפקים לכיוון המותניים: מעבירה את העבודה לגב הרחב.
הרמת החזה מהספסל.', synergists = array['rhomboids', 'trapezius', 'biceps']::text[], secondary_muscles = 'rhomboids,trapezius,biceps' where id = '83501093-d91e-4eb8-84c3-3c776764faa5';
update public.exercises set description = 'כפיפת הברכיים כנגד התנגדות במכונה, בשכיבה או בישיבה: מחזקת את הירך האחורית.', patient_cues = 'כרית: ממוקמת מעט מעל העקבים, מתחת לשריר השוק.
ציר: הברך מיושרת עם ציר הסיבוב של המכונה.
חזרה: לאט ובשליטה, בלי לתת למשקל ליפול.', common_mistake = 'הרמת האגן או קימור הגב (בשכיבה).
תנופה כדי להרים את המשקל.
טווח חלקי.' where id = '19c10057-a68e-46c7-b41a-38cdb432db37';
update public.exercises set patient_cues = 'מושב: כך שהברכיים ב-90 מעלות בתחילת התנועה.
כפות רגליים: ברוחב האגן באמצע המשטח.
ירידה: מבוקרת, הגב התחתון נשאר צמוד למושב.', common_mistake = 'נעילת ברכיים חדה בסיום: מעמיסה על הברך.
ירידה עמוקה מדי: האגן מתרומם והגב התחתון מתעגל.', prime_movers = array['quadriceps', 'gluteal']::text[], synergists = array['hamstring', 'adductors']::text[], secondary_muscles = 'hamstring,adductors' where id = 'f5c5fd33-e0ec-4bd2-bb7c-1468561494cb';
update public.exercises set patient_cues = 'במכונה: ישיבה בגו זקוף, הכריות על החלק החיצוני של הירכיים.
בפולי: הרגל העובדת מתחילה מוצלבת מעט לפני הרגל העומדת, להגדלת הטווח.
תנועה: לאט ובשליטה בשני הכיוונים.', common_mistake = 'בפולי: הטיית הגו לצד במקום הרחקה מהירך.
תנופה במקום תנועה מבוקרת.', target_muscle = 'glute-medius', prime_movers = array['glute-medius']::text[], synergists = array['gluteal']::text[], secondary_muscles = 'gluteal' where id = '2b2fdd09-17d3-41d3-af0a-8bdc781a511c';
update public.exercises set patient_cues = 'במכונה: פתחו את זרועות המכשיר רק עד מתיחה קלה במפשעה.
בפולי: הרגל העובדת חוצה לפני הרגל העומדת.
תנועה: לאט ובשליטה בשני הכיוונים.', common_mistake = 'בפולי: הטיית הגו לצד.
פתיחה רחבה מדי במכונה: מותחת יתר את המפשעה.' where id = '065d6919-7222-42b6-954d-92654ad3ed88';
update public.exercises set description = 'רכינה מטה בגו ישר וחזרה עד קו הגוף, בכסא רומי: מחזקת את זוקפי הגב, הישבן והירך האחורית.', patient_cues = 'כרית: מתחת לעצם האגן הקדמית, כך שהתנועה מגיעה מהירכיים.
רגליים: ישרות.
גב: ישר לאורך כל התנועה.
סיום: עד שהגוף בקו ישר, לא מעבר.', common_mistake = 'עלייה מעבר לקו הגוף: קימור יתר שמעמיס על הגב התחתון.
תנופה.', target_muscle = 'erector-spinae', prime_movers = array['erector-spinae', 'gluteal']::text[], synergists = array['hamstring']::text[], secondary_muscles = 'hamstring' where id = '3c4fefec-6114-4201-a227-e545143a810f';
update public.exercises set patient_cues = 'מושב: בגובה שבו הידיות מול אמצע החזה.
אחיזה: בידיות האופקיות.
התחלה: אפשר להיעזר בדוושת הרגל כדי להביא את הידיות לנקודת ההתחלה.', common_mistake = 'אחיזה בידיות האנכיות.
מושב גבוה או נמוך מדי: משנה את זווית הלחיצה ומעמיס על הכתף.', synergists = array['triceps', 'front-deltoids', 'serratus-anterior']::text[], secondary_muscles = 'triceps,front-deltoids,serratus-anterior' where id = 'ab93fc0f-59fc-4812-9c6b-f09379e80fa0';
update public.exercises set patient_cues = 'כרית תחתונה: מעל הקרסוליים.
תנועה: כפפו את הגו קדימה בעיגול הגב העליון.
ראש: בהמשך לעמוד השדרה, בלי למשוך אותו קדימה.', common_mistake = 'משיכה בידיים במקום כפיפה מהבטן.
תנופה.
משקל כבד מדי שמעביר את התנועה לירכיים.' where id = '805ffa28-4c12-4404-ba96-a80c0f6f63d7';
update public.exercises set patient_cues = 'מושב: בגובה שבו הידיות בגובה הכתפיים.
אחיזה: בידיות האופקיות.
מרפקים: מצביעים מעט קדימה, לא לאחור.', common_mistake = 'מרפקים לאחור: מעמיסים על הכתף.
קימור הגב והרמתו מהמושב.
נעילת מרפקים חדה למעלה.', target_muscle = 'front-deltoids', prime_movers = array['front-deltoids', 'triceps']::text[], synergists = array['side-deltoids', 'trapezius', 'serratus-anterior']::text[], secondary_muscles = 'side-deltoids,trapezius,serratus-anterior' where id = '94f2adc9-0143-41e4-86e7-26f83eb432c2';
update public.exercises set description = 'חתירה עם משקולת ביד אחת, כשהיד והברך הנגדיות נשענות על ספסל: מחזקת את הגב הרחב והגב האמצעי.', patient_cues = 'תמיכה: היד והברך של הצד הנגדי על הספסל.
גב: ניטרלי, מקביל לרצפה.
משיכה: למעלה ואחורה, לכיוון המותן, המרפק צמוד לגוף.
סיום: האמה אנכית לרצפה.', common_mistake = 'התחלה כשהיד לפני הכתף.
משיכה רחוקה מהגוף.
סיבוב הגו כדי להרים את המשקולת.
הרגל של צד היד העובדת על הספסל: צריכה להיות הרגל הנגדית.', synergists = array['rhomboids', 'trapezius', 'back-deltoids', 'biceps']::text[], secondary_muscles = 'rhomboids,trapezius,back-deltoids,biceps' where id = 'c7963cf7-ce32-49e4-bdf6-d17303612dba';
update public.exercises set synergists = array['triceps', 'front-deltoids', 'obliques']::text[], secondary_muscles = 'triceps,front-deltoids,obliques' where id = '6dbf2997-7ee2-4aaf-baba-451d2423b386';
update public.exercises set target_muscle = 'trapezius', prime_movers = array['trapezius', 'lats']::text[], synergists = array['rhomboids', 'forearm-flexors']::text[], secondary_muscles = 'rhomboids,forearm-flexors' where id = '7e332b8b-3e1a-4377-b517-e7920f508c3a';
update public.exercises set synergists = array['chest', 'biceps', 'erector-spinae']::text[], secondary_muscles = 'chest,biceps,erector-spinae' where id = '46dcc0ed-7177-4d70-a671-b876bba16da7';
update public.exercises set synergists = array['back-deltoids', 'trapezius', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,trapezius,triceps,abs' where id = 'f04b9333-b2bc-4ca2-acbe-50f2acaa2ed0';
update public.exercises set target_muscle = 'front-deltoids', prime_movers = array['front-deltoids', 'trapezius']::text[], synergists = array['side-deltoids', 'triceps', 'serratus-anterior', 'abs']::text[], secondary_muscles = 'side-deltoids,triceps,serratus-anterior,abs' where id = 'cc292115-4118-4b42-b8aa-fd0e7f722d68';
update public.exercises set synergists = array['quadriceps', 'gluteal', 'front-deltoids']::text[], secondary_muscles = 'quadriceps,gluteal,front-deltoids' where id = '713f85e7-37c9-464b-a4c1-6d6a50d7fc86';
update public.exercises set description = 'לחיצת כבל מהצד קדימה מהחזה והחזקה, בלי לתת לגו להסתובב: מחזקת את הבטן ואת היכולת להתנגד לסיבוב.', patient_cues = 'עמידה: הצד לפולי, ברכיים מעט כפופות, רגליים ברוחב הכתפיים.
לחיצה: מהחזה ישר קדימה, והחזקה של כמה שניות.
גו: לא מסתובב לכיוון הפולי, האגן ישר.', common_mistake = 'סיבוב הגו לכיוון הכבל.
עמידה קרובה מדי לפולי: אין מספיק התנגדות.
עצירת הנשימה בזמן ההחזקה.', synergists = array['abs', 'transverse-abdominis']::text[], secondary_muscles = 'abs,transverse-abdominis' where id = '0eb475cc-5123-46fb-a00c-299ac61f3657';
update public.exercises set prime_movers = array['forearm-flexors']::text[], synergists = array['lats']::text[], secondary_muscles = 'lats' where id = '27d5fae7-bb30-4748-906d-bf5c0b9c1a69';
update public.exercises set description = 'סגירת הידיות קדימה מול החזה במכונת פרפר, בלי תנועה במרפק: מחזקת את החזה.', patient_cues = 'מושב: בגובה שבו הידיות בגובה הכתפיים או מעט מתחת.
מרפקים: בכיפוף קל וקבוע.
תנועה: סגרו עד מול החזה ופתחו לאט עד מתיחה נוחה.', common_mistake = 'מושב לא בגובה הנכון: מעמיס על הכתף.
פתיחה רחבה מדי לאחור: מעמיסה על קדמת הכתף.
תנופה.', synergists = array['front-deltoids', 'serratus-anterior']::text[], secondary_muscles = 'front-deltoids,serratus-anterior' where id = '293d2b5f-bc13-40b5-9b6e-cb55626e4504';
update public.exercises set synergists = array['side-deltoids', 'triceps', 'erector-spinae', 'back-deltoids']::text[], secondary_muscles = 'side-deltoids,triceps,erector-spinae,back-deltoids' where id = 'c5264ebd-1010-4747-b3f7-94a74987b12f';
update public.exercises set name_he = 'פלאנק (החזקת בטן סטטית)', description = 'החזקה סטטית על האמות ועל קצות האצבעות, הגוף בקו ישר: מחזקת את שרירי הבטן והליבה.', patient_cues = 'מרפקים: מתחת לכתפיים.
כתפיים: דחפו את הרצפה ממכם, השכמות מתרחקות זו מזו.
רגליים: ירכיים מכווצות.
אגן: מגולגל מעט לאחור, הגוף בקו ישר מהראש לעקבים.', common_mistake = 'קריסת האגן למטה: מגדילה את הקימור ומעמיסה על הגב התחתון.
הרמת האגן גבוה מדי: מורידה את העבודה מהבטן.
עצירת הנשימה.', prime_movers = array['abs', 'transverse-abdominis']::text[], synergists = array['obliques', 'front-deltoids', 'quadriceps']::text[], secondary_muscles = 'obliques,front-deltoids,quadriceps' where id = 'f291ac49-a62a-4bd9-baa1-49761ef7906e';
update public.exercises set synergists = array['biceps', 'brachialis', 'rhomboids', 'trapezius', 'back-deltoids', 'forearm-flexors']::text[], secondary_muscles = 'biceps,brachialis,rhomboids,trapezius,back-deltoids,forearm-flexors' where id = 'b0b8c690-3d9c-4b91-bf19-0ce684d61da7';
update public.exercises set synergists = array['triceps', 'front-deltoids']::text[], secondary_muscles = 'triceps,front-deltoids' where id = 'b5927951-d721-4d3d-a0cf-e8a73c88dcfd';
update public.exercises set prime_movers = array['forearm-flexors', 'forearm-extensors']::text[] where id = 'b82e1c1b-26b4-463b-b09b-0b92bbbac078';
update public.exercises set description = 'פתיחת הידיים לצדדים בקו הכתפיים, בשכיבה על הבטן על ספסל משופע: מחזקת את הכתף האחורית.', patient_cues = 'ספסל: בשיפוע של עד 30 מעלות, החזה כולו נתמך.
ראש: המבט למטה.
אחיזה: אגודלים מעט כלפי מטה, כך שהעבודה מתרכזת בכתף האחורית.
מרפקים: כמעט ישרים.', common_mistake = 'כיפוף מרפקים גדול: הופך את התרגיל לחתירה.
משיכת הידיים לאחור לכיוון המותניים: מעבירה את העבודה לגב.
הרמת החזה מהספסל.', synergists = array['rhomboids', 'trapezius']::text[], secondary_muscles = 'rhomboids,trapezius' where id = 'cb8dfbb3-4f3c-4c21-a6ac-34c6fe6de5a1';
update public.exercises set description = 'הבאת הברכיים לחזה מתוך שכיבה על הגב, בגלגול האגן: מחזקת את החלק התחתון של שרירי הבטן.', patient_cues = 'ידיים: על הרצפה לצד הגוף.
רגליים: ברכיים כפופות ב-90 מעלות.
תנועה: גלגלו את האגן כך שהישבן מתרומם מהרצפה, וחזרו לאט.', common_mistake = 'תנופה מהרגליים במקום גלגול מהבטן.
דחיפה חזקה מהידיים.
הנחת הרגליים על הרצפה בין החזרות.' where id = 'b9fb2fbf-eb19-4c6a-bf1c-2a4f408b6eee';
update public.exercises set synergists = array['trapezius', 'rhomboids']::text[], secondary_muscles = 'trapezius,rhomboids' where id = '463b4cd5-abb6-44a7-8214-a5d565aa0952';
update public.exercises set synergists = array['triceps', 'gluteal']::text[], secondary_muscles = 'triceps,gluteal' where id = 'c90b8a4e-a748-46d9-a308-b958c60da8f8';
update public.exercises set target_muscle = 'back-deltoids', prime_movers = array['back-deltoids', 'triceps']::text[], synergists = array['gluteal', 'abs']::text[], secondary_muscles = 'gluteal,abs' where id = '13d63fc4-ac30-4229-a0bb-060fc4139eb9';
update public.exercises set description = 'כפיפה מהירכיים עם מוט, הגב ישר והברכיים כמעט ישרות, עד שהמוט מעט מתחת לברך: מחזקת את הירך האחורית והישבן.', patient_cues = 'ברכיים: כפופות מעט ונשארות כך לאורך כל התנועה.
תנועה: האגן נדחף אחורה, הגו קשיח והמוט מחליק על הרגליים.
ראש: בהמשך לעמוד השדרה.
חזרה: דחיפת האגן קדימה עם כיווץ ישבן.', common_mistake = 'עיגול הגב התחתון.
כפיפת ברכיים עמוקה שהופכת את התנועה לסקוואט.
הרחקת המוט מהרגליים.
ירידה מעבר לטווח שבו הגב נשאר ישר.', prime_movers = array['hamstring', 'gluteal']::text[], synergists = array['erector-spinae', 'forearm-flexors']::text[], secondary_muscles = 'erector-spinae,forearm-flexors' where id = '7230ecc7-22d9-4ff8-8c3e-69a83ef2826b';
update public.exercises set target_muscle = 'trapezius', prime_movers = array['trapezius', 'lats']::text[], synergists = array['rhomboids', 'forearm-flexors']::text[], secondary_muscles = 'rhomboids,forearm-flexors' where id = '858f5a8d-a5bc-4700-b141-e9d6c93a00a5';
update public.exercises set description = 'עלייה על כריות כפות הרגליים בישיבה, כשהברכיים כפופות: מחזקת את הסוליאוס, השריר העמוק בשוק.', patient_cues = 'כפות רגליים: רק הכריות על משטח הדריכה, העקבים באוויר.
כרית: על הירכיים, מעל הברכיים.
תנועה: עלו גבוה ככל האפשר, החזיקו שנייה, ורדו לאט עד מתיחה.', common_mistake = 'קפיצות במקום תנועה מבוקרת.
טווח חלקי: לא יורדים עד המתיחה.
קריסת הקרסול החוצה או פנימה.' where id = '1d4399bc-1eb0-458f-b906-9666df860652';
update public.exercises set description = 'לחיצת משקולות מגובה הכתפיים עד יישור הידיים, בישיבה: מחזקת את הכתפיים ואת הטרייספס.', patient_cues = 'מושב: עם משענת גבוהה, מוטה מעט לאחור.
התחלה: משקולות קרוב לגוף בגובה הכתפיים, האמות אנכיות.
סיום: יישור מעל הכתפיים, וירידה איטית.', common_mistake = 'פתיחה רחבה מדי בירידה: מעמיסה על הכתף.
טווח חלקי: עצירה כשהזרוע מקבילה לרצפה.
הקשת המשקולות זו בזו למעלה.', target_muscle = 'front-deltoids', prime_movers = array['front-deltoids', 'triceps']::text[], synergists = array['side-deltoids', 'trapezius', 'serratus-anterior']::text[], secondary_muscles = 'side-deltoids,trapezius,serratus-anterior' where id = '1a0077c6-0a9e-4b51-94a2-bb1725e279ed';
update public.exercises set description = 'לחיצת משקולות מעל הראש כשכפות הידיים פונות זו לזו והאמות מקבילות: מדגישה את הכתף הקדמית.', patient_cues = 'מושב: עם משענת גבוהה.
אחיזה: כפות הידיים פונות זו לזו.
התחלה: המשקולות קרובות זו לזו, לפני הגוף.
תנועה: ישר למעלה, האמות מקבילות לאורך כל הלחיצה.', common_mistake = 'המשקולות בורחות לצדדים.
קימור הגב התחתון והרמתו מהמשענת.', synergists = array['triceps', 'chest', 'trapezius', 'serratus-anterior']::text[], secondary_muscles = 'triceps,chest,trapezius,serratus-anterior' where id = 'b06124c6-c2ac-4155-8821-44aacc1d8d57';
update public.exercises set description = 'יישור הברכיים כנגד התנגדות במכונה: מחזק את הירך הקדמית.', patient_cues = 'כרית: על הקרסוליים.
מושב: הברך מיושרת עם ציר הסיבוב של המכונה.
ישיבה: זקופה, הישבן בקצה האחורי של המושב.
ירידה: לאט ובשליטה.', common_mistake = 'נעילת ברכיים חדה למעלה.
תנופה כדי להרים את המשקל.
הרמת הישבן מהמושב.' where id = 'cfb51c45-70ff-44fc-a5d7-d65327637458';
update public.exercises set patient_cues = 'ישיבה: החזה צמוד לכרית.
אחיזה: בידיות האופקיות.
מרפקים: ישרים או כפופים מעט.
תנועה: פתחו לצדדים בקו הכתפיים, וחזרו לאט.', common_mistake = 'הרמת הכתפיים לאוזניים.
כיפוף מרפקים גדול: הופך את התרגיל לחתירה.
תנופה.', synergists = array['rhomboids', 'trapezius']::text[], secondary_muscles = 'rhomboids,trapezius' where id = 'b691bf0c-2c35-46b5-8922-b16c6440f03e';
update public.exercises set synergists = '{}'::text[], secondary_muscles = '' where id = 'b549b9e2-0ccb-493a-b984-16802141ee65';
update public.exercises set description = 'משיכת ידית הכבל לכיוון הבטן בישיבה: מחזקת את הגב הרחב והגב האמצעי.', patient_cues = 'ישיבה: ברכיים מעט כפופות, גב זקוף.
אחיזה: ברוחב הכתפיים.
משיכה: לכיוון החלק התחתון של הבטן, המרפקים צמודים לגוף.
שכמות: קרבו אותן בסוף המשיכה.', common_mistake = 'נדנוד הגו קדימה ואחורה כדי לעזור למשיכה.
עיגול הגב התחתון.
הרמת הכתפיים לאוזניים.', prime_movers = array['lats', 'rhomboids']::text[], synergists = array['rhomboids', 'trapezius', 'back-deltoids', 'biceps']::text[], secondary_muscles = 'rhomboids,trapezius,back-deltoids,biceps' where id = '847ff700-a71b-4e53-af63-d1ce8da768f9';
update public.exercises set patient_cues = 'כרית: על עצם החזה, החזה נתמך לגמרי.
מרחק: הידיות מעט מעבר להישג היד, לטווח מלא.
אחיזה: בידיות האנכיות.
משיכה: המרפקים צמודים לגוף.', common_mistake = 'מושב בגובה או במרחק לא נכון.
אחיזה בידיות האופקיות: מעבירה את העבודה לכתפיים.
הרמת החזה מהכרית.', prime_movers = array['lats', 'rhomboids']::text[], synergists = array['rhomboids', 'trapezius', 'back-deltoids', 'biceps']::text[], secondary_muscles = 'rhomboids,trapezius,back-deltoids,biceps' where id = 'e1e257d5-1837-471e-a2d2-31fb37f16676';
update public.exercises set patient_cues = 'ישיבה: ברכיים מעט כפופות, גב זקוף.
אחיזה: רחבה מרוחב הכתפיים.
משיכה: לגובה הכתפיים, המרפקים פתוחים בקו הכתפיים.', common_mistake = 'משיכה נמוכה לבטן: מעבירה את העבודה לגב הרחב.
נדנוד הגו לאחור.
הרמת הכתפיים לאוזניים.', synergists = array['rhomboids', 'trapezius', 'biceps']::text[], secondary_muscles = 'rhomboids,trapezius,biceps' where id = 'cf92972c-4f81-4565-aa78-c93a29a4306a';
update public.exercises set description = 'החזקה סטטית על צד הגוף, על אמה אחת ועל צד כף הרגל, הגוף בקו ישר: מחזקת את השרירים האלכסוניים ואת צד הירך.', patient_cues = 'מרפק: בדיוק מתחת לכתף.
כתף: דחפו את הרצפה, הכתף רחוקה מהאוזן.
אגן: מורם, הגוף בקו ישר מהראש לרגליים.', common_mistake = 'צניחת האגן לרצפה.
הטיית האגן קדימה או אחורה.
הרמת הכתף לאוזן.', synergists = array['abs', 'glute-medius']::text[], secondary_muscles = 'abs,glute-medius' where id = '4cf90c9c-4bf7-4cdb-8ad5-3f31762e52e9';
update public.exercises set target_muscle = 'lats', prime_movers = array['lats']::text[], synergists = array['biceps', 'brachialis', 'rhomboids', 'trapezius', 'back-deltoids', 'forearm-flexors']::text[], secondary_muscles = 'biceps,brachialis,rhomboids,trapezius,back-deltoids,forearm-flexors' where id = '8147dd0a-04df-4038-a863-65473089aa43';
update public.exercises set synergists = array['quadriceps', 'hamstring', 'glute-medius', 'calves']::text[], secondary_muscles = 'quadriceps,hamstring,glute-medius,calves' where id = '5a0ec89a-401c-4a1c-bc5f-1f95064de985';
update public.exercises set synergists = array['quadriceps', 'hamstring', 'glute-medius', 'calves']::text[], secondary_muscles = 'quadriceps,hamstring,glute-medius,calves' where id = '49b0ecf8-7c01-44e4-9a54-dd10f261ec7e';
update public.exercises set patient_cues = 'ספסל: ממוקם כך שהמוט יורד לאמצע החזה, בקו הפטמות.
רגליים: על הרצפה בפיסוק רחב.
אחיזה: מעט רחבה מרוחב הכתפיים.', common_mistake = 'ספסל רחוק או קרוב מדי למוט: המוט יורד לבטן או לצוואר.
מרפקים פתוחים לגמרי לצדדים.
קפיצת המוט מהחזה.', synergists = array['triceps', 'front-deltoids', 'serratus-anterior']::text[], secondary_muscles = 'triceps,front-deltoids,serratus-anterior' where id = '83ffb885-d92f-43b5-a7d5-af99ba1e676e';
update public.exercises set patient_cues = 'ספסל: בשיפוע שלילי של כ-15–30 מעלות, ממוקם כך שהמוט יורד לחלק התחתון של החזה.
אחיזה: אגודל סוגר על המוט, פרקי ידיים ישרים.', common_mistake = 'שיפוע קטן מדי: התרגיל הופך ללחיצה רגילה.
ספסל לא במקום ביחס למוט.', synergists = array['triceps', 'front-deltoids', 'serratus-anterior']::text[], secondary_muscles = 'triceps,front-deltoids,serratus-anterior' where id = 'cb8bc20b-8378-41c7-8281-2af584e706e3';
update public.exercises set patient_cues = 'ספסל: בשיפוע של כ-30 מעלות, ממוקם כך שהמוט יורד לחלק העליון של החזה, ליד עצם הבריח.
אחיזה: מעט רחבה מרוחב הכתפיים.
רגליים: על הרצפה בפיסוק רחב.', common_mistake = 'שיפוע גבוה מדי (45 מעלות ומעלה): מעביר את העבודה לכתפיים.
ספסל לא במקום ביחס למוט.', synergists = array['triceps', 'front-deltoids', 'serratus-anterior']::text[], secondary_muscles = 'triceps,front-deltoids,serratus-anterior' where id = 'd173a7af-0be1-4907-9779-3e480b126614';
update public.exercises set description = 'לחיצת מוט מעל הראש במכונת סמית'', בישיבה: מחזקת את הכתפיים ואת הטרייספס.', patient_cues = 'כיסא: ממוקם כך שהמוט יורד קרוב לפנים, עד גובה עצם הבריח.
מרפקים: מתחת למוט, לא בורחים לאחור.
אחיזה: מעט רחבה מרוחב הכתפיים.', common_mistake = 'כיסא רחוק מדי מהמוט: המוט יורד לחזה.
אחיזה רחבה מדי: מקטינה את טווח התנועה.
מרפקים בורחים לאחור: מעמיסים על הכתף.', target_muscle = 'front-deltoids', prime_movers = array['front-deltoids', 'triceps']::text[], synergists = array['side-deltoids', 'trapezius', 'serratus-anterior']::text[], secondary_muscles = 'side-deltoids,trapezius,serratus-anterior' where id = 'bc62f6d3-58a9-45bb-8ca9-24ec49af8c35';
update public.exercises set description = 'סקוואט במכונת סמית'', שבה המוט נע במסלול קבוע: מחזק את הירך הקדמית והישבן.', patient_cues = 'רגליים: צעד אחד לפני קו המוט, ברוחב הכתפיים.
מוט: על הטרפז העליון.
ירידה: אנכית, הגו ישר, המשקל על כל כף הרגל.
ברכיים: בקו האצבעות.', common_mistake = 'הישענות יתר אחורה על המוט.
הרמת העקבים.
קריסת הברכיים פנימה.', prime_movers = array['quadriceps', 'gluteal']::text[], synergists = array['hamstring', 'adductors']::text[], secondary_muscles = 'hamstring,adductors' where id = '2c5072e9-a390-40ee-ab97-a7356631a1d5';
update public.exercises set description = 'מכרע במקום במכונת סמית'': מחזק את הירך הקדמית והישבן, עם יציבות שהמכונה נותנת.', patient_cues = 'מוט: על הטרפז העליון.
עמידה: פסיעה ארוכה, הרגל הקדמית מעט לפני קו המוט.
תחתית: הברכיים בכ-90 מעלות.
גו: זקוף לאורך כל התנועה.', common_mistake = 'פסיעה קצרה מדי: הברך הקדמית יוצאת הרבה מעבר לאצבעות.
עמידה רחוקה מדי מאחורי המוט: הגוף נוטה קדימה.', prime_movers = array['quadriceps', 'gluteal']::text[], synergists = array['hamstring', 'adductors']::text[], secondary_muscles = 'hamstring,adductors' where id = '4908ac2e-6832-450d-8654-92dce75e3727';
update public.exercises set patient_cues = 'עמידה: קרוב למוט.
אחיזה: בערך ברוחב הכתפיים.
מרפקים: מובילים את התנועה ונשארים גבוהים מכפות הידיים.
גובה: עד גובה החזה. מעל גובה הכתפיים עלול לגרום לצביטה בכתף.', common_mistake = 'אחיזה צרה מאוד: מעמיסה על פרקי הידיים והכתף.
כפיפת מרפקים בלבד בלי הרמה מהכתף.' where id = 'b54c5ab6-1341-42bd-b6ca-b2eebff560bf';
update public.exercises set description = 'כפיפת מרפקים עם מוט בעמידה: מחזקת את הביצפס. באחיזה הפוכה (כפות ידיים למטה) העבודה עוברת יותר לאמות.', patient_cues = 'אחיזה: ברוחב הכתפיים.
מרפקים: צמודים לגוף ולא זזים קדימה.
תנועה: רק במרפק, כפיפה מלאה וירידה איטית עד יישור.', common_mistake = 'תנופה מהגב.
הזזת המרפקים קדימה כדי להרים.
ירידה חלקית.', synergists = array['brachialis', 'forearm-flexors']::text[], secondary_muscles = 'brachialis,forearm-flexors' where id = '11876174-bba6-49c3-941e-e742f141e5d9';
update public.exercises set description = 'הזזת הרגל לאחור כנגד כבל מהפולי התחתון, עד סוף הטווח: מחזקת את הישבן.', patient_cues = 'רצועה: סביב הקרסול.
עמידה: זקופה, או הטיה קלה קדימה להגדלת הטווח.
תנועה: הרגל זזה לאחור מהירך, בלי לקמר את הגב.
החזקה: אפשר לעצור שנייה בסוף התנועה.', common_mistake = 'קימור הגב התחתון כדי להגדיל את הטווח.
תנופה מהרגל.
סיבוב האגן לצד.' where id = 'be5b13ea-2223-42de-8f2e-f4f573ff37ce';
update public.exercises set description = 'כפיפת מרפקים עם משקולות יד בעמידה, יד אחר יד: מחזקת את הביצפס.', patient_cues = 'אחיזה: כפות ידיים כלפי מעלה מדגישות את הביצפס; כפות ידיים זו מול זו (פטיש) מדגישות את האמה.
גב: זקוף, בלי תנופה.
מרפקים: צמודים לגוף.
ירידה: לאט, עד יישור.', common_mistake = 'תנופה מהגב ומהכתף.
הזזת המרפקים קדימה.
ירידה מהירה.', synergists = array['brachialis', 'forearm-flexors']::text[], secondary_muscles = 'brachialis,forearm-flexors' where id = '948293f5-b8fe-4aa8-bf82-6d3156044f0a';
update public.exercises set patient_cues = 'ידיות: בגובה הכתפיים או מעט מתחת.
עמידה: צעד וחצי קדימה מהכבלים, רגל אחת לפני השנייה.
מרפקים: בכיפוף קל וקבוע.
תנועה: הידיים נפגשות מול אמצע החזה.', common_mistake = 'ידיות בגובה לא נכון.
כיפוף מרפקים גדול: הופך את התרגיל ללחיצה.', synergists = array['front-deltoids', 'biceps', 'serratus-anterior']::text[], secondary_muscles = 'front-deltoids,biceps,serratus-anterior' where id = 'bf686d8d-002c-407c-8562-6694c8c4f985';
update public.exercises set patient_cues = 'ידיות: למעלה.
עמידה: הטיה קלה קדימה, רגל אחת לפני השנייה.
מרפקים: בכיפוף קל וקבוע.
תנועה: מלמעלה למטה, עד גובה הטבור, כ-20–30 ס״מ לפני הגוף.', common_mistake = 'כיפוף מרפקים גדול: הופך את התרגיל ללחיצה.
תנופה מהגו.', synergists = array['front-deltoids', 'biceps', 'serratus-anterior']::text[], secondary_muscles = 'front-deltoids,biceps,serratus-anterior' where id = '7d85ffb9-eb22-46b6-b962-50d63b16a5dc';
update public.exercises set patient_cues = 'ידיות: למטה.
עמידה: צעד וחצי קדימה.
מרפקים: בכיפוף קל שלא משתנה במהלך התרגיל.
תנועה: מלמטה למעלה, עד גובה אמצע החזה.', common_mistake = 'כיפוף מרפקים גדול: הופך את התרגיל ללחיצה.
הרמה מעל גובה הכתפיים.', synergists = array['front-deltoids', 'biceps', 'serratus-anterior']::text[], secondary_muscles = 'front-deltoids,biceps,serratus-anterior' where id = '9faa060a-c614-476f-9496-127b4343db2c';
update public.exercises set patient_cues = 'עמידה: קרוב לפולי, להגדלת הטווח.
מרפקים: צמודים לגוף ולא זזים קדימה.
תנועה: כפיפה מלאה וירידה איטית עד יישור.', common_mistake = 'תנופה מהגו.
תנועה בכתף: המרפק נע קדימה.', synergists = array['brachialis', 'forearm-flexors']::text[], secondary_muscles = 'brachialis,forearm-flexors' where id = '00ca9da7-7bdc-4642-8783-6acfbd04367b';
update public.exercises set description = 'עלייה על ספסל או מדרגה בדחיפה מהרגל הקדמית: מחזקת את הירך הקדמית והישבן.', patient_cues = 'רגל על המדרגה: כולה על המשטח, הברך בכ-90 מעלות.
עלייה: דחיפה מעקב הרגל העליונה, גו ישר.
למתקדמים: בלי לדחוף מהרגל שעל הרצפה.
ירידה: לאט ובשליטה.', common_mistake = 'דחיפה מהרגל שעל הרצפה במקום מהרגל העליונה.
הטיית הגוף לאחור בירידה ותנופה קדימה בעלייה.
קריסת הברך העליונה פנימה.', prime_movers = array['quadriceps', 'gluteal']::text[], synergists = array['hamstring', 'glute-medius']::text[], secondary_muscles = 'hamstring,glute-medius' where id = '3052db43-08f3-453a-80ef-b27b46b78627';
update public.exercises set description = 'הרמת מוט מהרצפה בברכיים כמעט ישרות: מדגישה את הירך האחורית והישבן.', patient_cues = 'ברכיים: כפופות קלות בלבד, האגן גבוה.
גב: ישר וקשיח לאורך כל התנועה.
מוט: קרוב לרגליים.', common_mistake = 'עיגול הגב.
מוט רחוק מהרגליים.
ירידה מעבר לטווח שבו הגב נשאר ישר.', prime_movers = array['hamstring', 'gluteal']::text[], synergists = array['erector-spinae', 'forearm-flexors']::text[], secondary_muscles = 'erector-spinae,forearm-flexors' where id = '0b7437ed-1e6b-4ab4-9fe5-c88f3ec1689d';
update public.exercises set synergists = array['chest', 'biceps', 'erector-spinae']::text[], secondary_muscles = 'chest,biceps,erector-spinae' where id = '463f0762-e38f-44ce-b1a7-637063fcac84';
update public.exercises set synergists = array['back-deltoids', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,triceps,abs' where id = '9c4626d2-1a08-40e4-8df0-8234b7f4f6ea';
update public.exercises set synergists = array['back-deltoids', 'trapezius', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,trapezius,triceps,abs' where id = '9b15c5d7-bd24-4ce8-a4be-a425840e3d64';
update public.exercises set patient_cues = 'עמידה: צעד וחצי מהפולי, רגל אחת לפני השנייה.
גוף: הטיה קלה קדימה, גב ניטרלי, ראש בהמשך לעמוד השדרה.
תנועה: ידיים ישרות, משיכה מהכתף עד הירכיים.', common_mistake = 'כיפוף מרפקים: הופך את התרגיל לפשיטת טרייספס.
נדנוד הגו כדי לעזור.
הרמת הכתפיים לאוזניים.', synergists = array['back-deltoids', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,triceps,abs' where id = '6de605a9-0e9e-42de-b4a5-27c1487e5ecc';
update public.exercises set description = 'הרמת החזה והרגליים מהרצפה בשכיבה על הבטן: מחזקת את זוקפי הגב.', patient_cues = 'תנועה: הרימו את החזה והרגליים יחד.
החזקה: 2–3 שניות למעלה.
צוואר: המבט לרצפה, הצוואר בהמשך לגב.', common_mistake = 'הרמת הראש למעלה: מעמיסה על הצוואר.
תנופה.
הרמה גבוהה מדי: מעמיסה על הגב התחתון.', synergists = array['gluteal', 'hamstring']::text[], secondary_muscles = 'gluteal,hamstring' where id = 'f946d604-7b80-4d67-be4d-1247e1ed3390';
update public.exercises set description = 'ישיבת פרפר עם הרמה אקטיבית: מפעילה את כופפי הירך והמקרבים ומשפרת שליטה וכוח לאורך הטווח.', synergists = array['hip-flexors']::text[], secondary_muscles = 'hip-flexors' where id = '1ebc4f3a-68ac-4ea2-abb2-acd90f41a7e0';
update public.exercises set description = 'חתירה במכשיר T-Bar, עם כרית לחזה או בלעדיה: מחזקת את הגב הרחב והגב האמצעי.', patient_cues = 'אחיזה: בידיות האנכיות.
ברכיים: כפופות מעט.
גב: ניטרלי לאורך כל התנועה.
משיכה: המרפקים צמודים לגוף, ובסוף האמה והזרוע אנכיות לרצפה.', common_mistake = 'אחיזה בידיות האופקיות: מעבירה את העבודה לכתף האחורית.
עיגול הגב.
הזדקפות הגו כדי לעזור במשיכה.', prime_movers = array['lats', 'rhomboids']::text[], synergists = array['trapezius', 'back-deltoids', 'biceps']::text[], secondary_muscles = 'trapezius,back-deltoids,biceps' where id = '792c349a-9e58-483b-8b6f-629b175c23d7';
update public.exercises set patient_cues = 'עמידה: קרוב לפולי, לטווח מלא.
מרפקים: צמודים לגוף ולא זזים.
תנועה: יישרו את המרפקים עד הסוף, וחזרו לאט עד שהאמה מקבילה לרצפה.', common_mistake = 'הזזת המרפקים קדימה ואחורה.
הטיית הגוף מעל הידית כדי לדחוף עם משקל הגוף.
חזרה מהירה למעלה.', synergists = '{}'::text[], secondary_muscles = '' where id = '621df7ad-6db1-45e7-a89e-92d18035a661';
update public.exercises set synergists = array['chest', 'biceps', 'erector-spinae']::text[], secondary_muscles = 'chest,biceps,erector-spinae' where id = '0f054a1b-2620-48ac-9aeb-0ee206ea84c1';
update public.exercises set synergists = array['back-deltoids', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,triceps,abs' where id = '42953224-ae33-44b1-97b4-fd1c625f3825';
update public.exercises set synergists = array['back-deltoids', 'trapezius', 'triceps', 'abs']::text[], secondary_muscles = 'back-deltoids,trapezius,triceps,abs' where id = '4f0785c4-f474-45c0-ad6b-d526fde19ab4';
update public.exercises set patient_cues = 'ראש: נתמך בידיים בלי למשוך אותו.
צוואר: ניטרלי.
תנועה: מרפק אחד נע לכיוון הברך הנגדית, עד שהשכמות מתנתקות מהרצפה.', common_mistake = 'משיכת הצוואר בידיים.
תנופה.
סיבוב המרפק בלבד בלי סיבוב של הגו.' where id = '71317576-b9c2-4b5c-8546-31b37ba8b88b';
update public.exercises set prime_movers = array['rotator-cuff', 'back-deltoids']::text[], synergists = array['trapezius', 'rhomboids']::text[], secondary_muscles = 'trapezius,rhomboids' where id = '74f60113-dfbf-4526-84e0-1c9f309d9b7f';
update public.exercises set target_muscle = 'front-deltoids', prime_movers = array['front-deltoids', 'trapezius']::text[], synergists = array['side-deltoids', 'triceps', 'serratus-anterior', 'abs']::text[], secondary_muscles = 'side-deltoids,triceps,serratus-anterior,abs' where id = 'fb42d3b2-743a-473f-af24-116842c5ee51';
update public.exercises set prime_movers = array['forearm-flexors', 'forearm-extensors']::text[] where id = '1fe1ebe0-cd8f-4b2a-b6a3-4b710850c043';
update public.exercises set target_muscle = 'forearm-flexors', prime_movers = array['forearm-flexors', 'forearm-extensors']::text[] where id = '62d0c3dd-132e-419f-8782-46bc462839e1';
update public.exercises set name_he = 'פולי עליון באחיזה צרה', name_en = 'Close Grip Front Lat Pulldown', description = 'משיכת מוט הפולי העליון לחזה באחיזה צרה, בישיבה: מחזקת את הגב הרחב והביצפס.', patient_cues = 'ישיבה: זקופה, הטיה קלה לאחור, ברכיים מתחת לכרית.
אחיזה: ברוחב הכתפיים.
משיכה: המרפקים צמודים לגוף, המוט עד גובה עצם הבריח.
חזרה: לאט, עד יישור מלא של הידיים.', common_mistake = 'תנופה לאחור כדי למשוך.
משיכה מאחורי הראש.
הרמת הכתפיים לאוזניים.', synergists = array['biceps', 'brachialis', 'rhomboids', 'back-deltoids']::text[], secondary_muscles = 'biceps,brachialis,rhomboids,back-deltoids' where id = '0f5882dc-b284-4636-83ef-aa57fe01e4ea';
update public.exercises set name_he = 'מתח באחיזה הפוכה (סנטר)', name_en = 'Chin Up', description = 'מתח באחיזה הפוכה, כפות הידיים פונות אליך: מחזק את הגב הרחב ומדגיש את הביצפס.', patient_cues = 'אחיזה: הפוכה, ברוחב הכתפיים.
התחלה: תלייה בידיים ישרות, שכמות מורדות.
משיכה: ישרה למעלה עד שהסנטר מעל המוט.
ירידה: לאט, עד יישור מלא.', common_mistake = 'תנופה ובעיטות ברגליים.
חצי טווח: עצירה לפני יישור הידיים.
הרמת הכתפיים לאוזניים.', synergists = array['biceps', 'brachialis', 'rhomboids', 'back-deltoids', 'forearm-flexors']::text[], secondary_muscles = 'biceps,brachialis,rhomboids,back-deltoids,forearm-flexors' where id = '28e99cd1-e8a2-4464-b41d-afcf1fbec592';
update public.exercises set name_he = 'פולי עליון באחיזה רחבה', name_en = 'Wide Grip Lat Pulldown', description = 'משיכת מוט הפולי העליון לחזה באחיזה רחבה, בישיבה: מחזקת את הגב הרחב.', patient_cues = 'ישיבה: זקופה, הטיה קלה לאחור, ברכיים מתחת לכרית.
אחיזה: רחבה מרוחב הכתפיים.
משיכה: המוט לחלק העליון של החזה, המרפקים יורדים לצדדים ולמטה.
חזרה: לאט, עד יישור מלא.', common_mistake = 'תנופה לאחור או הישענות גדולה לאחור: הופכת את התרגיל לחתירה.
הורדת המוט לבטן.
משיכה מאחורי הראש.', synergists = array['biceps', 'brachialis', 'rhomboids', 'back-deltoids']::text[], secondary_muscles = 'biceps,brachialis,rhomboids,back-deltoids' where id = 'cebf0fce-1169-4ab2-b228-5e731df9aa2e';
