# Open Finance Setup

## Objetivo
Implementar integrações bancárias reais sem expor segredos no app mobile.

## Princípios de segurança
- Nunca armazenar `client_secret` do provedor no app.
- Nunca chamar API bancária direto do React Native.
- Sempre intermediar consentimento, sync e webhooks por backend seguro.
- Validar o usuário do app com Firebase Auth antes de aceitar pedidos de conexão.

## Coleções usadas
- `open_finance_connection_requests`
- `open_finance_connections`
- `open_finance_sync_jobs`
- `transacoes_kipo`

## Fluxo recomendado
1. O app grava uma solicitação em `open_finance_connection_requests`.
2. O backend seguro consome a solicitação.
3. O backend abre/gera o fluxo do provedor Open Finance.
4. Após consentimento, o backend cria/atualiza `open_finance_connections`.
5. O backend sincroniza contas, saldos e transações.
6. O backend normaliza transações para `transacoes_kipo` com `origem = open_finance`.

## Regras mínimas esperadas
- Usuário só lê documentos do próprio `uid`.
- Usuário pode criar apenas a própria solicitação de conexão.
- Atualização de `open_finance_connections` deve ser feita só pelo backend.
- Atualização de `open_finance_sync_jobs.status` deve ser feita só pelo backend.

## Backend ideal
- Cloud Functions / Cloud Run / servidor privado
- Credenciais do provedor em variáveis seguras
- Webhook para atualizações incrementais
- Deduplicação por `providerTransactionId`

## Provider sugerido
- Pluggy

## Próximo passo real para produção
- Configurar backend seguro com Pluggy
- Criar regras do Firestore
- Mapear contas e transações do provedor para o modelo do Kipo
