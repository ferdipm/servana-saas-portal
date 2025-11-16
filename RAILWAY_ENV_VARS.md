# Variables de Entorno para Railway

## 📝 Configuración Requerida

Después de linkear el proyecto, configura estas variables de entorno en Railway:

```bash
# Método 1: Desde la terminal (más rápido)
cd /Users/fer/FerTodo/GITLAB/botsproject/saas-portal

railway variables set NEXT_PUBLIC_SUPABASE_URL="https://gfltxcyvdmknwklcycyo.supabase.co"

railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="<COPIA_DESDE_.env.local>"

railway variables set SUPABASE_SERVICE_ROLE_KEY="<OBTENER_DE_SUPABASE_DASHBOARD>"

# Método 2: Desde Railway Dashboard
# Ve a tu proyecto → Settings → Variables
# Y añade cada variable manualmente
```

## 🔑 Variables Necesarias

### 1. **NEXT_PUBLIC_SUPABASE_URL**
```
Value: https://gfltxcyvdmknwklcycyo.supabase.co
```
✅ Esta ya la tienes en .env.local

### 2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
Value: <copia desde .env.local>
```
⚠️ Es la clave pública, safe para el cliente

### 3. **SUPABASE_SERVICE_ROLE_KEY** (Opcional pero recomendado)
```
Value: <obtener de Supabase Dashboard → Settings → API → service_role key>
```
⚠️ **IMPORTANTE**: Esta es SECRETA, nunca la comitas a git

## 📦 Cómo Obtener SUPABASE_SERVICE_ROLE_KEY

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto (gfltxcyvdmknwklcycyo)
3. Settings → API
4. Busca "service_role" (secret)
5. Click en "Reveal" y copia la clave
6. Añádela a Railway

## 🚀 Después de Configurar

```bash
# Desplegar
railway up

# O si ya está linkeado
cd /Users/fer/FerTodo/GITLAB/botsproject/saas-portal
railway up
```

## 🔍 Verificar Variables

```bash
# Ver todas las variables configuradas
railway variables

# Ver logs del deployment
railway logs
```

## 📊 Variables Opcionales (para futuro)

```bash
# NODE_ENV (Railway lo configura automáticamente)
NODE_ENV=production

# Si usas Vercel Analytics o similar
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=your_id

# Si quieres debugging
DEBUG=true  # Solo para development
```

## ⚠️ NUNCA Incluir en Git

Asegúrate que `.env.local` esté en `.gitignore` (ya está).

Las variables sensibles SOLO deben estar en:
- Railway Dashboard (producción)
- Tu `.env.local` (desarrollo local)
