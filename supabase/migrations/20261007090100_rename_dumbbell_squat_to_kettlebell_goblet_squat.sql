-- Data change, approved 2026-10-07: the "Dumbbell Squat" record becomes
-- "Kettlebell Goblet Squat" in place (same id), so its existing references
-- keep working: 1 patient_exercises row, 2 workouts.items entries and 1
-- exercise_internal_notes row. There are no exercise URLs/slugs in the app,
-- so no alias is needed.
update public.exercises
set
  name_en = 'Kettlebell Goblet Squat',
  name_he = 'גובלט סקוואט עם קטלבל',
  equipment = array['kettlebell'],
  admin_tags = 'gym,kettlebell',
  description = 'ירידה לסקוואט תוך החזקת קטלבל צמוד למרכז החזה בשתי ידיים (אחיזה בידיות או בגוף המשקולת).',
  description_en = 'Squat down while holding a kettlebell close to the chest with both hands (by the horns or the bell).',
  patient_cues = E'עמידה ברוחב כתפיים, אצבעות מופנות מעט החוצה.\nהקטלבל צמוד לחזה ומרפקים פונים מטה.\nגב זקוף וחזה פתוח לאורך כל התנועה.\nירידה עמוקה עם המרפקים בין הברכיים, ודחיפה דרך כל כף הרגל.',
  cues_en = E'Feet shoulder-width, toes turned slightly out.\nKettlebell tight to the chest, elbows pointing down.\nTall back and open chest throughout.\nSit deep with elbows inside the knees, drive up through the whole foot.',
  common_mistake = E'הרחקת הקטלבל מהגוף.\nרכינת יתר של הגו לפנים.\nקריסת ברכיים פנימה או הרמת עקבים.',
  mistakes_en = E'Letting the kettlebell drift away from the body.\nLeaning the torso too far forward.\nKnees collapsing inward or heels lifting.'
where id = '2bd6e216-e97c-484d-8b5c-b5f5eb07c085'
  and name_en = 'Dumbbell Squat';  -- no-op if already renamed
