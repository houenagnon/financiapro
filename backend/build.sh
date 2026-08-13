#!/usr/bin/env bash
# Script de build Render (Build Command : ./build.sh)
set -o errexit

pip install -r requirements/prod.txt
python manage.py collectstatic --no-input
python manage.py migrate
# Idempotent : catalogues initiaux + compte Économat central si les
# variables SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD sont définies.
python manage.py seed_prod
# TEMPORAIRE — jeu de données de démo complet (centres, transactions,
# placements...) pour tester le module Placements sur ce déploiement.
# Idempotent, mais à RETIRER avant tout usage avec de vraies données :
# recrée sinon des comptes/opérations fictifs à chaque redéploiement.
python manage.py seed_demo
