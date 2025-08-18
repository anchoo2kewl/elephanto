# Admin SQL Commands - Velvet Hour Events

This document contains the essential SQL commands for administering the Velvet Hour Events application.

## Making a User Admin

### 1. Promote User to Admin by Email
```sql
-- Make a user admin by their email address
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';

-- Example: Make john@example.com an admin
UPDATE users SET role = 'admin' WHERE email = 'john@example.com';
```

### 2. Promote User to Admin by User ID
```sql
-- Make a user admin by their UUID (if you know their ID)
UPDATE users SET role = 'admin' WHERE id = 'USER_UUID_HERE';

-- Example with a real UUID:
UPDATE users SET role = 'admin' WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

### 3. Verify Admin Status
```sql
-- Check all admin users
SELECT id, email, name, role, isOnboarded, createdAt FROM users WHERE role = 'admin';

-- Check specific user's role
SELECT id, email, name, role FROM users WHERE email = 'admin@example.com';
```

## User Management Commands

### 4. List All Users
```sql
-- Get all users with basic info
SELECT id, email, name, role, isOnboarded, createdAt, updatedAt 
FROM users 
ORDER BY createdAt DESC;
```

### 5. Find Users by Email Domain
```sql
-- Find all users from a specific domain
SELECT id, email, name, role, isOnboarded 
FROM users 
WHERE email LIKE '%@company.com' 
ORDER BY createdAt DESC;
```

### 6. User Statistics
```sql
-- Count users by role
SELECT role, COUNT(*) as count 
FROM users 
GROUP BY role;

-- Count onboarded vs non-onboarded users
SELECT isOnboarded, COUNT(*) as count 
FROM users 
GROUP BY isOnboarded;
```

## Event Management Commands

### 7. View Active Event
```sql
-- Get the currently active event
SELECT id, title, date, time, location, is_active 
FROM events 
WHERE is_active = true;
```

### 8. List All Events
```sql
-- Get all events ordered by date
SELECT id, title, date, time, location, is_active, created_at 
FROM events 
ORDER BY date DESC;
```

### 9. Activate an Event
```sql
-- IMPORTANT: Only one event can be active at a time
-- This will deactivate all events and activate the specified one

BEGIN;
UPDATE events SET is_active = false;
UPDATE events SET is_active = true WHERE id = 'EVENT_UUID_HERE';
COMMIT;
```

### 10. Event Statistics
```sql
-- Get event with user participation stats
SELECT 
    e.title,
    e.date,
    e.is_active,
    COUNT(DISTINCT sr.userId) as survey_responses,
    COUNT(DISTINCT cp.userId) as cocktail_preferences
FROM events e
LEFT JOIN survey_responses sr ON e.id = sr.event_id
LEFT JOIN cocktail_preferences cp ON e.id = cp.event_id
GROUP BY e.id, e.title, e.date, e.is_active
ORDER BY e.date DESC;
```

## Survey and Cocktail Data

### 11. View Survey Responses for an Event
```sql
-- Get all survey responses for a specific event
SELECT 
    u.email,
    u.name,
    sr.fullName,
    sr.age,
    sr.gender,
    sr.torontoMeaning,
    sr.personality,
    sr.connectionType,
    sr.instagramHandle,
    sr.howHeardAboutUs,
    sr.createdAt
FROM survey_responses sr
JOIN users u ON sr.userId = u.id
JOIN events e ON sr.event_id = e.id
WHERE e.is_active = true
ORDER BY sr.createdAt DESC;
```

### 12. View Cocktail Preferences for an Event
```sql
-- Get all cocktail preferences for the active event
SELECT 
    u.email,
    u.name,
    cp.preference,
    cp.createdAt
FROM cocktail_preferences cp
JOIN users u ON cp.userId = u.id
JOIN events e ON cp.event_id = e.id
WHERE e.is_active = true
ORDER BY cp.preference, cp.createdAt DESC;
```

### 13. Cocktail Preference Distribution
```sql
-- Count cocktail preferences for the active event
SELECT 
    cp.preference,
    COUNT(*) as count
FROM cocktail_preferences cp
JOIN events e ON cp.event_id = e.id
WHERE e.is_active = true
GROUP BY cp.preference
ORDER BY count DESC;
```

## Database Maintenance

### 14. Check Database Schema Version
```sql
-- Check current migration version
SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 1;
```

### 15. View Admin Audit Log
```sql
-- See recent admin actions
SELECT 
    al.action,
    al.oldValue,
    al.newValue,
    al.ipAddress,
    al.createdAt,
    admin.email as admin_email,
    target.email as target_user_email
FROM adminAuditLogs al
LEFT JOIN users admin ON al.adminId = admin.id
LEFT JOIN users target ON al.targetUserId = target.id
ORDER BY al.createdAt DESC
LIMIT 20;
```

## Safety Commands

### 16. Backup Important Data
```sql
-- Export users (run this before any major changes)
COPY (SELECT * FROM users) TO '/tmp/users_backup.csv' WITH CSV HEADER;

-- Export survey responses
COPY (SELECT * FROM survey_responses) TO '/tmp/survey_responses_backup.csv' WITH CSV HEADER;

-- Export cocktail preferences  
COPY (SELECT * FROM cocktail_preferences) TO '/tmp/cocktail_preferences_backup.csv' WITH CSV HEADER;
```

### 17. Demote Admin (if needed)
```sql
-- Remove admin privileges from a user
UPDATE users SET role = 'user' WHERE email = 'former-admin@example.com';

-- CAUTION: Make sure there's at least one admin remaining!
SELECT COUNT(*) FROM users WHERE role = 'admin';
```

## Quick Setup for New Admin

If you're setting up a new admin user, follow these steps:

1. **First, create the user account** (via the application login flow)
2. **Then promote them to admin**:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'new-admin@example.com';
   ```
3. **Verify the promotion worked**:
   ```sql
   SELECT email, role FROM users WHERE email = 'new-admin@example.com';
   ```

## Important Notes

- **Only one event can be active at a time** - the application enforces this with a unique index
- **Admin promotion requires direct database access** - there's no UI for this for security reasons
- **All admin actions are logged** in the `adminAuditLogs` table
- **Always verify changes** by checking the results with SELECT statements
- **Keep at least one admin** - don't demote the last admin user

## Connection Information

To connect to the database:
- **Development**: Usually `localhost:5432`
- **Database name**: `elephanto_events` (check your .env file)
- **User**: Check your `DATABASE_URL` environment variable

```bash
# Example connection command
psql -h localhost -p 5432 -U elephanto -d elephanto_events
```