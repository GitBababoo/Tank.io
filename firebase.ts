
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAIWwIREufrveFVmR8mVwQB6mOBqva4CE",
  authDomain: "tank-io-5980e.firebaseapp.com",
  projectId: "tank-io-5980e",
  storageBucket: "tank-io-5980e.firebasestorage.app",
  messagingSenderId: "122542119272",
  appId: "1:122542119272:web:d61d4914dbeb0fcb7b9edd",
  databaseURL: "https://tank-io-5980e-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Initialize Firebase (Check for existing app to prevent duplicate init during hot-reload)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Services
export const auth = getAuth(app);
export const db = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();
