/**
 * Détecteur léger d'erreurs orthographiques courantes en français
 * (contexte commande restaurant & livraison au Cameroun).
 * Fonctionne 100 % hors-ligne en complément du correcteur natif du navigateur.
 */
export interface SpellIssue {
  original: string;
  suggestion: string;
  index: number;
  length: number;
}

const TYPO_DICT: Record<string, string> = {
  // Mots fréquents commande / cuisine
  piman: 'piment',
  pimant: 'piment',
  pimente: 'pimenté',
  pimentee: 'pimentée',
  piquan: 'piquant',
  pikant: 'piquant',
  san: 'sans',
  sams: 'sans',
  oigon: 'oignon',
  oigons: 'oignons',
  ognon: 'oignon',
  ognons: 'oignons',
  onion: 'oignon',
  onions: 'oignons',
  pouler: 'poulet',
  poullet: 'poulet',
  piosson: 'poisson',
  poissont: 'poisson',
  braiser: 'braisé',
  baiser: 'braisé',
  braise: 'braisé',
  griler: 'grillé',
  grille: 'grillé',
  cui: 'cuit',
  cuis: 'cuit',
  cuite: 'cuit',
  chau: 'chaud',
  chaut: 'chaud',
  frois: 'froid',
  froi: 'froid',
  glacer: 'glacé',
  glacee: 'glacée',
  fraiche: 'fraîche',
  sause: 'sauce',
  soce: 'sauce',
  sosse: 'sauce',
  sel: 'sel',
  sucrer: 'sucré',
  sucre: 'sucré',
  epice: 'épicé',
  epices: 'épices',
  viand: 'viande',
  beuf: 'bœuf',
  boeuf: 'bœuf',
  legume: 'légume',
  legumes: 'légumes',
  fritte: 'frites',
  frittes: 'frites',
  plantin: 'plantain',
  plantins: 'plantains',
  aloco: 'alloco',
  folere: 'foléré',
  bissape: 'bissap',
  gingenbre: 'gingembre',
  jinjembre: 'gingembre',
  boison: 'boisson',
  boisons: 'boissons',
  couver: 'couverts',
  couverts: 'couverts',
  serviete: 'serviette',
  servietes: 'serviettes',
  // Mots fréquents livraison / adresse Maroua
  apeler: 'appeler',
  apeller: 'appeler',
  appeller: 'appeler',
  appelé: 'appeler',
  apelle: 'appelle',
  ariver: 'arriver',
  arivé: 'arrivé',
  arive: 'arrive',
  arrivee: 'arrivée',
  portaille: 'portail',
  portay: 'portail',
  batiman: 'bâtiment',
  batiment: 'bâtiment',
  imeuble: 'immeuble',
  immeable: 'immeuble',
  quartie: 'quartier',
  kartier: 'quartier',
  carefour: 'carrefour',
  carfour: 'carrefour',
  livrer: 'livrer',
  livreur: 'livreur',
  livreure: 'livreur',
  livrison: 'livraison',
  livraizon: 'livraison',
  comande: 'commande',
  commende: 'commande',
  monaie: 'monnaie',
  mone: 'monnaie',
  meci: 'merci',
  mersi: 'merci',
  merçi: 'merci',
  bonjoure: 'bonjour',
  bonsoire: 'bonsoir',
  rapidemen: 'rapidement',
  vit: 'vite',
  svp: 's’il vous plaît',
  slvp: 's’il vous plaît',
  sil: 's’il',
  plait: 'plaît',
  pa: 'pas',
  tro: 'trop',
  bcp: 'beaucoup',
  bocoup: 'beaucoup',
  beaucou: 'beaucoup',
  pres: 'près',
  deriere: 'derrière',
  devan: 'devant',
  coté: 'côté',
  cote: 'côté',
  maison: 'maison',
  maizon: 'maison',
  entree: 'entrée',
  numero: 'numéro',
  telefone: 'téléphone',
  telphone: 'téléphone',
  telephone: 'téléphone',
  atention: 'attention',
  alergie: 'allergie',
  alergique: 'allergique',
  arachid: 'arachide',
  arachides: 'arachides',
};

function matchCase(original: string, suggestion: string): string {
  if (original.length > 0 && original[0] === original[0].toUpperCase() && original[0] !== original[0].toLowerCase()) {
    return suggestion[0].toUpperCase() + suggestion.slice(1);
  }
  return suggestion;
}

/**
 * Analyse un texte libre et retourne les mots mal orthographiés ou fautes évidentes
 * (lettres triplées comme "biiien", mots du dictionnaire d'erreurs).
 */
export function findFrenchSpellIssues(text: string): SpellIssue[] {
  if (!text.trim()) return [];
  const issues: SpellIssue[] = [];
  const wordRegex = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;
  let match: RegExpExecArray | null;

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const lower = word.toLowerCase();

    // 1. Dictionnaire de fautes courantes
    const dictHit = TYPO_DICT[lower];
    if (dictHit && dictHit !== lower) {
      issues.push({
        original: word,
        suggestion: matchCase(word, dictHit),
        index: match.index,
        length: word.length,
      });
      continue;
    }

    // 2. Répétition anormale de 3+ lettres identiques (ex: "biiien", "saaans", "viiiite")
    if (/(.)\1\1/i.test(word)) {
      const collapsed = word.replace(/(.)\1{2,}/gi, '$1');
      const further = TYPO_DICT[collapsed.toLowerCase()];
      issues.push({
        original: word,
        suggestion: matchCase(word, further || collapsed),
        index: match.index,
        length: word.length,
      });
    }
  }

  return issues;
}

/**
 * Remplace une faute précise dans la chaîne source
 */
export function applySingleSpellFix(text: string, issue: SpellIssue): string {
  return text.slice(0, issue.index) + issue.suggestion + text.slice(issue.index + issue.length);
}

/**
 * Corrige toutes les fautes détectées d'un seul coup
 */
export function applyAllSpellFixes(text: string): string {
  const issues = findFrenchSpellIssues(text);
  let result = text;
  // Appliquer de droite à gauche pour préserver les index
  for (let i = issues.length - 1; i >= 0; i--) {
    result = applySingleSpellFix(result, issues[i]);
  }
  return result.replace(/\s{2,}/g, ' ');
}
