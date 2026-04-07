import { VercelRequest } from '@vercel/node';
import { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../firebase/adminApp.js';

export async function requireUser(request: VercelRequest): Promise<DecodedIdToken> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('Missing Firebase authorization token.');
  }

  const idToken = authorization.slice('Bearer '.length);
  return adminAuth.verifyIdToken(idToken);
}
