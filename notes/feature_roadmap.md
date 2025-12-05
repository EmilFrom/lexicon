# Feature Roadmap: Facebook Groups + Messenger Replacement

## Vision
Transform the app into a complete replacement for Facebook Groups and Messenger, providing all essential social and communication features in a native mobile experience.

---

## Tier 1 - Must Have Features 🔥

### 1. Create New Chat Channels
**Priority**: Critical  
**Effort**: Medium  
**Impact**: High

**Description**: Users can create new chat channels directly from the app without needing to access the Discourse web interface.

**Features**:
- "New Chat" button in chat list screen
- Search and select users to add to channel
- Set channel name and description
- Choose between Direct Messages (1-on-1) and Group Chats
- Set channel privacy (public/private)
- Add channel icon/avatar

**Technical Requirements**:
- API endpoint: `POST /chat/api/channels.json`
- User search/autocomplete component
- Channel creation form
- Handle permissions (who can create channels)

**User Flow**:
1. Tap "New Chat" button
2. Select chat type (Direct Message or Group)
3. Search and select participants
4. Set channel name and description (for groups)
5. Create channel → Navigate to new channel

---

### 2. Emoji Reactions to Messages
**Priority**: Critical  
**Effort**: Medium  
**Impact**: High

**Description**: Users can react to messages with emojis, providing quick acknowledgment and reducing need for short reply messages.

**Features**:
- Long-press message to show reaction picker
- Common reactions: 👍 ❤️ 😂 😮 😢 🙏
- Display reactions below message with count
- Show who reacted (tap to see list)
- Add/remove your own reactions
- Real-time reaction updates

**Technical Requirements**:
- API endpoint: `POST /chat/api/channels/:id/messages/:message_id/reactions.json`
- Reaction picker UI component
- Update message model to include reactions
- Real-time updates via polling or websockets
- Reaction animation on add

**UI Design**:
- Reactions appear as small emoji bubbles below message
- Show count next to each emoji
- Highlight user's own reactions
- Smooth add/remove animations

---

### 3. Reply to Specific Messages
**Priority**: Critical  
**Effort**: Medium  
**Impact**: High

**Description**: Users can reply to specific messages in a conversation, maintaining context in busy group chats.

**Features**:
- Swipe message to reply (iOS) or long-press → Reply (Android)
- Show quoted message in reply
- Tap quoted message to jump to original
- Visual connection between reply and original
- Works with text, images, and other media

**Technical Requirements**:
- Update message model to include `replyToMessageId`
- API support for message threading
- Quote message preview component
- Scroll-to-message functionality
- Handle deleted original messages gracefully

**UI Design**:
- Quoted message appears above reply with subtle background
- Thin vertical line connecting quote to reply
- Truncate long quoted messages
- Show sender name in quote

---

### 4. Message Search
**Priority**: High  
**Effort**: Medium-High  
**Impact**: High

**Description**: Users can search for messages across channels or within a specific channel.

**Features**:
- Global search across all channels
- Search within current channel
- Filter by sender, date range, media type
- Search results with context preview
- Jump to message in conversation
- Recent searches

**Technical Requirements**:
- API endpoint: `GET /chat/api/channels/:id/messages/search.json`
- Search UI component
- Debounced search input
- Result highlighting
- Pagination for results

**User Flow**:
1. Tap search icon in chat list or channel
2. Enter search query
3. View results with message preview
4. Tap result → Navigate to message in context
5. Highlight searched message

---

## Tier 2 - High Value Features ⭐

### 5. Typing Indicators
**Priority**: High  
**Effort**: Medium  
**Impact**: Medium

**Description**: Show when other users are actively typing in a channel.

**Features**:
- "User is typing..." indicator at bottom of chat
- Show up to 3 users typing
- Auto-hide after 5 seconds of inactivity
- Animated dots

**Technical Requirements**:
- WebSocket or polling for typing events
- Debounced typing detection
- Handle multiple users typing
- Efficient state management

---

### 6. User Presence/Online Status
**Priority**: High  
**Effort**: Medium  
**Impact**: Medium

**Description**: Show which users are currently online or when they were last active.

**Features**:
- Green dot for online users
- "Active 5m ago" timestamp
- Show in user list, profiles, and chat headers
- Privacy settings (hide status)

**Technical Requirements**:
- API endpoint: `GET /chat/api/users/presence.json`
- Presence tracking system
- Efficient polling or WebSocket updates
- User preference for visibility

---

### 7. @Mentions in Posts
**Priority**: High  
**Effort**: Low-Medium  
**Impact**: Medium

**Description**: Tag specific users in posts (not just comments) to notify them.

**Features**:
- Type @ to trigger user autocomplete
- Highlight mentioned users in post
- Send notification to mentioned users
- @everyone for announcements (admin only)
- @channel for all channel members

**Technical Requirements**:
- Mention autocomplete component
- Parse mentions in post content
- Notification system integration
- Permission checks for @everyone

---

### 8. Voice Messages
**Priority**: Medium  
**Effort**: High  
**Impact**: Medium

**Description**: Record and send voice messages in chat.

**Features**:
- Hold to record, release to send
- Slide to cancel recording
- Waveform visualization during recording
- Playback controls (play/pause, seek)
- Show duration
- Auto-play next voice message

**Technical Requirements**:
- Audio recording API (expo-av)
- Audio upload to server
- Waveform generation
- Audio player component
- File size limits

---

## Tier 3 - Nice to Have Features ✨

### 9. Message Editing/Deletion
**Priority**: Medium  
**Effort**: Medium  
**Impact**: Medium

**Description**: Edit or delete sent messages.

**Features**:
- Edit message within 15 minutes
- Show "edited" label
- Delete for everyone (within time limit)
- Delete for yourself only
- Confirmation dialog for deletion

**Technical Requirements**:
- API endpoints for edit/delete
- Time-based permission checks
- Update UI in real-time
- Handle deleted message references (in replies)

---

### 10. Post Reactions (Beyond Likes)
**Priority**: Medium  
**Effort**: Low  
**Impact**: Low-Medium

**Description**: Multiple reaction types on posts, similar to Facebook.

**Features**:
- Long-press like button → reaction picker
- Reactions: Like, Love, Haha, Wow, Sad, Angry
- Show reaction counts
- See who reacted with what

**Technical Requirements**:
- Update post model for reactions
- Reaction picker UI
- API support for multiple reaction types

---

### 11. GIF Support
**Priority**: Medium  
**Effort**: Medium  
**Impact**: Low-Medium

**Description**: Search and send animated GIFs in chat.

**Features**:
- GIF picker with search (Giphy/Tenor API)
- Trending GIFs
- Recent GIFs
- Inline GIF playback
- Auto-play on scroll

**Technical Requirements**:
- Giphy or Tenor API integration
- GIF picker component
- Efficient GIF loading and caching
- Handle large file sizes

---

### 12. Events
**Priority**: Low-Medium  
**Effort**: High  
**Impact**: Medium

**Description**: Create and manage events within groups.

**Features**:
- Create event with date, time, location
- RSVP (Going/Maybe/Not Going)
- See attendee list
- Event reminders
- Calendar integration
- Event updates/notifications

**Technical Requirements**:
- Event data model
- Calendar UI component
- Notification system for reminders
- Native calendar integration (expo-calendar)

---

### 13. Notification Settings per Channel/Category
**Priority**: Medium  
**Effort**: Low  
**Impact**: Medium

**Description**: Granular control over notifications.

**Features**:
- Mute specific channels (1h, 8h, 1 week, forever)
- Custom notification sounds per channel
- Notification preview on/off
- Separate settings for mentions vs regular messages

**Technical Requirements**:
- Store notification preferences per channel
- Update notification handling logic
- Settings UI component

---

### 14. Camera Integration
**Priority**: Low  
**Effort**: Low  
**Impact**: Low

**Description**: Take photos/videos directly in app.

**Features**:
- Camera button in message input
- Take photo or video
- Quick send without saving to gallery
- Basic filters/editing

**Technical Requirements**:
- expo-camera integration
- Camera UI component
- Direct upload flow

---

### 15. Video Messages
**Priority**: Low  
**Effort**: Medium  
**Impact**: Low

**Description**: Send short video clips in chat.

**Features**:
- Record short videos (up to 60s)
- Inline video playback
- Thumbnail preview
- Compression for upload

**Technical Requirements**:
- Video recording API
- Video player component
- Video compression
- Upload progress indicator

---

### 16. User Blocking & Reporting
**Priority**: Medium  
**Effort**: Low-Medium  
**Impact**: Medium

**Description**: Block users and report inappropriate content.

**Features**:
- Block user from profile
- Hide blocked user's content
- Report messages/posts
- Admin review system

**Technical Requirements**:
- Block list management
- Filter blocked content
- Reporting API
- Admin moderation tools

---

### 17. Chat Themes/Customization
**Priority**: Low  
**Effort**: Medium  
**Impact**: Low

**Description**: Customize chat appearance.

**Features**:
- Custom bubble colors per chat
- Chat backgrounds/wallpapers
- Emoji/nickname for chats
- Dark mode per chat

**Technical Requirements**:
- Theme storage per channel
- Dynamic styling system
- Background image support

---

## Implementation Strategy

### Phase 1: Core Communication (Tier 1)
**Timeline**: 4-6 weeks
1. Create New Chat Channels (Week 1-2)
2. Emoji Reactions (Week 2-3)
3. Reply to Messages (Week 3-4)
4. Message Search (Week 4-6)

### Phase 2: Social Features (Tier 2)
**Timeline**: 4-6 weeks
1. Typing Indicators (Week 1)
2. User Presence (Week 1-2)
3. @Mentions in Posts (Week 2-3)
4. Voice Messages (Week 3-6)

### Phase 3: Polish & Extras (Tier 3)
**Timeline**: 6-8 weeks
- Prioritize based on user feedback
- Implement in order of user demand
- A/B test features before full rollout

---

## Success Metrics

**Tier 1 Features**:
- Channel creation rate
- Reaction usage per message
- Reply usage in group chats
- Search queries per user

**Tier 2 Features**:
- User engagement with typing indicators
- Presence check frequency
- Mention usage in posts
- Voice message adoption rate

**Tier 3 Features**:
- Feature-specific engagement metrics
- User satisfaction scores
- Retention impact

---

## Technical Considerations

### API Requirements
- Ensure Discourse API supports all features
- May need custom plugins for some features
- Consider GraphQL vs REST for complex queries

### Performance
- Efficient polling/WebSocket strategy
- Image/video compression
- Lazy loading for media
- Cache management

### UX Consistency
- Follow platform conventions (iOS/Android)
- Maintain design system
- Accessibility compliance
- Smooth animations

### Testing
- Unit tests for new components
- Integration tests for API calls
- E2E tests for critical flows
- Performance testing for media features
