# 🚀 Guide de Déploiement Afrofade sur VPS (`afrofade.pro`)

Ce document décrit la procédure automatisée de déploiement en production pour **Afrofade 3D Studio** via le pipeline CI/CD GitHub Actions (`environment: prod`) et les scripts d'installation VPS dans le dossier `project/Afrofade`.

---

## 📋 Prérequis Serveur (VPS)
- **OS** : Linux (Ubuntu 22.04 LTS recommandé) avec IP publique.
- **DNS** : Domaine `afrofade.pro` avec enregistrement **A** pointant vers l'IP du serveur.
- **Outillage** : Docker, Docker Compose et Nginx installés.
- **Ports Hôte isolés** :
  - `WEB_PORT=3005` (Front Next.js — évite tout conflit avec le port 3000)
  - `API_PORT=8005` (Back FastAPI 3D — évite tout conflit avec le port 8000)
- **Certificat SSL** : Certbot (Let's Encrypt) automatisé sans aucune intervention manuelle.

---

## 🛡️ Configuration de l'Environnement GitHub (`prod`)

Pour sécuriser et automatiser le déploiement non-interactif (notamment les commandes `sudo` sans TTY et l'émission du certificat SSL) :

### 1. Créer l'Environnement GitHub `prod`
1. Rendez-vous dans votre dépôt GitHub : **Settings** $\rightarrow$ **Environments**.
2. Cliquez sur **New environment** et nommez-le **`prod`**.

### 2. Ajouter les Secrets de l'Environnement `prod`
Dans l'environnement **`prod`** (ou dans Repository Secrets), ajoutez :

| Secret | Description | Exemple |
| :--- | :--- | :--- |
| **`VPS_SUDO_PASSWORD`** | Mot de passe `sudo` de l'utilisateur VPS (ex: `admin`) | `VotreMotDePasseSudo` |
| **`VPS_AFROFADE_PATH`** | Chemin absolu du projet sur le VPS | `/home/admin/project/Afrofade` |

---

## ⚙️ Déploiement Automatisé CI/CD (GitHub Actions)

Le pipeline `.github/workflows/ci-cd.yml` contient l'étape `deploy-vps` associée à l'environnement `prod` :

```yaml
  deploy-vps:
    name: Deploy Afrofade to VPS (project/Afrofade)
    environment: prod
    runs-on: [self-hosted, Linux, X64]
```

### Ce que fait le pipeline automatiquement :
1. **Copie les fichiers** et manifestes dans `/home/admin/project/Afrofade`.
2. **Injecte le mot de passe sudo** via standard input (`echo "$VPS_SUDO_PASSWORD" | sudo -S ...`) pour exécuter les privilèges administrateur sans bloquer le TTY.
3. **Exécute `scripts/configure-vps-nginx.sh`** :
   - Génère le fichier Nginx `/etc/nginx/sites-available/afrofade.conf` en redirigeant le proxy vers le port `3005`.
   - Lance **Certbot** de façon 100% non-interactive (`certbot --nginx --non-interactive --agree-tos -m contact@afrofade.pro --redirect`).
4. **Relance les conteneurs Docker** (`web` sur 3005, `api` sur 8005) via `docker compose up -d --build`.

---

## 🛠️ Déploiement Manuel sur le VPS (Optionnel)

Si vous préférez exécuter le déploiement directement en ligne de commande SSH :

```bash
cd ~/project/Afrofade
export VPS_SUDO_PASSWORD="votre_mot_de_passe"
./scripts/deploy-vps.sh ~/project/Afrofade afrofade.pro contact@afrofade.pro
```

---

## 🧪 Diagnostic et Vérification

### 1. Vérifier le statut des conteneurs Afrofade
```bash
docker compose ps
```

### 2. Logs en temps réel
```bash
docker compose logs -f
```

### 3. Tester la validité Nginx et le certificat SSL
```bash
sudo nginx -t
sudo certbot certificates
```
