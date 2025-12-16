import React, { useRef, useState } from 'react';
import clienteApi from '../api/clienteApi';

interface EditorTextoEnriquecidoProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  tipoRecurso?: string;
  idRecurso?: number | string; // Soporta tanto número como string (para preguntas)
  disabled?: boolean;
}

const EditorTextoEnriquecido: React.FC<EditorTextoEnriquecidoProps> = ({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  id,
  tipoRecurso = 'examen_descripcion',
  idRecurso,
  disabled = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Aplicar formato al texto seleccionado
  const aplicarFormato = (comando: string, valor?: string) => {
    document.execCommand(comando, false, valor);
    editorRef.current?.focus();
    actualizarContenido();
  };

  // Actualizar el contenido del editor
  const actualizarContenido = () => {
    if (editorRef.current) {
      // Limpiar contenido vacío o solo espacios
      let contenido = editorRef.current.innerHTML.trim();

      // Procesar y limpiar el HTML antes de guardar
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contenido;
      const images = tempDiv.querySelectorAll('img');

      if (images.length > 0) {
        images.forEach((img, index) => {
          const src = img.getAttribute('src') || '';
          const alt = img.getAttribute('alt') || '';

          // Si la imagen no tiene src, intentar encontrarlo en el DOM del editor
          if (!src) {
            // Intentar encontrar la imagen en el DOM del editor
            const editorImages = editorRef.current?.querySelectorAll('img');
            if (editorImages && editorImages[index]) {
              const editorImg = editorImages[index];
              const editorSrc = editorImg.getAttribute('src') || '';
              if (editorSrc) {
                img.setAttribute('src', editorSrc);
              }
            }
          }

          // Limpiar el alt si es "Imagen pegado" o está vacío
          if (!alt || alt === 'Imagen pegado' || alt.trim() === '') {
            img.setAttribute('alt', 'Imagen');
          }

          // Asegurar que la URL sea absoluta si no lo es
          const currentSrc = img.getAttribute('src') || '';
          if (currentSrc && !currentSrc.startsWith('http://') && !currentSrc.startsWith('https://') && !currentSrc.startsWith('data:')) {
            const baseUrl = window.location.origin;
            let absoluteUrl = '';
            if (currentSrc.startsWith('/storage/')) {
              absoluteUrl = baseUrl + currentSrc;
            } else if (currentSrc.startsWith('storage/')) {
              absoluteUrl = baseUrl + '/' + currentSrc;
            } else if (currentSrc.startsWith('/')) {
              absoluteUrl = baseUrl + currentSrc;
            } else {
              absoluteUrl = baseUrl + '/' + currentSrc;
            }
            img.setAttribute('src', absoluteUrl);
          }
        });

        // Actualizar el contenido con las correcciones
        contenido = tempDiv.innerHTML;
      }

      onChange(contenido || '');
    }
  };

  // Función para procesar HTML y asegurar que las URLs de imágenes sean absolutas
  const procesarHTMLImagenes = (html: string): string => {
    if (!html) return '';

    try {
      // Crear un contenedor temporal para preservar la estructura completa del HTML
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      const images = tempDiv.querySelectorAll('img');

      images.forEach((img) => {
        const src = img.getAttribute('src') || '';

        // Si la imagen no tiene src o es data URI, no procesar
        if (!src || src.startsWith('data:')) {
          return;
        }

        // Si la URL no es absoluta, convertirla a absoluta
        if (!src.startsWith('http://') && !src.startsWith('https://')) {
          const baseUrl = window.location.origin;
          // Manejar URLs que empiecen con /storage/ o solo storage/
          let absoluteUrl = '';
          if (src.startsWith('/storage/')) {
            absoluteUrl = baseUrl + src;
          } else if (src.startsWith('storage/')) {
            absoluteUrl = baseUrl + '/' + src;
          } else if (src.startsWith('/')) {
            absoluteUrl = baseUrl + src;
          } else {
            absoluteUrl = baseUrl + '/' + src;
          }
          img.setAttribute('src', absoluteUrl);
        }

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

        // Asegurar que tenga un alt si no lo tiene o si tiene "Imagen pegado"
        const alt = img.getAttribute('alt') || '';
        if (!alt || alt === 'Imagen pegado') {
          img.setAttribute('alt', 'Imagen');
        }
      });

      // Devolver el HTML completo del contenedor, no solo body.innerHTML
      return tempDiv.innerHTML;
    } catch (_e) {
      return html;
    }
  };

  // Inicializar y sincronizar el contenido
  React.useEffect(() => {
    if (editorRef.current) {
      // Solo actualizar si el contenido realmente cambió (evita loops infinitos)
      const currentContent = editorRef.current.innerHTML.trim();
      const newContent = (value || '').trim();

      if (currentContent !== newContent) {
        // Guardar posición del cursor
        const selection = window.getSelection();
        let range = null;
        if (selection && selection.rangeCount > 0) {
          range = selection.getRangeAt(0).cloneRange();
        }

        // Procesar el HTML para asegurar que las URLs de imágenes sean absolutas
        const processedContent = procesarHTMLImagenes(newContent);

        // Actualizar contenido
        editorRef.current.innerHTML = processedContent || '';


        // Restaurar posición del cursor si estaba dentro del editor
        if (range && selection && editorRef.current.contains(range.commonAncestorContainer)) {
          try {
            selection.removeAllRanges();
            selection.addRange(range);
          } catch {
            // Si falla al restaurar la posición del cursor, colocar cursor al final
            // Esto puede ocurrir si el rango ya no es válido
            const newRange = document.createRange();
            newRange.selectNodeContents(editorRef.current);
            newRange.collapse(false);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        }
      }
    }
  }, [value]);

  // Convertir base64 a Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64.split(',')[1] || base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Subir imagen desde Blob o File
  const subirImagenDesdeBlob = async (blob: Blob, nombreOriginal: string = 'imagen.png'): Promise<string | null> => {
    // Convertir Blob a File
    const file = new File([blob], nombreOriginal, { type: blob.type });

    if (file.size > 5 * 1024 * 1024) {
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('imagen', file);
      formData.append('tipo_recurso', tipoRecurso);
      if (idRecurso) {
        if (typeof idRecurso === 'number') {
          formData.append('id_recurso', idRecurso.toString());
        } else {
          formData.append('id_recurso_string', idRecurso);
        }
      }

      const response = await clienteApi.post('/admin/archivos/subir-imagen', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.url) {
        return response.data.url;
      }
      return null;
    } catch {
      return null;
    }
  };

  // Manejar pegado de contenido
  const handlePaste = async (e: React.ClipboardEvent) => {
    e.preventDefault();

    const clipboardData = e.clipboardData;
    const items = clipboardData.items;

    // Verificar si hay archivos de imagen en el clipboard (incluyendo capturas de pantalla)
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Detectar imágenes, incluyendo capturas de pantalla que pueden venir como 'image/png' o 'image/x-png'
      if (item.kind === 'file' && (
        item.type.startsWith('image/') ||
        item.type === 'image/x-png' ||
        item.type === 'image/x-jpeg'
      )) {
        const file = item.getAsFile();
        if (file) {
          imageFiles.push(file);
        }
      }
    }

    // Si hay imágenes como archivos, subirlas primero
    if (imageFiles.length > 0) {
      setUploading(true);
      try {
        const imageUrls: string[] = [];
        for (const file of imageFiles) {
          const formData = new FormData();
          formData.append('imagen', file);
          formData.append('tipo_recurso', tipoRecurso);
          if (idRecurso) {
            if (typeof idRecurso === 'number') {
              formData.append('id_recurso', idRecurso.toString());
            } else {
              formData.append('id_recurso_string', idRecurso);
            }
          }

          const response = await clienteApi.post('/admin/archivos/subir-imagen', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (response.data.success && response.data.url) {
            // Asegurar que la URL sea absoluta
            let imageUrl = response.data.url;
            if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
              const baseUrl = window.location.origin;
              imageUrl = baseUrl + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
            }
            imageUrls.push(imageUrl);
          }
        }

        // Insertar imágenes en el editor usando una forma más confiable
        for (const url of imageUrls) {
          if (!url) {
            continue;
          }

          // Usar Range API para insertar de forma más confiable
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();

            // Crear elemento img
            const imgElement = document.createElement('img');
            imgElement.src = url;
            imgElement.alt = 'Imagen';
            imgElement.style.cssText = 'max-width: 100%; height: auto; margin: 10px 0; display: block;';

            // Insertar el elemento
            range.insertNode(imgElement);

            // Colocar el cursor después de la imagen
            range.setStartAfter(imgElement);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            // Fallback: usar insertHTML si no hay selección
            const img = `<img src="${url}" alt="Imagen" style="max-width: 100%; height: auto; margin: 10px 0; display: block;" />`;
            document.execCommand('insertHTML', false, img);
          }

        }

        // Si también hay texto, insertarlo
        const texto = clipboardData.getData('text/plain');
        if (texto && !imageFiles.length) {
          document.execCommand('insertText', false, texto);
        }

        // Forzar actualización del contenido después de un breve delay para asegurar que el DOM se actualizó
        setTimeout(() => {
          actualizarContenido();
        }, 200);
      } catch (_error) {
        // Fallback: insertar solo texto
        const texto = clipboardData.getData('text/plain');
        document.execCommand('insertText', false, texto);
        actualizarContenido();
      } finally {
        setUploading(false);
      }
      return;
    }

    // Obtener datos del clipboard
    const textoPlano = clipboardData.getData('text/plain');
    const htmlData = clipboardData.getData('text/html');

    // Verificar si el texto pegado es una URL de imagen
    const esUrlImagen = textoPlano && (
      textoPlano.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i) ||
      textoPlano.match(/^https?:\/\/.+\/(storage|images|img|uploads).*\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i)
    );

    // Si el texto es una URL de imagen, descargarla y subirla
    if (esUrlImagen && !htmlData) {
      setUploading(true);
      try {
        const imageUrl = textoPlano.trim();

        // Descargar la imagen
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error('No se pudo descargar la imagen');
        }

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error('El archivo no es una imagen');
        }

        // Subir la imagen
        const url = await subirImagenDesdeBlob(blob, `imagen_pegada_${Date.now()}.${blob.type.split('/')[1] || 'png'}`);

        if (url) {
          // Asegurar que la URL sea absoluta
          let imageUrlFinal = url;
          if (!imageUrlFinal.startsWith('http://') && !imageUrlFinal.startsWith('https://')) {
            const baseUrl = window.location.origin;
            imageUrlFinal = baseUrl + (imageUrlFinal.startsWith('/') ? imageUrlFinal : '/' + imageUrlFinal);
          }

          // Insertar la imagen en el editor
          const selection = window.getSelection();
          if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();

            const imgElement = document.createElement('img');
            imgElement.src = imageUrlFinal;
            imgElement.alt = 'Imagen';
            imgElement.style.cssText = 'max-width: 100%; height: auto; margin: 10px 0; display: block;';

            range.insertNode(imgElement);
            range.setStartAfter(imgElement);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          } else {
            const img = `<img src="${imageUrlFinal}" alt="Imagen" style="max-width: 100%; height: auto; margin: 10px 0; display: block;" />`;
            document.execCommand('insertHTML', false, img);
          }

          setTimeout(() => {
            actualizarContenido();
          }, 100);
        }
      } catch (_error) {
        // Si falla, insertar como texto normal
        document.execCommand('insertText', false, textoPlano);
        actualizarContenido();
      } finally {
        setUploading(false);
      }
      return;
    }

    // Si no hay archivos, procesar HTML (puede contener imágenes base64 o URLs externas)
    if (htmlData) {
      setUploading(true);
      try {
        // Crear un elemento temporal para procesar el HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlData;

        // Buscar todas las imágenes en el HTML
        const images = tempDiv.querySelectorAll('img');
        const imagePromises: Promise<void>[] = [];

        images.forEach((img) => {
          const src = img.getAttribute('src') || '';

          // Si es base64, convertir y subir
          if (src.startsWith('data:image/')) {
            const match = src.match(/^data:image\/(\w+);base64,(.+)$/);
            if (match) {
              const mimeType = `image/${match[1]}`;

              const promise = (async () => {
                const blob = base64ToBlob(src, mimeType);
                const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
                let url = await subirImagenDesdeBlob(blob, `imagen_pegada.${extension}`);
                if (url) {
                  // Asegurar que la URL sea absoluta
                  if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    const baseUrl = window.location.origin;
                    url = baseUrl + (url.startsWith('/') ? url : '/' + url);
                  }
                  img.setAttribute('src', url);
                }
              })();

              imagePromises.push(promise);
            }
          }
          // Si es URL externa, intentar descargar y subir
          else if (src.startsWith('http://') || src.startsWith('https://')) {
            // Solo procesar si no es del mismo dominio
            const currentDomain = window.location.origin;
            if (!src.startsWith(currentDomain)) {
              const promise = (async () => {
                try {
                  const response = await fetch(src, { mode: 'cors' });
                  if (response.ok) {
                    const blob = await response.blob();
                    let url = await subirImagenDesdeBlob(blob, `imagen_externa.${blob.type.split('/')[1] || 'png'}`);
                    if (url) {
                      // Asegurar que la URL sea absoluta
                      if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        const baseUrl = window.location.origin;
                        url = baseUrl + (url.startsWith('/') ? url : '/' + url);
                      }
                      img.setAttribute('src', url);
                    }
                  }
                } catch {
                  // Mantener la URL original si falla
                }
              })();

              imagePromises.push(promise);
            }
          }
        });

        // Esperar a que todas las imágenes se suban
        await Promise.all(imagePromises);

        // Insertar el HTML procesado en el editor usando Range API
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();

          // Crear un contenedor temporal para el HTML procesado
          const container = document.createElement('div');
          container.innerHTML = tempDiv.innerHTML;

          // Insertar todos los nodos del contenedor
          const fragment = document.createDocumentFragment();
          while (container.firstChild) {
            fragment.appendChild(container.firstChild);
          }
          range.insertNode(fragment);

          // Colocar el cursor al final del contenido insertado
          range.setStartAfter(fragment.lastChild || range.startContainer);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // Fallback: usar insertHTML si no hay selección
          document.execCommand('insertHTML', false, tempDiv.innerHTML);
        }

        // Forzar actualización del contenido
        setTimeout(() => {
          actualizarContenido();
        }, 100);
      } catch {
        // Fallback: insertar solo texto
        const texto = clipboardData.getData('text/plain');
        document.execCommand('insertText', false, texto);
        actualizarContenido();
      } finally {
        setUploading(false);
      }
    } else {
      // Si no hay HTML, insertar texto plano
      const texto = clipboardData.getData('text/plain');
      document.execCommand('insertText', false, texto);
      actualizarContenido();
    }
  };

  // Subir imagen
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe exceder 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('imagen', file);
      formData.append('tipo_recurso', tipoRecurso);
      if (idRecurso) {
        // Si es número, usar id_recurso; si es string, usar id_recurso_string
        if (typeof idRecurso === 'number') {
          formData.append('id_recurso', idRecurso.toString());
        } else {
          formData.append('id_recurso_string', idRecurso);
        }
      }

      const response = await clienteApi.post('/admin/archivos/subir-imagen', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.url) {
        // Asegurar que la URL sea absoluta
        let imageUrl = response.data.url;
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
          const baseUrl = window.location.origin;
          imageUrl = baseUrl + (imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl);
        }

        // Insertar imagen en el editor usando Range API
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.deleteContents();

          // Crear elemento img
          const imgElement = document.createElement('img');
          imgElement.src = imageUrl;
          imgElement.alt = file.name;
          imgElement.style.cssText = 'max-width: 100%; height: auto; margin: 10px 0; display: block;';

          // Insertar el elemento
          range.insertNode(imgElement);

          // Colocar el cursor después de la imagen
          range.setStartAfter(imgElement);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        } else {
          // Fallback: usar insertHTML si no hay selección
          const img = `<img src="${imageUrl}" alt="${file.name}" style="max-width: 100%; height: auto; margin: 10px 0; display: block;" />`;
          document.execCommand('insertHTML', false, img);
        }

        // Forzar actualización del contenido
        setTimeout(() => {
          actualizarContenido();
        }, 100);
      } else {
        alert('Error al subir la imagen');
      }
    } catch {
      alert('Error al subir la imagen. Por favor, intenta de nuevo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Insertar tabla
  const insertarTabla = () => {
    const filas = prompt('Número de filas:', '3');
    const columnas = prompt('Número de columnas:', '3');

    if (filas && columnas) {
      let tabla = '<table style="border-collapse: collapse; width: 100%; margin: 10px 0;"><tbody>';
      for (let i = 0; i < parseInt(filas); i++) {
        tabla += '<tr>';
        for (let j = 0; j < parseInt(columnas); j++) {
          const contenido = i === 0 ? '<strong>Encabezado</strong>' : 'Celda';
          tabla += `<td style="border: 1px solid #ddd; padding: 8px;">${contenido}</td>`;
        }
        tabla += '</tr>';
      }
      tabla += '</tbody></table>';
      document.execCommand('insertHTML', false, tabla);
      actualizarContenido();
    }
  };

  return (
    <div className="border border-gray-300 rounded-md">
      {/* Barra de herramientas */}
      <div className="border-b border-gray-300 bg-gray-50 p-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => aplicarFormato('bold')}
          disabled={disabled}
          className={`px-3 py-1 text-sm font-bold border border-gray-300 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Negrita"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          onClick={() => aplicarFormato('italic')}
          disabled={disabled}
          className={`px-3 py-1 text-sm italic border border-gray-300 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Cursiva"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          onClick={() => aplicarFormato('underline')}
          disabled={disabled}
          className={`px-3 py-1 text-sm underline border border-gray-300 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Subrayado"
        >
          <u>U</u>
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => aplicarFormato('justifyLeft')}
          disabled={disabled}
          className={`px-3 py-1 text-sm border border-gray-300 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Alinear izquierda"
        >
          ⬅
        </button>
        <button
          type="button"
          onClick={() => aplicarFormato('justifyCenter')}
          disabled={disabled}
          className={`px-3 py-1 text-sm border border-gray-300 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Centrar"
        >
          ⬌
        </button>
        <button
          type="button"
          onClick={() => aplicarFormato('justifyRight')}
          disabled={disabled}
          className={`px-3 py-1 text-sm border border-gray-300 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Alinear derecha"
        >
          ➡
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => aplicarFormato('insertUnorderedList')}
          disabled={disabled}
          className={`px-3 py-1 text-sm border border-gray-300 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Lista con viñetas"
        >
          •
        </button>
        <button
          type="button"
          onClick={() => aplicarFormato('insertOrderedList')}
          disabled={disabled}
          className={`px-3 py-1 text-sm border border-gray-300 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Lista numerada"
        >
          1.
        </button>
        <div className="w-px bg-gray-300 mx-1" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          className={`px-3 py-1 text-sm border border-gray-300 rounded ${disabled || uploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Insertar imagen"
        >
          {uploading ? '⏳' : '🖼️'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          disabled={disabled}
          className="hidden"
        />
        <button
          type="button"
          onClick={insertarTabla}
          disabled={disabled}
          className={`px-3 py-1 text-sm border border-gray-300 rounded ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
          title="Insertar tabla"
        >
          ⧉
        </button>
      </div>

      {/* Área de edición */}
      <div
        ref={editorRef}
        id={id}
        contentEditable={!disabled}
        onInput={actualizarContenido}
        onPaste={handlePaste}
        suppressContentEditableWarning
        className={`min-h-[200px] p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
        style={{
          fontFamily: 'inherit',
          fontSize: '14px',
          lineHeight: '1.5',
        }}
        data-placeholder={placeholder}
      />

      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] table {
          border-collapse: collapse;
          width: 100%;
          margin: 10px 0;
        }
        [contenteditable] table td,
        [contenteditable] table th {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        [contenteditable] table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          margin: 10px 0;
          display: block;
        }
        [contenteditable] img[src=""] {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default EditorTextoEnriquecido;
