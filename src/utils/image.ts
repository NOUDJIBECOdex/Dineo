/**
 * Compresse et convertit une image locale (logo, photo produit ou preuve de livraison)
 * en Data URL léger adapté au stockage navigateur et aux réseaux 3G/4G.
 */
export function compressImageToDataUrl(
  file: File,
  options: { maxDimension?: number; quality?: number; preserveTransparency?: boolean } = {}
): Promise<string> {
  const { maxDimension = 560, quality = 0.82, preserveTransparency = false } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (file.type === 'image/svg+xml') {
        resolve(dataUrl);
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Format image non reconnu.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const mime = preserveTransparency && file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(mime, quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresse une photo de preuve de livraison et incruste automatiquement
 * un bandeau d'horodatage anti-fraude (N° commande, date/heure, lieu, acteur).
 */
export function compressAndWatermarkProofPhoto(
  file: File,
  stampLine1: string,
  stampLine2: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire la photo capturée.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format image invalide.'));
      img.onload = () => {
        const maxDim = 680;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Bandeau filigrane horodaté en bas de l'image
        const barH = Math.max(44, Math.round(height * 0.13));
        ctx.fillStyle = 'rgba(18, 18, 20, 0.78)';
        ctx.fillRect(0, height - barH, width, barH);

        const fontSize1 = Math.max(12, Math.round(width * 0.025));
        const fontSize2 = Math.max(10, Math.round(width * 0.021));
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `600 ${fontSize1}px Inter, system-ui, sans-serif`;
        ctx.fillText(stampLine1, 12, height - barH + Math.round(barH * 0.44));

        ctx.fillStyle = '#D4D4D8';
        ctx.font = `400 ${fontSize2}px monospace`;
        ctx.fillText(stampLine2, 12, height - barH + Math.round(barH * 0.80));

        resolve(canvas.toDataURL('image/jpeg', 0.76));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
