-- Data change (approved 2026-10-13): Single-Leg Calf Raise with a bent knee —
-- the soleus-biased sibling of the existing straight-knee Single-Leg Calf
-- Raise (with the knee bent the gastrocnemius is slack, so the soleus does
-- most of the work). Fields mirror that row's shape.
insert into public.exercises
  (name_en, name_he, name_display_preference, categories, admin_tags, equipment,
   target_muscle, secondary_muscles, prime_movers, synergists,
   description, description_en, patient_cues, cues_en, common_mistake, mistakes_en)
select 'Single-Leg Bent-Knee Calf Raise', 'עליית עקב על רגל אחת בברך כפופה', 'en', array['קליסטניקס'], 'calisthenics', array['bodyweight'],
  'soleus', 'calves,peroneus-longus', array['soleus'], array['calves', 'peroneus-longus'],
  'עמידה על רגל אחת על קצה מדרגה עם ברך כפופה מעט, עלייה על כרית כף הרגל וירידה איטית עד שהעקב מתחת לגובה המדרגה, בלי לשנות את זווית הברך.',
  'Stand on one foot on the edge of a step with the knee slightly bent, rise onto the ball of the foot, then lower slowly until the heel drops below the step, keeping the same knee bend throughout.',
  E'עמידה על רגל אחת, כרית כף הרגל על קצה המדרגה.\nכיפוף קל בברך (כ־20–30 מעלות) שנשמר לאורך כל התנועה.\nעלייה גבוהה על כרית כף הרגל, החזקה קצרה וירידה איטית.\nהקרסול יציב, המשקל על הבוהן הגדולה והשנייה.\nאפשר לגעת בקיר באצבעות לשיווי משקל.',
  E'Stand on one foot, ball of the foot on the step edge.\nA slight knee bend (about 20–30°) held the whole time.\nRise high onto the ball of the foot, pause, and lower slowly.\nKeep the ankle steady, weight over the big and second toes.\nTouch a wall with your fingertips for balance if needed.',
  E'יישור הברך בזמן העלייה (התרגיל הופך לעליית עקב רגילה).\nקריסת הקרסול החוצה או פנימה.\nקפיצות במקום תנועה מבוקרת.\nטווח תנועה חלקי.',
  E'Straightening the knee on the way up (it turns into a regular calf raise).\nAnkle rolling out or in.\nBouncing instead of a controlled movement.\nPartial range of motion.'
where not exists (select 1 from public.exercises where name_en = 'Single-Leg Bent-Knee Calf Raise');
