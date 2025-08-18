-- Seed the initial Velvet Hour event with current data
INSERT INTO events (
    id,
    title,
    tagline,
    date,
    time,
    entry_time,
    location,
    address,
    attire,
    age_range,
    description,
    is_active,
    ticket_url,
    google_maps_enabled,
    countdown_enabled,
    cocktail_selection_enabled,
    survey_enabled,
    the_hour_enabled
) VALUES (
    uuid_generate_v4(),
    'Velvet Hour',
    'Where Connection Meets Intention',
    '2025-09-17',
    '6:30 - 9:30 PM',
    'Entry until 7:15 PM',
    'Mademoiselle Bar + Grill, Toronto',
    '563 King St W, Toronto, ON M5V 1M1',
    'Smart Casual',
    '25 - 40',
    'An exclusive South Asian social mixer crafted for those who seek connection with depth and purpose. Set in the luxurious and intimate setting of Mademoiselle in Toronto, this premium evening invites accomplished professionals, entrepreneurs, creatives, and visionaries from across the GTA.',
    true,
    'https://www.eventbrite.com/e/velvet-hour-exclusive-south-asian-social-mixer-tickets-1462437553089',
    true,
    true,
    true,
    true,
    false
);

-- Get the event ID for subsequent inserts
-- Note: In a real migration, we'd use a known UUID, but for this example we'll use a variable approach

-- Insert FAQs for the Velvet Hour event
WITH event_data AS (
    SELECT id FROM events WHERE title = 'Velvet Hour' AND date = '2025-09-17'
)
INSERT INTO event_faqs (event_id, question, answer, display_order, color_gradient)
SELECT 
    event_data.id,
    question,
    answer,
    display_order,
    color_gradient
FROM event_data,
(VALUES
    ('What''s the dress code?', 'Smart-Casual, Dress to Impress :)', 1, 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'),
    ('Can I bring a guest?', 'Only individuals with a valid ticket will be able to attend.', 2, 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'),
    ('Will there be food and drinks?', 'There will be options of alcoholic/non-alcoholic drinks to choose from, along with passed hors d''oeuvres.', 3, 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'),
    ('What''s the typical age group or audience?', 'Between 25-40 years old', 4, 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'),
    ('Is there a structured program or is it free-flow?', 'The Velvet hour will be a structured program, more details to come!', 5, 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20'),
    ('Is this a networking or just social event?', 'Both! This event gives you the flexibility to network, be social, and most importantly, build connections.', 6, 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20'),
    ('Is there a cost to attend?', 'Yes there will be a ticket price shared with those on the guest list.', 7, 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20'),
    ('Will there be name tags or icebreakers?', 'There will be no nametags required. Yes we will have icebreakers.', 8, 'from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20')
) AS faq_data(question, answer, display_order, color_gradient);

-- Insert event details for the hero and feature sections
WITH event_data AS (
    SELECT id FROM events WHERE title = 'Velvet Hour' AND date = '2025-09-17'
)
INSERT INTO event_details (event_id, section_type, title, content, icon, display_order, color_scheme)
SELECT 
    event_data.id,
    section_type,
    title,
    content,
    icon,
    display_order,
    color_scheme
FROM event_data,
(VALUES
    ('feature_card', 'Premium Experience', 'Ambient lounge vibes, variety of drinks, and passed hors d''oeuvres', '🥂', 1, 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'),
    ('feature_card', 'Meaningful Connections', 'Curated guest list designed to spark authentic conversations', '🤝', 2, 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'),
    ('feature_card', 'Intentional Community', 'Where ambition, culture, and community come together', '🎯', 3, 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'),
    ('who_we_curate', 'Ambitious and professionally established', '', '✓', 1, 'green'),
    ('who_we_curate', 'Culturally rooted in the South Asian community', '', '✓', 2, 'green'),
    ('who_we_curate', 'Age range: 25 - 40 years old', '', '✓', 3, 'green'),
    ('who_we_curate', 'Open to meaningful conversations and lasting connections', '', '✓', 4, 'green'),
    ('guidelines', 'Dress Code', 'Smart Casual — come dressed to impress', '💼', 1, 'amber'),
    ('guidelines', 'Timely Arrival', 'Entry permitted only up to 30 minutes after start time', '⏳', 2, 'amber'),
    ('about_org', 'About ElephanTO Events', 'ElephanTO Events was started to fill a gap in the South Asian social scene by creating spaces that celebrate culture and bring people together. Our events are designed to help you grow, connect, and collaborate in a welcoming and meaningful way.', '', 1, 'default')
) AS detail_data(section_type, title, content, icon, display_order, color_scheme);