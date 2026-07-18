#!/usr/bin/env bash
# Script de build Render (Build Command : ./build.sh)
set -o errexit

pip install -r requirements/prod.txt
python manage.py collectstatic --no-input
python manage.py migrate
# Idempotent : catalogues initiaux + compte Économat central si les
# variables SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD sont définies.
python manage.py seed_prod

# ⚠️ TEMPORAIRE — données de démonstration pour tester la prod
# (2 centres, comptes économes/assistant mot de passe Demo2026!, ~80
# transactions). À RETIRER après validation du déploiement de test.
python manage.py seed_demo
