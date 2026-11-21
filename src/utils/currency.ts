/**
 * Formate un montant numérique en devise locale FCFA.
 * Exemple: 3500 -> "3 500 FCFA"
 */
export function formatFCFA(amount: number): string {
  const formattedNumber = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formattedNumber} FCFA`;
}
