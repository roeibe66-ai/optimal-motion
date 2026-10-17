-- Roei, 2026-10-17: the latissimus dorsi is "הרחב הגבי", not "הגב הרחב"
-- (the muscle label changed in app/constants/catalog.ts in the same change).
update public.exercises
set description = replace(description, 'הגב הרחב', 'הרחב הגבי'),
    patient_cues = replace(patient_cues, 'הגב הרחב', 'הרחב הגבי'),
    common_mistake = replace(common_mistake, 'הגב הרחב', 'הרחב הגבי')
where description like '%הגב הרחב%' or patient_cues like '%הגב הרחב%' or common_mistake like '%הגב הרחב%';
