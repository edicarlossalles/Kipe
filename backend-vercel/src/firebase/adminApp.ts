import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getEnvironment } from '../config/environment.js';

const environment = getEnvironment();

const adminApp = getApps().length > 0
  ? getApp()
  : initializeApp({
      credential: cert({
        projectId: environment.firebaseProjectId,
        clientEmail: environment.firebaseClientEmail,
        privateKey: environment.firebasePrivateKey,
      }),
      projectId: environment.firebaseProjectId,
    });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);
