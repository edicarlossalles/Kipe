function readFromProcess(name: string): string | undefined {
  return process.env[name];
}

function readRequired(name: string): string {
  const value = readFromProcess(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readJson<T>(name: string, fallback: T): T {
  const raw = readFromProcess(name);
  if (!raw) {
    return fallback;
  }

  return JSON.parse(raw) as T;
}

export interface PluggyEnvironment {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
  webhookSecret?: string;
  connectorIds: Record<string, number>;
}

export function getPluggyEnvironment(): PluggyEnvironment {
  return {
    clientId: readRequired('PLUGGY_CLIENT_ID'),
    clientSecret: readRequired('PLUGGY_CLIENT_SECRET'),
    baseUrl: readFromProcess('PLUGGY_BASE_URL') ?? 'https://api.pluggy.ai',
    webhookSecret: readFromProcess('PLUGGY_WEBHOOK_SECRET'),
    connectorIds: readJson<Record<string, number>>('PLUGGY_CONNECTOR_IDS_JSON', {}),
  };
}
