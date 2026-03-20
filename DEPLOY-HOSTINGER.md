# Deploy Hostinger

Este projeto e um `Next.js` com `Prisma` e PostgreSQL.

## O que precisa existir no servidor

- Node.js 20+ instalado
- acesso ao banco PostgreSQL
- variaveis de ambiente configuradas
- processo rodando com `npm run start` ou `pm2`

## Variaveis obrigatorias

Crie um arquivo `.env` no servidor com:

```env
DATABASE_URL=""

GOOGLE_DRIVE_FOLDER_ID=""
GOOGLE_OAUTH_CLIENT_ID=""
GOOGLE_OAUTH_CLIENT_SECRET=""
GOOGLE_OAUTH_REDIRECT_URI="https://SEU-DOMINIO/api/google/drive/callback"
```

## Google Cloud

No Google Cloud, em `OAuth Client ID`, adicione o redirect online:

```text
https://SEU-DOMINIO/api/google/drive/callback
```

Se manter local e online ao mesmo tempo, deixe os dois:

```text
http://localhost:3000/api/google/drive/callback
https://SEU-DOMINIO/api/google/drive/callback
```

## Passos de deploy

1. enviar o projeto para o servidor
2. instalar dependencias com `npm install`
3. gerar o prisma client com `npx prisma generate`
4. aplicar a estrutura atual do banco com `npx prisma db push`
5. gerar build com `npm run build`
6. subir com `npm run start`

## Recomendacao de processo

Use `pm2` para manter o app rodando:

```bash
pm2 start npm --name infotche -- run start
pm2 save
```

## Validacao depois de subir

1. abrir `/tecnico/login`
2. fazer login
3. abrir `/tecnico`
4. conectar Google Drive no dominio online
5. criar um atendimento com foto
6. confirmar:
   - registro salvo no banco
   - imagem salva no Drive
   - historico mostrando a foto

## Observacao importante

Como o upload usa OAuth de conta pessoal Google, depois do deploy online sera necessario reconectar o Google Drive no dominio final.
