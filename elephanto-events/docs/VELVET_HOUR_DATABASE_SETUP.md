# Velvet Hour Dashboard - Complete Database Setup

This document contains all the PSQL queries needed to recreate the Velvet Hour event dashboard exactly as shown in the screenshots.

## Prerequisites

Make sure you have:
- PostgreSQL database running
- Database migrations completed (run `go run . migrate up`)
- User with admin privileges created

## Step 1: Create the Main Event

```sql
-- Create the main Velvet Hour event
INSERT INTO events (
  id, title, tagline, date, time, entry_time, location, address, 
  attire, age_range, description, is_active, ticket_url, 
  google_maps_enabled, countdown_enabled, cocktail_selection_enabled, 
  survey_enabled, the_hour_enabled, the_hour_active_date,
  created_at, updated_at
) VALUES (
  uuid_generate_v4(),
  'Velvet Hour',
  'Where Connection Meets Intention',
  '2025-09-17 18:30:00'::timestamp,
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
  false,
  NULL,
  NOW(),
  NOW()
);
```

## Step 2: Create Event Detail Sections

### 2.1 About the Event Section
```sql
INSERT INTO event_details (id, event_id, section_type, title, content, display_order) VALUES
(uuid_generate_v4(), 
 (SELECT id FROM events WHERE is_active = true LIMIT 1),
 'about_event', 
 'About the Event',
 '<div class="text-center mb-8">
    <h3 class="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-4">
      Velvet Hour: Where Connection Meets Intention
    </h3>
    <p class="text-lg text-gray-700 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed">
      An exclusive South Asian social mixer crafted for those who seek connection with depth and purpose. 
      Set in the luxurious and intimate setting of Mademoiselle in Toronto, this premium evening invites 
      accomplished professionals, entrepreneurs, creatives, and visionaries from across the GTA.
    </p>
  </div>

  <!-- Key Info Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div class="p-6 text-center bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg">
      <div class="text-3xl mb-3">🥂</div>
      <h4 class="font-bold text-gray-900 dark:text-white mb-2">Premium Experience</h4>
      <p class="text-sm text-gray-600 dark:text-gray-400">Ambient lounge vibes, variety of drinks, and passed hors d''oeuvres</p>
    </div>
    
    <div class="p-6 text-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
      <div class="text-3xl mb-3">🤝</div>
      <h4 class="font-bold text-gray-900 dark:text-white mb-2">Meaningful Connections</h4>
      <p class="text-sm text-gray-600 dark:text-gray-400">Curated guest list designed to spark authentic conversations</p>
    </div>
    
    <div class="p-6 text-center bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
      <div class="text-3xl mb-3">🎯</div>
      <h4 class="font-bold text-gray-900 dark:text-white mb-2">Intentional Community</h4>
      <p class="text-sm text-gray-600 dark:text-gray-400">Where ambition, culture, and community come together</p>
    </div>
  </div>',
 1);
```

### 2.2 Event Details Section
```sql
INSERT INTO event_details (id, event_id, section_type, title, content, display_order) VALUES
(uuid_generate_v4(), 
 (SELECT id FROM events WHERE is_active = true LIMIT 1),
 'event_details', 
 'Event Details',
 '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm sm:text-base">
    <div class="flex items-center text-gray-800 dark:text-gray-300">
      <span class="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">📅 Date:</span>
      Saturday, September 17th, 2025
    </div>
    <div class="flex items-center text-gray-800 dark:text-gray-300">
      <span class="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">⏰ Time:</span>
      6:30 - 9:30 PM
    </div>
    <div class="flex items-center text-gray-800 dark:text-gray-300">
      <span class="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">🚪 Entry:</span>
      Entry until 7:15 PM
    </div>
    <div class="flex items-center text-gray-800 dark:text-gray-300">
      <span class="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">📍 Location:</span>
      Mademoiselle Bar + Grill
    </div>
    <div class="flex items-center text-gray-800 dark:text-gray-300">
      <span class="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">👔 Attire:</span>
      Smart Casual
    </div>
    <div class="flex items-center text-gray-800 dark:text-gray-300">
      <span class="font-semibold text-yellow-600 dark:text-yellow-400 mr-3">🎂 Age:</span>
      25 - 40
    </div>
  </div>',
 2);
```

### 2.3 Who We're Curating Section
```sql
INSERT INTO event_details (id, event_id, section_type, title, content, display_order) VALUES
(uuid_generate_v4(), 
 (SELECT id FROM events WHERE is_active = true LIMIT 1),
 'who_we_curate', 
 'Who We''re Curating',
 '<p class="text-gray-700 dark:text-gray-300 text-center mb-6">
    We are curating a refined and intentional group of South Asians who are:
  </p>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="flex items-center space-x-3">
      <div class="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <span class="text-green-600 dark:text-green-400 text-sm">✓</span>
      </div>
      <span class="text-gray-700 dark:text-gray-300">Ambitious and professionally established</span>
    </div>
    <div class="flex items-center space-x-3">
      <div class="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <span class="text-green-600 dark:text-green-400 text-sm">✓</span>
      </div>
      <span class="text-gray-700 dark:text-gray-300">Culturally rooted in the South Asian community</span>
    </div>
    <div class="flex items-center space-x-3">
      <div class="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <span class="text-green-600 dark:text-green-400 text-sm">✓</span>
      </div>
      <span class="text-gray-700 dark:text-gray-300">Age range: 25 - 40 years old</span>
    </div>
    <div class="flex items-center space-x-3">
      <div class="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
        <span class="text-green-600 dark:text-green-400 text-sm">✓</span>
      </div>
      <span class="text-gray-700 dark:text-gray-300">Open to meaningful conversations and lasting connections</span>
    </div>
  </div>',
 3);
```

### 2.4 Important Guidelines Section
```sql
INSERT INTO event_details (id, event_id, section_type, title, content, display_order) VALUES
(uuid_generate_v4(), 
 (SELECT id FROM events WHERE is_active = true LIMIT 1),
 'guidelines', 
 'Important Guidelines',
 '<div class="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-600">
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="text-center">
      <div class="text-3xl mb-3">💼</div>
      <h5 class="font-semibold text-gray-900 dark:text-white mb-2">Dress Code</h5>
      <p class="text-gray-700 dark:text-gray-300">Smart Casual — come dressed to impress</p>
    </div>
    <div class="text-center">
      <div class="text-3xl mb-3">⏳</div>
      <h5 class="font-semibold text-gray-900 dark:text-white mb-2">Timely Arrival</h5>
      <p class="text-gray-700 dark:text-gray-300">Entry permitted only up to 30 minutes after start time</p>
    </div>
  </div>
</div>',
 4);
```

### 2.5 About ElephanTO Events Section
```sql
INSERT INTO event_details (id, event_id, section_type, title, content, display_order) VALUES
(uuid_generate_v4(), 
 (SELECT id FROM events WHERE is_active = true LIMIT 1),
 'about_org', 
 'About ElephanTO Events',
 '<p class="text-gray-700 dark:text-gray-300 text-center leading-relaxed">
    ElephanTO Events was started to fill a gap in the South Asian social scene by creating spaces that 
    celebrate culture and bring people together. Our events are designed to help you grow, connect, 
    and collaborate in a welcoming and meaningful way.
  </p>',
 5);
```

### 2.6 Venue Location Section
```sql
INSERT INTO event_details (id, event_id, section_type, title, content, display_order) VALUES
(uuid_generate_v4(), 
 (SELECT id FROM events WHERE is_active = true LIMIT 1),
 'location', 
 'Venue Location',
 '<p class="text-gray-700 dark:text-gray-400 mb-3 text-center font-semibold">
    📍 Mademoiselle Bar + Grill, Toronto
  </p>
  <p class="text-gray-600 dark:text-gray-400 mb-6 text-center text-sm">
    563 King St W, Toronto, ON M5V 1M1
  </p>',
 6);
```

## Step 3: Create Event FAQs

```sql
-- Insert all FAQs with proper gradients and ordering
INSERT INTO event_faqs (id, event_id, question, answer, display_order, color_gradient) VALUES
(uuid_generate_v4(), (SELECT id FROM events WHERE is_active = true LIMIT 1), 'What''s the dress code?', 'Smart-Casual, Dress to Impress :)', 1, 'yellow-orange'),
(uuid_generate_v4(), (SELECT id FROM events WHERE is_active = true LIMIT 1), 'Can I bring a guest?', 'Only individuals with a valid ticket will be able to attend.', 2, 'purple-pink'),
(uuid_generate_v4(), (SELECT id FROM events WHERE is_active = true LIMIT 1), 'Will there be food and drinks?', 'There will be options of alcoholic/non-alcoholic drinks to choose from, along with passed hors d''oeuvres.', 3, 'blue-cyan'),
(uuid_generate_v4(), (SELECT id FROM events WHERE is_active = true LIMIT 1), 'What''s the typical age group or audience?', 'Between 25-40 years old', 4, 'green-emerald'),
(uuid_generate_v4(), (SELECT id FROM events WHERE is_active = true LIMIT 1), 'Is there a structured program or is it free-flow?', 'The Velvet hour will be a structured program, more details to come!', 5, 'indigo-purple'),
(uuid_generate_v4(), (SELECT id FROM events WHERE is_active = true LIMIT 1), 'Is this a networking or just social event?', 'Both! This event gives you the flexibility to network, be social, and most importantly, build connections.', 6, 'pink-rose'),
(uuid_generate_v4(), (SELECT id FROM events WHERE is_active = true LIMIT 1), 'Is there a cost to attend?', 'Yes there will be a ticket price shared with those on the guest list.', 7, 'amber-yellow'),
(uuid_generate_v4(), (SELECT id FROM events WHERE is_active = true LIMIT 1), 'Will there be name tags or icebreakers?', 'There will be no nametags required. Yes we will have icebreakers.', 8, 'teal-cyan');
```

## Step 4: Admin User Setup

```sql
-- Make a user admin (replace with actual email)
UPDATE users SET role = 'admin' WHERE email = 'your-admin@example.com';

-- Verify admin status
SELECT id, email, name, role FROM users WHERE role = 'admin';
```

## Step 5: Verification Queries

```sql
-- Check the event was created correctly
SELECT title, date, is_active, countdown_enabled FROM events WHERE is_active = true;

-- Check all event sections are created in order
SELECT section_type, title, display_order 
FROM event_details 
WHERE event_id = (SELECT id FROM events WHERE is_active = true LIMIT 1) 
ORDER BY display_order;

-- Check FAQs are created with proper gradients
SELECT question, color_gradient, display_order 
FROM event_faqs 
WHERE event_id = (SELECT id FROM events WHERE is_active = true LIMIT 1) 
ORDER BY display_order;

-- Check countdown timer calculation
SELECT 
  title,
  date,
  EXTRACT(EPOCH FROM (date - NOW())) / 86400 as days_remaining,
  countdown_enabled
FROM events 
WHERE is_active = true;
```

## Step 6: Reset/Cleanup (if needed)

If you need to start over:

```sql
-- Delete existing event data
DELETE FROM event_faqs WHERE event_id IN (SELECT id FROM events WHERE is_active = true);
DELETE FROM event_details WHERE event_id IN (SELECT id FROM events WHERE is_active = true);
DELETE FROM events WHERE is_active = true;

-- Then run the setup steps above again
```

## Frontend Features Supported

The dashboard will automatically:
- ✅ Show dynamic countdown timer
- ✅ Display all sections in order with proper HTML styling
- ✅ Render FAQs with colored gradients
- ✅ Show Google Maps for location section
- ✅ Handle The Hour feature (enabled/disabled with optional link)
- ✅ Display action buttons based on event configuration
- ✅ Load user preferences (cocktail/survey) if authenticated

## Notes

- The `date` field in events table drives the countdown timer
- Set `the_hour_enabled = true` and provide `the_hour_link` to enable The Hour feature
- All HTML content in `event_details.content` supports full Tailwind CSS classes
- FAQ `color_gradient` values map to predefined gradient combinations
- Google Maps integration requires `google_maps_enabled = true`

## Troubleshooting

If the countdown shows 0:
1. Check the event date: `SELECT date FROM events WHERE is_active = true;`
2. Ensure the date is in the future
3. Verify `countdown_enabled = true`

If sections don't appear:
1. Check event details exist: `SELECT COUNT(*) FROM event_details WHERE event_id IN (SELECT id FROM events WHERE is_active = true);`
2. Verify display_order values
3. Check the content field for valid HTML

## The Hour Feature Configuration

### Enable The Hour Feature (without link - shows "Coming Soon")
```sql
UPDATE events 
SET the_hour_enabled = true, the_hour_link = NULL 
WHERE is_active = true;
```

### Enable The Hour Feature (with link - shows "Enter" and opens link)
```sql
UPDATE events 
SET the_hour_enabled = true, the_hour_link = 'https://your-hour-experience.com' 
WHERE is_active = true;
```

### Disable The Hour Feature (hides the button completely)
```sql
UPDATE events 
SET the_hour_enabled = false, the_hour_link = NULL 
WHERE is_active = true;
```

### Check The Hour Configuration
```sql
SELECT title, the_hour_enabled, the_hour_link 
FROM events 
WHERE is_active = true;
```

The Hour feature behavior:
- **Disabled** (`the_hour_enabled = false`): Button doesn't appear
- **Enabled without link** (`the_hour_enabled = true, the_hour_link = NULL`): Shows "Coming Soon" button (disabled)
- **Enabled with link** (`the_hour_enabled = true, the_hour_link = 'URL'`): Shows "Enter" button (clickable, opens URL)