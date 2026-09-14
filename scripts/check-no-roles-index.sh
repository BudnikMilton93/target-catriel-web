#!/usr/bin/env bash
# Falla si algún endpoint indexa el array de roles directamente (ej. `roles[0]`)
# en vez de usar hasRole()/requireRole(). getUserRoles (api/_lib/roles.ts) arma
# ese array sin `orderBy`, así que indexarlo por posición es un bug de
# autorización no determinista, no solo un problema de estilo (ver
# documents/arquitectura/03-plan-migracion-dotnet.md, hallazgos S3/S1b).
set -euo pipefail

matches=$(grep -rEn 'roles\[[0-9]+\]' api --include="*.ts" | grep -v '\.test\.ts' || true)

if [ -n "$matches" ]; then
  echo "Se encontró indexación directa del array de roles (ej. roles[0]) fuera de tests:"
  echo "$matches"
  echo ""
  echo "Usá hasRole(roles, '<rol>') o requireRole('<rol>') en su lugar."
  exit 1
fi

echo "OK: no se encontró indexación directa del array de roles."
