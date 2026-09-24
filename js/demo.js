/* ELIAS — Modo demostración
   ---------------------------------------------------------------
   Todo lo de este archivo funciona SIN Supabase y SIN internet:
   datos de ejemplo reales, usuarios de prueba, motor de IA local
   (Llama) que redacta a partir de esos datos reales, calculadora
   de notas, observador con bloqueo real de 15 minutos, votación
   de gobierno escolar, etc.
   Persiste en localStorage para que los cambios se vean durante
   la demostración (recargar la página no borra el progreso).
   Fase siguiente: reemplazar esto por datos reales de Supabase.
*/
const EliasDemo = (() => {
  const KEY = 'elias_demo_v2';
  const QUINCE_MIN = 15 * 60 * 1000;

  function horasAntes(mins) { return Date.now() - mins * 60 * 1000; }
  function uid(p) { return p + '-' + Math.random().toString(36).slice(2, 8); }

  function semilla() {
    const ahora = Date.now();
    return {
      colegio: { nombre: 'Institución Educativa San Rafael', codigo: 'SR', ciudad: 'Ibagué', sedes: ['Sede Central', 'Sede Norte', 'Sede Rural'] },

      asignaturas: ['Español', 'Matemáticas', 'Ciencias Naturales', 'Ciencias Sociales', 'Inglés', 'Educación Física'],

      cursos: [
        { id: 'c6a', nombre: '6°A', sede: 'Sede Central', director: 'doc-carlos' },
        { id: 'c7b', nombre: '7°B', sede: 'Sede Central', director: 'doc-carlos' },
        { id: 'c8a', nombre: '8°A', sede: 'Sede Central', director: 'doc-paola' }
      ],

      // Indicadores de desempeño reales por asignatura y grado (periodo 3)
      indicadores: {
        'Español-6°': [
          'Comprende textos narrativos identificando personajes, tiempo, lugar y conflicto.',
          'Produce textos escritos con coherencia y cohesión, aplicando reglas ortográficas básicas.',
          'Participa en debates argumentando su punto de vista con respeto por el turno de la palabra.'
        ],
        'Matemáticas-6°': [
          'Resuelve operaciones con números enteros aplicando correctamente sus propiedades.',
          'Interpreta y construye gráficas estadísticas sencillas a partir de datos recolectados.',
          'Plantea y resuelve problemas cotidianos usando razones y proporciones.'
        ],
        'Ciencias Naturales-6°': [
          'Explica el proceso de oxido-reducción reconociéndolo en ejemplos cotidianos (oxidación de metales, combustión).',
          'Clasifica los seres vivos según el reino al que pertenecen, justificando el criterio usado.',
          'Diseña y ejecuta experiencias sencillas aplicando los pasos del método científico.'
        ],
        'Español-7°': [
          'Analiza textos argumentativos identificando tesis y argumentos del autor.',
          'Redacta ensayos cortos con estructura de introducción, desarrollo y conclusión.'
        ],
        'Matemáticas-7°': [
          'Resuelve ecuaciones lineales de primer grado con una incógnita.',
          'Aplica el teorema de Pitágoras en la solución de problemas geométricos.'
        ],
        'Ciencias Naturales-7°': [
          'Describe la función de los principales sistemas del cuerpo humano.',
          'Relaciona los cambios de estado de la materia con la energía involucrada.'
        ]
      },

      docentes: [
        { id: 'doc-carlos', nombre: 'Carlos Peña', usuario: 'srcp01', clave: 'Peda2026!', sede: 'Sede Central', tipo: 'area', asignaturas: ['Español'], cursos: ['c6a', 'c7b'], esDirectorDe: 'c6a' },
        { id: 'doc-paola', nombre: 'Paola Rincón', usuario: 'srpr02', clave: 'Peda2026!', sede: 'Sede Central', tipo: 'area', asignaturas: ['Matemáticas'], cursos: ['c6a', 'c7b', 'c8a'], esDirectorDe: 'c8a' },
        { id: 'doc-jorge', nombre: 'Jorge Salazar', usuario: 'srjs03', clave: 'Peda2026!', sede: 'Sede Central', tipo: 'area', asignaturas: ['Ciencias Naturales'], cursos: ['c6a', 'c7b'], esDirectorDe: null }
      ],

      estudiantes: [
        { id: 'est-camila', nombre: 'Camila Torres', curso: 'c6a', documento: '1098765432', fechaNacimiento: '2013-03-14', acudiente: 'pad-marta', usuario: 'srct04', clave: 'Est2026!', contactoEmergencia: '3001234567 (Marta Torres, mamá)', direccion: 'Cra 12 #34-21, Ibagué', caracterizado: true },
        { id: 'est-sofia', nombre: 'Sofía Ramírez', curso: 'c6a', documento: '1098765433', fechaNacimiento: '2013-06-02', acudiente: 'pad-luis', usuario: 'srsr05', clave: 'Est2026!', contactoEmergencia: '3007654321 (Luis Ramírez, papá)', direccion: 'Cll 45 #10-15, Ibagué', caracterizado: false },
        { id: 'est-andres', nombre: 'Andrés Morales', curso: 'c7b', documento: '1098765434', fechaNacimiento: '2012-09-20', acudiente: 'pad-diana', usuario: 'sram06', clave: 'Est2026!', contactoEmergencia: '3009988776 (Diana Morales, mamá)', direccion: 'Cra 5 #22-40, Ibagué', caracterizado: false },
        { id: 'est-juan', nombre: 'Juan Pérez', curso: 'c7b', documento: '1098765435', fechaNacimiento: '2012-11-11', acudiente: 'pad-rosa', usuario: 'srjp07', clave: 'Est2026!', contactoEmergencia: '3002221100 (Rosa Pérez, mamá)', direccion: 'Cll 8 #6-30, Ibagué', caracterizado: false },
        { id: 'est-laura', nombre: 'Laura Gómez', curso: 'c8a', documento: '1098765436', fechaNacimiento: '2011-05-05', acudiente: 'pad-marta', usuario: 'srlg08', clave: 'Est2026!', contactoEmergencia: '3005556677 (Marta Gómez, mamá)', direccion: 'Cra 20 #15-08, Ibagué', caracterizado: false }
      ],

      padres: [
        { id: 'pad-marta', nombre: 'Marta Torres', usuario: 'srmt09', clave: 'Fam2026!', hijos: ['est-camila', 'est-laura'] },
        { id: 'pad-luis', nombre: 'Luis Ramírez', usuario: 'srlr10', clave: 'Fam2026!', hijos: ['est-sofia'] },
        { id: 'pad-diana', nombre: 'Diana Morales', usuario: 'srdm11', clave: 'Fam2026!', hijos: ['est-andres'] },
        { id: 'pad-rosa', nombre: 'Rosa Pérez', usuario: 'srrp12', clave: 'Fam2026!', hijos: ['est-juan'] }
      ],

      // Rector, secretaría, coordinaciones y orientación entran con correo (como en producción)
      directivos: [
        { id: 'rec-marta', nombre: 'Marta Delgado', rol: 'rector', correo: 'rectora@sanrafael.demo', clave: 'Directivo2026!' },
        { id: 'sec-diana', nombre: 'Diana Ríos', rol: 'secretaria', correo: 'secretaria@sanrafael.demo', clave: 'Directivo2026!' },
        { id: 'ori-paula', nombre: 'Paula Nieto', rol: 'orientador', correo: 'orientacion@sanrafael.demo', clave: 'Directivo2026!' },
        { id: 'cac-jorge', nombre: 'Jorge Salazar', rol: 'coordacad', correo: 'coordacademico@sanrafael.demo', clave: 'Directivo2026!' },
        { id: 'ccv-ana', nombre: 'Ana Beltrán', rol: 'coordconv', correo: 'coordconvivencia@sanrafael.demo', clave: 'Directivo2026!' }
      ],

      // Observador: registros reales, uno de ellos creado "ahora" para poder demostrar
      // el bloqueo de edición a los 15 minutos en vivo.
      observador: [
        {
          id: uid('obs'), estudianteId: 'est-camila', docenteId: 'doc-carlos', tipo: '1',
          fecha: new Date(horasAntes(60 * 24 * 6)).toISOString().slice(0, 10),
          descripcion: 'Llegó 15 minutos tarde a la clase de Español sin justificación.',
          creadoEn: horasAntes(60 * 24 * 6), notificado15: true,
          descargos: { texto: 'La estudiante presentó excusa médica al día siguiente.', creadoEn: horasAntes(60 * 24 * 6 - 20), bloqueado: true }
        },
        {
          id: uid('obs'), estudianteId: 'est-andres', docenteId: 'doc-carlos', tipo: '2',
          fecha: new Date(horasAntes(60 * 24 * 2)).toISOString().slice(0, 10),
          descripcion: 'Agresión verbal a un compañero durante el descanso. Se citó a acudiente.',
          creadoEn: horasAntes(60 * 24 * 2), notificado15: true,
          descargos: null
        },
        {
          id: uid('obs'), estudianteId: 'est-camila', docenteId: 'doc-carlos', tipo: '1',
          fecha: new Date().toISOString().slice(0, 10),
          descripcion: 'No trajo el material solicitado para el laboratorio de Ciencias por segunda vez en la semana.',
          creadoEn: horasAntes(5), notificado15: false, // recién creado hace 5 min -> AÚN editable, para demostrar el candado en vivo
          descargos: null
        }
      ],

      actividades: [
        { id: uid('act'), asignatura: 'Español', curso: 'c6a', docenteId: 'doc-carlos', titulo: 'Cuento corto: mi barrio', tipo: 'actividad', fecha: '2026-09-10', notaPromedio: 4.3 },
        { id: uid('act'), asignatura: 'Español', curso: 'c6a', docenteId: 'doc-carlos', titulo: 'Taller de ortografía', tipo: 'actividad', fecha: '2026-09-15', notaPromedio: 4.0 },
        { id: uid('act'), asignatura: 'Matemáticas', curso: 'c6a', docenteId: 'doc-paola', titulo: 'Guía de proporciones', tipo: 'tarea', fecha: '2026-09-12', notaPromedio: 3.9 }
      ],

      // Notas por estudiante y asignatura — 4 casillas de 25% + comportamiento + autoevaluación
      planilla: {
        'est-camila|Español': { actividades: 4.3, evaluaciones: 4.0, tareas: 4.5, evaluacionFinal: 4.2, comportamiento: 4.8, autoevaluacion: 4.5 },
        'est-sofia|Español': { actividades: 3.8, evaluaciones: 4.0, tareas: 3.6, evaluacionFinal: null, comportamiento: 4.2, autoevaluacion: 4.0 },
        'est-andres|Español': { actividades: 4.1, evaluaciones: null, tareas: null, evaluacionFinal: null, comportamiento: 3.9, autoevaluacion: 4.0 },
        'est-juan|Español': { actividades: 4.6, evaluaciones: 4.8, tareas: 4.5, evaluacionFinal: 4.7, comportamiento: 4.9, autoevaluacion: 4.8 },
        'est-laura|Matemáticas': { actividades: 3.5, evaluaciones: 3.9, tareas: null, evaluacionFinal: null, comportamiento: 4.0, autoevaluacion: 3.8 }
      },

      // PIAR — solo estudiantes caracterizados por orientación
      piar: {
        'est-camila': {
          diagnostico: 'Trastorno específico del aprendizaje (dislexia leve), diagnóstico presentado por la familia en marzo de 2026.',
          recomendacionesOrientacion: [
            'Dar tiempo adicional (30%) en evaluaciones escritas.',
            'Permitir apoyo de lectura en voz alta para comprensión de enunciados.',
            'Priorizar evaluación oral cuando sea posible.'
          ]
        }
      },

      notificaciones: {
        rector: [
          { de: 'Coordinación de Convivencia', texto: 'Caso tipo 2 de Andrés Morales (7°B) fue remitido a Comité de Convivencia.', fecha: '2026-09-18' },
          { de: 'Secretaría', texto: 'Pre-informe académico del Periodo 3 listo para tu revisión.', fecha: '2026-09-19' }
        ],
        secretaria: [
          { de: 'Sistema ELIAS', texto: 'Fecha de corte del Periodo 3 vence el 30 de septiembre.', fecha: '2026-09-19' }
        ],
        orientador: [
          { de: 'Carlos Peña (Docente)', texto: 'Reporte de acompañamiento pedagógico de Camila Torres (6°A) — Anexo 2 enviado.', fecha: '2026-09-14' }
        ],
        coordacad: [
          { de: 'Sistema ELIAS', texto: 'Jorge Salazar debe definir la ponderación del puesto antes del cierre de periodo.', fecha: '2026-09-16' }
        ],
        coordconv: [
          { de: 'Carlos Peña (Docente)', texto: 'Registro tipo 2 de Andrés Morales (7°B) — requiere seguimiento del comité.', fecha: '2026-09-18' }
        ],
        docente: [
          { de: 'Rectoría', texto: 'Recuerda subir tus indicadores de desempeño del Periodo 3 antes del viernes.', fecha: '2026-09-17' },
          { de: 'Paula Nieto (Orientación)', texto: 'PIAR de Camila Torres actualizado — revisa las nuevas recomendaciones.', fecha: '2026-09-15' }
        ],
        padre: [
          { de: 'Carlos Peña (Docente)', texto: 'Camila obtuvo 4.4 en Español en el corte parcial del Periodo 3.', fecha: '2026-09-16' },
          { de: 'Colegio (banner)', texto: 'Entrega de boletines: 3 de octubre, 2:00 p.m.', fecha: '2026-09-19' }
        ],
        estudiante: [
          { de: 'Carlos Peña (Docente)', texto: 'Nueva actividad publicada: Taller de ortografía.', fecha: '2026-09-15' },
          { de: 'Gobierno Escolar', texto: 'Ya se abrieron las preinscripciones a personero y representante estudiantil.', fecha: '2026-09-18' }
        ]
      },

      banner: 'Entrega de boletines del Periodo 3: viernes 3 de octubre, 2:00 p.m. — Reunión de padres de familia por curso.',

      gobiernoEscolar: {
        habilitado: true,
        fechasPreinscripcion: { inicio: '2026-09-15', fin: '2026-09-25' },
        fechaVotacion: '2026-09-29',
        candidatos: [
          { id: 'cand1', estudianteId: 'est-laura', cargo: 'Personero/a', propuesta: 'Más torneos deportivos inter-cursos y un buzón digital de sugerencias.', validado: true },
          { id: 'cand2', estudianteId: 'est-juan', cargo: 'Representante estudiantil', propuesta: 'Jornadas de tutorías entre compañeros antes de evaluaciones finales.', validado: true },
          { id: 'cand3', estudianteId: 'est-andres', cargo: 'Personero/a', propuesta: 'Cafetería con precios fijos y más opciones saludables.', validado: false }
        ],
        votos: {} // { estudianteId: candidatoId }
      },

      piarGenerados: [], // { id, estudianteId, asignatura, texto, autor, creadoEn }
      datosPersonales: {} // { 'rol:perfilId': {foto, fechaNacimiento, documento, estudios, direccion, telefono} }
    };
  }

  function cargar() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* localStorage puede fallar en modo privado — seguimos con datos en memoria */ }
    return semilla();
  }

  let DB = cargar();

  function guardar(db) {
    if (db) DB = db;
    try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* no pasa nada, sigue en memoria */ }
  }
  guardar();

  function reiniciar() { DB = semilla(); guardar(DB); return DB; }

  function estudiante(id) { return DB.estudiantes.find(e => e.id === id); }
  function docente(id) { return DB.docentes.find(d => d.id === id); }
  function curso(id) { return DB.cursos.find(c => c.id === id); }
  function padre(id) { return DB.padres.find(p => p.id === id); }
  function grado(cursoId) { const c = curso(cursoId); return c ? c.nombre.replace(/[A-Za-z]$/, '') : ''; }

  // ---------- Autenticación de demostración (usuario+clave y correo) ----------
  function loginUsuario(usuario, clave) {
    usuario = (usuario || '').trim().toLowerCase();
    const doc = DB.docentes.find(d => d.usuario.toLowerCase() === usuario && d.clave === clave);
    if (doc) return { ok: true, rol: 'docente', perfilId: doc.id, nombre: doc.nombre };
    const est = DB.estudiantes.find(e => e.usuario.toLowerCase() === usuario && e.clave === clave);
    if (est) return { ok: true, rol: 'estudiante', perfilId: est.id, nombre: est.nombre };
    const pad = DB.padres.find(p => p.usuario.toLowerCase() === usuario && p.clave === clave);
    if (pad) return { ok: true, rol: 'padre', perfilId: pad.id, nombre: pad.nombre };
    return { ok: false, error: 'Usuario o clave incorrectos.' };
  }

  function loginCorreo(correo, clave) {
    correo = (correo || '').trim().toLowerCase();
    const dir = DB.directivos.find(d => d.correo.toLowerCase() === correo && d.clave === clave);
    if (dir) return { ok: true, rol: dir.rol, perfilId: dir.id, nombre: dir.nombre };
    return { ok: false, error: 'Correo o clave incorrectos.' };
  }

  function cuentasDePrueba() {
    return {
      correo: DB.directivos.map(d => ({ rol: d.rol, nombre: d.nombre, correo: d.correo, clave: d.clave })),
      usuario: [
        ...DB.docentes.map(d => ({ rol: 'docente', nombre: d.nombre, usuario: d.usuario, clave: d.clave })),
        ...DB.estudiantes.map(e => ({ rol: 'estudiante', nombre: e.nombre, usuario: e.usuario, clave: e.clave })),
        ...DB.padres.map(p => ({ rol: 'padre', nombre: p.nombre, usuario: p.usuario, clave: p.clave }))
      ]
    };
  }

  // ---------- Generación de usuario/clave (igual criterio que usará Supabase después) ----------
  function iniciales(nombre) {
    return nombre.trim().split(/\s+/).map(p => p[0]).join('').toUpperCase();
  }
  function aleatorio(n) {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let r = '';
    for (let i = 0; i < n; i++) r += chars[Math.floor(Math.random() * chars.length)];
    return r;
  }
  function generarUsuario(nombre) {
    return (DB.colegio.codigo + iniciales(nombre).slice(0, 2) + aleatorio(3)).toLowerCase();
  }
  function generarClave() {
    const may = 'ABCDEFGHJKMNPQRSTUVWXYZ', min = 'abcdefghjkmnpqrstuvwxyz', num = '23456789';
    return may[Math.floor(Math.random() * may.length)] + min[Math.floor(Math.random() * min.length)] +
      min[Math.floor(Math.random() * min.length)] + num[Math.floor(Math.random() * num.length)] +
      num[Math.floor(Math.random() * num.length)] + min[Math.floor(Math.random() * min.length)] + '!';
  }

  function crearDocentesMasivo(nombres, sede) {
    const creados = nombres.filter(Boolean).map(nombre => {
      const d = { id: uid('doc'), nombre: nombre.trim(), usuario: generarUsuario(nombre), clave: generarClave(), sede: sede || 'Sede Central', tipo: 'area', asignaturas: [], cursos: [], esDirectorDe: null };
      DB.docentes.push(d);
      return d;
    });
    guardar(DB);
    return creados;
  }

  function crearEstudiantesMasivo(filas) {
    // filas: [{nombre, cursoId, documento, acudienteNombre}]
    const creados = filas.filter(f => f.nombre).map(f => {
      let acudienteId = null;
      if (f.acudienteNombre) {
        let pad = DB.padres.find(p => p.nombre.toLowerCase() === f.acudienteNombre.trim().toLowerCase());
        if (!pad) {
          pad = { id: uid('pad'), nombre: f.acudienteNombre.trim(), usuario: generarUsuario(f.acudienteNombre), clave: generarClave(), hijos: [] };
          DB.padres.push(pad);
        }
        acudienteId = pad.id;
      }
      const est = { id: uid('est'), nombre: f.nombre.trim(), curso: f.cursoId, documento: f.documento || '', fechaNacimiento: '', acudiente: acudienteId, usuario: generarUsuario(f.nombre), clave: generarClave(), contactoEmergencia: '', direccion: '', caracterizado: false };
      DB.estudiantes.push(est);
      if (acudienteId) { const pad = padre(acudienteId); if (pad && !pad.hijos.includes(est.id)) pad.hijos.push(est.id); }
      return est;
    });
    guardar(DB);
    return creados;
  }

  // ---------- Planilla / calificaciones ----------
  function notaPlanilla(estudianteId, asignatura) {
    return DB.planilla[estudianteId + '|' + asignatura] || { actividades: null, evaluaciones: null, tareas: null, evaluacionFinal: null, comportamiento: null, autoevaluacion: null, docenteId: null };
  }
  // docenteId: quién registró/editó por última vez esta nota — trazabilidad para Coordinación/Rectoría.
  // Preparado para viajar tal cual a la columna docente_id de la tabla notas en Supabase.
  function guardarNotaPlanilla(estudianteId, asignatura, campo, valor, docenteId) {
    const key = estudianteId + '|' + asignatura;
    if (!DB.planilla[key]) DB.planilla[key] = { actividades: null, evaluaciones: null, tareas: null, evaluacionFinal: null, comportamiento: null, autoevaluacion: null, docenteId: null };
    DB.planilla[key][campo] = valor === '' ? null : Number(valor);
    if (docenteId) DB.planilla[key].docenteId = docenteId;
    guardar(DB);
    return promedioFinal(DB.planilla[key]);
  }
  function promedioFinal(n) {
    const campos = [n.actividades, n.evaluaciones, n.tareas, n.evaluacionFinal].filter(v => v !== null && v !== undefined && v !== '');
    if (!campos.length) return null;
    const suma = campos.reduce((a, b) => a + Number(b), 0);
    return Math.round((suma / campos.length) * 100) / 100;
  }
  // Todas las casillas de planilla de un estudiante (una por asignatura) — usado para el ranking/Puesto real.
  function notasDeEstudiante(estudianteId) {
    const prefijo = estudianteId + '|';
    return Object.keys(DB.planilla)
      .filter(k => k.startsWith(prefijo))
      .map(k => DB.planilla[k]);
  }
  function promedioActividades(notas) {
    // notas: array de números (varias actividades del banco) -> promedio para la casilla "Actividades"
    const validas = notas.map(Number).filter(n => !isNaN(n));
    if (!validas.length) return null;
    return Math.round((validas.reduce((a, b) => a + b, 0) / validas.length) * 100) / 100;
  }

  // ---------- Observador: candado de 15 minutos ----------
  function puedeEditarObservador(registro) {
    return (Date.now() - registro.creadoEn) < QUINCE_MIN;
  }
  function minutosRestantes(registro) {
    const restan = QUINCE_MIN - (Date.now() - registro.creadoEn);
    return Math.max(0, Math.ceil(restan / 60000));
  }
  function crearObservador(estudianteId, docenteId, tipo, descripcion, fecha) {
    const r = { id: uid('obs'), estudianteId, docenteId, tipo, descripcion, fecha: fecha || new Date().toISOString().slice(0, 10), creadoEn: Date.now(), notificado15: false, descargos: null };
    DB.observador.unshift(r);
    guardar(DB);
    return r;
  }
  function editarObservador(id, descripcion) {
    const r = DB.observador.find(o => o.id === id);
    if (!r || !puedeEditarObservador(r)) return { ok: false, error: 'Ya pasaron los 15 minutos: este registro no se puede modificar.' };
    r.descripcion = descripcion;
    guardar(DB);
    return { ok: true };
  }
  function registrosObservadorDe(estudianteId) { return DB.observador.filter(o => o.estudianteId === estudianteId); }
  function marcarNotificado15(id) {
    const r = DB.observador.find(o => o.id === id);
    if (r) { r.notificado15 = true; guardar(DB); }
  }
  function puedeEditarDescargos(registro) {
    if (!registro.descargos) return true;
    return (Date.now() - registro.descargos.creadoEn) < QUINCE_MIN;
  }
  function guardarDescargos(observadorId, texto) {
    const r = DB.observador.find(o => o.id === observadorId);
    if (!r) return { ok: false, error: 'Registro no encontrado.' };
    if (r.descargos && !puedeEditarDescargos(r)) return { ok: false, error: 'Ya pasaron los 15 minutos: los descargos no se pueden modificar.' };
    r.descargos = { texto, creadoEn: Date.now() };
    guardar(DB);
    return { ok: true };
  }

  // ---------- Gobierno escolar ----------
  function candidatosVisibles() { return DB.gobiernoEscolar.candidatos.filter(c => c.validado); }
  function preinscribir(estudianteId, cargo, propuesta) {
    const c = { id: uid('cand'), estudianteId, cargo, propuesta, validado: false };
    DB.gobiernoEscolar.candidatos.push(c);
    guardar(DB);
    return c;
  }
  function validarCandidato(id) {
    const c = DB.gobiernoEscolar.candidatos.find(c => c.id === id);
    if (c) { c.validado = true; guardar(DB); }
  }
  function yaVoto(estudianteId) { return !!DB.gobiernoEscolar.votos[estudianteId]; }
  function votar(estudianteId, candidatoId) {
    if (yaVoto(estudianteId)) return { ok: false, error: 'Ya registraste tu voto — solo se puede votar una vez.' };
    DB.gobiernoEscolar.votos[estudianteId] = candidatoId;
    guardar(DB);
    return { ok: true };
  }
  function resultadosVotacion() {
    const conteo = {};
    Object.values(DB.gobiernoEscolar.votos).forEach(cid => { conteo[cid] = (conteo[cid] || 0) + 1; });
    return DB.gobiernoEscolar.candidatos.filter(c => c.validado).map(c => ({ ...c, votos: conteo[c.id] || 0 })).sort((a, b) => b.votos - a.votos);
  }

  // ---------- PIAR generados (quedan disponibles para consulta) ----------
  function guardarPIARGenerado(estudianteId, asignatura, texto, autor) {
    const doc = { id: uid('piardoc'), estudianteId, asignatura, texto, autor, creadoEn: Date.now() };
    DB.piarGenerados.unshift(doc);
    guardar(DB);
    return doc;
  }
  function piarGeneradosDe(estudianteId) { return DB.piarGenerados.filter(p => p.estudianteId === estudianteId); }

  // ---------- Datos personales editables por cada perfil ----------
  function datosPersonales(rol, perfilId) { return DB.datosPersonales[rol + ':' + perfilId] || {}; }
  function guardarDatosPersonales(rol, perfilId, datos) {
    DB.datosPersonales[rol + ':' + perfilId] = { ...datosPersonales(rol, perfilId), ...datos };
    guardar(DB);
  }

  return {
    get DB() { return DB; }, guardar, reiniciar,
    estudiante, docente, curso, padre, grado,
    loginUsuario, loginCorreo, cuentasDePrueba,
    generarUsuario, generarClave, crearDocentesMasivo, crearEstudiantesMasivo,
    notaPlanilla, guardarNotaPlanilla, notasDeEstudiante, promedioFinal, promedioActividades,
    puedeEditarObservador, minutosRestantes, crearObservador, editarObservador, registrosObservadorDe, marcarNotificado15,
    puedeEditarDescargos, guardarDescargos,
    candidatosVisibles, preinscribir, validarCandidato, yaVoto, votar, resultadosVotacion,
    guardarPIARGenerado, piarGeneradosDe, datosPersonales, guardarDatosPersonales
  };
})();

/* ---------- Llama (IA) — motor local, redacta a partir de datos REALES de EliasDemo ----------
   No es un modelo generativo en la nube: arma el texto con reglas, a partir de datos verdaderos
   (observador, notas, indicadores). Por eso funciona sin internet y no puede fallar en la demo.
*/
const LlamaIA = (() => {
  function origen() {
    return 'Fui creada por el licenciado Julián David Díaz Cortés, con el objetivo de facilitar y agilizar los procesos académicos y complementarios del entorno y la vida escolar.';
  }

  function informeEstudiante(estudianteId) {
    const est = EliasDemo.estudiante(estudianteId);
    if (!est) return 'No encuentro ese estudiante.';
    const registros = EliasDemo.registrosObservadorDe(estudianteId);
    const faltas = { 1: 0, 2: 0, 3: 0 };
    registros.forEach(r => faltas[r.tipo] = (faltas[r.tipo] || 0) + 1);
    const cursoNom = EliasDemo.curso(est.curso)?.nombre || '';
    let texto = `Informe de seguimiento — ${est.nombre} (${cursoNom})\n\n`;
    texto += `Según el observador del estudiante, en el periodo se registran ${registros.length} anotación(es): `;
    texto += `${faltas[1]} de tipo 1, ${faltas[2]} de tipo 2 y ${faltas[3]} de tipo 3.\n\n`;
    if (registros.length) {
      texto += 'Detalle de lo registrado:\n';
      registros.forEach(r => { texto += `• ${r.fecha} (tipo ${r.tipo}): ${r.descripcion}\n`; });
      texto += '\n';
    } else {
      texto += 'No se registran anotaciones de convivencia en el periodo.\n\n';
    }
    if (faltas[2] + faltas[3] === 0 && faltas[1] <= 1) {
      texto += 'Conclusión: el comportamiento del estudiante en el periodo es adecuado, sin situaciones que requieran seguimiento adicional.';
    } else if (faltas[3] > 0) {
      texto += 'Conclusión: se recomienda seguimiento prioritario por parte de Coordinación de Convivencia dada la gravedad de lo registrado.';
    } else {
      texto += 'Conclusión: se recomienda seguimiento por parte del director de curso y acompañamiento de orientación escolar.';
    }
    return texto;
  }

  function planPIAR(estudianteId, asignatura, docenteNombre) {
    const est = EliasDemo.estudiante(estudianteId);
    const piar = EliasDemo.DB.piar[estudianteId];
    if (!est || !piar) return 'Este estudiante no tiene un PIAR activo.';
    let texto = `Plan de acompañamiento (PIAR) — ${est.nombre} — Asignatura: ${asignatura}\n\n`;
    texto += `Diagnóstico de base (registrado por orientación escolar): ${piar.diagnostico}\n\n`;
    texto += 'Recomendaciones de orientación escolar:\n';
    piar.recomendacionesOrientacion.forEach(r => { texto += `• ${r}\n`; });
    texto += `\nAjuste razonable propuesto para ${asignatura}: siguiendo la línea de orientación, se sugiere adaptar las evaluaciones escritas dando tiempo adicional y priorizando, cuando sea posible, la sustentación oral de los temas trabajados en clase.`;
    texto += `\n\nDocumento generado a partir de datos reales del estudiante${docenteNombre ? ' — solicitado por ' + docenteNombre : ''}. Disponible para consulta de orientación, coordinación, secretaría, rectoría, el acudiente y el estudiante.`;
    return texto;
  }

  function retroalimentacionEstudio(tema, asignatura) {
    const t = (tema || '').trim();
    if (!t) return 'Escribe el tema que no entendiste y te lo explico.';
    return `Vamos a repasar "${t}"${asignatura ? ' de ' + asignatura : ''}:\n\n` +
      `1) Idea principal: identifica qué pregunta responde "${t}" dentro del tema que viste en clase.\n` +
      `2) Ejemplo cotidiano: piensa en un caso de tu día a día donde aplique "${t}" — eso ayuda a que no se te olvide.\n` +
      `3) Practica: resuelve 2 o 3 ejercicios cortos sobre "${t}" antes de la próxima clase.\n\n` +
      `Si quieres, te genero una guía de repaso en PDF o Excel con ejercicios de "${t}" para practicar más.`;
  }

  function informeAdministrativo(alcance, db) {
    const totalEst = db.estudiantes.length;
    const totalObs = db.observador.length;
    const promedios = Object.values(db.planilla).map(n => EliasDemo.promedioFinal(n)).filter(v => v !== null);
    const promedioGeneral = promedios.length ? (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(2) : 'sin datos';
    return `Informe consolidado (${alcance === 'global' ? 'todas las sedes' : 'sede'})\n\n` +
      `Estudiantes con datos registrados: ${totalEst}\n` +
      `Anotaciones en el observador del periodo: ${totalObs}\n` +
      `Promedio académico general del periodo: ${promedioGeneral}\n\n` +
      `Este informe cruza datos reales de gestión académica, convivencia y orientación cargados en ELIAS.`;
  }

  return { origen, informeEstudiante, planPIAR, retroalimentacionEstudio, informeAdministrativo };
})();

