// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDq5ny8-aysjvgB0mR2iKPIkJcKIzTPB3Q",
  authDomain: "stepsproject-9e095.firebaseapp.com",
  projectId: "stepsproject-9e095",
  storageBucket: "stepsproject-9e095.firebasestorage.app",
  messagingSenderId: "367350167177",
  appId: "1:367350167177:web:4610a380a7bd8edf67f858",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

// 🟢 Auth helpers
export const loginUser = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

export const registerUser = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

export const resetPassword = (email) =>
  sendPasswordResetEmail(auth, email);

export const signInWithGoogle = () => signInWithPopup(auth, provider);

export const signOut = () => fbSignOut(auth);

// ✅ NEW — Send verification email
export const sendVerificationEmail = async (user) => {
  if (user && !user.emailVerified) {
    await sendEmailVerification(user);
  }
};

