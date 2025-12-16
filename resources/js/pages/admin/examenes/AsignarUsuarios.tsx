import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth';

const IconX = ({ size = 24, ...props }: React.SVGProps<SVGSVGElement> & { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface Usuario {
  idUsuario: number;
  nombre: string;
  apellidos: string;
  correo: string;
}

interface Props {
  examenId: number;
  onCerrar: () => void;
  onAsignacionActualizada?: () => void;
}

const AsignarUsuarios: React.FC<Props> = ({ examenId, onCerrar, onAsignacionActualizada }) => {
  const { token } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosAsignados, setUsuariosAsignados] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/admin/examenes/${examenId}/asignar`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setUsuarios(data.docentes || []);
        // usuarios_asignados ya viene como array de IDs desde el backend
        setUsuariosAsignados(data.usuarios_asignados || []);
      } else {
        const errorData = await res.json();
        if (errorData.message) {
          alert(errorData.message);
        }
      }
    } catch {
      // Error al cargar datos, se ignora silenciosamente
      // Mantener estados vacíos si falla la carga
      setUsuarios([]);
      setUsuariosAsignados([]);
    } finally {
      setLoading(false);
    }
  }, [examenId, token]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const toggleUsuario = (idUsuario: number) => {
    setUsuariosAsignados(prev =>
      prev.includes(idUsuario)
        ? prev.filter(id => id !== idUsuario)
        : [...prev, idUsuario]
    );
  };

  const guardar = async () => {
    try {
      setGuardando(true);
      const res = await fetch(`/api/v1/admin/examenes/${examenId}/asignar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ usuarios: usuariosAsignados }),
      });

      if (res.ok) {
        if (onAsignacionActualizada) onAsignacionActualizada();
        onCerrar();
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Error al asignar usuarios');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay-banco backdrop-blur-md bg-black/30 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
          <h3 className="text-2xl font-bold text-gray-900">Asignar Examen a Docentes</h3>
          <button onClick={onCerrar} className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full">
            <IconX size={24} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Seleccione los docentes que tendrán acceso a este examen privado.
          </p>

          {loading ? (
            <div className="text-center py-12 text-gray-500">Cargando docentes...</div>
          ) : usuarios.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No hay docentes disponibles</div>
          ) : (
            <div className="max-h-96 overflow-y-auto border border-gray-300 rounded-lg">
              {usuarios.map((usuario) => (
                <label
                  key={usuario.idUsuario}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={usuariosAsignados.includes(usuario.idUsuario)}
                    onChange={() => toggleUsuario(usuario.idUsuario)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {usuario.nombre} {usuario.apellidos}
                    </div>
                    <div className="text-sm text-gray-600">{usuario.correo}</div>
                  </div>
                </label>
              ))}
            </div>
          )}

          {usuariosAsignados.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {usuariosAsignados.length} docente(s) seleccionado(s)
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex justify-end space-x-3">
          <button
            onClick={onCerrar}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : 'Guardar Asignación'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AsignarUsuarios;

