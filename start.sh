#!/bin/sh
set -e

echo "🚀 Iniciando processo de boot do App..."

echo "📦 Rodando Prisma Migrate Deploy..."
npx prisma migrate deploy

echo "✅ Migrações concluidas. Iniciando servidor Next.js..."
exec node server.js
