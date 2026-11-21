/**
 * Nettoie et formate strictement un numéro de téléphone camerounais.
 * Rejette tout caractère alphabétique ou symbole invalide.
 * Accepte le préfixe +237 ou directement les 9 chiffres commençant par 6.
 */
export function sanitizePhoneInput(raw: string): string {
  // Supprime tout sauf chiffres et un éventuel "+" en tout début de chaîne
  const trimmed = raw.trimStart();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  // Limite maximale : 12 chiffres (237 + 9 chiffres) ou 9 chiffres locaux
  if (hasPlus) {
    const capped = digitsOnly.slice(0, 12);
    if (!capped) return '+';
    if (capped.startsWith('237')) {
      const local = capped.slice(3);
      return formatGrouped('+237', local);
    }
    return `+${capped}`;
  }

  if (digitsOnly.startsWith('237') && digitsOnly.length > 9) {
    const local = digitsOnly.slice(3, 12);
    return formatGrouped('+237', local);
  }

  const local = digitsOnly.slice(0, 9);
  return formatLocalDigits(local);
}

function formatLocalDigits(local: string): string {
  if (local.length <= 1) return local;
  const first = local.slice(0, 1);
  const rest = local.slice(1);
  const pairs = rest.match(/.{1,2}/g) || [];
  return `${first} ${pairs.join(' ')}`.trim();
}

function formatGrouped(prefix: string, local: string): string {
  if (!local) return `${prefix} `;
  return `${prefix} ${formatLocalDigits(local)}`.trim();
}

/**
 * Retourne le nombre de chiffres effectifs (hors préfixe 237).
 */
export function countLocalPhoneDigits(phone: string): number {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('237')) {
    return digits.slice(3).length;
  }
  return digits.length;
}
