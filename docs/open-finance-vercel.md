# Open Finance Grátis com Vercel

## Estratégia
- Firebase continua sendo usado para Auth e Firestore
- o backend seguro do Pluggy roda fora do Firebase, no Vercel
- o app React Native envia chamadas autenticadas com o token do Firebase
- o backend valida o token, fala com a Pluggy e grava no Firestore com `firebase-admin`

## Pasta do backend
`backend-vercel/`

## O que o backend expõe
- `POST /api/open-finance/connect`
- `POST /api/open-finance/sync`
- `POST /api/open-finance/disconnect`
- `POST /api/open-finance/webhook`

## Variáveis de ambiente no Vercel
Baseie-se em [`backend-vercel/.env.example`](/D:/Documentos/Kipo/backend-vercel/.env.example).

Você vai precisar de:
- `PLUGGY_CLIENT_ID`
- `PLUGGY_CLIENT_SECRET`
- `PLUGGY_BASE_URL`
- `PLUGGY_WEBHOOK_SECRET`
- `OPEN_FINANCE_PUBLIC_BASE_URL`
- `PLUGGY_CONNECTOR_IDS_JSON`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

## Como gerar a service account do Firebase
1. Abra o [Google Cloud Console](https://console.cloud.google.com/)
2. Entre no projeto `edyrun-3275e`
3. Vá em `IAM e administrador` -> `Contas de serviço`
4. Crie uma conta de serviço para o backend
5. Dê permissão para Firestore e Auth
6. Gere uma chave JSON
7. Pegue do JSON:
- `project_id` -> `FIREBASE_PROJECT_ID`
- `client_email` -> `FIREBASE_CLIENT_EMAIL`
- `private_key` -> `FIREBASE_PRIVATE_KEY`

## Como publicar no Vercel
1. Entre na conta Vercel
2. Crie um novo projeto apontando para a pasta `backend-vercel`
3. Adicione todas as variáveis de ambiente
4. Faça o deploy

## Depois do deploy
Quando o deploy terminar, copie a URL do projeto, por exemplo:

`https://kipo-open-finance.vercel.app`

Use essa URL em:
- `OPEN_FINANCE_PUBLIC_BASE_URL` no Vercel
- [`openFinanceApiConfig.ts`](/D:/Documentos/Kipo/src/modules/openFinance/infrastructure/openFinanceApiConfig.ts) no app

## Webhook da Pluggy
O webhook final fica assim:

`https://SEU_BACKEND_VERCEL/api/open-finance/webhook`

Esse valor precisa estar consistente com `OPEN_FINANCE_PUBLIC_BASE_URL`.

## Fluxo de teste
1. publicar o backend no Vercel
2. atualizar a URL do app
3. abrir `Open Finance`
4. conectar um banco
5. concluir o consentimento
6. verificar no Firestore:
- `open_finance_connections`
- `open_finance_sync_jobs`
- `open_finance_accounts`
- `open_finance_transactions_raw`
- `transacoes_kipo`

## Observações
- como o `Client Secret` da Pluggy apareceu nesta conversa, gere um novo ao finalizar
- a URL padrão em [`openFinanceApiConfig.ts`](/D:/Documentos/Kipo/src/modules/openFinance/infrastructure/openFinanceApiConfig.ts) é só placeholder até você publicar de verdade
