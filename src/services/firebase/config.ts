// src/services/firebase/config.ts

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAPv4YHG1ZLk3J2HctWn5CY1Bpuy3AlaeI",
  authDomain: "edyrun-3275e.firebaseapp.com",
  projectId: "edyrun-3275e",
  storageBucket: "edyrun-3275e.firebasestorage.app",
  messagingSenderId: "445031236537",
  appId: "1:445031236537:web:669efee5e293d16560ac68"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;