-- Exercise data fix (2026-10-15): proper gym equipment (barbell / machine /
-- cable instead of the "dumbbells" catch-all), a difficulty level for
-- every exercise that had none, and two gym exercises that were filed under
-- calisthenics. Reviewed by Roei: EXERCISE-DATA-FIX.xlsx. The new equipment
-- ids are in EQUIPMENT_LIST (app/constants/catalog.ts).

update public.exercises set difficulty_level = 'intermediate' where id = '35e64f1f-4ad6-44c0-bd98-f5589017017e'; -- בהטיית גו, חתירה עם משקולות יד/ מוט
update public.exercises set difficulty_level = 'beginner' where id = 'c7963cf7-ce32-49e4-bdf6-d17303612dba'; -- בהטיית גו, חתירה עם משקולת יד
update public.exercises set difficulty_level = 'beginner' where id = '34bd26fb-b4cc-4476-bbf9-9a6a42345990'; -- בהטיית גו, פשיטת מרפק עם משקולת יד
update public.exercises set difficulty_level = 'beginner' where id = '7ba916e3-964a-479e-a2bc-56ec6f21754c'; -- בישיבה בשיפוע חיובי, כפיפת כתף עם משקולות יד
update public.exercises set difficulty_level = 'beginner' where id = '6a8151cc-6e08-4b2f-8f44-7eaa1a86c9d3'; -- בישיבה בשיפוע, כפיפת מרפקים עם משקולות יד
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = 'bc62f6d3-58a9-45bb-8ca9-24ec49af8c35'; -- בישיבה לחיצת כתפיים ב- SMITH MACHINE
update public.exercises set difficulty_level = 'beginner' where id = 'b06124c6-c2ac-4155-8821-44aacc1d8d57'; -- בישיבה לחיצת כתפיים באחיזה צרה עם משקולות יד
update public.exercises set difficulty_level = 'beginner' where id = '1a0077c6-0a9e-4b51-94a2-bb1725e279ed'; -- בישיבה לחיצת כתפיים עם משקולות יד
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = 'cfb51c45-70ff-44fc-a5d7-d65327637458'; -- בישיבה פשיטת ברכיים במכונה
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = 'b691bf0c-2c35-46b5-8922-b16c6440f03e'; -- בישיבה, הרחקה אופקית בכתף במכונה
update public.exercises set difficulty_level = 'beginner' where id = '203828a4-e1b3-4979-9a89-7cb503749a86'; -- בישיבה, זרוע נתמכת בירך כפיפת מרפק
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = 'cf92972c-4f81-4565-aa78-c93a29a4306a'; -- בישיבה, חתירה אופקית בפולי תחתון
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = '847ff700-a71b-4e53-af63-d1ce8da768f9'; -- בישיבה, חתירה בפולי תחתון
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = 'e1e257d5-1837-471e-a2d2-31fb37f16676'; -- בישיבה, חתירה עם מכונה
update public.exercises set difficulty_level = 'beginner' where id = '554fd682-9ac5-48f9-bc27-4434cd953c28'; -- בישיבה, כפיפת מרפקים על ספסל יעודי (כומר)
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = 'ab93fc0f-59fc-4812-9c6b-f09379e80fa0'; -- בישיבה, לחיצת חזה במכונה
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '94f2adc9-0143-41e4-86e7-26f83eb432c2'; -- בישיבה, לחיצת כתפיים במכונה
update public.exercises set difficulty_level = 'beginner' where id = 'b549b9e2-0ccb-493a-b984-16802141ee65'; -- בישיבה, פשיטת מרפקים עם משקולת יד
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '293d2b5f-bc13-40b5-9b6e-cb55626e4504'; -- בישיבה, קרוב אופקי בכתף (פרפר) במכונה
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = '218e8dcc-c8de-456a-bbf2-4f57300297a0'; -- בישיבה/ עמידה לחיצת כתפיים מלפנים עם מוט
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'intermediate' where id = '6266eb01-36b7-43f2-8778-d782b1b4a16c'; -- בעמידה (גב למכשיר) פשיטת מרפקים בפולי
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'intermediate' where id = '1c57a34c-f2f0-41be-b756-04c43723267f'; -- בעמידה, הרחקה אופקית בכתף בכבל קרוס
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = '0d3e3289-a1f5-40de-acf5-68e12e369fcc'; -- בעמידה, הרחקת כתף בפולי תחתון
update public.exercises set difficulty_level = 'beginner' where id = '4ed0c8d3-e64c-4811-9cf5-4c5f7e1086e4'; -- בעמידה, הרחקת כתף עם משקולות יד
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'intermediate' where id = 'b54c5ab6-1341-42bd-b6ca-b2eebff560bf'; -- בעמידה, חתירה ישרה SMITH MACHINE
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = 'bdc7c933-b22a-47ab-b69a-a5edc0114051'; -- בעמידה, חתירה ישרה במוט
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'intermediate' where id = 'ec88b983-c34b-4d22-aa59-da7fc8913599'; -- בעמידה, חתירה ישרה בפולי תחתון
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = '00ca9da7-7bdc-4642-8783-6acfbd04367b'; -- בעמידה, כפיפת מרפקים בפולי תחתון
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'beginner' where id = '11876174-bba6-49c3-941e-e742f141e5d9'; -- בעמידה, כפיפת מרפקים עם מוט (סופינציה / פרונציה)
update public.exercises set difficulty_level = 'beginner' where id = '948293f5-b8fe-4aa8-bf82-6d3156044f0a'; -- בעמידה, כפיפת מרפקים עם משקולות יד
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = 'be5b13ea-2223-42de-8f2e-f4f573ff37ce'; -- בעמידה, פשיטת ירך בפולי תחתון
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = '6de605a9-0e9e-42de-b4a5-27c1487e5ecc'; -- בעמידה, פשיטת כתף בפולי עליון
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = '621df7ad-6db1-45e7-a89e-92d18035a661'; -- בעמידה, פשיטת מרפקים בפולי עליון
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'intermediate' where id = 'bf686d8d-002c-407c-8562-6694c8c4f985'; -- בעמידה, קרוב אופקי בכתף (פרפר) בכבל קרוס
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'intermediate' where id = '7d85ffb9-eb22-46b6-b962-50d63b16a5dc'; -- בעמידה, קרוב אופקי בכתף (פרפר) בפולי עליון
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'intermediate' where id = '9faa060a-c614-476f-9496-127b4343db2c'; -- בעמידה, קרוב אופקי בכתף (פרפר) בפולי תחתון
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '19c10057-a68e-46c7-b41a-38cdb432db37'; -- בשכיבה / בישיבה כפיפת ברכיים במכונה
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = 'b5e9635c-2634-4af9-a3ba-e1a00c6f0c8f'; -- בשכיבה בשיפוע חיובי, לחיצת חזה כנגד מוט
update public.exercises set difficulty_level = 'beginner' where id = '893cfb78-e8e4-4479-ad0f-4444863e472e'; -- בשכיבה בשיפוע חיובי, לחיצת חזה כנגד משקולות יד
update public.exercises set difficulty_level = 'intermediate' where id = 'a3eaec53-af6f-481d-829f-f09147430e43'; -- בשכיבה בשיפוע חיובי, פרפר עם משקולות יד
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = '9a2ad7e3-363b-420b-b773-cabe90ac36ff'; -- בשכיבה בשיפוע שלילי, לחיצת חזה כנגד מוט
update public.exercises set difficulty_level = 'intermediate' where id = '4715e7f2-3df0-4260-a525-6a72b1766c22'; -- בשכיבה בשיפוע שלילי, לחיצת חזה כנגד משקולות יד
update public.exercises set difficulty_level = 'intermediate' where id = '4dffc4fa-6231-4e94-83bc-886d296a3686'; -- בשכיבה בשיפוע שלילי, קרוב אופקי בכתף (פרפר) עם משקולות יד
update public.exercises set difficulty_level = 'beginner' where id = 'cb8dfbb3-4f3c-4c21-a6ac-34c6fe6de5a1'; -- בשכיבה, הרחקה אופקית בכתף עם משקולות יד
update public.exercises set difficulty_level = 'beginner' where id = '83501093-d91e-4eb8-84c3-3c776764faa5'; -- בשכיבה, חתירה אופקית במשקולות יד / מוט
update public.exercises set difficulty_level = 'beginner' where id = 'c6cb1278-b7de-4c51-b318-bcc13a5c6c13'; -- בשכיבה, חתירה עם משקולות יד
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '83ffb885-d92f-43b5-a7d5-af99ba1e676e'; -- בשכיבה, לחיצת חזה ב-Smith Machine
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = 'd173a7af-0be1-4907-9779-3e480b126614'; -- בשכיבה, לחיצת חזה בשיפוע חיובי ב- Smith Machine
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'intermediate' where id = 'cb8bc20b-8378-41c7-8281-2af584e706e3'; -- בשכיבה, לחיצת חזה בשיפוע שלילי ב- Smith Machine
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = 'b6f61b1e-d35c-4d80-be13-7df426010dbb'; -- בשכיבה, לחיצת חזה כנגד מוט
update public.exercises set difficulty_level = 'beginner' where id = 'a69cc9f4-81ce-4e9f-8978-dfb2266d4b21'; -- בשכיבה, לחיצת חזה כנגד משקולות יד
update public.exercises set difficulty_level = 'intermediate' where id = '2a9d4d69-541e-49e6-9fe3-ac3ae74c2da2'; -- בשכיבה, פשיטת כתף (פולאובר) עם משקולת יד
update public.exercises set difficulty_level = 'intermediate' where id = '7c8a9213-5f24-4ca7-979c-689943635e24'; -- בשכיבה, פשיטת מרפקים עם משקולות יד
update public.exercises set difficulty_level = 'intermediate' where id = '02378447-586d-4ca3-81d8-48cbc0371840'; -- בשכיבה, קרוב אופקי בכתף (פרפר) עם משקולות יד
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'intermediate' where id = '3fd1b796-b37a-4b28-8fe7-5199a4bec5ea'; -- בתליית גוף, סיבוב אגן לאחור
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = '6b470272-4d30-4172-b09f-47c6b6f6381e'; -- דדליפט
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = '0b7437ed-1e6b-4ab4-9fe5-c88f3ec1689d'; -- דדליפט ברגליים ישרות
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = '7230ecc7-22d9-4ff8-8c3e-69a83ef2826b'; -- דדליפט רומני
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = '1f21c4d9-e674-4a8f-9e67-069cef0546ea'; -- דחיקת אגן (היפ טראסט)
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '2b2fdd09-17d3-41d3-af0a-8bdc781a511c'; -- הרחקת ירך במכונה / פולי תחתון
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'intermediate' where id = '792c349a-9e58-483b-8b6f-629b175c23d7'; -- חתירה במכשיר T-BAR
update public.exercises set difficulty_level = 'beginner' where id = 'cb5f6522-f6cf-47e4-8de6-fed30cc060b4'; -- כפיפה כפית בקרסול במשקולת / סמית' / מכונה
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '805ffa28-4c12-4404-ba96-a80c0f6f63d7'; -- כפיפות גו במכונה
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'intermediate' where id = '931fea30-afc6-4f61-92e4-ab25a54e9e8f'; -- כפיפת גו בפולי עליון
update public.exercises set difficulty_level = 'beginner' where id = '753abf8a-7a90-488d-8eea-af48755276a6'; -- כפיפת גו צידית באמצעות משקולת יד
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '4fd78edd-5a61-434d-87fa-7a11916f5e20'; -- לחיצת חזה באחיזה צרה Smith Machine
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = '24fe60e2-8b7d-4601-9764-17fcee047a18'; -- לחיצת חזה צרה באמצעות מוט
update public.exercises set difficulty_level = 'beginner' where id = '22d3ba77-7efd-4796-9583-8cb39efc9cbc'; -- לחיצת חזה צרה במשקולות יד
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = 'f5c5fd33-e0ec-4bd2-bb7c-1468561494cb'; -- לחיצת רגליים במכונה / בשיפוע 45 מעלות
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '4908ac2e-6832-450d-8654-92dce75e3727'; -- מכרע באמצעות Smith Machine
update public.exercises set difficulty_level = 'intermediate' where id = '4c0bffd2-5927-42d2-af89-8778aff3f6ca'; -- מכרע באמצעות מוט / משקולות יד
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '2c5072e9-a390-40ee-ab97-a7356631a1d5'; -- סקווט ב-Smith Machine
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate' where id = 'e85a83cc-6676-4307-b96d-852e8f617f5a'; -- סקווט כנגד מוט
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = 'cda1a2c2-8aad-4198-8328-83c875786a5a'; -- עליות מתח במכשיר הגרביטון
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = '0eb475cc-5123-46fb-a00c-299ac61f3657'; -- פאלופ פרס (לחיצת פאלופ כנגד כבל)
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = '0f5882dc-b284-4636-83ef-aa57fe01e4ea'; -- פולי עליון באחיזה צרה
update public.exercises set equipment = array['cable']::text[], difficulty_level = 'beginner' where id = 'cebf0fce-1169-4ab2-b228-5e731df9aa2e'; -- פולי עליון באחיזה רחבה
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '3c4fefec-6114-4201-a227-e545143a810f'; -- פשיטת גו בכסא רומי
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner' where id = '065d6919-7222-42b6-954d-92654ad3ed88'; -- קרוב ירך במכונה / פולי תחתון
update public.exercises set difficulty_level = 'intermediate' where id = 'd14ded25-a369-408b-b1a0-ca35eb103a2d'; -- אראונד דה וורלד עם לאנג' אחורי וקטלבל
update public.exercises set difficulty_level = 'beginner' where id = '2bd6e216-e97c-484d-8b5c-b5f5eb07c085'; -- גובלט סקוואט עם קטלבל
update public.exercises set difficulty_level = 'intermediate' where id = '301f63ae-adb5-4b1e-90e6-23922db552bc'; -- דדליפט רומני על רגל אחת עם קטלבל
update public.exercises set difficulty_level = 'beginner' where id = '9306af2b-b264-45a0-886e-7a6e74959295'; -- דדליפט רומני עם קטלבל
update public.exercises set difficulty_level = 'intermediate' where id = 'd1169f60-d9bf-4de0-befe-577aa13ac13d'; -- הייפול עם קטלבל
update public.exercises set difficulty_level = 'beginner' where id = '53595290-c014-4c37-bd05-2c74076c82b3'; -- הילה עם קטלבל
update public.exercises set difficulty_level = 'intermediate' where id = '661351f4-ebcb-4717-883b-7be907ae54d5'; -- העברת רגליים מעל קטלבל
update public.exercises set difficulty_level = 'intermediate' where id = '789346b5-7011-4df0-b8b3-263c54970232'; -- חיתוך בכריעת חצי ברך עם קטלבל
update public.exercises set difficulty_level = 'intermediate' where id = '91974222-f2a0-4f15-b3fe-29a2200e30fd'; -- כיווץ ברכיים מצד לצד עם קטלבל
update public.exercises set difficulty_level = 'beginner' where id = 'a949f794-4a19-45c8-bd98-c83d5c156427'; -- כפיפת מרפקים עם קטלבל
update public.exercises set difficulty_level = 'intermediate' where id = 'fd676690-f334-4aa0-b6f4-8756f9c9fc92'; -- לאנג' אחורי ולחיצת כתף עם קטלבל
update public.exercises set difficulty_level = 'intermediate' where id = '3c31b522-ae4d-4bda-81b5-be932c8d28d7'; -- לאנג' אחורי עם קטלבל בגובלט
update public.exercises set difficulty_level = 'intermediate' where id = '02bf001d-a888-4456-85c0-e4b6b22496f1'; -- לחיצת כתף סטריקט עם קטלבל
update public.exercises set difficulty_level = 'intermediate' where id = 'f30f388f-50a4-4a0e-b28a-fd21220acfd3'; -- סווינג עם קטלבל
update public.exercises set difficulty_level = 'advanced' where id = '01ed674b-2c3c-4ea3-957a-f230e2730db6'; -- סנאץ' עם קטלבל
update public.exercises set difficulty_level = 'beginner' where id = '88a354aa-2f23-4ad2-bd3e-04def6551cdc'; -- פולאובר עם קטלבל
update public.exercises set difficulty_level = 'beginner' where id = '3c6c8c6f-f8e6-4d71-a366-d0e705961e07'; -- פשיטת מרפקים מעל הראש עם קטלבל
update public.exercises set difficulty_level = 'beginner' where id = '5aed2f10-6bd2-4c3a-af1e-2c2ec0aa3d7c'; -- "אופניים"
update public.exercises set equipment = array['machine']::text[], difficulty_level = 'beginner', categories = array['מכון כושר']::text[], admin_tags = 'gym' where id = '1d4399bc-1eb0-458f-b906-9666df860652'; -- בישיבה, כפיפה כפית במכונה ייעודית
update public.exercises set difficulty_level = 'beginner' where id = 'e0e9d6c5-6a2b-4673-8163-ce648c7cddb0'; -- בעמידת שש / פלאנק, הרמת יד ורגל נגדית
update public.exercises set difficulty_level = 'beginner' where id = 'b9fb2fbf-eb19-4c6a-bf1c-2a4f408b6eee'; -- בשכיבה, סיבוב אגן לאחור
update public.exercises set equipment = array['barbell']::text[], difficulty_level = 'intermediate', categories = array['מכון כושר']::text[], admin_tags = 'gym' where id = '93bb56bb-1a05-4fd0-8188-8b942704879f'; -- בשכיבה, פשיטת מרפקים עם מוט
update public.exercises set difficulty_level = 'beginner' where id = 'f946d604-7b80-4d67-be4d-1247e1ed3390'; -- בשכיבת אפיים, פשיטת גו כנגד משקל גוף
update public.exercises set difficulty_level = 'advanced' where id = '6904cf77-b57f-4ac6-84b0-327df7fa4405'; -- ישיבת L על מקבילים
update public.exercises set difficulty_level = 'beginner' where id = '71317576-b9c2-4b5c-8546-31b37ba8b88b'; -- כפיפות גו אלכסוניות
update public.exercises set difficulty_level = 'beginner' where id = 'ab2872a1-79a6-4e12-a4ed-0ad5be9c9fd5'; -- כפיפות גו/לפנים
update public.exercises set difficulty_level = 'intermediate' where id = 'bda0b24a-c650-4c10-bcfc-11fc84866e30'; -- מקבילים / מקבילים בגרביטון
update public.exercises set difficulty_level = 'advanced' where id = '6f8195a1-7d5c-41ec-b022-dcab80714dc4'; -- מקבילים רחב
update public.exercises set difficulty_level = 'intermediate' where id = '28e99cd1-e8a2-4464-b41d-afcf1fbec592'; -- מתח באחיזה הפוכה (סנטר)
update public.exercises set difficulty_level = 'beginner' where id = 'd78584b2-e907-4760-968b-0f9836f61e5a'; -- סקוואט במשקל גוף
update public.exercises set difficulty_level = 'intermediate' where id = 'e73365f0-be44-41af-b38c-4e2ad97185dc'; -- סקווט בולגרי
update public.exercises set difficulty_level = 'beginner' where id = '3052db43-08f3-453a-80ef-b27b46b78627'; -- עליות מדרגה
update public.exercises set difficulty_level = 'intermediate' where id = 'ae8ff1b2-5d26-4e9f-bbfd-566fcec67497'; -- עליות מתח לפנים צר / רחב
update public.exercises set difficulty_level = 'beginner' where id = '00650691-5b7d-421f-8546-491bac55a9ef'; -- עליית עקב על רגל אחת
update public.exercises set difficulty_level = 'beginner' where id = '34e5c91c-6d3a-45eb-8ac5-0480d1c911d6'; -- עליית עקב על רגל אחת בברך כפופה
update public.exercises set difficulty_level = 'beginner' where id = '0e7df640-30b1-45cd-94f1-ee4fa2752884'; -- עליית עקבים בעמידה
update public.exercises set difficulty_level = 'beginner' where id = '1e6df363-7f65-4fea-8469-57881b874172'; -- פינגווין
update public.exercises set difficulty_level = 'beginner' where id = 'f291ac49-a62a-4bd9-baa1-49761ef7906e'; -- פלאנק (החזקת בטן סטטית)
update public.exercises set difficulty_level = 'beginner' where id = '4cf90c9c-4bf7-4cdb-8ad5-3f31762e52e9'; -- פלאנק צידי
update public.exercises set difficulty_level = 'beginner' where id = 'c3426f0a-9ad9-4d00-9009-506bf675ff29'; -- רוטציה חיצונית בכבל קרוס
update public.exercises set difficulty_level = 'beginner' where id = 'bdf884e8-8e6f-41dd-8fd9-8a69b0a9942a'; -- רוטציה פנימית בכבל קרוס
