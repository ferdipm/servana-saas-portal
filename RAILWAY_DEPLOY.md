# Deploy SaaS Portal a Railway

## Arquitectura Final en Railway

```
Railway Project: "Servana"
│
├── Service 1: servana-ai (Backend API)
│   ├── URL: https://servana-ai-production.up.railway.app
│   ├── Port: 3000
│   ├── Bot de WhatsApp + Onboarding API
│   └── Git repo: /botsproject/servana-ai
│
└── Service 2: saas-portal (Frontend Dashboard)
    ├── URL: https://portal.servana.app
    ├── Port: 3001
    ├── Dashboard para restaurantes
    └── Git repo: /botsproject/saas-portal (este proyecto)
```

## Paso 1: Preparar el Repositorio

Tu proyecto ya tiene `.git` iniciado. Necesitas subirlo a GitHub/GitLab:

```bash
cd /Users/fer/FerTodo/GITLAB/botsproject/saas-portal

# Crear repo en GitHub/GitLab primero, luego:
git add .
git commit -m "Initial commit: SaaS Portal setup"
git remote add origin <tu-repo-url>
git push -u origin main
```

## Paso 2: Crear Nuevo Service en Railway

### Opción A: Via Railway Dashboard (Recomendado)

1. Ve a Railway Dashboard: https://railway.app
2. Abre tu proyecto existente "Servana" (donde ya está `servana-ai`)
3. Click en **"+ New Service"**
4. Selecciona **"GitHub Repo"**
5. Conecta el repo de `saas-portal`
6. Railway detectará automáticamente que es Next.js

### Opción B: Via Railway CLI

```bash
cd /Users/fer/FerTodo/GITLAB/botsproject/saas-portal

# Instalar Railway CLI si no lo tienes
brew install railway

# Login
railway login

# Link al proyecto existente
railway link

# Crear nuevo service
railway up
```

## Paso 3: Configurar Variables de Entorno en Railway

En Railway Dashboard → saas-portal service → Variables:

```bash
# Supabase (las mismas que servana-ai)
NEXT_PUBLIC_SUPABASE_URL=<tu-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>

# Next.js
NODE_ENV=production

# Port (Railway lo asigna automáticamente, pero puedes forzarlo)
PORT=3000

# Backend API URL (para llamar a servana-ai desde el portal)
NEXT_PUBLIC_API_URL=https://servana-ai-production.up.railway.app
```

### Compartir Variables entre Services (Opcional)

Railway permite **shared variables** para no duplicar:

1. Ve a Project Settings → Shared Variables
2. Añade las keys de Supabase ahí
3. Ambos services las heredarán automáticamente

## Paso 4: Configurar Dominio Personalizado (Opcional)

En Railway Dashboard → saas-portal → Settings → Domains:

1. Click **"Generate Domain"** (Railway te da uno gratis: `*.up.railway.app`)
2. O configura tu dominio custom:
   - Añade `portal.tudominio.com`
   - Apunta CNAME a Railway
   - Esperá propagación DNS (5-30 min)

## Paso 5: Deploy

Railway hace deploy automático en cada `git push`:

```bash
cd /Users/fer/FerTodo/GITLAB/botsproject/saas-portal

# Hacer cambios...
git add .
git commit -m "Update dashboard"
git push origin main

# Railway detecta el push y redeploys automáticamente
```

Ver logs en tiempo real:
```bash
railway logs --service saas-portal
```

## Networking entre Services

Railway provee **Private Networking** gratis:

### Variables automáticas que Railway inyecta:

```bash
# Dentro de saas-portal puedes acceder a servana-ai via:
$SERVANA_AI_URL  # Railway genera esto automáticamente
# Ejemplo: http://servana-ai.railway.internal:3000

# Dentro de servana-ai puedes acceder a saas-portal via:
$SAAS_PORTAL_URL
# Ejemplo: http://saas-portal.railway.internal:3000
```

### Ejemplo de uso en código:

```tsx
// En saas-portal/app/actions.ts
const BACKEND_URL = process.env.SERVANA_AI_URL || process.env.NEXT_PUBLIC_API_URL;

export async function processOnboarding(data: any) {
  // Llamar al backend internamente (más rápido, sin salir a internet)
  const response = await fetch(`${BACKEND_URL}/api/onboarding/create-business`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}
```

## Monitoreo y Logs

### Ver logs en Railway Dashboard:
```
Railway Dashboard → saas-portal → Logs
```

### Ver logs via CLI:
```bash
# Logs del portal
railway logs --service saas-portal

# Logs del backend
railway logs --service servana-ai

# Logs en tiempo real
railway logs --service saas-portal --follow
```

## Costos Railway

Railway cobra por **uso de recursos**:

- **Free Tier**: $5 de crédito/mes (suficiente para desarrollo)
- **Hobby Plan**: $5/mes + consumo adicional
- **Usage**:
  - Next.js: ~$0.002/hora (~$1.50/mes si corre 24/7)
  - Backend: Similar

**Estimado para 2 services pequeños**: $5-10/mes

## Rollback

Si algo sale mal, puedes volver a un deploy anterior:

1. Railway Dashboard → saas-portal → Deployments
2. Click en el deployment anterior
3. Click **"Redeploy"**

## Troubleshooting

### Error: "Build failed"
- Verifica que `railway.toml` exista
- Revisa logs: `railway logs --service saas-portal`

### Error: "Variables no definidas"
- Verifica en Railway Dashboard → Variables
- Las variables `NEXT_PUBLIC_*` deben estar en tiempo de BUILD

### Error: "Cannot connect to Supabase"
- Verifica que las keys en Railway coincidan con `.env.local`
- Usa `railway run npm run dev` para testear localmente con variables de Railway

## Siguientes Pasos

Una vez deployado el portal:

1. **Añadir Auth**: Implementar Clerk o Supabase Auth
2. **Multi-tenant**: Conectar users a sus tenants
3. **Onboarding Flow**: Crear signup → onboarding → dashboard
4. **Custom Domain**: Configurar `app.tudominio.com`

## Comandos Útiles

```bash
# Ver status de todos los services
railway status

# Abrir dashboard
railway open

# Variables locales (sync con Railway)
railway variables

# Run comando con variables de Railway
railway run npm run dev

# Shell en production
railway shell
```
