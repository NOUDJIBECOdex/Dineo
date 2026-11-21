# Dineo — ERP Restaurant, Commande Client QR & Livraison (Maroua, Cameroun)

Application web complète de gestion de restaurant conçue pour le contexte local de **Maroua (Extrême-Nord, Cameroun)** : devise FCFA, quartiers de Maroua, paiements **Orange Money**, **MTN MoMo** et **Espèces**, design éditorial minimaliste (modes clair & sombre + palette de marque personnalisable).

## Interfaces disponibles

| Espace | Route | Description |
| :--- | :--- | :--- |
| **Dashboard Restaurant (ERP)** | `/` | 22 modules : Tableau de bord, Caisse POS, Cuisine KDS (alerte 5 s), Facturation 80 mm/A4, Livraisons & Dossier Preuves, Tables & QR Codes imprimables, Stocks & Recettes automatiques, Achats/Fournisseurs, Rapports analytiques, Dépenses, Salaires, Fidélité, Personnel, RBAC & Audit. |
| **Espace Client (Mobile-First)** | `/menu` ou `/table/T-01` | Menu digital QR Table & Livraison Domicile, correction orthographique en direct sur les notes, demande d'addition intelligente, suivi en direct, code secret de remise 4 chiffres & confirmation de réception avec photo. |
| **Espace Livreur (Mobile-First)** | `/livreur` | Réservation de courses, verrouillage de départ tant que la cuisine n'est pas prête, alerte sonore 10 s + vibration dès que le colis est prêt, caméra arrière directe avec filigrane horodaté anti-fraude, validation par code PIN client & pointage caisse de fin de service. |

## Stack technique

- **React 19** + **TypeScript** + **Vite 8** + **Tailwind CSS v4**
- **Code-splitting par route (`React.lazy`)** optimisé pour réseaux mobiles 3G
- **Web Audio API** autonome (alertes Cuisine 5 s & Livreur 10 s sans fichiers externes)
- **QR Code ISO/IEC 18004** (`qrcode`) prêt à l'impression A4

## Démarrage local

```bash
npm install
npm run dev
```

## Build production & vérification

```bash
npm run build
npm run lint
```

## Déploiement rapide (Vercel / Netlify / Cloudflare Pages)

Le dépôt inclut déjà `vercel.json` et `public/_redirects` pour la gestion des routes SPA (`/menu`, `/table/T-01`, `/livreur`).
- **Build command** : `npm run build`
- **Output directory** : `dist`
