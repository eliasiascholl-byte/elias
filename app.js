/* ELIAS — arranque de código real
   Router simple de una sola página + tutorial guiado por voz (Web Speech API,
   NO es la IA de ELIAS — es solo lectura de texto fijo, sin conexión a ningún modelo).
   Próxima fase: conectar Supabase (auth + datos) y el motor de IA (Llama) — ver js/ai/llama-client.js
*/
const Elias = (() => {
  let history = ['login'];
  let obStep = 0;
  const totalSteps = 5;
  let currentRole = 'rector';
  let currentUser = null; // perfil real (Supabase) de quien inició sesión — null = vista de prueba

  const rolTexto = {
    rector: 'Rectora/Rector', secretaria: 'Secretaría', docente: 'Docente',
    orientador: 'Orientación escolar', padre: 'Acudiente', estudiante: 'Estudiante',
    coordacad: 'Coord. Académico', coordconv: 'Coord. Convivencia'
  };

  // Mensajes en pantalla — no usamos alert()/confirm()/prompt() porque en páginas
  // publicadas los cuadros del navegador a veces quedan bloqueados sin avisar.
  function mostrarMensaje(texto) {
    const caja = document.getElementById('elias-toast');
    const texto_el = document.getElementById('elias-toast-texto');
    if (!caja || !texto_el) { console.log('[ELIAS]', texto); return; }
    texto_el.textContent = texto;
    caja.hidden = false;
  }
  function cerrarMensaje() {
    const caja = document.getElementById('elias-toast');
    if (caja) caja.hidden = true;
  }

  const roleLabels = {
    rector: ["Marta Delgado", "Rectora · Sede Central"],
    secretaria: ["Diana Ríos", "Secretaría · Sede Central"],
    docente: ["Carlos Peña", "Docente · Sede Central"],
    orientador: ["Paula Nieto", "Orientación escolar · Sede Central"],
    padre: ["Marta Torres", "Acudiente · Sede Central"],
    estudiante: ["Camila Torres", "Estudiante · 6°A"],
    coordacad: ["Jorge Salazar", "Coord. Académico · Sede Central"],
    coordconv: ["Ana Beltrán", "Coord. Convivencia · Sede Central"]
  };

  const stepText = [
    "Bienvenido a Elías. Este tutorial te explica, con voz, dónde está cada cosa y cómo se usa. No es la inteligencia artificial de Elías, es solo una guía. La puedes repetir cuando quieras desde tu perfil.",
    "Desde Inicio ves un resumen de lo tuyo: tus cursos o asignaturas si eres docente, tus estudiantes si eres acudiente, o los indicadores del colegio si eres directivo.",
    "En Gestión están las funciones de tu perfil: notas, asistencia, convivencia, orientación o lo administrativo, según tu rol. Cada tarjeta te lleva directo a esa función.",
    "En Avisos llegan tus notificaciones y el banner general del colegio. Puedes enviar notificaciones a quien te corresponda según tu perfil, desde el botón de nuevo comunicado.",
    "En Perfil editas tus datos, configuras tu cuenta y puedes volver a ver este tutorial cuando quieras. Listo, ya puedes empezar a usar Elías."
  ];

  function go(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + screenId);
    if (el) el.classList.add('active');
    history.push(screenId);
    if (screenId === 'perfilusuario') renderProfile();
    window.scrollTo(0, 0);
  }

  function back() {
    history.pop();
    const prev = history.pop() || 'login';
    go(prev);
  }

  async function login() {
    try {
      const terms = document.getElementById('login-terms');
      if (!terms.checked) {
        mostrarMensaje('Para continuar, acepta los Términos de uso y la Política de protección de datos.');
        return;
      }
      const email = document.getElementById('login-email').value.trim();
      const pass = document.getElementById('login-pass').value;
      if (!email || !pass) { mostrarMensaje('Escribe tu correo y tu contraseña.'); return; }

      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) { mostrarMensaje('No pudimos iniciar sesión: revisa tu correo y tu contraseña. Si eres docente u otro perfil, usa el correo y la clave temporal que te dio tu colegio.'); return; }

      await cargarPerfilYEntrar(data.user.id, true);
    } catch (e) {
      mostrarMensaje('Algo falló al iniciar sesión: ' + e.message);
    }
  }

  async function cargarPerfilYEntrar(userId, esLogin) {
    const { data: perfil, error } = await sb.from('perfiles').select('*').eq('id', userId).single();
    if (error || !perfil) {
      mostrarMensaje('Tu cuenta existe, pero todavía no tiene un perfil dentro de un colegio. Pídele a Secretaría o a la Rectora que te registre en ELIAS.');
      return;
    }
    currentUser = perfil;
    currentRole = perfil.rol;
    roleLabels[perfil.rol] = [perfil.nombre, `${rolTexto[perfil.rol] || perfil.rol} · ${perfil.sede || 'Sede Central'}`];
    const switcher = document.getElementById('demo-switcher');
    if (switcher) switcher.style.display = 'none';
    setRole(perfil.rol);

    if (esLogin && perfil.debe_cambiar_clave) {
      pendienteUserId = userId;
      go('cambiarclave');
      return;
    }

    go('onboarding');
    obReset();
  }

  let pendienteUserId = null;

  async function cambiarClave() {
    const nueva = document.getElementById('cc-nueva').value;
    const nueva2 = document.getElementById('cc-nueva2').value;
    if (!nueva || nueva.length < 6) { mostrarMensaje('La clave nueva debe tener al menos 6 caracteres.'); return; }
    if (nueva !== nueva2) { mostrarMensaje('Las dos claves no coinciden.'); return; }

    const { error: passError } = await sb.auth.updateUser({ password: nueva });
    if (passError) { mostrarMensaje('No se pudo cambiar la clave: ' + passError.message); return; }

    await sb.from('perfiles').update({ debe_cambiar_clave: false }).eq('id', pendienteUserId);
    pendienteUserId = null;
    go('onboarding');
    obReset();
  }

  async function crearInstitucion() {
    try {
      const terms = document.getElementById('ci-terms');
      if (!terms.checked) { mostrarMensaje('Acepta los Términos de uso y la Política de protección de datos para continuar.'); return; }
      const nombreColegio = document.getElementById('ci-nombre').value.trim();
      const dane = document.getElementById('ci-dane').value.trim();
      const ciudad = document.getElementById('ci-ciudad').value.trim();
      const nombreRector = document.getElementById('ci-rector').value.trim();
      const correo = document.getElementById('ci-correo').value.trim();
      const pass = document.getElementById('ci-pass').value;
      const pass2 = document.getElementById('ci-pass2').value;

      if (!nombreColegio || !nombreRector || !correo || !pass) { mostrarMensaje('Completa al menos el nombre del colegio, tu nombre, tu correo y una contraseña.'); return; }
      if (pass !== pass2) { mostrarMensaje('Las contraseñas no coinciden.'); return; }

      const signUp = await sb.auth.signUp({ email: correo, password: pass });
      if (signUp.error) { mostrarMensaje('No pudimos crear tu cuenta: ' + signUp.error.message); return; }

      const { data: colegio, error: colegioError } = await sb.from('colegios')
        .insert({ nombre: nombreColegio, codigo_dane: dane || null, ciudad: ciudad || null })
        .select().single();
      if (colegioError) { mostrarMensaje('Tu cuenta se creó, pero hubo un problema creando el colegio: ' + colegioError.message); return; }

      const { error: perfilError } = await sb.from('perfiles')
        .insert({ id: signUp.data.user.id, colegio_id: colegio.id, rol: 'rector', nombre: nombreRector, sede: 'Sede Central' });
      if (perfilError) { mostrarMensaje('El colegio se creó, pero hubo un problema con tu perfil: ' + perfilError.message); return; }

      await cargarPerfilYEntrar(signUp.data.user.id);
    } catch (e) {
      mostrarMensaje('Algo falló creando la institución: ' + e.message);
    }
  }

  function generarClaveTemporal() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let clave = '';
    for (let i = 0; i < 8; i++) clave += chars[Math.floor(Math.random() * chars.length)];
    document.getElementById('reg-pass').value = clave;
  }

  async function registrarDocente() {
    try {
      if (!currentUser) { mostrarMensaje('Debes iniciar sesión (como Rectora o Secretaría) para registrar docentes.'); return; }
      const nombre = document.getElementById('reg-nombre').value.trim();
      const correo = document.getElementById('reg-correo').value.trim();
      const clave = document.getElementById('reg-pass').value;
      if (!nombre || !correo) { mostrarMensaje('Escribe al menos el nombre y el correo del docente.'); return; }
      if (!clave) { mostrarMensaje('Dale clic a "Generar" para crear la clave temporal del docente.'); return; }

      const tipo = document.getElementById('reg-tipo').value;
      const datos = {
        correo, password: clave, rol: 'docente', nombre,
        documento: document.getElementById('reg-doc').value.trim() || null,
        fecha_nacimiento: document.getElementById('reg-fecha').value || null,
        telefono: document.getElementById('reg-tel').value.trim() || null,
        idioma: document.getElementById('reg-idioma').value,
        sede: document.getElementById('reg-sede').value,
        tipo_docente: tipo,
        asignaturas: tipo === 'area' ? (document.getElementById('reg-asignaturas').value.trim() || null) : null,
        grados: tipo === 'multigrado' ? (document.getElementById('reg-grados-multigrado').value.trim() || null) : (document.getElementById('reg-grados-area').value.trim() || null)
      };

      const { data, error } = await sb.functions.invoke('crear-docente', { body: datos });
      if (error || (data && data.error)) { mostrarMensaje('No se pudo registrar: ' + (data && data.error ? data.error : error.message)); return; }

      mostrarMensaje(`Cuenta creada.\n\nDale al docente:\nCorreo: ${correo}\nClave temporal: ${clave}\n\nDebe cambiarla en su primer ingreso — ELIAS se la pide automáticamente.`);
      go('dashboard');
    } catch (e) {
      mostrarMensaje('Algo falló registrando el docente: ' + e.message);
    }
  }

  function renderDots() {
    const wrap = document.getElementById('ob-dots');
    wrap.innerHTML = '';
    for (let i = 0; i < totalSteps; i++) {
      const d = document.createElement('div');
      d.className = 'dot' + (i === obStep ? ' on' : '');
      wrap.appendChild(d);
    }
  }

  function showStep(i) {
    document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
    document.querySelector(`.step[data-step="${i}"]`).classList.add('active');
    document.getElementById('ob-next').textContent = (i === totalSteps - 1) ? 'Empezar a usar Elías' : 'Siguiente';
    renderDots();
    speakStep(i); // se reproduce solo — no hay que tocar un botón aparte
  }

  function obReset() { obStep = 0; showStep(0); }
  function obNext() {
    if (obStep >= totalSteps - 1) { go('dashboard'); return; }
    obStep++; showStep(obStep);
  }
  function obPrev() {
    if (obStep <= 0) return;
    obStep--; showStep(obStep);
  }

  function speakStep(i, manual) {
    if (!('speechSynthesis' in window)) {
      if (manual) mostrarMensaje('Este dispositivo no soporta lectura por voz del navegador.');
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(stepText[i]);
    u.lang = 'es-CO';
    u.rate = 0.98;
    window.speechSynthesis.speak(u);
  }

  function setRole(role) {
    currentRole = role;
    document.querySelectorAll('.role-btn').forEach(b => b.classList.toggle('on', b.dataset.role === role));
    document.querySelectorAll('.dash-role').forEach(p => p.classList.toggle('active', p.dataset.rolePanel === role));
  }

  const gestionItems = {
    rector: [
      { label: 'Perfil institucional', sub: 'Logo, misión/visión, almacenamiento, calendario', screen: 'perfilinstitucional', ready: true },
      { label: 'Puesto por curso y colegio', sub: 'Ranking ponderado: académico + comportamiento', screen: 'puesto', ready: true },
      { label: 'Informe consolidado', sub: 'Por sede y global, en PDF', screen: 'informeconsolidado', ready: true },
      { label: 'Gestión de permisos', sub: 'Delegar funciones de Secretaría', screen: 'permisos', ready: true }
    ],
    secretaria: [
      { label: 'Docentes', sub: 'Crear cuenta, dar de baja', screen: 'registro', ready: true },
      { label: 'Notificar', sub: 'Nuevo comunicado', screen: 'notificaciones', ready: true },
      { label: 'Fechas de corte', sub: 'Programar periodo', screen: 'fechascorte', ready: true },
      { label: 'Pre-informe académico', sub: 'Revisar y publicar', screen: 'preinforme', ready: true }
    ],
    docente: [
      { label: 'Planilla de calificaciones', sub: 'Por curso o por área', screen: 'planilla', ready: true },
      { label: 'Registrar convivencia', sub: 'Tipo 1, 2 o 3', screen: 'convivencia', ready: true },
      { label: 'Observador', sub: 'Anotación diaria', screen: 'observador', ready: true },
      { label: 'Anexo 2', sub: 'Acompañamiento pedagógico', screen: 'anexo2', ready: true },
      { label: 'Comportamiento', sub: 'Solo si eres director de grupo', screen: 'comportamiento', ready: true },
      { label: 'Banco de actividades', sub: '40 semanas por asignatura', screen: 'bancoactividades', ready: true }
    ],
    orientador: [
      { label: 'Anexo 2 recibidos', sub: 'Base para construir el PIAR', screen: 'anexo2', ready: true },
      { label: 'Consolidados', sub: 'PIAR, convivencia, atención a padres', screen: 'consolidadosorientacion', ready: true }
    ],
    padre: [
      { label: 'Calificaciones de mi hijo/a', sub: 'Notas por periodo y boletín', screen: 'calificacioneshijo', ready: true },
      { label: 'Notificar al docente', sub: 'Solo a los de tu hijo/a', screen: 'notificaciones', ready: true }
    ],
    estudiante: [
      { label: 'Mis calificaciones', sub: 'Notas por periodo', screen: 'miscalificaciones', ready: true },
      { label: 'Mis evaluaciones', sub: 'Pendientes y resueltas', screen: 'misevaluaciones', ready: true }
    ],
    coordacad: [
      { label: 'Sistema de evaluación', sub: 'Numérico o por letras y ponderación del puesto — aplica a todos los docentes', screen: 'sistemaeval', ready: true },
      { label: 'Puesto por curso y colegio', sub: 'Ranking ponderado: académico + comportamiento', screen: 'puesto', ready: true },
      { label: 'Horarios y mallas', sub: 'Planeación curricular', screen: 'horariosmallas', ready: true },
      { label: 'Pre-informe académico', sub: 'Revisión antes de Secretaría', screen: 'preinforme', ready: true }
    ],
    coordconv: [
      { label: 'Ruta de atención', sub: 'Casos tipo 2 y 3', screen: 'rutaatencion', ready: true },
      { label: 'Comité de convivencia', sub: 'Casos activos', screen: 'comiteconvivencia', ready: true }
    ]
  };

  function renderGestion() {
    const wrap = document.getElementById('gestion-list');
    const items = gestionItems[currentRole] || [];
    wrap.innerHTML = `<p class="lead">${roleLabels[currentRole][1]}</p>` + items.map(it => `
      <div class="card" style="${it.ready ? 'cursor:pointer' : 'opacity:.6'}" ${it.ready ? `onclick="Elias.go('${it.screen}')"` : ''}>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
          <p class="card-title" style="margin:0">${it.label}</p>
          ${it.ready ? '' : '<span class="pill" style="background:rgba(89,105,138,.14);color:var(--text-soft)">Próximamente</span>'}
        </div>
        <p class="small" style="margin:0">${it.sub}</p>
      </div>`).join('');
  }

  function dashTab(tab, ev) {
    document.querySelectorAll('#screen-dashboard .navitem').forEach(n => n.classList.remove('active'));
    if (ev && ev.currentTarget) ev.currentTarget.classList.add('active');
    if (tab === 'gestion') {
      renderGestion();
      go('gestion');
    }
    // 'inicio' no necesita hacer nada más: ya se ve el dash-role activo
  }

  async function redactarConvivencia() {
    const tipo = document.getElementById('conv-tipo').value;
    const hechos = document.getElementById('conv-hechos').value || '(sin hechos descritos todavía)';
    const box = document.getElementById('conv-resultado');
    const txt = document.getElementById('conv-resultado-texto');
    box.style.display = 'flex';
    txt.textContent = 'Redactando…';
    const res = await LlamaClient.redactarNarrativaConvivencia(tipo, hechos);
    if (res.simulated) {
      txt.textContent = `[Modo simulado — sin backend todavía] Con el motor conectado, aquí aparecería la narrativa factual redactada por la IA en el formato oficial, para el tipo ${tipo} que elegiste, a partir de: "${hechos}".`;
    } else {
      txt.textContent = res.texto || JSON.stringify(res);
    }
  }

  function pondCheck() {
    const a = Number(document.getElementById('pond-academico').value) || 0;
    const c = Number(document.getElementById('pond-comportamiento').value) || 0;
    const aviso = document.getElementById('pond-aviso');
    aviso.textContent = (a + c === 100) ? '' : `Suma actual: ${a + c}% — debe dar 100%.`;
  }

  function setEscala(tipo, ev) {
    document.querySelectorAll('#screen-sistemaeval .row .btn').forEach(b => {
      b.classList.remove('btn-primary'); b.classList.add('btn-ghost');
    });
    const btn = ev && ev.currentTarget;
    if (btn) { btn.classList.remove('btn-ghost'); btn.classList.add('btn-primary'); }
    // Próxima fase: guardar en Supabase — currentEscala = tipo
  }

  function regTipoChange() {
    const tipo = document.getElementById('reg-tipo').value;
    document.getElementById('reg-campo-area').style.display = (tipo === 'area') ? '' : 'none';
    document.getElementById('reg-campo-multigrado').style.display = (tipo === 'multigrado') ? '' : 'none';
  }

  async function generarInformeAdmin() {
    const txt = document.getElementById('informe-texto');
    txt.textContent = 'Generando…';
    const res = await LlamaClient.generarInformeAdministrativo('sede');
    txt.textContent = res.simulated
      ? '[Modo simulado — sin backend todavía] Con el motor conectado, aquí aparecen las conclusiones redactadas por la IA a partir de los indicadores de las 4 gestiones.'
      : (res.texto || JSON.stringify(res));
  }

  async function generarActividad() {
    const res = await LlamaClient.generarActividad('Español', '6°', 'complementaria');
    if (res.simulated) mostrarMensaje('[Modo simulado — sin backend todavía] Con el motor conectado, aquí la IA arma una nueva actividad para el banco de esta asignatura.');
  }

  function renderProfile() {
    const [name, role] = roleLabels[currentRole];
    document.getElementById('pu-name').textContent = name;
    document.getElementById('pu-role').textContent = role;
  }

  return { go, back, login, obNext, obPrev, obReset, speakStep, setRole, dashTab, redactarConvivencia, regTipoChange, setEscala, pondCheck, generarInformeAdmin, generarActividad, crearInstitucion, registrarDocente, generarClaveTemporal, cambiarClave, cerrarMensaje };
})();

