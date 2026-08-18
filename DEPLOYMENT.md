# 🚀 Guide de Déploiement Afrofade sur VPS (`afrofade.pro`)

Ce document décrit la procédure pas à pas et automatisée pour déployer l'application **Afrofade 3D Studio** en production sur le serveur VPS dans le dossier `project/Afrofade`.

---

## 📋 Prérequis Serveur (VPS)
- Un VPS Linux (Ubuntu 22.04 LTS recommandé) avec adresse IP publique.
- Nom de domaine **`afrofade.pro`** avec un enregistrement DNS **Type A** pointant vers l'IP du VPS.
- **Docker** et **Docker Compose** installés sur le VPS.
- Ports 80 (HTTP) et 443 (HTTPS) ouverts dans le pare-feu.
- Répertoire cible sur le VPS : `~/project/Afrofade` (ou `/root/project/Afrofade`).

---

## 🛠️ Déploiement Automatisé ou Manuel

### Option A : Déploiement via le script automatisé `deploy-vps.sh`

Exécutez la commande suivante pour déployer dans `~/project/Afrofade` :
```bash
./scripts/deploy-vps.sh ~/project/Afrofade afrofade.pro contact@afrofade.pro
```

Ce script effectue automatiquement :
1. La création et synchronisation des fichiers dans `~/project/Afrofade`.
2. La vérification de la propagation DNS via `scripts/check-dns.sh`.
3. La configuration de Nginx & l'obtention du certificat SSL via `scripts/configure-vps-nginx.sh`.
4. Le lancement et le build des conteneurs Docker Compose (`web` & `api`).

---

### Option B : Déploiement Manuel Étape par Étape

#### 1. Créer le dossier et cloner le projet dans `project/Afrofade`
```bash
mkdir -p ~/project
git clone https://github.com/sokevinjonas/Afrofade.git ~/project/Afrofade
cd ~/project/Afrofade
```

#### 2. Configurer le fichier `.env`
Créez le fichier `.env` dans `~/project/Afrofade` :
```bash
cat << 'EOF' > .env
NEXT_PUBLIC_APP_URL=https://afrofade.pro
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

MONEY_FUSION_URL=https://www.moneyfusion.net/api/v1/pay
MONEY_FUSION_API_KEY=your-money-fusion-api-key-live
EOF
```

#### 3. Vérification DNS & Configuration Nginx / Certbot SSL
```bash
sudo ./scripts/configure-vps-nginx.sh --domain afrofade.pro --email contact@afrofade.pro
```
> **Note :** Le script vérifie d'abord si `afrofade.pro` résout bien par DNS avant d'exécuter Certbot pour éviter tout échec de génération Let's Encrypt.

#### 4. Démarrer les services Docker
```bash
docker compose up -d --build
```

---

## ⚙️ CI/CD Pipeline (GitHub Actions)

Le workflow `.github/workflows/ci-cd.yml` valide le frontend et l'API backend, puis déploie automatiquement sur le runner auto-hébergé du VPS dans le répertoire `project/Afrofade`.

### Variables et Secrets recommandés dans GitHub:
- `VPS_AFROFADE_PATH` : `/root/project/Afrofade` (ou `/home/user/project/Afrofade`)

---

## 🧪 Vérification & Diagnostics

### Vérifier la résolution DNS
```bash
./scripts/check-dns.sh afrofade.pro
```

### Vérifier les conteneurs Docker
```bash
docker compose ps
docker compose logs -f
```
