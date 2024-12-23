# NoteGenius

NoteGenius est une application web intuitive permettant aux utilisateurs de transformer leurs fichiers PDF en cartes de révision interactives. Conçu pour simplifier l'apprentissage, NoteGenius combine puissance et simplicité grâce à Flask pour le backend et une interface utilisateur claire et efficace.

---

## ✨ Fonctionnalités

- **🔑 Inscription et Connexion** : Créez un compte sécurisé pour gérer vos fichiers et résultats.
- **📂 Téléchargement de Fichiers** : Importez vos fichiers PDF en un clic.
- **📋 Analyse Intelligente** : Générez des cartes de révision à partir du contenu de vos documents.
- **🗂️ Gestion des Fichiers** : Consultez, organisez ou supprimez vos fichiers facilement.
- **🔔 Notifications en Temps Réel** : Recevez des alertes pour chaque étape, succès ou erreur.
- **🧹 Nettoyage Automatique** : Les fichiers des utilisateurs inactifs sont supprimés toutes les 24 heures pour garantir la confidentialité.

---

## 🚀 Installation

### Pré-requis
- Python 3.8+
- pip (gestionnaire de paquets Python)

### Étapes

1. **Clonez le dépôt :**
   ```bash
   git clone https://github.com/Zeffut/NoteGenius.git
   cd NoteGenius
   ```

2. **Créez un environnement virtuel et activez-le :**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Sur Windows, utilisez `venv\Scripts\activate`
   ```

3. **Installez les dépendances :**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurez les variables d'environnement :**
   ```bash
   export FLASK_APP=app.py
   export FLASK_ENV=development
   ```

5. **Initialisez la base de données :**
   ```bash
   flask db init
   flask db migrate
   flask db upgrade
   ```

6. **Lancez l'application :**
   ```bash
   flask run
   ```

---

## 🖥️ Utilisation

- Accédez à l'application via `http://localhost:5000`.
- Inscrivez-vous ou connectez-vous pour commencer.
- Téléchargez vos fichiers PDF et cliquez sur **"Analyser"** pour générer vos cartes de révision.

---

## 🤝 Contribuer

Les contributions sont les bienvenues ! Pour participer :
- **Forkez** le projet
- **Créez une branche** pour votre fonctionnalité ou correction :
  ```bash
  git checkout -b ma-nouvelle-fonctionnalite
  ```
- **Soumettez une pull request** et décrivez vos changements.

---

## 📄 Licence

Ce projet n'est pas déstiné a usage commercial.

---

Merci d'utiliser **NoteGenius** ! 🌟
