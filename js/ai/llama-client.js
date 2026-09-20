/* ELIAS — punto de integración del motor de IA (Llama)
   ---------------------------------------------------
   Estado: STUB (interfaz definida, sin conexión real todavía).
   El motor se conecta cuando exista el backend (junto con Supabase) — mientras tanto,
   toda pantalla que use IA debe llamar SOLO a esta interfaz, nunca directo al proveedor,
   para poder cambiar de motor sin tocar las pantallas.

   Reglas de producto que este cliente debe respetar siempre:
   - Solo texto. Nunca voz, nunca audio de entrada/salida de la IA.
   - Nunca diagnostica ni decide (tipo de falta, clasificación PIAR/DUA, escalamiento):
     solo redacta/formatea a partir de lo que una persona ya decidió o escribió.
   - Cada función de este cliente corresponde a UN formato fijo (ver plan de construcción,
     sección "Formatos con IA") — nunca un prompt genérico para todo.
*/

const LlamaClient = (() => {
  const ENDPOINT = null; // TODO: URL del backend cuando exista (fase Supabase + servidor)

  async function _call(task, payload) {
    if (!ENDPOINT) {
      console.warn(`[LlamaClient] "${task}" llamado sin backend configurado todavía — modo simulado.`);
      return { ok: false, simulated: true, task, payload };
    }
    const res = await fetch(`${ENDPOINT}/ai/${task}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`LlamaClient: fallo en "${task}" (${res.status})`);
    return res.json();
  }

  return {
    // Docente llena parámetros observacionales -> IA redacta el Anexo 2 en formato oficial
    redactarAnexo2: (parametrosObservacionales) => _call('anexo2', parametrosObservacionales),
    // Orientación construye el PIAR con ajustes razonables por área -> IA sugiere estrategias por área
    sugerirEstrategiasPIAR: (caracterizacionSIMAT, valoracionPedagogica) =>
      _call('piar-estrategias', { caracterizacionSIMAT, valoracionPedagogica }),
    // Docente registra el hecho de convivencia (tipo ya elegido por el humano) -> IA redacta narrativa factual
    redactarNarrativaConvivencia: (tipo, hechos) => _call('convivencia-narrativa', { tipo, hechos }),
    // Docente pide actividad/evaluación/refuerzo -> IA genera desde el banco o desde cero
    generarActividad: (asignatura, grado, tipo) => _call('actividad', { asignatura, grado, tipo }),
    // Informe académico consolidado por estudiante -> IA redacta conclusiones a partir de indicadores
    generarInformeEstudiante: (estudianteId) => _call('informe-estudiante', { estudianteId }),
    // Informe administrativo consolidado (por sede o global)
    generarInformeAdministrativo: (alcance) => _call('informe-admin', { alcance })
  };
})();

