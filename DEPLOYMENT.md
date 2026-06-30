# Production Deployment Playbook & Playbook Reference

This guide provides comprehensive, senior-level instructions for taking this **Full-Stack AI-Powered Gamified Productivity Platform** to production.

---

## 🚀 Architectural Overview

The application is structured as a modern, decoupled full-stack application:
1. **Frontend (Vite + React 19 + Tailwind CSS v4)**: A high-performance, single-page application (SPA).
2. **Backend (Express + TSX + Node.js)**: A secure REST API that proxy-requests to the Gemini SDK and manages the state integration layer.
3. **Database (Firebase Firestore)**: Dynamic persistence for user profiles, tasks, goals, habits, chats, and notification logs.
4. **Authentication (Firebase Auth)**: Secure token-based user sessions, including client-side Google popup authorization.

---

## 🛠️ Deployment Strategies

You can deploy this application as a **Monolith** (both frontend and backend on the same server) or in a **Decoupled Architecture** (frontend on a static host like Vercel/Netlify, backend on a container provider like Render/Railway/Cloud Run).

### Option A: Monolithic Deployment (Render, Railway, or Google Cloud Run) - *Recommended*
Since the repository includes an integrated Express server that serves static files in production, you can deploy the entire app as a single service.

#### Render Deployment Steps:
1. Create a new **Web Service** on Render and connect your Git repository.
2. Configure the following build settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
3. Add all your environment variables in the **Environment** tab (see [Environment Variables Reference](#-environment-variables-reference)).
4. Render will build the React SPA, compile the TypeScript server into `dist/server.cjs`, and launch it on port `3000`.

---

### Option B: Decoupled Deployment (Vercel/Netlify + Railway/Render)
If you prefer Vercel or Netlify for hosting the client-side SPA, you can host the frontend statically and run the Express API on a backend server.

#### Frontend (Vercel / Netlify):
1. Connect your repository to Vercel.
2. Set the build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Configure the **VITE_API_BASE_URL** public environment variable pointing to your deployed backend URL (e.g. `https://your-api.railway.app`).
4. Vercel will host your static files and automatically route any API requests to your external server via the built-in fetch interceptor.

#### Backend (Railway / Render / Cloud Run):
1. Create a Web Service and set:
   - **Build Command**: `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`
   - **Start Command**: `node dist/server.cjs`
2. Define the **CORS_ORIGIN** or let it allow access from your Vercel URL.
3. Configure your server-side environment variables (e.g. `GEMINI_API_KEY`, Firebase keys).

---

## 🔐 Environment Variables Reference

### 1. Server-Side Environment Variables (Private/Secret)
These must **ONLY** be specified on your backend hosting provider (Render/Railway). Never expose these to frontend static files.

| Variable Name | Required | Purpose / Explanation | Where to Obtain / Default Value |
| :--- | :---: | :--- | :--- |
| `GEMINI_API_KEY` | **Yes** | Powers all smart AI features (task breakdowns, AI calendar scheduler, context warnings, and coaching chats). | [Google AI Studio Secrets](https://aistudio.google.com/) |
| `FIREBASE_API_KEY` | **Yes** | Authorized token for server-side Firestore operations. | Firebase Console > Project Settings |
| `FIREBASE_PROJECT_ID` | **Yes** | Associates Firestore client with your database project. | Firebase Console > Project Settings |
| `FIREBASE_AUTH_DOMAIN` | **Yes** | Standard domain mapping for authenticating users. | `your-project-id.firebaseapp.com` |
| `FIREBASE_STORAGE_BUCKET` | No | Target bucket for any user-uploaded files. | `your-project-id.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID`| No | Authorized key for background system notifications.| Firebase Console > Cloud Messaging |
| `FIREBASE_APP_ID` | **Yes** | Unique identifier for your registered Web App. | Firebase Console > General |
| `FIREBASE_MEASUREMENT_ID` | No | Custom ID for tracking platform telemetry. | `G-XXXXXXXXXX` |
| `FIREBASE_DATABASE_ID` | No | Custom Database ID if using multiple Firestore DBs. | Default: `(default)` |
| `APP_URL` | No | Public URL used for generating redirects or headers. | E.g. `https://your-app.com` |
| `PORT` | No | Network interface port for Express server. | Default: `3000` |
| `CURRENT_TIME` | No | Custom override string for mocking deterministic dates. | Omit in prod (defaults to system time) |

### 2. Client-Side Environment Variables (Public)
These are compiled into the client bundle at build-time. Prefix with `VITE_` is mandatory.

| Variable Name | Required | Purpose / Explanation | Where to Obtain / Default Value |
| :--- | :---: | :--- | :--- |
| `VITE_API_BASE_URL` | No | Base URL of your backend API if hosted on a separate domain. | E.g. `https://my-backend-api.onrender.com` (Leave empty if monolith) |
| `VITE_FIREBASE_API_KEY` | **Yes** | Initializes client-side Google popup authentication. | Firebase Console > Project Settings |
| `VITE_FIREBASE_AUTH_DOMAIN` | **Yes** | Domain where authentication popup redirects. | `your-project-id.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | **Yes** | Targets client-side auth state with your project. | Firebase Console > Project Settings |
| `VITE_FIREBASE_STORAGE_BUCKET`| No | Path for uploading avatars/attachments. | `your-project-id.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | No | Sender routing for push notifications. | Firebase Console |
| `VITE_FIREBASE_APP_ID` | **Yes** | Matches web application client registration. | Firebase Console |
| `VITE_FIREBASE_MEASUREMENT_ID` | No | Client analytics tracking. | `G-XXXXXXXXXX` |
| `VITE_FIREBASE_DATABASE_ID` | No | Targets custom database on Firestore client. | `remixed-firestore-database-id` |

---

## 🔒 Firestore Security Rules

To ensure your production Firestore database is fully secure from malicious access, deploy these rules via the Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User Profile Rules
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Task Rules
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Goals Rules
    match /goals/{goalId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Habits Rules
    match /habits/{habitId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Notifications Rules
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Chats History Rules
    match /chats/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## ✅ Deployment Pre-flight Checklist

- [ ] **Verify Dependencies**: Run `npm run lint` and `npm run build` locally to guarantee zero compilation errors.
- [ ] **Register OAuth Redirect URIs**: Ensure that your deployed app URL (and your Vercel/Netlify domain) is added to your **Firebase Console > Authentication > Authorized Domains** list, otherwise Google Popup Login will fail.
- [ ] **Verify CORS Configuration**: If you decoupled the frontend and backend, ensure the Express backend is configured to accept requests from your Vercel/Netlify domain.
- [ ] **Check Client-side Env**: Make sure that all `VITE_` variables are correctly supplied in your static host dashboard (Vercel/Netlify).
- [ ] **Set Firestore Indexes**: Ensure that queries sorting tasks by deadline and risk score are supported by composite indexes if requested.
