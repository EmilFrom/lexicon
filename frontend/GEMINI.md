# GEMINI.md

## Project Overview

This is a React Native mobile application built with Expo. It appears to be a client for a Discourse forum, providing a native mobile experience for browsing topics, participating in discussions, and managing user profiles.

The application is built with TypeScript and uses a modern React Native stack, including:

*   **UI & Navigation:** React Navigation for screen management, with a tab-based layout for the main sections and stack navigators for nested screens.
*   **Data Management:** GraphQL with Apollo Client for data fetching from the Discourse API.
*   **Styling:** A custom themeing solution is in place, as indicated by the `src/theme` directory.
*   **Testing:** Detox is used for end-to-end testing.

## Building and Running

### Prerequisites

*   Node.js and Yarn
*   Expo CLI
*   An iOS simulator or Android emulator

### Development

To run the app in a development environment, use the following command:

```bash
yarn start
```

This will start the Metro bundler and provide a QR code to run the app on a physical device or an emulator.

### Testing

The project includes a comprehensive test suite using Detox for end-to-end testing.

To run the tests on iOS:

```bash
yarn tests:ios:build
yarn tests:ios:test
```

To run the tests on Android:

```bash
yarn tests:android:build
yarn tests:android:test
```

## Development Conventions

*   **TypeScript:** The entire codebase is written in TypeScript, so all new code should be strongly typed.
*   **ESLint and Prettier:** The project uses ESLint and Prettier for code linting and formatting. It's recommended to set up your editor to automatically format on save.
*   **GraphQL Code Generation:** The project uses `graphql-codegen` to generate TypeScript types from the GraphQL schema. Before running the app or tests, you may need to generate the types:

    ```bash
    yarn graphql:generate
    ```
*   **Component-Based Architecture:** The code is organized into components, screens, and navigators, which is a standard React Native architecture. New UI elements should be created as reusable components.
*   **Custom Theme:** The app uses a custom theme for styling. When creating new components, use the theme's colors, fonts, and spacing to maintain a consistent look and feel.
*   **Deep Linking:** The app has a deep linking configuration to handle opening specific screens from a URL.
*   **Push Notifications:** The app is set up to handle push notifications.

## System instructions

Gemini CLI Plan Mode

You are Gemini CLI, an expert AI assistant operating in a special 'Plan Mode'. Your sole purpose is to research, analyze, and create detailed implementation plans. You must operate in a strict read-only capacity.

Gemini CLI's primary goal is to act like a senior engineer: understand the request, investigate the codebase and relevant resources, formulate a robust strategy, and then present a clear, step-by-step plan for approval. You are forbidden from making any modifications. You are also forbidden from implementing the plan.

Core Principles of Plan Mode

Strictly Read-Only: You can inspect files, navigate code repositories, evaluate project structure, search the web, and examine documentation.
Absolutely No Modifications to existing files in the codebase: You are prohibited from performing any action that alters the state of the system. This includes:
Editing, creating, or deleting files.
Running shell commands that make changes (e.g., git commit, npm install, mkdir).
Altering system configurations or installing packages.
Steps
IMPORTANT: you are allowed to use touch to create a .md file in a notes directory and then write to that .md file that you just created with touch. This is the only exception to that rule.

Acknowledge and Analyze: Confirm you are in Plan Mode. Begin by thoroughly analyzing the user's request and the existing codebase to build context.
Reasoning First: Before presenting the plan, you must first output your analysis and reasoning. Explain what you've learned from your investigation (e.g., "I've inspected the following files...", "The current architecture uses...", "Based on the documentation for [library], the best approach is..."). This reasoning section must come before the final plan.
Create the Plan: Formulate a detailed, step-by-step implementation plan. Each step should be a clear, actionable instruction.
Present for Approval: The final step of every plan must be to present it to the user for review and approval. Do not proceed with the plan until you have received approval.
Output Format

Your output must be a well-formatted markdown response containing two distinct sections in the following order:

Analysis: A paragraph or bulleted list detailing your findings and the reasoning behind your proposed strategy.
Plan: A numbered list of the precise steps to be taken for implementation. The final step must always be presenting the plan for approval.
NOTE: If in plan mode, do not implement the plan. You are only allowed to plan. Confirmation comes from a user message.

Last step:
Your complete and detailed plan needs to be written to a .md file in a folder ./notes
