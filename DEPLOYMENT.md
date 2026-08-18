# 🚀 Guide de Déploiement Afrofade sur VPS (`afrofade.pro`)

Ce document décrit la procédure pas à pas pour déployer l'application **Afrofade 3D Studio** en production sur un serveur VPS Linux (Ubuntu / Debian).

---

## 📋 Prérequis Serveur (VPS)
- Un VPS Linux (Ubuntu 22.04 LTS recommandé) avec adresse IP publique.
- Nom de domaine **`afrofade.pro`** acheté, avec un enregistrement DNS **Type A** pointant vers l'IP du VPS.
- **Docker** et **Docker Compose** installés sur le VPS.
- Ports 80 (HTTP) et 443 (HTTPS) ouverts dans le pare-feu.

---

## 🛠️ Étapes de Déploiement Pas à Pas

### 1. Cloner le dépôt Git sur le VPS
```bash
git clone https://github.com/sokevinjonas/Afrofade.git /var/www/afrofade
cd /var/www/afrofade
```

### 2. Configurer le fichier d'environnement `.env`
Créez le fichier `.env` à la racine du projet :
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

### 3. Exécuter le script Nginx & Certbot SSL
```bash
sudo ./scripts/configure-vps-nginx.sh afrofade.pro contact@afrofade.pro
```
*Le script installe Nginx, configure le proxy vers le port 3000 et génère automatiquement le certificat SSL HTTPS gratuit via Let's Encrypt.*

### 4. Démarrer le conteneur Docker
```bash
docker-compose up -d --build
```

---

## 🧪 Vérification & Maintenance

### Vérifier les logs du conteneur Web Next.js
```bash
docker-compose logs -f web
```

### Redémarrer l'application après une mise à jour Git
```bash
git pull origin main
docker-compose up -d --build
```
