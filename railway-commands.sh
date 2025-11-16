#!/bin/bash

# 🚀 Script Helper para Deploy a Railway
# Ejecuta estos comandos uno por uno

echo "========================================="
echo "  DEPLOY SAAS PORTAL A RAILWAY"
echo "========================================="
echo ""

# PASO 1: Inicializar proyecto
echo "📦 PASO 1: Inicializar proyecto"
echo "Ejecuta: railway init"
echo ""
echo "Responde:"
echo "  - Project name: servana-saas-portal"
echo "  - Environment: production"
echo ""
read -p "Presiona ENTER cuando hayas completado railway init..."
echo ""

# PASO 2: Configurar variables de entorno
echo "🔐 PASO 2: Configurar variables de entorno"
echo ""
echo "Copia y pega estos comandos UNO POR UNO:"
echo ""
echo '# Variable 1: Supabase URL'
echo 'railway variables set NEXT_PUBLIC_SUPABASE_URL="https://gfltxcyvdmknwklcycyo.supabase.co"'
echo ""
echo '# Variable 2: Supabase Anon Key'
echo 'railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmbHR4Y3l2ZG1rbndrbGN5Y3lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjExNjA4NzksImV4cCI6MjA3NjczNjg3OX0.09yHzQCdEInJxwr2QOpjnHpbeyGc4jIRWfbdLgx8UMI"'
echo ""
echo '# Variable 3: Service Role Key (IMPORTANTE: Obtén esto de Supabase Dashboard)'
echo '# Ve a: https://supabase.com/dashboard/project/gfltxcyvdmknwklcycyo/settings/api'
echo '# Busca "service_role" y copia la clave'
echo 'railway variables set SUPABASE_SERVICE_ROLE_KEY="TU_SERVICE_ROLE_KEY_AQUI"'
echo ""
read -p "Presiona ENTER cuando hayas configurado las 3 variables..."
echo ""

# PASO 3: Verificar variables
echo "✅ PASO 3: Verificar variables configuradas"
echo "Ejecuta: railway variables"
echo ""
echo "Deberías ver las 3 variables listadas."
echo ""
read -p "Presiona ENTER para continuar..."
echo ""

# PASO 4: Deploy
echo "🚀 PASO 4: Hacer deploy"
echo ""
echo "Ejecuta: railway up"
echo ""
echo "Esto tomará 2-3 minutos..."
echo ""
read -p "Presiona ENTER cuando el deploy haya terminado..."
echo ""

# PASO 5: Ver logs y URL
echo "📊 PASO 5: Verificar deployment"
echo ""
echo "Ejecuta estos comandos para verificar:"
echo ""
echo "  railway status    # Ver info del proyecto"
echo "  railway logs      # Ver logs en tiempo real"
echo "  railway open      # Abrir en navegador"
echo ""
echo "========================================="
echo "  ✅ DEPLOY COMPLETADO"
echo "========================================="
echo ""
echo "Tu portal debería estar en:"
echo "https://servana-saas-portal-production.up.railway.app"
echo ""
echo "O ejecuta 'railway open' para abrir automáticamente"
echo ""
