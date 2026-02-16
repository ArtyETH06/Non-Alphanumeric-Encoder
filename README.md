# Non-Alphanumeric-Decoder (NAD)

Petit site pédagogique montrant une vulnérabilité PHP basée sur l'utilisation d'eval et une regex qui bloque uniquement les lettres.

Fichiers:
- `index.html` : page principale (explication + outils)
- `style.css`  : styles (dark theme)
- `script.js`  : encodeur / décodeur live

Ouvrir localement :

1. Ouvrez `index.html` dans un navigateur (double-clic ou `open index.html` selon votre OS).
2. Dans la section "Encodeur / Décodeur live" :
   - Entrez un texte dans "Texte à encoder" et cliquez sur "Encoder" pour obtenir un payload composé d'expressions du type `("#"^"@") . ("!"^"@") ...`.
   - Collez ce payload dans une application vulnérable qui fait `eval('print '.$_POST['input']);` après avoir vérifié que la regex n'autorise pas les lettres.

Notes pédagogiques:
- Le script choisit pour chaque caractère la première paire non-alphanumérique qui XORe pour donner la lettre voulue.
- C'est un outil d'étude. N'utilisez pas ces techniques pour des activités non autorisées.

Interface mise à jour:
- header avec logo et navigation (liens vers les sections Exploit / Encoder / Décoder)
- colonne de gauche : explication pas-à-pas de l'exploit
- colonne de droite : encodeur + décodeur interactifs

Footer: affichera la mention "dev by Arty".
