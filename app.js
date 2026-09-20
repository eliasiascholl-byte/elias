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
    if (screenId === 'demoacceso') renderDemoAcceso();
    if (screenId === 'notificaciones') renderNotificaciones();
    if (screenId === 'planilla') renderPlanilla();
    if (screenId === 'observador') renderObservador();
    if (screenId === 'gobiernoescolar') renderGobiernoEscolar();
    if (screenId === 'piar') renderPIAR();
    if (screenId === 'informeconsolidado') renderInformeConsolidadoKPIs();
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

  // ================= MODO DEMOSTRACIÓN (sin Supabase) =================
  let demoSesion = null; // { rol, perfilId, nombre }
  let demoHijoActivo = null; // estudianteId que el acudiente está viendo

  function demoTab(tipo, ev) {
    document.querySelectorAll('#demoacceso-toggle .toggle-opt').forEach(o => o.classList.remove('active'));
    if (ev && ev.currentTarget) ev.currentTarget.classList.add('active');
    document.getElementById('demoacceso-correo').style.display = tipo === 'correo' ? '' : 'none';
    document.getElementById('demoacceso-usuario').style.display = tipo === 'usuario' ? '' : 'none';
  }

  function renderDemoAcceso() {
    const cuentas = EliasDemo.cuentasDePrueba();
    const correoWrap = document.getElementById('demoacceso-correo-lista');
    correoWrap.innerHTML = cuentas.correo.map(c => `
      <div class="card">
        <div class="row"><p class="card-title" style="margin:0">${c.nombre}</p><span class="pill">${rolTexto[c.rol] || c.rol}</span></div>
        <p class="small">Correo: ${c.correo} · Clave: ${c.clave}</p>
        <button class="btn btn-primary" style="align-self:flex-start" onclick="Elias.entrarDemoCorreo('${c.correo}','${c.clave}')">Entrar como ${c.nombre.split(' ')[0]}</button>
      </div>`).join('');
    const usuWrap = document.getElementById('demoacceso-usuario-lista');
    usuWrap.innerHTML = cuentas.usuario.map(c => `
      <div class="card">
        <div class="row"><p class="card-title" style="margin:0">${c.nombre}</p><span class="pill">${rolTexto[c.rol] || c.rol}</span></div>
        <p class="small">Usuario: ${c.usuario} · Clave: ${c.clave}</p>
        <button class="btn btn-primary" style="align-self:flex-start" onclick="Elias.entrarDemoUsuario('${c.usuario}','${c.clave}')">Entrar como ${c.nombre.split(' ')[0]}</button>
      </div>`).join('');
  }

  function entrarDemoCorreo(correo, clave) {
    const r = EliasDemo.loginCorreo(correo, clave);
    if (!r.ok) { mostrarMensaje(r.error); return; }
    entrarComoDemo(r);
  }
  function entrarDemoUsuario(usuario, clave) {
    const r = EliasDemo.loginUsuario(usuario, clave);
    if (!r.ok) { mostrarMensaje(r.error); return; }
    entrarComoDemo(r);
  }
  function entrarComoDemo(r) {
    demoSesion = { rol: r.rol, perfilId: r.perfilId, nombre: r.nombre };
    demoHijoActivo = null;
    if (r.rol === 'padre') {
      const pad = EliasDemo.padre(r.perfilId);
      demoHijoActivo = pad && pad.hijos && pad.hijos[0];
    }
    let sub = rolTexto[r.rol] || r.rol;
    if (r.rol === 'docente') { const d = EliasDemo.docente(r.perfilId); sub += ' · ' + (d ? d.sede : ''); }
    if (r.rol === 'estudiante') { const e = EliasDemo.estudiante(r.perfilId); sub += ' · ' + (e ? EliasDemo.curso(e.curso).nombre : ''); }
    roleLabels[r.rol] = [r.nombre, sub];
    const switcher = document.getElementById('demo-switcher');
    if (switcher) switcher.style.display = 'none';
    setRole(r.rol);
    go('dashboard');
  }

  function estaEnDemo() { return !!demoSesion; }

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
      { label: 'Docentes y estudiantes', sub: 'Registro masivo — respaldo de Secretaría', screen: 'registro', ready: true },
      { label: 'Puesto por curso y colegio', sub: 'Ranking ponderado: académico + comportamiento', screen: 'puesto', ready: true },
      { label: 'Informe consolidado', sub: 'Por sede y global, en PDF/Excel', screen: 'informeconsolidado', ready: true },
      { label: 'Gobierno escolar', sub: 'Habilitar fechas, ver resultados', screen: 'gobiernoescolar', ready: true },
      { label: 'Gestión de permisos', sub: 'Delegar funciones de Secretaría', screen: 'permisos', ready: true }
    ],
    secretaria: [
      { label: 'Docentes y estudiantes', sub: 'Registro masivo (usuario y clave automáticos)', screen: 'registro', ready: true },
      { label: 'Notificar', sub: 'Nuevo comunicado', screen: 'notificaciones', ready: true },
      { label: 'Fechas de corte', sub: 'Programar periodo', screen: 'fechascorte', ready: true },
      { label: 'Pre-informe académico', sub: 'Revisar y publicar', screen: 'preinforme', ready: true }
    ],
    docente: [
      { label: 'Planilla de calificaciones', sub: 'Actividades, evaluaciones, tareas, evaluación final', screen: 'planilla', ready: true },
      { label: 'Registrar convivencia', sub: 'Tipo 1, 2 o 3', screen: 'convivencia', ready: true },
      { label: 'Observador', sub: 'Anotación diaria — candado de 15 min', screen: 'observador', ready: true },
      { label: 'Anexo 2', sub: 'Acompañamiento pedagógico', screen: 'anexo2', ready: true },
      { label: 'PIAR de mis estudiantes', sub: 'Plan de acompañamiento con IA', screen: 'piar', ready: true },
      { label: 'Comportamiento', sub: 'Solo si eres director de grupo', screen: 'comportamiento', ready: true },
      { label: 'Banco de actividades', sub: '40 semanas por asignatura', screen: 'bancoactividades', ready: true }
    ],
    orientador: [
      { label: 'Anexo 2 recibidos', sub: 'Base para construir el PIAR', screen: 'anexo2', ready: true },
      { label: 'PIAR', sub: 'Construir y consultar planes de acompañamiento', screen: 'piar', ready: true },
      { label: 'Consolidados', sub: 'PIAR, convivencia, atención a padres', screen: 'consolidadosorientacion', ready: true }
    ],
    padre: [
      { label: 'Calificaciones de mi hijo/a', sub: 'Notas por periodo y boletín', screen: 'calificacioneshijo', ready: true },
      { label: 'PIAR de mi hijo/a', sub: 'Si tiene plan de acompañamiento activo', screen: 'piar', ready: true },
      { label: 'Notificar al docente', sub: 'Solo a los de tu hijo/a', screen: 'notificaciones', ready: true }
    ],
    estudiante: [
      { label: 'Mis calificaciones', sub: 'Notas por periodo', screen: 'miscalificaciones', ready: true },
      { label: 'Mis evaluaciones', sub: 'Pendientes y resueltas', screen: 'misevaluaciones', ready: true },
      { label: 'Estudiar con Llama (IA)', sub: 'Explicaciones y guías de repaso', screen: 'apoyoestudio', ready: true },
      { label: 'Gobierno escolar', sub: 'Postularme o votar', screen: 'gobiernoescolar', ready: true },
      { label: 'Mi PIAR', sub: 'Si tienes plan de acompañamiento activo', screen: 'piar', ready: true }
    ],
    coordacad: [
      { label: 'Sistema de evaluación', sub: 'Numérico o por letras y ponderación del puesto — aplica a todos los docentes', screen: 'sistemaeval', ready: true },
      { label: 'Puesto por curso y colegio', sub: 'Ranking ponderado: académico + comportamiento', screen: 'puesto', ready: true },
      { label: 'Horarios y mallas', sub: 'Planeación curricular', screen: 'horariosmallas', ready: true },
      { label: 'Pre-informe académico', sub: 'Revisión antes de Secretaría', screen: 'preinforme', ready: true },
      { label: 'Gobierno escolar', sub: 'Validar candidatos de sociales/humanidades', screen: 'gobiernoescolar', ready: true }
    ],
    coordconv: [
      { label: 'Ruta de atención', sub: 'Casos tipo 2 y 3', screen: 'rutaatencion', ready: true },
      { label: 'Comité de convivencia', sub: 'Casos activos', screen: 'comiteconvivencia', ready: true },
      { label: 'Observador general', sub: 'Ver todos los registros del colegio', screen: 'observador', ready: true }
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
    const tipos = { 1: 'Tipo 1 — se maneja dentro del aula/colegio', 2: 'Tipo 2 — activa comité de convivencia', 3: 'Tipo 3 — posible delito, remisión a autoridades' };
    txt.textContent = `Narrativa factual (${tipos[tipo]}):\n\n"${hechos}"\n\nRedactado por Llama a partir de lo que describiste — la clasificación del tipo de falta la elegiste tú, la IA nunca la decide.`;
    if (estaEnDemo() && ['docente', 'orientador', 'coordconv'].includes(demoSesion.rol)) {
      const estudiantes = estudiantesVisibles();
      if (estudiantes[0]) EliasDemo.crearObservador(estudiantes[0].id, demoSesion.perfilId, tipo, hechos);
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
    if (estaEnDemo()) {
      txt.textContent = LlamaIA.informeAdministrativo('sede', EliasDemo.DB);
      return;
    }
    const res = await LlamaClient.generarInformeAdministrativo('sede');
    txt.textContent = res.simulated
      ? '[Sin datos todavía — conecta tu colegio a Supabase o entra en modo demostración] Aquí aparecerán las conclusiones redactadas por la IA a partir de los indicadores de las 4 gestiones.'
      : (res.texto || JSON.stringify(res));
  }

  async function generarActividad() {
    if (estaEnDemo()) { mostrarMensaje('Actividad generada por Llama y agregada al banco de actividades (demostración).'); return; }
    const res = await LlamaClient.generarActividad('Español', '6°', 'complementaria');
    if (res.simulated) mostrarMensaje('[Sin datos todavía] Conecta tu colegio a Supabase o entra en modo demostración para ver esto funcionando.');
  }
  function renderProfile() {
    const [name, role] = roleLabels[currentRole];
    document.getElementById('pu-name').textContent = name;
    document.getElementById('pu-role').textContent = role;
    const refWrap = document.getElementById('pu-datos-referencia');
    if (refWrap) {
      if (estaEnDemo() && demoSesion.rol === 'estudiante') {
        const e = EliasDemo.estudiante(demoSesion.perfilId);
        refWrap.innerHTML = e ? `<div class="card">
          <p class="card-title" style="margin:0 0 4px">Datos de referencia (no editables por ti)</p>
          <p class="small">Documento: ${e.documento || '—'}</p>
          <p class="small">Contacto de acudiente: ${e.contactoEmergencia || '—'}</p>
          <p class="small">Dirección: ${e.direccion || '—'}</p>
        </div>` : '';
      } else {
        refWrap.innerHTML = '';
      }
      const d = estaEnDemo() ? EliasDemo.datosPersonales(demoSesion.rol, demoSesion.perfilId) : {};
      document.getElementById('pu-foto').value = d.foto || '';
      document.getElementById('pu-fechanac').value = d.fechaNacimiento || '';
      document.getElementById('pu-documento').value = d.documento || '';
      document.getElementById('pu-estudios').value = d.estudios || '';
      document.getElementById('pu-direccion').value = d.direccion || '';
      document.getElementById('pu-telefono').value = d.telefono || '';
    }
  }

  function guardarPerfilDemo() {
    if (!estaEnDemo()) { mostrarMensaje('Esto se guarda de verdad una vez tu cuenta esté conectada a Supabase.'); return; }
    EliasDemo.guardarDatosPersonales(demoSesion.rol, demoSesion.perfilId, {
      foto: document.getElementById('pu-foto').value.trim(),
      fechaNacimiento: document.getElementById('pu-fechanac').value,
      documento: document.getElementById('pu-documento').value.trim(),
      estudios: document.getElementById('pu-estudios').value.trim(),
      direccion: document.getElementById('pu-direccion').value.trim(),
      telefono: document.getElementById('pu-telefono').value.trim()
    });
    mostrarMensaje('Tus datos quedaron guardados.');
  }

  // ================= NOTIFICACIONES / BANNER =================
  function renderNotificaciones() {
    const bannerWrap = document.getElementById('notif-banner');
    const listaWrap = document.getElementById('notif-lista');
    if (!bannerWrap || !listaWrap) return;
    if (!estaEnDemo()) { bannerWrap.innerHTML = ''; listaWrap.innerHTML = ''; return; }
    const db = EliasDemo.DB;
    bannerWrap.innerHTML = `<div class="card" style="background:rgba(229,162,60,.12);border:1px solid rgba(229,162,60,.4)">
      <p class="card-title" style="margin:0 0 4px">📣 Banner del colegio</p>
      <p class="small" style="margin:0">${db.banner}</p>
    </div>`;
    const items = db.notificaciones[demoSesion.rol] || [];
    listaWrap.innerHTML = `<p class="lead" style="margin:10px 0 6px">Tus notificaciones</p>` + (items.length ? items.map(n => `
      <div class="card">
        <p class="card-sub" style="margin:0 0 2px"><strong>${n.de}</strong> · ${n.fecha}</p>
        <p class="small" style="margin:0">${n.texto}</p>
      </div>`).join('') : '<p class="small">No tienes notificaciones nuevas.</p>');
  }

  // ================= PLANILLA DE CALIFICACIONES =================
  function estudiantesVisibles() {
    if (!estaEnDemo()) return [];
    const db = EliasDemo.DB;
    if (demoSesion.rol === 'docente') {
      const doc = EliasDemo.docente(demoSesion.perfilId);
      return db.estudiantes.filter(e => doc && doc.cursos.includes(e.curso));
    }
    if (demoSesion.rol === 'estudiante') return db.estudiantes.filter(e => e.id === demoSesion.perfilId);
    if (demoSesion.rol === 'padre') {
      const pad = EliasDemo.padre(demoSesion.perfilId);
      return db.estudiantes.filter(e => pad && pad.hijos.includes(e.id));
    }
    return db.estudiantes; // rector, secretaria, orientador, coordinaciones: ven todo
  }

  function asignaturasDisponibles() {
    if (estaEnDemo() && demoSesion.rol === 'docente') {
      const doc = EliasDemo.docente(demoSesion.perfilId);
      if (doc && doc.asignaturas && doc.asignaturas.length) return doc.asignaturas;
    }
    return EliasDemo.DB.asignaturas;
  }

  function renderPlanilla() {
    const sel = document.getElementById('pl-asignatura');
    if (!sel) return;
    if (!sel.dataset.filled) {
      sel.innerHTML = asignaturasDisponibles().map(a => `<option value="${a}">${a}</option>`).join('');
      sel.dataset.filled = '1';
    }
    const asignatura = sel.value;
    const estudiantes = estudiantesVisibles();
    const tabla = document.getElementById('planilla-tabla');
    tabla.innerHTML = `
      <div class="table-wrap">
        <div class="t-head" style="grid-template-columns:1.3fr .7fr .7fr .7fr .7fr .6fr .8fr .8fr">
          <span>Estudiante</span><span>Activ. 25%</span><span>Eval. 25%</span><span>Tareas 25%</span><span>Ev.Final 25%</span><span>Prom.</span><span>Comport.</span><span>Autoeval.</span>
        </div>
        <div class="t-body">
        ${estudiantes.map(e => {
          const n = EliasDemo.notaPlanilla(e.id, asignatura);
          const prom = EliasDemo.promedioFinal(n);
          return `<div class="t-row" style="grid-template-columns:1.3fr .7fr .7fr .7fr .7fr .6fr .8fr .8fr">
            <div class="stu-name">${e.nombre}<span class="grade-tag">${EliasDemo.curso(e.curso) ? EliasDemo.curso(e.curso).nombre : ''}</span></div>
            <input class="note-input" type="number" step="0.1" min="0" max="5" value="${n.actividades ?? ''}" onchange="Elias.onNotaInput(this,'${e.id}','${asignatura}','actividades')">
            <input class="note-input" type="number" step="0.1" min="0" max="5" value="${n.evaluaciones ?? ''}" onchange="Elias.onNotaInput(this,'${e.id}','${asignatura}','evaluaciones')">
            <input class="note-input" type="number" step="0.1" min="0" max="5" value="${n.tareas ?? ''}" onchange="Elias.onNotaInput(this,'${e.id}','${asignatura}','tareas')">
            <input class="note-input" type="number" step="0.1" min="0" max="5" value="${n.evaluacionFinal ?? ''}" onchange="Elias.onNotaInput(this,'${e.id}','${asignatura}','evaluacionFinal')">
            <span class="final-note" id="prom-${e.id}-${asignatura.replace(/\s/g,'')}">${prom ?? '—'}</span>
            <input class="note-input" type="number" step="0.1" min="0" max="5" value="${n.comportamiento ?? ''}" onchange="Elias.onNotaInput(this,'${e.id}','${asignatura}','comportamiento')">
            <input class="note-input" type="number" step="0.1" min="0" max="5" value="${n.autoevaluacion ?? ''}" onchange="Elias.onNotaInput(this,'${e.id}','${asignatura}','autoevaluacion')">
          </div>`;
        }).join('')}
        </div>
      </div>`;
  }

  function onNotaInput(input, estudianteId, asignatura, campo) {
    const prom = EliasDemo.guardarNotaPlanilla(estudianteId, asignatura, campo, input.value);
    const span = document.getElementById(`prom-${estudianteId}-${asignatura.replace(/\s/g, '')}`);
    if (span) span.textContent = prom ?? '—';
  }

  function calcularPromedioActividades() {
    const raw = document.getElementById('pl-calc-input').value;
    const notas = raw.split(',').map(s => s.trim()).filter(Boolean);
    const prom = EliasDemo.promedioActividades(notas);
    document.getElementById('pl-calc-resultado').textContent = prom !== null ? `Promedio: ${prom} — cópialo en la casilla "Actividades" del estudiante que corresponda.` : 'Escribe al menos una nota válida.';
  }
  // ================= OBSERVADOR =================
  let observadorIntervalo = null;
  function registrosObservadorVisibles() {
    const db = EliasDemo.DB;
    const scope = estudiantesVisibles().map(e => e.id);
    if (['rector', 'secretaria', 'orientador', 'coordacad', 'coordconv'].includes(demoSesion.rol)) return db.observador;
    return db.observador.filter(o => scope.includes(o.estudianteId));
  }

  function renderObservador() {
    if (!estaEnDemo()) return;
    const selEst = document.getElementById('obs-estudiante');
    const puedeCrear = ['docente', 'orientador', 'coordconv'].includes(demoSesion.rol);
    document.getElementById('obs-nuevo').style.display = puedeCrear ? '' : 'none';
    if (puedeCrear) selEst.innerHTML = estudiantesVisibles().map(e => `<option value="${e.id}">${e.nombre} (${EliasDemo.curso(e.curso) ? EliasDemo.curso(e.curso).nombre : ''})</option>`).join('');

    const registros = registrosObservadorVisibles();
    const wrap = document.getElementById('obs-lista');
    wrap.innerHTML = '<p class="lead" style="margin:12px 0 6px">Historial</p>' + (registros.length ? registros.map(r => {
      const est = EliasDemo.estudiante(r.estudianteId);
      const editable = EliasDemo.puedeEditarObservador(r);
      const esMio = demoSesion.rol === 'docente' && r.docenteId === demoSesion.perfilId;
      const soyElEstudiante = demoSesion.rol === 'estudiante' && r.estudianteId === demoSesion.perfilId;
      const soyElAcudiente = demoSesion.rol === 'padre' && (EliasDemo.padre(demoSesion.perfilId)?.hijos || []).includes(r.estudianteId);
      let bloqueHtml = '';
      if (esMio && editable) {
        bloqueHtml = `<p class="small" style="color:#E5A23C">Editable por ${EliasDemo.minutosRestantes(r)} minuto(s) más.</p>
          <textarea id="obs-edit-${r.id}" onchange="Elias.guardarEdicionObservador('${r.id}')">${r.descripcion}</textarea>`;
      } else if (esMio && !editable) {
        bloqueHtml = '<p class="small" style="color:#59698A">🔒 Bloqueado — ya pasaron los 15 minutos.</p>';
      }
      let descargosHtml = '';
      if (!editable && (soyElEstudiante || soyElAcudiente)) {
        const puedeEditarDesc = EliasDemo.puedeEditarDescargos(r);
        if (r.descargos && !puedeEditarDesc) {
          descargosHtml = `<div class="card" style="margin-top:6px"><p class="card-title" style="margin:0 0 4px">Descargos (registrados)</p><p class="small">${r.descargos.texto}</p><p class="small" style="color:#59698A">🔒 Bloqueados — ya pasaron los 15 minutos desde que los enviaste.</p></div>`;
        } else {
          descargosHtml = `<div class="card" style="margin-top:6px">
            <p class="card-title" style="margin:0 0 4px">Tus descargos</p>
            ${r.descargos ? `<p class="small" style="color:#E5A23C">Editable por ${15 - Math.floor((Date.now() - r.descargos.creadoEn) / 60000)} minuto(s) más.</p>` : ''}
            <textarea id="desc-${r.id}" placeholder="Explica tu versión de los hechos…">${r.descargos ? r.descargos.texto : ''}</textarea>
            <button class="btn btn-primary btn-sm" style="align-self:flex-start;margin-top:6px" onclick="Elias.enviarDescargos('${r.id}')">Enviar descargos</button>
          </div>`;
        }
      }
      return `<div class="card">
        <div class="row"><p class="card-title" style="margin:0">${est ? est.nombre : '—'}</p><span class="chip ${r.tipo === '3' ? 'chip-red' : r.tipo === '2' ? 'chip-amber' : 'chip-teal'}">Tipo ${r.tipo}</span></div>
        <p class="small" style="margin:2px 0">${r.fecha}</p>
        <p class="small" style="margin:0">${r.descripcion}</p>
        ${bloqueHtml}
        ${descargosHtml}
      </div>`;
    }).join('') : '<p class="small">Sin registros todavía.</p>');
  }

  function guardarObservador() {
    if (!estaEnDemo()) return;
    const estudianteId = document.getElementById('obs-estudiante').value;
    const tipo = document.getElementById('obs-tipo').value;
    const descripcion = document.getElementById('obs-descripcion').value.trim();
    if (!descripcion) { mostrarMensaje('Escribe qué observaste.'); return; }
    EliasDemo.crearObservador(estudianteId, demoSesion.perfilId, tipo, descripcion);
    document.getElementById('obs-descripcion').value = '';
    mostrarMensaje('Reporte guardado. Tienes 15 minutos para editarlo si necesitas corregir algo.');
    renderObservador();
    if (!observadorIntervalo) observadorIntervalo = setInterval(() => { if (document.getElementById('screen-observador').classList.contains('active')) renderObservador(); }, 20000);
  }

  function guardarEdicionObservador(id) {
    const texto = document.getElementById('obs-edit-' + id).value;
    const r = EliasDemo.editarObservador(id, texto);
    if (!r.ok) mostrarMensaje(r.error); else mostrarMensaje('Actualizado.');
    renderObservador();
  }

  function enviarDescargos(observadorId) {
    const texto = document.getElementById('desc-' + observadorId).value.trim();
    if (!texto) { mostrarMensaje('Escribe tus descargos antes de enviar.'); return; }
    const r = EliasDemo.guardarDescargos(observadorId, texto);
    if (!r.ok) mostrarMensaje(r.error); else mostrarMensaje('Descargos enviados. Tienes 15 minutos para editarlos.');
    renderObservador();
  }
  // ================= GOBIERNO ESCOLAR =================
  function renderGobiernoEscolar() {
    if (!estaEnDemo()) return;
    const db = EliasDemo.DB.gobiernoEscolar;
    const wrap = document.getElementById('gob-contenido');
    const puedeValidar = ['rector', 'secretaria', 'coordacad', 'docente'].includes(demoSesion.rol);
    let html = `<div class="card"><p class="card-title" style="margin:0 0 4px">Fechas</p>
      <p class="small">Preinscripciones: ${db.fechasPreinscripcion.inicio} al ${db.fechasPreinscripcion.fin}</p>
      <p class="small">Votación: ${db.fechaVotacion}</p></div>`;

    if (demoSesion.rol === 'estudiante') {
      const yaVoto = EliasDemo.yaVoto(demoSesion.perfilId);
      html += `<div class="card"><p class="card-title" style="margin:0 0 4px">Postularme</p>
        <div class="field"><label>Cargo</label><select id="gob-cargo"><option>Personero/a</option><option>Representante estudiantil</option></select></div>
        <div class="field"><label>Mi propuesta</label><textarea id="gob-propuesta" placeholder="Escribe tu propuesta…"></textarea></div>
        <button class="btn btn-primary" onclick="Elias.preinscribirGobierno()">Enviar preinscripción</button></div>`;
      html += `<p class="lead" style="margin:10px 0 6px">Candidatos</p>`;
      html += EliasDemo.candidatosVisibles().map(c => {
        const est = EliasDemo.estudiante(c.estudianteId);
        return `<div class="card"><div class="row"><p class="card-title" style="margin:0">${est ? est.nombre : ''}</p><span class="pill">${c.cargo}</span></div>
          <p class="small">${c.propuesta}</p>
          ${yaVoto ? '' : `<button class="btn btn-primary btn-sm" style="align-self:flex-start" onclick="Elias.votarGobierno('${c.id}')">Votar</button>`}</div>`;
      }).join('') || '<p class="small">Aún no hay candidatos validados.</p>';
      if (yaVoto) html += '<p class="small">Ya registraste tu voto — gracias por participar.</p>';
    }

    if (puedeValidar) {
      const pendientes = db.candidatos.filter(c => !c.validado);
      html += `<p class="lead" style="margin:10px 0 6px">Preinscripciones por validar</p>`;
      html += pendientes.length ? pendientes.map(c => {
        const est = EliasDemo.estudiante(c.estudianteId);
        return `<div class="card"><div class="row"><p class="card-title" style="margin:0">${est ? est.nombre : ''}</p><span class="pill">${c.cargo}</span></div>
          <p class="small">${c.propuesta}</p>
          <button class="btn btn-primary btn-sm" style="align-self:flex-start" onclick="Elias.validarGobierno('${c.id}')">Validar</button></div>`;
      }).join('') : '<p class="small">No hay preinscripciones pendientes.</p>';
    }

    if (['rector', 'secretaria', 'coordacad'].includes(demoSesion.rol)) {
      html += '<p class="lead" style="margin:10px 0 6px">Resultados en vivo</p>';
      html += EliasDemo.resultadosVotacion().map(c => {
        const est = EliasDemo.estudiante(c.estudianteId);
        return `<div class="list-row"><span>${est ? est.nombre : ''} · ${c.cargo}</span><span style="font-weight:700">${c.votos} voto(s)</span></div>`;
      }).join('') || '<p class="small">Sin votos todavía.</p>';
    }
    wrap.innerHTML = html;
  }
  function preinscribirGobierno() {
    if (demoSesion.rol !== 'estudiante') return;
    const cargo = document.getElementById('gob-cargo').value;
    const propuesta = document.getElementById('gob-propuesta').value.trim();
    if (!propuesta) { mostrarMensaje('Escribe tu propuesta.'); return; }
    EliasDemo.preinscribir(demoSesion.perfilId, cargo, propuesta);
    mostrarMensaje('Preinscripción enviada — queda visible cuando la validen.');
    renderGobiernoEscolar();
  }
  function validarGobierno(id) { EliasDemo.validarCandidato(id); mostrarMensaje('Candidato validado — ya es visible para todos los estudiantes.'); renderGobiernoEscolar(); }
  function votarGobierno(candidatoId) {
    const r = EliasDemo.votar(demoSesion.perfilId, candidatoId);
    if (!r.ok) mostrarMensaje(r.error); else mostrarMensaje('Tu voto quedó registrado.');
    renderGobiernoEscolar();
  }
  // ================= PIAR =================
  function renderPIAR() {
    if (!estaEnDemo()) return;
    const wrap = document.getElementById('piar-contenido');
    const db = EliasDemo.DB;
    let objetivo = null; // estudianteId a mostrar
    if (demoSesion.rol === 'estudiante') objetivo = demoSesion.perfilId;
    if (demoSesion.rol === 'padre') objetivo = demoHijoActivo;

    if (objetivo) {
      const est = EliasDemo.estudiante(objetivo);
      if (!est || !est.caracterizado) { wrap.innerHTML = '<p class="small">No tienes un PIAR activo por ahora.</p>'; return; }
      const generados = EliasDemo.piarGeneradosDe(objetivo);
      wrap.innerHTML = `<p class="lead">${est.nombre} tiene un plan de acompañamiento activo, caracterizado por orientación escolar.</p>` +
        (generados.length ? generados.map(g => `<div class="card"><p class="card-title" style="margin:0 0 4px">${g.asignatura} · ${new Date(g.creadoEn).toLocaleDateString()}</p><p class="small" style="white-space:pre-line">${g.texto}</p></div>`).join('')
          : '<p class="small">Orientación ya registró el diagnóstico; todavía no hay un plan generado por un docente.</p>');
      return;
    }

    if (demoSesion.rol === 'orientador') {
      const caracterizados = db.estudiantes.filter(e => e.caracterizado);
      wrap.innerHTML = '<p class="lead">Estudiantes caracterizados</p>' + caracterizados.map(e => {
        const piar = db.piar[e.id];
        return `<div class="card"><p class="card-title" style="margin:0 0 4px">${e.nombre}</p><p class="small">${piar ? piar.diagnostico : 'Sin diagnóstico cargado.'}</p></div>`;
      }).join('');
      return;
    }

    if (demoSesion.rol === 'docente') {
      const doc = EliasDemo.docente(demoSesion.perfilId);
      const misCaracterizados = estudiantesVisibles().filter(e => e.caracterizado);
      if (!misCaracterizados.length) { wrap.innerHTML = '<p class="small">Ninguno de tus estudiantes tiene PIAR activo por ahora.</p>'; return; }
      wrap.innerHTML = misCaracterizados.map(e => `
        <div class="card">
          <p class="card-title" style="margin:0 0 4px">${e.nombre}</p>
          <p class="small">Orientación ya dejó recomendaciones — pídele a Llama el plan para tu asignatura.</p>
          <button class="btn btn-primary btn-sm" style="align-self:flex-start" onclick="Elias.generarPIARDocente('${e.id}')">Generar plan con IA</button>
          <div id="piar-gen-${e.id}"></div>
        </div>`).join('');
      return;
    }

    // rector, secretaria, coordacad, coordconv: consulta general
    const todos = db.piarGenerados;
    wrap.innerHTML = '<p class="lead">Planes generados (consulta)</p>' + (todos.length ? todos.map(g => {
      const est = EliasDemo.estudiante(g.estudianteId);
      return `<div class="card"><p class="card-title" style="margin:0 0 4px">${est ? est.nombre : ''} · ${g.asignatura}</p><p class="small" style="white-space:pre-line">${g.texto}</p></div>`;
    }).join('') : '<p class="small">Todavía no se ha generado ningún plan.</p>');
  }

  function generarPIARDocente(estudianteId) {
    const doc = EliasDemo.docente(demoSesion.perfilId);
    const asignatura = (doc && doc.asignaturas && doc.asignaturas[0]) || EliasDemo.DB.asignaturas[0];
    const texto = LlamaIA.planPIAR(estudianteId, asignatura, doc ? doc.nombre : '');
    EliasDemo.guardarPIARGenerado(estudianteId, asignatura, texto, doc ? doc.nombre : '');
    document.getElementById('piar-gen-' + estudianteId).innerHTML = `<p class="small" style="white-space:pre-line;margin-top:6px">${texto}</p>`;
  }
  // ================= APOYO DE ESTUDIO CON IA =================
  function pedirApoyoEstudio() {
    const asignatura = document.getElementById('ap-asignatura').value.trim();
    const tema = document.getElementById('ap-tema').value.trim();
    const box = document.getElementById('ap-resultado');
    box.style.display = 'flex';
    document.getElementById('ap-resultado-texto').textContent = LlamaIA.retroalimentacionEstudio(tema, asignatura);
  }

  // ================= REGISTRO MASIVO =================
  function registrarDocentesMasivo() {
    if (!estaEnDemo()) { mostrarMensaje('Inicia sesión en modo demostración como Rectora o Secretaría para usar esto.'); return; }
    const nombres = document.getElementById('reg-masivo-nombres').value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!nombres.length) { mostrarMensaje('Pega al menos un nombre.'); return; }
    const creados = EliasDemo.crearDocentesMasivo(nombres, 'Sede Central');
    document.getElementById('reg-masivo-resultado').innerHTML = `<div class="card" style="margin-top:8px"><p class="card-title" style="margin:0 0 6px">Listo — entrega esto en secreto a cada docente</p>` +
      creados.map(d => `<p class="small">${d.nombre} — usuario: <strong>${d.usuario}</strong> · clave: <strong>${d.clave}</strong></p>`).join('') +
      `<button class="btn btn-ghost" style="margin-top:6px" onclick="Elias.exportarCredenciales(${JSON.stringify(creados).replace(/"/g, '&quot;')})">Descargar Excel</button></div>`;
  }

  function registrarEstudiantesMasivo() {
    if (!estaEnDemo()) { mostrarMensaje('Inicia sesión en modo demostración como Rectora o Secretaría para usar esto.'); return; }
    const lineas = document.getElementById('reg-masivo-estudiantes').value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lineas.length) { mostrarMensaje('Pega al menos un estudiante.'); return; }
    const filas = lineas.map(l => {
      const [nombre, cursoNombre, acudienteNombre] = l.split(';').map(s => (s || '').trim());
      const cursoObj = EliasDemo.DB.cursos.find(c => c.nombre.toLowerCase() === (cursoNombre || '').toLowerCase());
      return { nombre, cursoId: cursoObj ? cursoObj.id : EliasDemo.DB.cursos[0].id, acudienteNombre };
    });
    const creados = EliasDemo.crearEstudiantesMasivo(filas);
    document.getElementById('reg-masivo-estudiantes-resultado').innerHTML = `<div class="card" style="margin-top:8px"><p class="card-title" style="margin:0 0 6px">Listo — el director de curso entrega esto en secreto</p>` +
      creados.map(e => `<p class="small">${e.nombre} — usuario: <strong>${e.usuario}</strong> · clave: <strong>${e.clave}</strong></p>`).join('') + `</div>`;
  }

  async function exportarCredenciales(lista) {
    if (!window.ExcelJS) { mostrarMensaje('No se pudo cargar el generador de Excel.'); return; }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Credenciales');
    ws.addRow(['Nombre', 'Usuario', 'Clave']);
    lista.forEach(d => ws.addRow([d.nombre, d.usuario, d.clave]));
    const buf = await wb.xlsx.writeBuffer();
    descargarBlob(new Blob([buf]), 'credenciales_docentes.xlsx');
  }

  function descargarBlob(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  // ================= INFORME CONSOLIDADO / EXPORTAR =================
  function renderInformeConsolidadoKPIs() {
    if (!estaEnDemo()) return;
    const db = EliasDemo.DB;
    const promedios = Object.values(db.planilla).map(n => EliasDemo.promedioFinal(n)).filter(v => v !== null);
    const promGeneral = promedios.length ? (promedios.reduce((a, b) => a + b, 0) / promedios.length).toFixed(2) : '—';
    document.getElementById('ic-kpi-prom').textContent = promGeneral;
    document.getElementById('ic-kpi-conv').textContent = db.observador.length;
    document.getElementById('ic-kpi-piar').textContent = db.estudiantes.filter(e => e.caracterizado).length;
    document.getElementById('ic-kpi-est').textContent = db.estudiantes.length;
  }

  async function exportarConsolidado(origen, formato) {
    if (!estaEnDemo()) { mostrarMensaje('La exportación con datos reales del colegio estará disponible cuando tu cuenta esté conectada a Supabase.'); return; }
    const db = EliasDemo.DB;
    const filas = [];
    Object.keys(db.planilla).forEach(key => {
      const [estId, asignatura] = key.split('|');
      const est = EliasDemo.estudiante(estId);
      if (!est) return;
      const n = db.planilla[key];
      filas.push([est.nombre, EliasDemo.curso(est.curso) ? EliasDemo.curso(est.curso).nombre : '', asignatura, n.actividades ?? '', n.evaluaciones ?? '', n.tareas ?? '', n.evaluacionFinal ?? '', EliasDemo.promedioFinal(n) ?? '']);
    });

    if (formato === 'excel') {
      if (!window.ExcelJS) { mostrarMensaje('No se pudo cargar el generador de Excel.'); return; }
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Consolidado');
      ws.addRow(['Estudiante', 'Curso', 'Asignatura', 'Actividades', 'Evaluaciones', 'Tareas', 'Ev. final', 'Promedio']);
      filas.forEach(f => ws.addRow(f));
      const buf = await wb.xlsx.writeBuffer();
      descargarBlob(new Blob([buf]), `consolidado_${origen}.xlsx`);
    } else {
      if (!window.jspdf) { mostrarMensaje('No se pudo cargar el generador de PDF.'); return; }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      doc.setFontSize(14); doc.text('ELIAS — Consolidado', 14, 16);
      doc.setFontSize(10); doc.text(LlamaIA.informeAdministrativo('sede', db), 14, 26, { maxWidth: 180 });
      let y = 70;
      doc.setFontSize(9);
      filas.slice(0, 35).forEach(f => { doc.text(f.join(' | '), 14, y); y += 6; if (y > 280) { doc.addPage(); y = 20; } });
      doc.save(`consolidado_${origen}.pdf`);
    }
  }

  return {
    go, back, login, obNext, obPrev, obReset, speakStep, setRole, dashTab, redactarConvivencia, regTipoChange, setEscala, pondCheck,
    generarInformeAdmin, generarActividad, crearInstitucion, registrarDocente, generarClaveTemporal, cambiarClave, cerrarMensaje,
    demoTab, entrarDemoCorreo, entrarDemoUsuario, guardarPerfilDemo,
    onNotaInput, calcularPromedioActividades, renderPlanilla,
    guardarObservador, guardarEdicionObservador, enviarDescargos,
    preinscribirGobierno, validarGobierno, votarGobierno,
    generarPIARDocente, pedirApoyoEstudio,
    registrarDocentesMasivo, registrarEstudiantesMasivo, exportarCredenciales, exportarConsolidado
  };
})();
