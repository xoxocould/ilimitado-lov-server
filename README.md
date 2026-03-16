# Ilimitado Lov Server

Servidor webhook para a extensão Ilimitado Lov.

## Como subir no Render

1. Faça fork ou upload deste repositório no GitHub
2. No Render, crie um **Web Service** conectando este repositório
3. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** Node

## Endpoint

`POST /webhook/promptxexe`

Body:
```json
{
  "message": "sua mensagem",
  "projectId": "id-do-projeto-lovable",
  "token": "token-de-sessao-lovable"
}
```
