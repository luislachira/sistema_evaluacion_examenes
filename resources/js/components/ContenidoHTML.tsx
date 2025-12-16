import React, { useEffect, useRef } from 'react';
import { procesarHTMLImagenes } from '../utils/procesarHTML';

interface ContenidoHTMLProps {
  html: string;
  className?: string;
}

/**
 * Componente para renderizar HTML de forma segura, asegurando que las imágenes se muestren correctamente
 */
const ContenidoHTML: React.FC<ContenidoHTMLProps> = ({ html, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && html) {
      // Procesar el HTML para asegurar que las URLs de imágenes sean absolutas
      // y limpiar atributos incorrectos como alt="Imagen pegado"
      const processedHTML = procesarHTMLImagenes(html);
      containerRef.current.innerHTML = processedHTML;
      
      // WeakMap para almacenar timeouts por imagen (fuera del forEach)
      const imgTimeouts = new WeakMap<HTMLImageElement, NodeJS.Timeout | null>();
      
      // Después de insertar el HTML, verificar y corregir imágenes
      const images = containerRef.current.querySelectorAll('img');
      images.forEach((img) => {
        // Asegurar que el alt esté limpio (por si acaso)
        const alt = img.getAttribute('alt') || '';
        if (!alt || alt === 'Imagen pegado' || alt.trim() === '') {
          img.setAttribute('alt', 'Imagen');
        }
        
        // Asegurar que la URL sea absoluta y use el dominio correcto (doble verificación)
        const src = img.getAttribute('src') || '';
        const currentOrigin = window.location.origin;
        
        if (src) {
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
          
          if (newSrc !== src) {
            img.setAttribute('src', newSrc);
          }
        }
        
        // Si la imagen falla al cargar, mostrar un placeholder DESPUÉS de un tiempo muy largo
        // Esto evita mostrar el error prematuramente cuando la imagen se está cargando
        const handleError = function(this: HTMLImageElement) {
          // Verificar inmediatamente si la imagen ya se cargó
          if (this.complete && this.naturalWidth > 0 && this.naturalHeight > 0) {
            // La imagen se cargó correctamente, no mostrar error
            return;
          }
          
          // Cancelar cualquier timeout previo para esta imagen
          const existingTimeout = imgTimeouts.get(this);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }
          
          // Esperar un tiempo muy largo (10 segundos) antes de mostrar el error
          // Esto da tiempo suficiente para que la imagen cargue incluso con conexiones lentas
          const timeout = setTimeout(() => {
            // Verificar una última vez si la imagen se cargó mientras esperábamos
            if (this.complete && this.naturalWidth > 0 && this.naturalHeight > 0) {
              // La imagen se cargó correctamente, no mostrar error
              imgTimeouts.delete(this);
              return;
            }
            
            // Solo mostrar error si la imagen realmente no se cargó después de 10 segundos
            if (this.parentNode && this.tagName === 'IMG' && 
                (!this.complete || this.naturalWidth === 0 || this.naturalHeight === 0) && 
                this.src) {
              // Verificar que el elemento padre no sea un div de error (para evitar duplicados)
              const parent = this.parentElement || this.parentNode;
              const isAlreadyError = parent instanceof Element && 
                                    parent.nodeName === 'DIV' && 
                                    parent.classList.contains('imagen-error-placeholder');
              
              if (!isAlreadyError) {
                // Crear un div con mensaje de error en lugar de la imagen rota
                const errorDiv = document.createElement('div');
                errorDiv.className = 'imagen-error-placeholder';
                errorDiv.style.cssText = 'padding: 20px; background-color: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 4px; text-align: center; color: #6b7280; font-size: 14px; margin: 10px 0;';
                errorDiv.innerHTML = `
                  <div style="margin-bottom: 8px;">📷</div>
                  <div style="font-weight: 500; margin-bottom: 4px;">Imagen no disponible</div>
                  <div style="font-size: 12px; color: #9ca3af;">La imagen referenciada no se encuentra en el servidor</div>
                `;
                
                // Reemplazar la imagen con el placeholder
                this.parentNode.replaceChild(errorDiv, this);
              }
            }
            
            imgTimeouts.delete(this);
          }, 10000); // Esperar 10 segundos antes de mostrar el error
          
          imgTimeouts.set(this, timeout);
        };
        
        // Solo agregar el listener si la imagen no está ya cargada
        if (!(img.complete && img.naturalHeight !== 0)) {
          img.addEventListener('error', handleError);
          
          // También verificar cuando la imagen se carga exitosamente para cancelar el timeout
          const handleLoad = function(this: HTMLImageElement) {
            // Cancelar el timeout si la imagen se carga
            const timeout = imgTimeouts.get(this);
            if (timeout) {
              clearTimeout(timeout);
              imgTimeouts.delete(this);
            }
            
            // Remover los listeners
            this.removeEventListener('error', handleError);
            this.removeEventListener('load', handleLoad);
          };
          
          img.addEventListener('load', handleLoad);
        }
      });
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        wordBreak: 'break-word',
      }}
    />
  );
};

export default ContenidoHTML;

