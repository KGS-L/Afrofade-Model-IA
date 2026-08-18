/**
* Afrofade — Gestionnaire du modèle commercial B2C (Crédits rechargeables sans abonnement).
*/

export interface CreditPack {
 id: string;
 name: string;
 price: string;
 amountFcfa: number;
 credits: number;
 badge?: string;
 popular?: boolean;
 example: string;
 description: string;
}

export const B2C_CREDIT_PACKS: CreditPack[] = [
 {
   id: 'pack_essai',
   name: 'Pack Essai',
   price: '500 FCFA',
   amountFcfa: 500,
   credits: 5,
   popular: false,
   example: '1 tête 3D + 3 téléchargements HD',
   description: 'Parfait pour tester l’application avant votre prochain rendez-vous.',
 },
 {
   id: 'pack_style',
   name: 'Pack Style',
   price: '1 000 FCFA',
   amountFcfa: 1000,
   credits: 12,
   popular: true,
   badge: 'RECOMMANDÉ',
   example: '2 têtes 3D + 8 téléchargements HD',
   description: 'Idéal pour comparer plusieurs looks et trouver le style idéal.',
 },
 {
   id: 'pack_passion',
   name: 'Pack Passion',
   price: '2 000 FCFA',
   amountFcfa: 2000,
   credits: 30,
   popular: false,
   example: '5 têtes 3D + 20 téléchargements HD',
   description: 'Pour les passionnés qui aiment changer régulièrement de style.',
 },
];

export interface CreditCostRule {
 action: string;
 costInCredits: number;
 label: string;
 note: string;
}

export const CREDIT_COST_RULES: CreditCostRule[] = [
 {
   action: 'CREATE_HEAD',
   costInCredits: 2,
   label: 'Création de votre tête 3D',
   note: '2 crédits par reconstruction photo',
 },
 {
   action: 'TRY_ON_HAIRSTYLE',
   costInCredits: 0,
   label: 'Essayage de coiffures du catalogue',
   note: 'Gratuit & illimité sur vos têtes',
 },
 {
   action: 'CHANGE_HAIRSTYLE',
   costInCredits: 0,
   label: 'Changement de style ou couleur',
   note: 'Gratuit & instantané',
 },
 {
   action: 'DOWNLOAD_HD',
   costInCredits: 1,
   label: 'Téléchargement HD du rendu',
   note: '1 crédit par image Haute Définition',
 },
 {
   action: 'SHARE_LOOK',
   costInCredits: 0,
   label: 'Partage WhatsApp / Réseaux',
   note: 'Gratuit',
 },
 {
   action: 'RECONSTRUCT_NEW_PHOTOS',
   costInCredits: 2,
   label: 'Nouvelle tête avec nouvelles photos',
   note: '2 crédits',
 },
];

export const B2C_USER_JOURNEY_STEPS = [
 {
   step: '01',
   title: 'Prenez vos photos',
   description: 'Une photo de face et deux de profil sous un bon éclairage.',
 },
 {
   step: '02',
   title: 'Créez votre tête 3D',
   description: 'Notre moteur IA reconstruit votre morphologie exacte.',
 },
 {
   step: '03',
   title: 'Essayez les coiffures',
   description: 'Testez gratuitement tous les styles Afro, Locks, Braids et Fades.',
 },
 {
   step: '04',
   title: 'Téléchargez & Montrez',
   description: 'Sauvegardez votre look HD et montrez-le directement à votre coiffeur.',
 },
];
