# Velvet Hour Interactive Matching System

## Overview

The Velvet Hour is an interactive real-time matching system designed to facilitate meaningful connections at events. It transforms traditional networking by creating structured, timed interactions where attendees meet multiple people through organized rounds.

## Core Concept

The Velvet Hour creates a structured social experience where:
- Attendees are paired with different people for timed conversations
- Each round lasts for a configurable duration (default: 10 minutes)
- Participants get breaks between rounds (default: 5 minutes)
- After each round, participants provide feedback on their matches
- The system ensures no repeat pairings across all rounds

## System Architecture

### Database Schema

The system uses five main tables:
- `velvet_hour_sessions` - Session metadata and configuration
- `velvet_hour_participants` - User participation records
- `velvet_hour_matches` - Pairing information for each round
- `velvet_hour_feedback` - Post-round feedback collection
- `velvet_hour_questions` - Feedback questions configuration

### State Machine

The system operates through several states:
1. **Waiting** - Participants have joined but rounds haven't started
2. **Matched** - Participants are paired and can see their match
3. **In Round** - Active conversation period with countdown timer
4. **Feedback** - Collecting feedback after each round
5. **Break** - Rest period between rounds
6. **Completed** - All rounds finished

## Admin Controls

### Event Configuration

Admins can configure Velvet Hour settings for each event:

#### Three-Tier Control System:
1. **"The Hour Feature"** - Controls visibility of the Velvet Hour button
   - When disabled: Button is hidden from user dashboard
   - When enabled: Button appears but may show "Coming Soon"

2. **"Make Available to Users"** - Controls user access state
   - When disabled: Button shows "Coming Soon" and is disabled
   - When enabled: Button shows "Enter" and becomes clickable

3. **"Start Velvet Hour"** - Initiates the actual session
   - Creates session record and allows participants to join
   - Validates minimum attendance requirements

#### Configuration Options:
- **Round Duration**: Length of each conversation (default: 10 minutes)
- **Break Duration**: Rest time between rounds (default: 5 minutes) 
- **Total Rounds**: Number of matching rounds (default: 4)
- **Minimum Participants**: Required attendees to start (default: 8)

### Session Management

#### Starting a Session:
- Only users marked as "attending" the event can participate
- System validates minimum attendance (2x minimum participants)
- Creates session record with configuration settings
- Generates unique pairings for all rounds using greedy algorithm

#### Manual Matchmaking:
- Drag-and-drop interface for admin to create custom pairings
- Real-time visual representation of participant connections
- Ability to override algorithmic matching when needed

#### Session Controls:
- **Start Round**: Begins timed conversation period
- **End Round**: Moves all participants to feedback phase
- **Start Break**: Initiates break period between rounds
- **Reset Session**: Completely clears all session data for fresh start

### Admin Dashboard Features

#### Session Overview:
- Current active event display
- Participant count and status
- Round progress tracking
- Real-time session state monitoring

#### Participant Management:
- View all joined participants
- Monitor participant states
- Track completion status

#### Reset Functionality:
- Complete data cleanup for re-running sessions
- Removes all participants, matches, and feedback
- Allows fresh start for the same event

## User Experience

### Discovery and Access

#### Dashboard Integration:
- Velvet Hour appears as a button on the main dashboard
- Three states: Hidden, "Coming Soon", or "Enter"
- Only visible when admin enables "The Hour Feature"

#### Access Flow:
1. User sees "Coming Soon" when feature is enabled but not available
2. Admin enables "Make Available to Users" → Button shows "Enter"
3. User clicks "Enter" → Navigates to Velvet Hour page
4. If no session started → Shows "session not available" message
5. When session active → User can join and participate

### Participation Flow

#### Joining Session:
- User enters Velvet Hour page when session is active
- System checks if user is attending the event
- Non-attending users are blocked with clear messaging
- Successful join adds user to participant pool

#### Waiting Phase:
- Shows participant count and session status
- Displays "Waiting for session to begin..." message
- Real-time updates when admin starts rounds

#### Round Experience:
1. **Match Display**: Shows partner name and match details
2. **Countdown Timer**: Visual timer for conversation duration
3. **Round Completion**: Automatic transition to feedback phase

#### Feedback Collection:
- Post-round questionnaire about the interaction
- Questions cover connection quality and interest level
- Feedback stored for potential future use

#### Break Periods:
- Rest time between rounds with countdown
- Shows next round information
- Preparation messaging for upcoming matches

#### Completion:
- Summary of all completed rounds
- Thank you message and next steps
- Session completion acknowledgment

### Mobile-First Design

The entire experience is optimized for mobile devices:
- Responsive layout for all screen sizes
- Touch-friendly interface elements
- Clear typography and contrast
- Intuitive navigation and controls

## Technical Implementation

### Backend API Endpoints

#### Public Endpoints:
- `GET /api/velvet-hour/status` - Get current session status
- `POST /api/velvet-hour/join` - Join active session
- `POST /api/velvet-hour/feedback` - Submit round feedback

#### Admin Endpoints:
- `POST /api/admin/velvet-hour/start` - Create and start session
- `POST /api/admin/velvet-hour/start-round` - Begin round with pairings
- `POST /api/admin/velvet-hour/end-round` - Conclude current round
- `POST /api/admin/velvet-hour/start-break` - Initiate break period
- `POST /api/admin/velvet-hour/reset` - Clear all session data

### Frontend Components

#### User Components:
- `VelvetHour.tsx` - Main user experience page
- `VelvetHourWaiting.tsx` - Waiting room component
- `VelvetHourMatch.tsx` - Match display and timer
- `VelvetHourFeedback.tsx` - Post-round feedback form
- `VelvetHourComplete.tsx` - Session completion screen

#### Admin Components:
- `VelvetHourControl.tsx` - Session management interface
- `VelvetHourMatchmaking.tsx` - Drag-and-drop pairing tool
- Event configuration toggles integrated into admin panel

### Pairing Algorithm

The system uses a greedy algorithm to ensure unique pairings:
1. Tracks all previous matches for each participant
2. For each round, finds valid pairings avoiding repeats
3. Handles odd numbers by rotating participants out
4. Validates pairing feasibility before starting sessions

### Real-Time Updates

- Frontend polls backend every 3 seconds for status updates
- State synchronization between admin actions and user experience
- Automatic transitions between phases based on backend state

## Security and Validation

### Access Control:
- JWT authentication for all endpoints
- Admin role verification for management functions
- Event attendance validation for participation

### Data Integrity:
- Transaction-based database operations
- Validation of session states and transitions
- Prevention of duplicate session creation

### Business Logic Validation:
- Minimum participant requirements
- One-time session execution per event (unless reset)
- Pairing uniqueness across all rounds

## Error Handling

### Common Scenarios:
- Insufficient participants for session start
- Network connectivity issues during rounds
- Invalid state transitions
- Session conflicts and duplicates

### User-Friendly Messages:
- Clear error explanations
- Actionable next steps
- Graceful degradation when features unavailable

## Future Enhancements

### Potential Features:
- Advanced matching algorithms based on preferences
- Post-event connection facilitation
- Analytics and success metrics
- Integration with external communication platforms
- Customizable feedback questions per event

### Scalability Considerations:
- WebSocket integration for real-time updates
- Horizontal scaling for large events
- Caching strategies for high-frequency polling
- Performance optimization for mobile devices

## Troubleshooting

### Common Issues:
1. **Users can't join**: Check attendance status and session state
2. **Rounds won't start**: Verify minimum participants and admin permissions
3. **Pairing failures**: Check for sufficient participants for unique matches
4. **State inconsistencies**: Use reset functionality to clear corrupted data

### Admin Tools:
- Session reset for complete cleanup
- Real-time status monitoring
- Participant state inspection
- Backend logging for debugging

## Best Practices

### For Event Organizers:
- Test the system before the actual event
- Ensure clear communication about Velvet Hour timing
- Have backup plans for technical issues
- Monitor participation levels throughout

### For Admins:
- Start sessions only when sufficient participants have joined
- Use manual matchmaking for special requirements
- Monitor round progress and participant engagement
- Reset sessions only when necessary (clears all data)

### For Development:
- Follow the three-tier control system architecture
- Maintain state consistency across all components
- Implement proper error handling and user feedback
- Test thoroughly with various participant counts and scenarios