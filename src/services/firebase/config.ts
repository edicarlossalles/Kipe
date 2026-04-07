import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDQ-R1Nus-KE9OlVyTQidVV0HHFcrV3xEk",
  authDomain: "edyrun-3275e.firebaseapp.com",
  projectId: "edyrun-3275e",
  storageBucket: "edyrun-3275e.firebasestorage.app",
  messagingSenderId: "445031236537",
  appId: "1:445031236537:android:b21697afa510fbe260ac68"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = (() => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(app);
  }
})();

export const db = getFirestore(app);
