# Velvet Hour: Complete Application Redesign - Product Requirements Document

## Executive Summary

This PRD documents the comprehensive redesign of the ElephantTO Events application, rebranding it as "Velvet Hour" for an exclusive South Asian networking event on September 17th, 2025. The redesign includes UI/UX improvements, new features, database enhancements, and modern design elements.

## Project Overview

### Event Details
- **Event Name**: Velvet Hour: Exclusive South Asian Social Mixer
- **Date**: September 17th, 2025, 6:30 PM - 9:30 PM (Entry until 7:15 PM)
- **Venue**: Mademoiselle Bar + Grill, 563 King St W, Toronto, ON M5V 1M1
- **Target Audience**: South Asian professionals, entrepreneurs, creatives (25-40 years)
- **Theme**: Black background with gold accents, luxurious and intimate

## 1. Visual Identity & Branding

### 1.1 Logo & Branding
- **New Logo**: Custom Velvet Hour logo replacing ElephantTO branding
- **Color Scheme**: Black backgrounds with gold/yellow text and accents
- **Typography**: Modern, elegant font hierarchy
- **Theme**: Luxurious, exclusive, intimate networking experience

### 1.2 Design System
- **Glass Card Components**: Elevated and subtle variants with backdrop blur
- **Gradient Accents**: Yellow-to-orange gradients for highlights and dividers
- **Dark/Light Mode**: Full compatibility with responsive color classes
- **Mobile-First**: Responsive design for all screen sizes

## 2. Dashboard Redesign

### 2.1 Welcome Section
- **Personalized Greeting**: "Welcome back, [Name]! 👋"
- **Event Countdown**: Real-time countdown timer to September 17th, 2025
- **Event Tagline**: "Get ready for Velvet Hour - Saturday, September 17th, 2025"

### 2.2 Action Buttons Grid
Four main action buttons in a responsive grid:

1. **Buy Tickets** (🎫)
   - Direct link to Eventbrite: `https://www.eventbrite.com/e/velvet-hour-exclusive-south-asian-social-mixer-tickets-1462437553089`
   - Always clickable

2. **Select Cocktail** (🍷) 
   - Opens cocktail preference dialog
   - Shows current preference if selected

3. **About Me Survey** (📄)
   - Opens comprehensive survey dialog
   - Shows "Completed" status after submission
   - One-time submission with database constraint

4. **The Hour** (⏰)
   - Disabled until event day
   - Shows "Coming Soon" status

### 2.3 About the Event Section
Complete redesign with modern layout and comprehensive content:

#### Hero Section
- **Main Tagline**: "Velvet Hour: Where Connection Meets Intention"
- **Description**: Exclusive South Asian social mixer for accomplished professionals

#### Key Feature Cards (3-column grid)
1. **Premium Experience** 🥂: Ambient lounge vibes, variety of drinks, passed hors d'oeuvres
2. **Meaningful Connections** 🤝: Curated guest list for authentic conversations
3. **Intentional Community** 🎯: Where ambition, culture, and community converge

#### Event Details Grid
- Date: Saturday, September 17th, 2025
- Time: 6:30 - 9:30 PM
- Entry: Entry until 7:15 PM
- Location: Mademoiselle Bar + Grill
- Attire: Smart Casual
- Age: 25 - 40

#### Who We're Curating
Professional criteria with green checkmarks:
- Ambitious and professionally established
- Culturally rooted in the South Asian community
- Age range: 25 - 40 years old
- Open to meaningful conversations and lasting connections

#### Important Guidelines
- **Dress Code**: Smart Casual — come dressed to impress
- **Timely Arrival**: Entry permitted only up to 30 minutes after start time

#### About ElephanTO Events
Mission statement about filling gaps in South Asian social scene

#### Venue & Google Maps Integration
- Full venue details with embedded Google Maps
- Fallback system when API key unavailable

### 2.4 FAQ Section Redesign
**Complete redesign from 2-column layout to modern single-section design:**

#### New Layout Features
- Modern header with gradient divider
- 2-column responsive grid (4 FAQs per column)
- Each FAQ has unique gradient background colors
- Better typography with bold colored questions

#### All 8 FAQs Included
1. **What's the dress code?** (Yellow gradient)
   - Smart-Casual, Dress to Impress :)

2. **Can I bring a guest?** (Purple gradient)
   - Only individuals with a valid ticket will be able to attend.

3. **Will there be food and drinks?** (Blue gradient)
   - There will be options of alcoholic/non-alcoholic drinks to choose from, along with passed hors d'oeuvres.

4. **What's the typical age group or audience?** (Green gradient)
   - Between 25-40 years old

5. **Is there a structured program or is it free-flow?** (Indigo gradient)
   - The Velvet hour will be a structured program, more details to come!

6. **Is this a networking or just social event?** (Pink gradient)
   - Both! This event gives you the flexibility to network, be social, and most importantly, build connections.

7. **Is there a cost to attend?** (Amber gradient)
   - Yes there will be a ticket price shared with those on the guest list.

8. **Will there be name tags or icebreakers?** (Teal gradient)
   - There will be no nametags required. Yes we will have icebreakers.

### 2.5 Social Media & Contact Redesign
**Transformed from side-by-side layout to modern unified section:**

#### New Features
- Horizontal social media buttons (Instagram + Email)
- Buttons include icons, labels, and subtle details
- Dedicated contact information card
- Better visual hierarchy and spacing
- Improved hover effects and transitions

## 3. New Feature: Cocktail Preference System

### 3.1 Frontend Implementation
**File**: `/frontend/src/components/CocktailDialog.tsx`

#### Features
- Modal dialog with 4 cocktail options
- Visual design with emojis and descriptions
- Form validation and error handling
- Integration with toast notification system

#### Cocktail Options
1. **Beer** 🍺 - Refreshing beers and lagers
2. **Wine** 🍷 - Fine wines and champagne  
3. **Cocktail** 🍸 - Premium cocktails and spirits
4. **Non-Alcoholic** 🥤 - Mocktails and soft drinks

### 3.2 Backend Implementation
**File**: `/backend/handlers/cocktail_preference.go`

#### Database Schema
```sql
CREATE TABLE cocktail_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID REFERENCES users(id) ON DELETE CASCADE,
    preference VARCHAR(50) NOT NULL CHECK (preference IN ('beer', 'wine', 'cocktail', 'non-alcoholic')),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId)
);
```

#### API Endpoints
- `GET /api/cocktail-preference` - Retrieve user's current preference
- `POST /api/cocktail-preference` - Save/update user's preference

### 3.3 Key Technical Fixes
- **Authentication**: Fixed context access using `middleware.GetUserFromContext`
- **Storage Key**: Corrected localStorage key from 'token' to 'auth_token'
- **Error Handling**: Proper 401 unauthorized responses

## 4. New Feature: Comprehensive Survey System

### 4.1 Frontend Implementation
**File**: `/frontend/src/components/SurveyDialog.tsx`

#### Survey Fields
1. **Full Name** (pre-populated from user registration)
2. **Email** (pre-populated from user account)
3. **Age** (number input, 18-100 range)
4. **Gender** (radio: Male/Female/Other)
5. **Toronto Meaning** (radio: 5 options)
   - New beginning — fresh start/transition
   - Temporary stop — just a chapter
   - Place to visit — destination to explore
   - Land of opportunity — build wealth/career
   - Home — where I live, belong, feel rooted
6. **Personality** (radio: 5 options)
   - Ambitious — highly driven, go-getter
   - Adventurous — travel and try new things
   - Balanced — healthy mix of productivity and well-being
   - Intentional — quieter, mindful approach
   - Social — enjoy people, thrive on social energy
7. **Connection Type** (radio: 3 options)
   - Dating
   - Friendship/meet new people
   - Professional Connection
8. **Instagram Handle** (optional text input)
9. **How Heard About Us** (radio: 4 options)
   - Instagram
   - Event Brite
   - Friends/Family
   - Facebook

### 4.2 Custom Radio Button Components
**Key Innovation**: Custom radio buttons for cross-theme visibility

#### Problem Solved
- Native radio buttons invisible in dark mode
- Inconsistent styling across browsers

#### Solution
- Custom visual radio buttons with explicit styling
- Yellow selection indicator for brand consistency
- Hidden native radio inputs for accessibility
- Proper cursor states and transitions

### 4.3 Backend Implementation
**File**: `/backend/handlers/survey.go`

#### Database Schema
```sql
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    userId UUID REFERENCES users(id) ON DELETE CASCADE,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 100),
    gender VARCHAR(20) NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    torontoMeaning VARCHAR(100) NOT NULL CHECK (torontoMeaning IN (...)),
    personality VARCHAR(50) NOT NULL CHECK (personality IN (...)),
    connectionType VARCHAR(50) NOT NULL CHECK (connectionType IN (...)),
    instagramHandle VARCHAR(100),
    howHeardAboutUs VARCHAR(50) NOT NULL CHECK (howHeardAboutUs IN (...)),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(userId)
);
```

#### One-Time Submission Constraint
- Database UNIQUE constraint on userId prevents multiple submissions
- Frontend shows "Completed" status and read-only mode after submission
- Backend returns 409 Conflict for duplicate submissions

#### API Endpoints
- `GET /api/survey-response` - Retrieve user's survey response
- `POST /api/survey-response` - Create new survey response

## 5. Toast Notification System

### 5.1 Implementation
**File**: `/frontend/src/components/Toast.tsx`

#### Features
- Context-based toast provider
- Multiple toast types: success, error, warning, info
- Auto-dismiss with configurable duration
- Manual close functionality
- Smooth animations (slide-in from right)
- Fixed positioning (top-right corner)

### 5.2 Integration Points
- **Cocktail Preference**: Success/error feedback
- **Survey Submission**: Success with extended duration (7s)
- **Form Validation**: Error messages for missing fields
- **Authentication**: Status updates

### 5.3 Replaced Browser Alerts
Eliminated all browser `alert()` calls with toast notifications:
- Better user experience
- Consistent with application design
- Non-blocking interface

## 6. Technical Improvements & Bug Fixes

### 6.1 Authentication Context Fixes
**Issue**: 401 Unauthorized errors for authenticated requests

**Root Cause**: 
- Wrong localStorage key ('token' vs 'auth_token')
- Incorrect context access pattern in backend handlers

**Solution**:
- Updated frontend to use correct 'auth_token' key
- Fixed backend handlers to use `middleware.GetUserFromContext(r)`

### 6.2 Database Migration Issues
**Issue**: 500 errors after database schema changes

**Root Cause**: Backend querying non-existent columns (dateOfBirth, currentCity)

**Solution**: Updated all SQL queries and Go structs to match new schema

### 6.3 Dark Mode Compatibility
**Issue**: Text visibility problems in light/dark modes

**Solutions**:
- Implemented responsive color classes throughout
- Custom radio button styling for cross-theme visibility
- Proper contrast ratios for all text elements
- Gradient backgrounds work in both themes

### 6.4 Form Data Issues
**Fixed**:
- Age field defaulting to 25 (now starts blank)
- Full name not pre-populated (now uses user.name from registration)
- Radio button selections invisible in dark mode (custom components)

## 7. Google Maps Integration

### 7.1 Implementation
**File**: `/frontend/src/components/GoogleMap.tsx`

#### Features
- Embedded Google Maps for venue location
- Fallback message when API key unavailable
- Responsive iframe sizing
- Proper error handling

#### Integration
- Full address: "563 King St W, Toronto, ON M5V 1M1"
- Embedded in venue location section
- Maintains aspect ratio across devices

## 8. Development & Deployment

### 8.1 Environment Setup
- **Frontend**: Vite + React + TypeScript
- **Backend**: Go with PostgreSQL
- **Development**: Docker Compose for local environment
- **Database**: PostgreSQL with UUID extensions and triggers

### 8.2 Project Structure
```
elephanto-events/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CocktailDialog.tsx (NEW)
│   │   │   ├── SurveyDialog.tsx (NEW)
│   │   │   ├── Toast.tsx (NEW)
│   │   │   └── GoogleMap.tsx (NEW)
│   │   ├── pages/
│   │   │   └── Dashboard.tsx (REDESIGNED)
│   │   └── services/
│   │       ├── cocktailApi.ts (NEW)
│   │       └── surveyApi.ts (NEW)
├── backend/
│   ├── handlers/
│   │   ├── cocktail_preference.go (NEW)
│   │   └── survey.go (NEW)
│   └── db/migrations/
│       ├── 000005_add_cocktail_preferences.up.sql (NEW)
│       └── 000006_add_survey_responses.up.sql (NEW)
└── VELVET_HOUR_REDESIGN_PRD.md (NEW)
```

## 9. Success Metrics

### 9.1 User Experience Improvements
- ✅ Modern, cohesive design system
- ✅ Mobile-responsive layout
- ✅ Dark/light mode compatibility
- ✅ Improved navigation and information architecture

### 9.2 New Feature Adoption
- ✅ Cocktail preference collection system
- ✅ Comprehensive attendee survey system
- ✅ Enhanced event information presentation
- ✅ Better social media integration

### 9.3 Technical Quality
- ✅ Eliminated browser alerts in favor of toast notifications
- ✅ Fixed all authentication and authorization issues
- ✅ Resolved database migration conflicts
- ✅ Improved form validation and error handling

## 10. Future Enhancements

### 10.1 Potential Improvements
- Analytics dashboard for admin users
- Advanced filtering and search for attendee connections
- Event photo gallery integration
- Push notifications for event updates
- QR code check-in system for event day

### 10.2 Scalability Considerations
- Database indexing optimization
- CDN integration for static assets
- Caching strategies for frequently accessed data
- Load testing for concurrent user scenarios

## Conclusion

The Velvet Hour redesign successfully transforms the ElephantTO Events application into a modern, feature-rich platform that reflects the exclusive and intentional nature of the event. The combination of visual improvements, new functionality, and technical enhancements creates a compelling user experience that aligns with the event's premium positioning and community-focused mission.

All features have been implemented, tested, and are ready for the September 17th, 2025 event launch.