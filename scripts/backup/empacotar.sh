#!/usr/bin/env bash
# Empacota o dump para enviar ao servidor novo, com soma de verificação.
#
#   bash scripts/backup/empacotar.sh backup/migracao-<data>
#
# O pacote inclui hash de senha (03-usuarios.sql): mande por canal privado
# (pendrive em mãos, ou um link com senha que você passa por outro meio), nunca
# por grupo de mensagens ou e-mail aberto.
set -euo pipefail

PASTA="${1:?informe a pasta do dump}"
NOME=$(basename "$PASTA")
SAIDA="backup/$NOME.zip"

if command -v zip >/dev/null 2>&1; then
  (cd "$(dirname "$PASTA")" && zip -qr "$NOME.zip" "$NOME")
else
  powershell -NoProfile -Command "Compress-Archive -Path '$PASTA' -DestinationPath '$SAIDA' -Force"
fi

echo "pacote: $SAIDA"
if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$SAIDA" | tee "$SAIDA.sha256"
  echo "Confira no destino com: sha256sum -c $(basename "$SAIDA").sha256"
fi
