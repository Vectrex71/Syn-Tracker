// Fallback Firebase Configuration for SYN-Tracker
export const defaultFirebaseConfig = {
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0389642675",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:684802988305:web:d03f2c096d8c7722b2d4b0",
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "dummy-api-key-for-local-build",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0389642675.firebaseapp.com",
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || "ai-studio-syntrackeronline-d2df4192-9183-490e-8f1d-023382f6c134",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0389642675.firebasestorage.app",
  messagingSenderId: "684802988305",
  measurementId: "",
  recaptchaSiteKey: ""
};

let resolvedConfig = defaultFirebaseConfig;

try {
  // In Vite / ES modules, we safely attempt to read or provide the config
  const globFn = (import.meta as any).glob;
  if (typeof globFn === 'function') {
    const raw = globFn('../../firebase-applet-config.json', { eager: true });
    const key = Object.keys(raw)[0];
    if (key && (raw[key] as any)?.default) {
      resolvedConfig = (raw[key] as any).default;
    }
  }
} catch {
  resolvedConfig = defaultFirebaseConfig;
}

export const firebaseConfig = resolvedConfig;
export default firebaseConfig;
