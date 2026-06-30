# 🕒 Last-Minute Life Saver

A highly advanced, supportive, and non-judgmental **AI Productivity Co-Pilot** designed specifically for high-stress achievers, students, and professionals dealing with tight deadlines, procrastination, and heavy workloads. 

**Last-Minute Life Saver** goes beyond standard task list trackers by dynamically scheduling work-blocks around your natural daily biological energy peaks, predicting looming deadline risks, gamifying focus metrics with collectible achievements, and offering instant voice command synchronization.

---

## 🚀 Key Architectural Features

### 📊 1. Dynamic Dashboard & Deadline Risk Predictor
*   **Deadline Risk Index**: Automatically visualizes which projects or assignments require immediate attention with high-contrast warning badges.
*   **Daily Progression Trackers**: Beautiful visual charts rendering completed vs. outstanding tasks, XP totals, and active habit metrics.
*   **Quota-Preserving AI Reminders**: Serves intelligent, context-aware reminders summarizing active tasks and planning suggestions while utilizing smart server-side caching to guarantee reliability under heavy use.

### ⚡ 2. Peak Energy Scheduler (Biological Hours Mapping)
*   **Chronotype Customization**: Define your peak biological hours (Morning Focus, Afternoon Slump, Late Night Burst) to map tasks directly to your highest-energy states.
*   **Dynamic Calendar Blocks**: Interactive timeline displaying active workspace intervals, helping you distribute work naturally and avoid last-minute cramming.

### 🎙️ 3. Natural Language Voice Command Deck
*   **Speech-to-Action NLP**: Click suggested quick-actions or use your microphone to naturally speak instructions like *"Add task study biology tomorrow"* or *"Complete task Javascript homework"*.
*   **Workspace Action Synchronization**: Translates spoken commands into backend state actions (database creation, completion toggles, view changes) on the fly, accented by satisfying haptic animations.

### 🤖 4. AI Saviour Coach Chatbot
*   **Supportive, Non-Judgmental Context**: An active conversational partner to talk through feelings of anxiety, break down complex project rubrics into tiny atomic tasks, and build custom weekly agendas.
*   **Workspace Memory Integration**: The Coach is fully aware of your current tasks, deadlines, and completed milestones, ensuring every reply is perfectly tuned to your schedule.

### 🏆 5. Gamified Milestones & Leaderboards
*   **Focus Medals**: Unlock collectible status badges like *Focus Champion*, *Deadline Destroyer*, and *Consistency King* by executing high-priority tasks.
*   **XP Progression & Ranks**: Compare focus metrics with other high-stress achievers on a social leaderboard to stay inspired and defeat procrastination.

---

## 🛠️ Technical Stack & Architecture

### Frontend
*   **Framework**: React 18+ with Vite (TypeScript)
*   **Animations**: Liquid smooth layout micro-animations via `motion` (Framer Motion)
*   **Styling**: High-contrast modern UI built with custom Tailwind CSS utility classes supporting full Responsive Layouts (Mobile, Tablet, Desktop)
*   **Charts**: Precision data visualization via Recharts & Lucide Icons

### Backend
*   **Server**: Node.js Express server running fully compiled TypeScript
*   **AI Engine**: Modern `@google/genai` TypeScript SDK proxying all context queries, chat records, and NLP classifications securely server-side
*   **Durable Cloud Storage**: Unified Firebase Firestore connection with automatic server-side data synchronization
*   **Resiliency Design**: Intelligent fallback caches protecting third-party model quotas and maintaining responsiveness during connection transitions

---

## 📦 Directory Structure

```text
├── server/
│   └── dbStore.ts          # Central memory sync engine & local database store
├── src/
│   ├── components/
│   │   ├── CoachView.tsx       # AI Coach chatbot and Voice Hub with NLP command processor
│   │   ├── DashboardView.tsx   # Aggregated analytics, charts, and deadline predictions
│   │   ├── GoalsView.tsx       # Long-term milestones management
│   │   ├── HabitsView.tsx      # Daily atomic habit and streak tracker
│   │   ├── LeaderboardView.tsx # Gamified profile badges and global leaderboards
│   │   ├── SchedulerView.tsx   # Peak Biological energy hours and active workspace scheduler
│   │   └── TasksView.tsx       # Task management cards, prioritization, and filters
│   ├── App.tsx             # Main router, navigation dashboard, and authentication gate
│   ├── firebase.ts         # Firebase client config and credentials check
│   ├── index.css           # Global typography, color theme, and Tailwind imports
│   ├── main.tsx            # React entrypoint
│   └── types.ts            # Shared workspace TypeScript interfaces
├── server.ts               # Express entrypoint, API routes, and AI prompt template wrappers
├── package.json            # Build compilation targets and dependency list
└── metadata.json           # Application configurations and hardware permission parameters
```

---

## 🚦 Local Setup & Run Instructions

### 1. Prerequisite Packages
Ensure you have **Node.js (v18+)** and **npm** installed.

### 2. Dependency Installation
Install all dependencies listed in the manifest:
```bash
npm install
```

### 3. Environment Variables Setup
Create a `.env` file in the root directory based on `.env.example`:
```env
# Server-side secrets (never exposed to client browser)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Running the Applet
To boot the Node server and launch the Vite asset bundler in dynamic development mode:
```bash
npm run dev
```
The server will start running on **http://localhost:3000**.

### 5. Production Compilation
To bundle the frontend assets and compile the unified Node.js server for containerized deployment:
```bash
npm run build
```
Once the build concludes, launch the compiled production bundle via:
```bash
npm start
```

---

## 🔒 Security & Optimization Practices
*   **Strict Server-Side Secrets**: Private SDK keys remain safely guarded on the server side; no API keys are exposed to the browser context.
*   **Advanced Quota Caching**: Implements a strict memory cache layer intercepting repetitive AI reminder requests to optimize speed and strictly adhere to rate limits.
*   **Local Fallback Persistence**: Guarantees offline availability; if Firestore database connections are momentarily interrupted, client states continue updating seamlessly through local caches.
