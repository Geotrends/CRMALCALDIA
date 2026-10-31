const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {runInNewContext} = require('node:vm');
const {EventEmitter} = require('node:events');

const source = readFileSync(resolve(__dirname, '../../espocrm-custom/files/client/custom/src/helpers/case-role-guidance.js'), 'utf8');
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const roles = ['radicacion', 'asignacion', 'inspeccion', 'patrullaje', 'juridica', 'tecnico', 'receptor', 'admin'];

// Exercise the public render scheduling API with a minimal DOM adapter.
function liveBanner(role, attributes, programaciones = [], options = {}) {
    let html = '';
    const grid = {length: 1, before(value) { html = value; }};
    const selection = {filter() { return this; }, add() { return this; }, find() { return this; }, remove() {}, first() { return grid; }};
    const user = {id: options.userId || 'viewer'};
    const fields = {
        isAdminUser: () => role === 'admin',
        isRadicacionUser: () => role === 'radicacion',
        isAsignadorUser: () => role === 'asignacion',
        isInspeccionUser: () => role === 'inspeccion',
        isInspectorAmbientalUser: () => role === 'inspeccion',
        isJuridicaUser: () => role === 'juridica',
        isPatrulleroUser: () => role === 'patrullaje',
        isCaseRadicado: model => !!model.get('cNumeroRadicado'),
        ensureProfile: () => Promise.resolve({roles: []}),
        onProfileReady: callback => callback(),
    };
    let helper;
    runInNewContext(source, {
        define: (_name, _dependencies, factory) => { helper = factory(fields); },
        $: () => ({text(value) { this.value = value; return this; }, html() { return escape(this.value); }}),
        window: {setTimeout: callback => callback(), setInterval: () => 1, clearInterval() {}},
        document: {hidden: false, addEventListener() {}, removeEventListener() {}},
        Espo: {Ajax: {getRequest: options.getRequest || (() => Promise.resolve({programaciones}))}},
    });
    const model = Object.assign(new EventEmitter(), {
        id: 'case', get: key => attributes[key], isNew: () => !!options.isNew,
        trigger(event, ...args) { this.emit(event, ...args); },
    });
    const view = Object.assign(new EventEmitter(), {
        $el: selection,
        getUser: () => user,
        _crmRoles: role === 'inspeccion' ? ['Inspector Ambiental'] : [],
        _crmVisitasGuia: options.uncached ? null : Object.assign({programaciones}, options.visitas),
        _crmCierreGuia: options.cierre || {requisitos: []},
        model,
        listenTo(target, events, callback) { events.split(' ').forEach(event => target.on(event, callback)); },
    });
    helper.schedule(view);
    return {get html() { return html; }, model, view, setup: () => helper.setup(view)};
}

function banner(...args) { return liveBanner(...args).html; }

test('todos los roles ven la misma etapa, acción y encargado en los nueve estados', () => {
    const cases = [
        ['Pendiente de radicacion', 'Radicar la solicitud', 'Auxiliar Administrativo · Radicador'],
        ['Radicado', 'Revisar la competencia y asignar la solicitud', 'Director Técnico'],
        ['Asignado', 'Programar la visita', 'Ana Pérez'],
        ['En gestión técnica', 'Programar la visita', 'Ana Pérez'],
        ['Revisión de hallazgos', 'Hacer la revisión técnico-jurídica del acta y definir el trámite', 'Inspector Ambiental'],
        ['Pendiente de respuesta final', 'Completar el cierre de la solicitud', 'Ana Pérez'],
        ['Remitido por competencia', 'Completar el cierre de la solicitud', 'Ana Pérez'],
        ['Finalizado', 'Ninguna: la solicitud está cerrada', 'Sin acciones pendientes'],
        ['Proceso cerrado', 'Ninguna: la solicitud está cerrada', 'Sin acciones pendientes'],
    ];
    for (const role of roles) {
        for (const [status, action, actor] of cases) {
            const visits = status === 'Revisión de hallazgos' ? [{actaId: 'acta', actaEstado: 'Diligenciada'}] : [];
            const html = banner(role, {status, assignedUserId: 'owner', assignedUserName: 'Ana Pérez'}, visits);
            assert.ok(html.includes('<dt>Etapa actual</dt><dd>' + status), role + ': ' + status);
            assert.ok(html.includes('<dt>Siguiente acción</dt><dd>' + action), role + ': ' + action);
            assert.ok(html.includes('<dt>A cargo de</dt><dd>' + actor), role + ': ' + actor);
        }
    }
});

test('radicación consulta un caso histórico sin recibir instrucciones para corregirlo', () => {
    const html = banner('radicacion', {status: 'Radicado', cNumeroRadicado: '123'});
    assert.ok(html.includes('Le corresponde a Director Técnico'));
    assert.ok(!html.includes('corrija la radicación'));
    assert.ok(!html.includes('ícono de lápiz'));
});

test('después de definir el trámite la evaluación pendiente corresponde al director o al profesional asignado', () => {
    const cierre = {aplica: true, requisitos: [{key: 'evaluacionResultado', ok: false}, {key: 'respuestaFinal', ok: false}]};
    for (const status of ['Pendiente de respuesta final', 'Remitido por competencia']) {
        for (const role of ['tecnico', 'asignacion', 'inspeccion', 'radicacion']) {
            const html = banner(role, {status, assignedUserId: 'viewer', assignedUserName: 'Profesional Universitario'}, [], {cierre});
            assert.ok(html.includes('<dt>Siguiente acción</dt><dd>Evaluación de resultado</dd>'));
            assert.ok(html.includes('<dt>A cargo de</dt><dd>Director Técnico o Profesional Universitario'));
            assert.ok(!html.includes('<strong>Complete el cierre de la solicitud</strong>'));
        }
    }
});

test('el banner abierto deja de pedir evaluación cuando se actualiza la lista de cierre', async () => {
    const current = liveBanner('asignacion', {status: 'Pendiente de respuesta final', assignedUserId: 'other'}, [], {
        cierre: {aplica: true, requisitos: [{key: 'evaluacionResultado', ok: false}]},
    });
    current.setup();
    await flush();
    assert.ok(current.html.includes('Registre la evaluación de resultado'));
    assert.ok(current.html.includes('(usted)'));
    current.model.emit('cierre:updated', {aplica: true, requisitos: [{key: 'evaluacionResultado', ok: true}]});
    assert.ok(!current.html.includes('<dd>Evaluación de resultado</dd>'));
    assert.ok(current.html.includes('Completar el cierre de la solicitud'));
    current.view.emit('remove');
});

test('un trámite sin requisito de evaluación no la solicita en el banner', () => {
    const html = banner('tecnico', {status: 'Remitido por competencia', assignedUserId: 'viewer'}, [], {
        cierre: {aplica: true, requisitos: [{key: 'remisionEnviada', ok: false}]},
    });
    assert.ok(!html.includes('<dd>Evaluación de resultado</dd>'));
    assert.ok(html.includes('Completar el cierre de la solicitud'));
});

test('la visita delegada indica la persona encargada y solo la identifica como usted para esa persona', () => {
    const attributes = {status: 'En gestión técnica', assignedUserId: 'owner', assignedUserName: 'Ana Pérez'};
    const visit = {name: 'V1', responsableName: 'Luis Gómez', actaEstado: 'Pendiente', puedeAdjuntar: true};
    const owner = banner('inspeccion', attributes, [{...visit, esResponsable: false}], {userId: 'owner'});
    assert.ok(owner.includes('<dt>A cargo de</dt><dd>Luis Gómez</dd>'));
    assert.ok(!owner.includes('(usted)'));
    const delegate = banner('tecnico', attributes, [{...visit, esResponsable: true}]);
    assert.ok(delegate.includes('<dt>A cargo de</dt><dd>Luis Gómez (usted)</dd>'));
    assert.ok(delegate.includes('Realice la visita V1 y adjunte el acta'));
});

test('el inspector que también es responsable recibe la revisión cuando el acta está diligenciada', () => {
    const html = banner('inspeccion', {status: 'Revisión de hallazgos', assignedUserId: 'viewer'}, [{actaId: 'acta', actaEstado: 'Diligenciada'}]);
    assert.ok(html.includes('Haga la revisión técnico-jurídica del acta'));
    assert.ok(!html.includes('Espere la revisión'));
});

test('una visita complementaria ya programada pide adjuntar el acta en vez de programar otra', () => {
    const html = banner('tecnico', {status: 'En gestión técnica', cDecisionTramite: 'Visita complementaria', assignedUserId: 'viewer'}, [{name: 'V2', esResponsable: true, responsableName: 'Luis', puedeAdjuntar: true}]);
    assert.ok(html.includes('Adjuntar acta de visita'));
    assert.ok(!html.includes('Programe la visita complementaria'));
});

test('la decisión de la primera acta no bloquea la revisión del acta complementaria', async () => {
    const attributes = {status: 'En gestión técnica', cDecisionTramite: 'Visita complementaria', assignedUserId: 'viewer'};
    const first = {
        id: 'visit-1', name: 'V1', actaId: 'acta-1', actaEstado: 'Diligenciada', actaFirmada: true,
        actaDecisionTramite: 'Visita complementaria', actaRevisada: true,
    };
    const current = liveBanner('tecnico', attributes, [first]);
    current.setup();
    await flush();
    assert.ok(current.html.includes('<strong>Programe la visita complementaria</strong>'));

    const second = {id: 'visit-2', name: 'V2', esResponsable: true, responsableName: 'Ana', actaRevisada: false};
    current.model.emit('visitas:updated', {programaciones: [first, second]});
    assert.ok(current.html.includes('<strong>Adjunte el acta de visita</strong>'));

    const completed = {...second, actaId: 'acta-2', actaEstado: 'Diligenciada', actaFirmada: true, actaDecisionTramite: ''};
    current.model.emit('visitas:updated', {programaciones: [first, completed]});
    assert.ok(current.html.includes('Hacer la revisión técnico-jurídica'));
    assert.ok(current.html.includes('<dt>A cargo de</dt><dd>Inspector Ambiental</dd>'));
    assert.ok(!current.html.includes('Programe la visita complementaria'));
    const inspector = banner('inspeccion', attributes, [first, completed]);
    assert.ok(inspector.includes('<strong>Haga la revisión técnico-jurídica del acta</strong>'));

    // A further visit is required only when the newest acta is actually reviewed again.
    const reviewed = {...completed, actaRevisada: true, actaDecisionTramite: 'Visita complementaria'};
    current.model.emit('visitas:updated', {programaciones: [first, reviewed]});
    assert.ok(current.html.includes('Programe la visita complementaria'));
    current.model.emit('visitas:updated', {programaciones: [first, reviewed, {...second, id: 'cancelled', estado: 'Cancelada'}]});
    assert.ok(current.html.includes('Programe la visita complementaria'));
    current.view.emit('remove');
});

test('el valor predeterminado de decisión en un acta sin revisión no exige otra visita', () => {
    const html = banner('tecnico', {status: 'En gestión técnica', cDecisionTramite: 'Visita complementaria'}, [{
        actaId: 'new-acta', actaEstado: 'Diligenciada', actaFirmada: true,
        actaDecisionTramite: 'Visita complementaria', actaRevisada: false,
    }]);
    assert.ok(html.includes('Hacer la revisión técnico-jurídica'));
    assert.ok(!html.includes('Programar la visita complementaria'));
});

const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return {promise, resolve};
};

test('el banner abierto avanza de programación a acta y revisión sin cambiar el estado del caso', async () => {
    const current = liveBanner('tecnico', {status: 'En gestión técnica', assignedUserId: 'viewer', assignedUserName: 'Ana'});
    current.setup();
    await flush();
    assert.ok(current.html.includes('<strong>Programe la visita</strong>'));
    const visit = {id: 'visit', name: 'V1', responsableName: 'Ana', esResponsable: true, puedeAdjuntar: true};
    current.model.emit('visitas:updated', {programaciones: [visit]});
    assert.ok(current.html.includes('<strong>Adjunte el acta de visita</strong>'));
    assert.ok(!current.html.includes('<strong>Programe la visita</strong>'));
    current.model.emit('visitas:updated', {programaciones: [{...visit, actaId: 'acta', actaEstado: 'Diligenciada', actaFirmada: true}]});
    assert.ok(current.html.includes('<dt>A cargo de</dt><dd>Inspector Ambiental</dd>'));
    assert.ok(current.html.includes('Hacer la revisión técnico-jurídica'));
    assert.ok(!current.html.includes('<strong>Adjunte el acta de visita</strong>'));
    current.view.emit('remove');
});

test('una respuesta anterior no sobrescribe el acta recién cargada por el panel', async () => {
    const stale = deferred();
    const current = liveBanner('tecnico', {status: 'En gestión técnica', assignedUserId: 'viewer'}, [], {uncached: true, getRequest: () => stale.promise});
    current.setup();
    await flush();
    current.model.emit('visitas:updated', {programaciones: [{actaId: 'acta', actaEstado: 'Diligenciada', actaFirmada: true}]});
    stale.resolve({programaciones: []});
    await flush();
    assert.ok(current.html.includes('Hacer la revisión técnico-jurídica'));
    assert.ok(!current.html.includes('Programe la visita'));
    current.view.emit('remove');
});

test('un guardado durante una consulta pendiente vuelve a consultar en vez de conservar datos antiguos', async () => {
    const stale = deferred();
    let requests = 0;
    const current = liveBanner('tecnico', {status: 'Asignado', assignedUserId: 'viewer'}, [], {
        uncached: true,
        getRequest: () => ++requests === 1 ? stale.promise : Promise.resolve({programaciones: [{name: 'V1', esResponsable: true}]}),
    });
    current.setup();
    await flush();
    current.model.emit('sync');
    stale.resolve({programaciones: []});
    await flush();
    assert.equal(requests, 2);
    assert.ok(current.html.includes('<strong>Adjunte el acta de visita</strong>'));
    current.view.emit('remove');
});

test('el panel comparte los datos nuevos y repite la consulta si se guarda mientras estaba cargando', async () => {
    const current = liveBanner('tecnico', {status: 'En gestión técnica', assignedUserId: 'viewer'});
    current.setup();
    await flush();
    const stale = deferred();
    let requests = 0;
    let panelDefinition;
    runInNewContext(readFileSync(resolve(__dirname, '../../espocrm-custom/files/client/custom/src/views/case/fields/acta-visita-action.js'), 'utf8'), {
        define: (_name, _dependencies, factory) => {
            panelDefinition = factory({extend: definition => definition}, {}, {
                ensureProfile() {}, onProfileReady: callback => callback(),
            }, {fetchActaWorkflowForCase: () => Promise.resolve({})}, {}, {}, {});
        },
        Espo: {Ajax: {getRequest: () => ++requests === 1 ? stale.promise : Promise.resolve({programaciones: [{name: 'V1', esResponsable: true}]})}},
    });
    const panel = {
        model: current.model,
        getUser: current.view.getUser,
        loadActaState: panelDefinition.loadActaState,
        scheduleLoadActaState() { this.loadActaState(); },
        applyActaState() {},
    };
    panel.loadActaState();
    panel.loadActaState(); // Another save requests a refresh while the previous request is pending.
    stale.resolve({programaciones: []});
    await flush();
    assert.equal(requests, 2);
    assert.ok(current.html.includes('<strong>Adjunte el acta de visita</strong>'));
    current.view.emit('remove');
});

test('un acta sin firma no da por completo el paso de adjuntar el acta', () => {
    const html = banner('tecnico', {status: 'En gestión técnica', assignedUserId: 'viewer'}, [{name: 'V1', esResponsable: true, actaId: 'acta', actaEstado: 'Diligenciada', actaFirmada: false}]);
    assert.ok(html.includes('<strong>Adjunte el acta de visita firmada</strong>'));
    assert.ok(!html.includes('Espere la revisión'));
});

test('los nombres dinámicos se muestran como texto y el formulario nuevo no lleva banner', () => {
    const html = banner('tecnico', {status: 'Asignado', assignedUserName: '<img src=x onerror=alert(1)>'});
    assert.ok(!html.includes('<img'));
    assert.ok(html.includes('&lt;img'));
    assert.equal(banner('receptor', {status: 'Radicado'}, [], {isNew: true}), '');
});
