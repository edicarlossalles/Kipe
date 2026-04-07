# Open Finance Backend

## Objetivo
Implementar integrações bancárias reais sem expor segredos no app mobile.

## O que foi estruturado
- `functions/` com backend seguro em Firebase Functions
- contratos compartilhados em `shared/openFinance/contracts.ts`
- filas Firestore para conexão, sincronização e webhook
- normalização de contas e transações em `transacoes_kipo`
- regras e índices do Firestore para os fluxos novos

## Princípios de segurança
- Nunca armazenar `PLUGGY_CLIENT_SECRET` no app.
- Nunca chamar Pluggy direto do React Native.
- Sempre intermediar consentimento, sync e webhook pelo backend.
- Não manter CPF/CNPJ em coleções permanentes depois de criar a conexão.
- Usuário só lê documentos do próprio `uid`.
- Escrita sensível em conexões, webhooks e transações bancárias fica restrita ao backend.

## Fluxo ponta a ponta
1. O app cria um documento em `open_finance_connection_requests` com instituição e CPF/CNPJ.
2. A Function `onOpenFinanceConnectionRequestCreated` resolve o `connectorId`, consulta o conector Pluggy e cria o `Item`.
3. A conexão é gravada em `open_finance_connections` com `providerItemId`, `consentUrl` e status.
4. O app observa a conexão e abre o `consentUrl`.
5. O Pluggy envia webhooks para `pluggyWebhook`.
6. O webhook é persistido em `open_finance_webhook_events` e processado de forma assíncrona.
7. Em `item/created`, `item/updated` ou `transactions/created`, o backend cria um job em `open_finance_sync_jobs`.
8. A Function `onOpenFinanceSyncJobCreated` executa `PATCH /items/{id}`, busca contas e transações e atualiza:
- `open_finance_accounts`
- `open_finance_transactions_raw`
- `transacoes_kipo`

## Variáveis necessárias
```bash
PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=
PLUGGY_WEBHOOK_SECRET=
OPEN_FINANCE_WEBHOOK_URL=
PLUGGY_CONNECTOR_IDS_JSON={"nubank":601,"caixa":602}
```

## Fontes oficiais
- [Pluggy Creating an Item](https://docs.pluggy.ai/docs/creating-an-item)
- [Pluggy Item Update](https://docs.pluggy.ai/reference/items-update)
- [Pluggy Webhooks](https://docs.pluggy.ai/docs/webhooks)
- [Pluggy Transactions](https://docs.pluggy.ai/docs/transactions)

## Limites honestos
- A estrutura do backend está pronta no código, mas eu não validei execução real porque este ambiente não consegue rodar `node` nem publicar Functions.
- Os `connectorId` reais ainda precisam ser preenchidos com os valores da sua conta Pluggy.
- Se a sua conta Pluggy exigir Pluggy Connect para criação, será necessário adaptar a etapa de consentimento para Connect Token em vez de `POST /items`.
