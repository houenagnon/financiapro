#!/usr/bin/env bash
# Script de build Render (Build Command : ./build.sh)
set -o errexit

pip install -r requirements/prod.txt
python manage.py collectstatic --no-input
python manage.py migrate
