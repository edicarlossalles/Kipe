export interface BackendEnvironment {
  pluggyClientId: string;
  pluggyClientSecret: string;
  pluggyBaseUrl: string;
  pluggyWebhookSecret?: string;
  openFinancePublicBaseUrl: string;
  connectorIds: Record<string, number>;
  firebaseProjectId: string;
  firebaseClientEmail: string;
  firebasePrivateKey: string;
}

function readRequired(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readJson<T>(name: string, fallback: T): T {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  return JSON.parse(raw) as T;
}

export function getEnvironment(): BackendEnvironment {
  return {
    pluggyClientId: readRequired('PLUGGY_CLIENT_ID'),
    pluggyClientSecret: readRequired('PLUGGY_CLIENT_SECRET'),
    pluggyBaseUrl: process.env.PLUGGY_BASE_URL ?? 'https://api.pluggy.ai',
    pluggyWebhookSecret: process.env.PLUGGY_WEBHOOK_SECRET,
    openFinancePublicBaseUrl: readRequired('OPEN_FINANCE_PUBLIC_BASE_URL'),
    connectorIds: readJson<Record<string, number>>('PLUGGY_CONNECTOR_IDS_JSON', {}),
    firebaseProjectId: readRequired('FIREBASE_PROJECT_ID'),
    firebaseClientEmail: readRequired('FIREBASE_CLIENT_EMAIL'),
    firebasePrivateKey: readRequired('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  };
}
