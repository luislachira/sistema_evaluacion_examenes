/**
 * Utilidad para depurar problemas con imágenes en HTML
 */
export function debugImagenesHTML(html: string): void {
  if (!html) {
    return;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');

    images.forEach((_img) => {
      // Función de debug deshabilitada
    });
  } catch (_e) {
    // Error silenciado
  }
}

