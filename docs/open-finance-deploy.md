# Deploy Open Finance

## 1. Pré-requisitos
- Node.js instalado e disponível no terminal
- npm disponível
- Firebase CLI instalado ou acessível por `npx firebase-tools`
- credenciais reais da Pluggy
- projeto Firebase já configurado

## 2. Arquivo de ambiente
Copie `functions/.env.example` para `functions/.env` e preencha:

```env
PLUGGY_CLIENT_ID=
PLUGGY_CLIENT_SECRET=
PLUGGY_BASE_URL=https://api.pluggy.ai
PLUGGY_WEBHOOK_SECRET=
OPEN_FINANCE_WEBHOOK_URL=https://us-central1-SEU_PROJECT_ID.cloudfunctions.net/pluggyWebhook
PLUGGY_CONNECTOR_IDS_JSON={"nubank":0,"caixa":0,"itau":601,"bradesco":0,"banco_do_brasil":0,"santander":0}
```

## 3. Instalação
No app:

```powershell
cd D:\Documentos\Kipo
npm install
```

Nas functions:

```powershell
cd D:\Documentos\Kipo\functions
npm install
```

## 4. Descobrir connector IDs da Pluggy
Use sua conta Pluggy para listar conectores:

```powershell
$body = @{
  clientId = "SEU_CLIENT_ID"
  clientSecret = "SEU_CLIENT_SECRET"
} | ConvertTo-Json

$auth = Invoke-RestMethod -Method Post -Uri "https://api.pluggy.ai/auth" -ContentType "application/json" -Body $body
$headers = @{ "X-API-KEY" = $auth.apiKey }

Invoke-RestMethod -Method Get -Uri "https://api.pluggy.ai/connectors" -Headers $headers
```

Depois atualize `PLUGGY_CONNECTOR_IDS_JSON` com os IDs corretos.

## 5. Build local

```powershell
cd D:\Documentos\Kipo\functions
npm run build
```

## 6. Selecionar o projeto Firebase

```powershell
cd D:\Documentos\Kipo
npx firebase-tools login
npx firebase-tools use SEU_PROJECT_ID
```

## 7. Deploy

```powershell
cd D:\Documentos\Kipo
npx firebase-tools deploy --only firestore:rules,firestore:indexes,functions
```

## 8. Teste ponta a ponta
1. Abra o app.
2. Vá em `Open Finance`.
3. Escolha o banco.
4. Informe CPF/CNPJ.
5. Verifique no Firestore:
- `open_finance_connection_requests`
- `open_finance_connections`
6. Confirme se foi gerado `consentUrl`.
7. Toque em `Abrir consentimento`.
8. Conclua o consentimento.
9. Verifique se o webhook chegou.
10. Confirme criação de:
- `open_finance_accounts`
- `open_finance_transactions_raw`
- `transacoes_kipo`

## 9. Checklist de validação
- A conexão saiu de `pending` para `awaiting_consent` ou `connected`
- `providerItemId` foi preenchido
- `consentUrl` existe quando necessário
- `open_finance_sync_jobs` foi criado
- `accountsCount` e `transactionCount` foram atualizados
- as transações apareceram na Home com origem bancária

## 10. Se falhar
- confira `PLUGGY_CLIENT_ID` e `PLUGGY_CLIENT_SECRET`
- confira `OPEN_FINANCE_WEBHOOK_URL`
- confira `PLUGGY_CONNECTOR_IDS_JSON`
- confira se a conta Pluggy permite criação por API
- confira se o banco escolhido está habilitado no seu ambiente Pluggy
- confira logs das Functions no Firebase
