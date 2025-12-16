import React from 'react';
import EnsambladorExamen from '../EnsambladorExamen';
import { examenesService } from '../../../../services/examenesService';
import type { Examen, DatosPaso5 } from '../../../../types/examenes';

interface Props {
  examenId: number;
  examen: Examen;
  datosPaso?: DatosPaso5 | null;
  soloLectura?: boolean;
  onCompletado: () => void;
  onSiguiente: () => void;
  onVolver: () => void;
}

const Paso5Ensamblador: React.FC<Props> = ({
  examenId,
  soloLectura = false,
  onCompletado,
  onSiguiente,
  onVolver
}) => {
  // Key única que se genera al montar el componente para forzar recarga
  const [ensambladorKey] = React.useState(() => `ensamblador-${examenId}-${Math.random()}`);
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          PASO 5: Ensamblador de Preguntas
        </h2>
        <p className="text-sm text-gray-600">
          Asigne preguntas del banco a cada subprueba. Cada subprueba debe tener al menos 1 pregunta asignada.
        </p>
      </div>

      <EnsambladorExamen
        key={ensambladorKey}
        examenId={examenId}
        soloLectura={soloLectura}
        onCerrar={onVolver}
        mostrarComoModal={false}
        onPreguntasActualizadas={async () => {
          // Verificar si todas las subpruebas tienen preguntas
          // Esto se puede hacer llamando al estado del wizard
          try {
            const estado = await examenesService.admin.getEstadoWizard(examenId);
            if (estado.estado_pasos.paso5) {
              await examenesService.admin.actualizarPaso(examenId, 5);
              onCompletado();
            }
          } catch {
            // Ignorar errores al verificar estado del wizard
          }
        }}
      />

      {/* Botones adicionales */}
      <div className="flex justify-between mt-6 pt-6 border-t">
        <button
          onClick={onVolver}
          className="px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          ← Volver a Paso 4
        </button>
        <button
          onClick={async () => {
            // Verificar completitud antes de continuar
            try {
              const estado = await examenesService.admin.getEstadoWizard(examenId);
              if (estado.estado_pasos.paso5) {
                await examenesService.admin.actualizarPaso(examenId, 5);
                onCompletado();
                onSiguiente();
              } else {
                alert('Debe asignar al menos 1 pregunta a cada subprueba antes de continuar.');
              }
            } catch {
              alert('Error al verificar la completitud del examen.');
            }
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Continuar al Paso 6 →
        </button>
      </div>
    </div>
  );
};

export default Paso5Ensamblador;

