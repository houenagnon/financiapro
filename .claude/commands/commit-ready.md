---
description: Analyse le statut Git et propose un message de commit conforme aux conventions du projet, sans jamais committer automatiquement.
argument-hint: "[optionnel: chemin ou zone à considérer en priorité]"
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git log:*), Read
---

Tu prépares un commit pour l'utilisateur, mais **tu ne dois jamais exécuter
`git commit` ni `git add` toi-même** dans cette commande : tu proposes, tu
ne commits pas.

Procède dans cet ordre :

1. **Inspecter l'état réel** — lance `git status` puis `git diff` (staged
   et unstaged) pour voir précisément ce qui a changé. Lance aussi
   `git log --oneline -10` pour connaître le style de messages déjà utilisé
   dans ce projet.

2. **Lire le CLAUDE.md** s'il existe à la racine du projet, et rappelle
   explicitement à l'utilisateur la nomenclature/convention de commit qui y
   est définie (préfixes autorisés, langue, scope, etc.). S'il n'existe
   pas encore, dis-le et base-toi sur Conventional Commits par défaut
   (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`, `style`, `perf`).

3. **Vérifier la cohérence du changement** — si le diff mélange plusieurs
   sujets sans lien (ex: un fix de bug + une nouvelle feature + du
   reformatage sans rapport), **refuse de proposer un commit unique** :
   explique pourquoi les changements ne sont pas liés, et propose un
   découpage en plusieurs commits logiques, avec pour chacun les fichiers
   concernés et un message proposé.

4. **Si le changement est cohérent**, propose :
   - un message de commit au format Conventional Commits
     (`<type>(<scope optionnel>): <description>`), en respectant la
     nomenclature du CLAUDE.md si elle diffère
   - une description courte du corps du commit si le changement le justifie
     (pourquoi, pas quoi)
   - la liste des fichiers à inclure dans ce commit

5. **Ne crée jamais le commit toi-même.** Termine toujours en indiquant à
   l'utilisateur la commande `git commit` qu'il peut lancer (ou que tu peux
   lancer si il te le demande explicitement dans un message séparé), sans
   l'exécuter dans le cadre de cette commande.

Si l'argument `$ARGUMENTS` est fourni, concentre l'analyse sur ce chemin ou
cette zone du diff en priorité, tout en signalant si d'autres changements
non liés existent ailleurs dans le repo.
