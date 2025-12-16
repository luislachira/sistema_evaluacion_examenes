/**
 * Procesa HTML para convertir URLs relativas de imágenes a absolutas
 * y asegurar que las imágenes se muestren correctamente
 * También corrige URLs con dominios incorrectos
 */
export function procesarHTMLImagenes(html: string): string {
  if (!html) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');
    const currentOrigin = window.location.origin;

    images.forEach((img) => {
      const src = img.getAttribute('src') || '';

      if (!src) {
        return;
      }

      let newSrc = src;

      // Si es una URL absoluta, verificar si el dominio es incorrecto
      if (src.startsWith('http://') || src.startsWith('https://')) {
        try {
          const url = new URL(src);
          // Si el dominio no coincide con el actual, reemplazarlo
          // También verificar dominios conocidos incorrectos
          const dominiosIncorrectos = ['examen-ascenso.com', 'IdIn.site', 'idIn.site'];
          const hostname = url.hostname.toLowerCase();

          if (url.origin !== currentOrigin || dominiosIncorrectos.includes(hostname)) {
            // Mantener la ruta pero cambiar el origen
            newSrc = currentOrigin + url.pathname + url.search + url.hash;
          }
        } catch (_e) {
          // Si hay error al parsear la URL, mantener el src original
        }
      } else if (!src.startsWith('data:')) {
        // Si la URL no es absoluta y no es data URI, convertirla a absoluta
        let absoluteUrl = '';

        if (src.startsWith('/storage/')) {
          absoluteUrl = currentOrigin + src;
        } else if (src.startsWith('storage/')) {
          absoluteUrl = currentOrigin + '/' + src;
        } else if (src.startsWith('/')) {
          absoluteUrl = currentOrigin + src;
        } else {
          absoluteUrl = currentOrigin + '/' + src;
        }

        newSrc = absoluteUrl;
      }

      img.setAttribute('src', newSrc);

      // Asegurar que las imágenes tengan estilos correctos
      const currentStyle = img.getAttribute('style') || '';
      let newStyle = currentStyle;

      if (!currentStyle.includes('max-width')) {
        newStyle += (newStyle ? '; ' : '') + 'max-width: 100%;';
      }
      if (!currentStyle.includes('height')) {
        newStyle += (newStyle ? '; ' : '') + 'height: auto;';
      }
      if (!currentStyle.includes('display')) {
        newStyle += (newStyle ? '; ' : '') + 'display: block;';
      }
      if (!currentStyle.includes('margin')) {
        newStyle += (newStyle ? '; ' : '') + 'margin: 10px 0;';
      }

      img.setAttribute('style', newStyle);

      // Limpiar el alt si es "Imagen pegado" o está vacío
      const alt = img.getAttribute('alt') || '';
      if (!alt || alt === 'Imagen pegado' || alt.trim() === '') {
        img.setAttribute('alt', 'Imagen');
      }

    });

    return doc.body.innerHTML;
  } catch (_e) {
    return html;
  }
}

