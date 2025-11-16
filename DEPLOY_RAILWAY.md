# 🚀 Guía de Deploy a Railway - SaaS Portal

## ✅ Pre-requisitos (Ya completados)

- [x] Railway CLI instalado y logueado (ferdipm@gmail.com)
- [x] `railway.toml` configurado
- [x] `.railwayignore` creado
- [x] Scripts de build en `package.json`

---

## 📋 Paso a Paso

### **PASO 1: Crear el Proyecto en Railway**

```bash
cd /Users/fer/FerTodo/GITLAB/botsproject/saas-portal

# Inicializar proyecto
railway init
```

**Responde cuando te pregunte:**
- ✏️ **Project name**: `servana-saas-portal`
- 🔧 **Environment**: `production`

Verás algo como:
```
✓ Created project servana-saas-portal
✓ Linked to servana-saas-portal
```

---

### **PASO 2: Configurar Variables de Entorno**

#### Opción A: Desde terminal (Más rápido) ⚡

```bash
# 1. Supabase URL (pública)
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://gfltxcyvdmknwklcycyo.supabase.co"

# 2. Supabase Anon Key (copia desde .env.local)
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="<PEGA_AQUI_TU_ANON_KEY>"

# 3. Service Role Key (opcional pero recomendado)
#    Obtén esto desde: Supabase Dashboard → Settings → API → service_role key
railway variables set SUPABASE_SERVICE_ROLE_KEY="<PEGA_AQUI_TU_SERVICE_ROLE_KEY>"
```

#### Opción B: Desde Railway Dashboard 🌐

1. Ve a https://railway.app/dashboard
2. Abre tu proyecto "servana-saas-portal"
3. Click en **Variables** (sidebar izquierdo)
4. Click en **+ New Variable**
5. Añade cada variable:

| Variable | Value | Nota |
|----------|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://gfltxcyvdmknwklcycyo.supabase.co` | URL pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<copia de .env.local>` | Clave anónima |
| `SUPABASE_SERVICE_ROLE_KEY` | `<desde Supabase Dashboard>` | **SECRETO** |

---

### **PASO 3: Deploy Inicial** 🎯

```bash
# Desde el directorio del proyecto
cd /Users/fer/FerTodo/GITLAB/botsproject/saas-portal

# Hacer deploy
railway up
```

Railway automáticamente:
1. ✓ Detecta que es un proyecto Next.js
2. ✓ Ejecuta `npm install`
3. ✓ Ejecuta `npm run build`
4. ✓ Ejecuta `npm run start`

---

### **PASO 4: Monitorear el Deploy**

```bash
# Ver logs en tiempo real
railway logs
```

Deberías ver:
```
[INFO] Building...
[INFO] Installing dependencies...
[INFO] Running build...
[SUCCESS] Build completed
[INFO] Starting server...
[SUCCESS] Server listening on port 3000
```

---

### **PASO 5: Obtener URL del Deploy**

```bash
# Ver información del deployment
railway status
```

O desde el dashboard:
1. Ve a tu proyecto en Railway
2. Click en el servicio (debería llamarse "web" o "servana-saas-portal")
3. Copia la URL pública (algo como: `servana-saas-portal-production.up.railway.app`)

---

## 🔍 Verificación Post-Deploy

### Checklist:

- [ ] El sitio carga en la URL de Railway
- [ ] Login funciona (redirect a Supabase Auth)
- [ ] Dashboard muestra reservas
- [ ] No hay errores en la consola del navegador
- [ ] Variables de entorno están configuradas:
  ```bash
  railway variables
  ```

---

## 🐛 Troubleshooting

### Problema: "Build failed"

**Solución:**
```bash
# Limpiar cache y rebuild
railway up --detach

# Ver logs detallados
railway logs
```

### Problema: "Cannot connect to Supabase"

**Solución:** Verifica que las variables de entorno estén configuradas:
```bash
railway variables

# Deberías ver:
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Problema: "Page not loading / 404"

**Solución:** Next.js puede tardar unos segundos en arrancar la primera vez. Espera 30-60 segundos y recarga.

### Problema: "Memory issues"

Railway free tier tiene límites. Si ves errores de memoria:
```bash
# En railway.toml, añade:
[deploy]
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
healthcheckPath = "/"
healthcheckTimeout = 100
```

---

## 🎨 Configurar Dominio Custom (Opcional)

### Opción 1: Generar dominio Railway

```bash
railway domain
```

Esto te dará un dominio como: `servana-saas-portal-production.up.railway.app`

### Opción 2: Usar tu propio dominio

1. En Railway Dashboard → Settings → Domains
2. Click **+ Custom Domain**
3. Ingresa tu dominio (ej: `portal.servana.ai`)
4. Railway te dará un CNAME record
5. Añade ese CNAME en tu proveedor de DNS:
   ```
   Type: CNAME
   Name: portal
   Value: servana-saas-portal-production.up.railway.app
   TTL: 3600
   ```

---

## 🔄 Deployments Futuros

Después del setup inicial, deployar nuevos cambios es super simple:

```bash
# 1. Hacer cambios en tu código
# 2. Deploy
cd /Users/fer/FerTodo/GITLAB/botsproject/saas-portal
railway up

# O configurar auto-deploy desde Git (recomendado)
railway link
# Luego en Railway Dashboard:
# Settings → Service → Connect to GitHub → Select repo
```

### Auto-Deploy desde GitHub (Recomendado)

1. Sube tu código a GitHub
2. En Railway Dashboard:
   - Settings → Service
   - **Source** → Connect GitHub Repo
   - Selecciona tu repo
3. Ahora cada `git push` hará auto-deploy 🎉

---

## 📊 Comandos Útiles

```bash
# Ver status
railway status

# Ver logs
railway logs

# Ver variables
railway variables

# Abrir en navegador
railway open

# Ver uso de recursos
railway usage

# Reiniciar servicio
railway restart

# Eliminar deployment (cuidado!)
railway down
```

---

## 💰 Costos

**Plan Hobby (Free):**
- ✅ $5 de crédito gratis al mes
- ✅ Suficiente para este proyecto (~$3-4/mes)
- ✅ 512MB RAM
- ✅ Shared CPU
- ✅ SSL gratis
- ✅ Dominios custom

**Plan Pro ($20/mes):**
- Solo necesario si > 10,000 usuarios/mes
- 8GB RAM, more resources

---

## 🎯 Siguiente Paso

Una vez deployado exitosamente, considera:

1. **Configurar auto-deploy desde GitHub**
2. **Añadir dominio custom** (ej: `portal.servana.ai`)
3. **Configurar error monitoring** (Sentry)
4. **Añadir analytics** (Vercel Analytics o Posthog)
5. **Setup CI/CD** con tests automáticos

---

## 🆘 Soporte

Si tienes problemas:
- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- O pregúntame a mí 😊

---

**¡Listo para deploy!** 🚀

Ejecuta `railway init` y sígueme los pasos.
