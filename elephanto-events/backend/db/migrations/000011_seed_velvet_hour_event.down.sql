-- Remove seeded Velvet Hour event data
DELETE FROM event_details WHERE event_id IN (SELECT id FROM events WHERE title = 'Velvet Hour' AND date = '2025-09-17');
DELETE FROM event_faqs WHERE event_id IN (SELECT id FROM events WHERE title = 'Velvet Hour' AND date = '2025-09-17');
DELETE FROM events WHERE title = 'Velvet Hour' AND date = '2025-09-17';