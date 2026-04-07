export const INSTITUTION_KEYS = [
  'nubank',
  'caixa',
  'itau',
  'bradesco',
  'banco_do_brasil',
  'santander',
] as const;

export function resolveConnectorId(institutionKey: string, connectorIds: Record<string, number>): number {
  const connectorId = connectorIds[institutionKey];
  if (!connectorId) {
    throw new Error(`Connector ID not configured for institution ${institutionKey}`);
  }

  return connectorId;
}
