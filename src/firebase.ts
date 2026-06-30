// Client-side Firebase helper
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut, User as FirebaseUser } from "firebase/auth";

let firebaseApp: any = null;
let firebaseAuth: any = null;
let isRealFirebase = false;

// Check for VITE_ environment variables first
const envConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Wrap initialization in a promise to avoid top-level await build limits
const initFirebasePromise = (async () => {
  try {
    if (envConfig.apiKey) {
      firebaseApp = initializeApp(envConfig);
      firebaseAuth = getAuth(firebaseApp);
      isRealFirebase = true;
      console.log("[Firebase] Successfully initialized with environment variables.");
    } else {
      const res = await fetch("/firebase-applet-config.json");
      if (res.ok) {
        const config = await res.json();
        if (config && config.apiKey) {
          firebaseApp = initializeApp(config);
          firebaseAuth = getAuth(firebaseApp);
          isRealFirebase = true;
          console.log("[Firebase] Successfully initialized with cloud project config JSON.");
        }
      }
    }
  } catch (e) {
    console.warn("[Firebase] Config not found or inactive. Falling back to Local Simulated Credentials.");
  }
})();

export { isRealFirebase };

// Mock auth state for elegant local previewing
interface MockUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
}

export const googleProvider = null; // Lazy loaded later if needed

export async function loginWithGoogle(): Promise<MockUser | FirebaseUser> {
  await initFirebasePromise;
  if (isRealFirebase && firebaseAuth) {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  } else {
    // Simulated Google Login
    return {
      uid: "guest-user-123",
      email: "junarhussain@gmail.com",
      displayName: "Productivity Champion"
    };
  }
}

export async function signOutUser() {
  await initFirebasePromise;
  if (isRealFirebase && firebaseAuth) {
    await fbSignOut(firebaseAuth);
  }
}

export function onAuthStateChangedListener(callback: (user: MockUser | FirebaseUser | null) => void) {
  let isUnsubscribed = false;
  let fbUnsub: any = null;

  initFirebasePromise.then(() => {
    if (isUnsubscribed) return;
    if (isRealFirebase && firebaseAuth) {
      fbUnsub = firebaseAuth.onAuthStateChanged(callback);
    } else {
      // Mock standard immediate login for instant interactive iframe
      setTimeout(() => {
        if (isUnsubscribed) return;
        callback({
          uid: "guest-user-123",
          email: "junarhussain@gmail.com",
          displayName: "Productivity Champion"
        });
      }, 100);
    }
  });

  return () => {
    isUnsubscribed = true;
    if (fbUnsub) fbUnsub();
  };
}
