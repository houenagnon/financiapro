---
description: Vérifie la cohérence des contrats API entre le backend Django/DRF et le frontend Next.js (routes, méthodes, champs, types, formats de réponse).
argument-hint: "[zone optionnelle: ex. transactions, auth, centres]"
allowed-tools: Read, Grep, Glob, Bash(find:*), Bash(grep:*)
---

Tu vas vérifier la cohérence entre les endpoints backend réellement
disponibles et la façon dont le frontend les consomme. Si un argument est
fourni (`$ARGUMENTS`), limite la vérification à cette zone fonctionnelle
(ex: transactions, auth, centres). Sinon, couvre l'ensemble des endpoints.

Procède dans cet ordre :

1. **Inspecter le backend réel** — ne te fie pas à la documentation ou aux
   plans : lis les `urls.py` des apps concernées (`backend/apps/*/urls.py`,
   `backend/config/urls.py`) et les serializers/views associés pour établir
   la liste réelle des routes, méthodes HTTP, champs attendus/renvoyés,
   types et statuts de réponse.

2. **Inspecter le frontend réel** — repère les appels API (client API dans
   `frontend/src/lib/`, hooks, types dans `frontend/src/types/`) et note
   pour chaque appel : route appelée, méthode, payload envoyé, forme de la
   réponse attendue côté TypeScript.

3. **Comparer** et lister précisément les écarts trouvés, par exemple :
   - route appelée côté front qui n'existe pas (ou plus) côté back
   - méthode HTTP différente (ex: PUT côté front, PATCH seulement côté back)
   - champ envoyé/attendu manquant, renommé, ou de type différent (ex:
     `montant` en string côté front vs `Decimal`/number côté back)
   - format de date, pagination, ou structure d'erreur incohérents

4. **Ne vérifie que ce qui est pertinent** — s'il n'y a pas de code
   frontend ou backend pour une zone donnée, dis-le clairement plutôt que
   d'inventer des écarts. Ne lance pas de vérifications hors du périmètre
   demandé (pas de lint global, pas de tests complets) sauf si nécessaire
   pour confirmer un écart.

5. **Proposer le plus petit plan correctif possible** — pour chaque écart,
   indique la correction minimale (côté front ou back, au choix le plus
   simple) sans réécrire de code qui fonctionne déjà. Ne propose pas de
   refonte ou d'abstraction non demandée.

6. **Résumer** dans un tableau ou une liste courte : écart constaté →
   fichier(s) concerné(s) → correction proposée. Termine par une conclusion
   claire : contrats alignés, ou liste priorisée des écarts à corriger.

Ne modifie aucun fichier dans cette commande : c'est un diagnostic, pas une
correction automatique. Si l'utilisateur veut appliquer les corrections,
propose-le explicitement et attends confirmation.
