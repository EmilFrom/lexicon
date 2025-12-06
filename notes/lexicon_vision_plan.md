# Lexicon App: Architecture Vision & Roadmap

## 1. Executive Summary
The goal is to transform the Lexicon app into a user-driven community platform where users can self-organize. Unlike a traditional Discourse forum where admins create structure, Lexicon empowers users to create **Projects** (Categories) and **Chats** (Channels/DMs) dynamically.

## 2. Concept Mapping
We will map the user's desired features to Discourse's core primitives.

| App Feature | Discourse Concept | Description |
| :--- | :--- | :--- |
| **Project** | **Category** | A public space for a topic. Contains Topics (Posts) and potentially a Chat Channel. |
| **Project Chat** | **Category Channel** | A real-time chat room attached to a specific Category. Visible to project members. |
| **Ad-hoc Group** | **Personal Message (PM)** | A private group chat for specific users (e.g., "Roskilde Festival"). |
| **Feed** | **Latest Topics** | The main feed showing activity from all Categories (filtered by user preferences). |

## 3. Detailed Feature Specifications

### 3.1. User-Created Projects (Categories)
*   **User Story**: "I want to create a new project called 'Urban Gardening' that everyone can see."
*   **Technical Challenge**: By default, only Admins can create Categories.
*   **Solution**: Use the **Lexicon Plugin** to expose a secure endpoint `POST /lexicon/projects`.
    *   The plugin will create a Discourse Category on behalf of the user.
    *   It will automatically set permissions (Everyone: See/Create/Reply).
    *   It will make the creator the "Category Owner" (if we implement ownership logic).

### 3.2. Project Notifications
*   **User Story**: "I want to browse 'Urban Gardening' but not get buzzed every time someone posts."
*   **Technical Implementation**: Use Discourse's Notification Levels.
    *   **Watching**: Notify for everything.
    *   **Tracking**: Notify if mentioned or replied to (show new count).
    *   **Regular**: Normal behavior.
    *   **Muted**: Hide from feed.
*   **UI**: A simple "Bell" icon on the Project page to toggle these states.

### 3.3. Project Chats (Contextual Channels)
*   **User Story**: "I want a chat room for the 'Urban Gardening' project to discuss quick things."
*   **Technical Implementation**: Discourse Chat Plugin.
    *   When a Project is created, the Plugin can optionally create a **Category Channel** linked to it.
    *   Alternatively, users can create a channel later.
    *   **Permissions**: Inherit from the Category. If the Category is public, the Chat is public.

### 3.4. Ad-hoc Group Chats (Direct Messages)
*   **User Story**: "I want to chat with Emil and Sarah about the festival."
*   **Technical Implementation**: **Traditional Personal Messages (PMs)**.
    *   **Status**: **ALREADY IMPLEMENTED** (Phase 2.5).
    *   **Enhancement**: Ensure "Add User" functionality is smooth in the UI.

## 4. The Role of `discourse-lexicon-plugin`
Since we need to bypass standard Discourse permission models (e.g., letting regular users create Categories), the Ruby on Rails plugin is critical.

### Required Capabilities:
1.  **Project Creation Proxy**: An endpoint that accepts a project name/description and creates a Category.
2.  **Channel Management**: Endpoints to create/archive chat channels if the standard API is too restrictive.
3.  **User Roles**: Automatically granting necessary Trust Levels or Group memberships upon sign-up so users can perform these actions (or handling it entirely server-side).

## 5. Roadmap

### Phase 1: Foundation (Completed) ✅
*   Hybrid Messaging Architecture (Channels + DMs).
*   Basic Navigation and UI.

### Phase 2: Plugin Integration (Next Steps) 🚧
*   **Action**: Import `discourse-lexicon-plugin` to workspace.
*   **Analysis**: Review existing endpoints and add missing ones for Category/Channel creation.
*   **Backend Work**: Implement `POST /lexicon/projects`.

### Phase 3: Project (Category) Features 🏗️
*   **Frontend**: Create "New Project" screen.
*   **Frontend**: Build "Project Detail" screen (Feed + Chat tab).
*   **Backend**: Connect to Plugin API.

### Phase 4: Advanced Chat Features 💬
*   **Feature**: "Invite to Chat" (Add users to existing PMs).
*   **Feature**: "Project Chat" (Link Chat to Category).

### Phase 5: Web Support (V2) 🌐
*   **Goal**: Deploy the Expo app as a PWA/Web App to replace the confusing default interface.

## 6. Immediate Action Items
1.  **Upload Plugin**: Please add the `discourse-lexicon-plugin` code to the workspace.
2.  **Review Plugin**: I will analyze the Ruby code to see how we can extend it.
3.  **Prototype**: We can start building the "New Project" UI while the backend is being prepared.
