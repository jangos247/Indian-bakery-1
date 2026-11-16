import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, User } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

function createFirestoreDb() {
  try {
    return initializeFirestore(
      app,
      { experimentalAutoDetectLongPolling: true },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createFirestoreDb();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const OWNER_ADMIN_EMAIL = 'mohammadhisan552@gmail.com';

export const BOOTSTRAPPED_OWNER_EMAILS = [
  'mohammadhisan552@gmail.com',
  'jangos247@gmail.com',
  'peelfatherdotin@gmail.com',
] as const;

export function getResolvedUserEmail(user: User | null | undefined): string {
  if (!user) return '';
  if (user.email) return user.email.trim();
  const providerEmail = user.providerData?.find((p) => Boolean(p?.email))?.email;
  return providerEmail ? providerEmail.trim() : '';
}

export function emailToOwnerDocId(email: string): string {
  return email.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
}

export function isBootstrappedOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return BOOTSTRAPPED_OWNER_EMAILS.some((e) => e === normalized);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) ?? [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection(retried = false) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'settings', 'store'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('the client is offline') || message.includes('unavailable')) {
      if (!retried && typeof window !== 'undefined') {
        window.setTimeout(() => {
          void testConnection(true);
        }, 2500);
        return;
      }
      console.warn('Firestore connection delayed or offline; operating with local defaults until online.');
    }
  }
}

void testConnection();
