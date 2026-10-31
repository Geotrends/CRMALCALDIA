const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {runInNewContext} = require('node:vm');
const {EventEmitter} = require('node:events');

const flush = () => new Promise(done => setImmediate(done));
function deferred() {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return {promise, resolve};
}
function definition(file, dependencies) {
    let result;
    runInNewContext(readFileSync(resolve(__dirname, '../../espocrm-custom/files/client/custom/src/', file), 'utf8'), {
        define: (_name, _deps, factory) => { result = factory(...dependencies); },
        window: {setTimeout: callback => { callback(); return 1; }, clearTimeout() {}},
    });
    return result;
}
function decisionView(getRequest = () => Promise.resolve({list: []})) {
    let renders = 0;
    const methods = definition('views/case/fields/decision-juridica.js', [
        {extend: value => value, prototype: {setup() {}}}, {}, {getRequest}, {},
        {safeReRender() { renders++; return Promise.resolve(); }},
    ]);
    const model = Object.assign(new EventEmitter(), {id: 'case', get: key => ({status: 'En gestión técnica'})[key]});
    const attributes = {};
    const view = Object.assign(new EventEmitter(), methods, {
        model, getUser: () => ({}), isRendered: () => true,
        $el: {data(key, value) { if (arguments.length === 2) attributes[key] = value; return attributes[key]; }},
        listenTo(target, events, callback) { events.split(' ').forEach(event => target.on(event, callback.bind(this))); },
        updatePanelVisibility() {}, canDecidir: () => true, translateCaseLabel: () => '',
    });
    return {view, model, get renders() { return renders; }};
}

test('un panel ya visible cambia de aviso sin firma al formulario sin recargar la página', async () => {
    const current = decisionView();
    const view = current.view;
    view.stateReady = true;
    view.currentActa = {id: 'acta', formatoManoAdjuntoIds: []};
    view.hasActaFirmada = false;
    view.refreshViewState();
    await flush();
    assert.equal(view.data().showSinFirma, true);
    assert.equal(current.renders, 1);
    view.currentActa = {id: 'acta', formatoManoAdjuntoIds: ['signed']};
    view.hasActaFirmada = true;
    view.refreshViewState();
    await flush();
    assert.equal(view.data().showRevisar, true);
    assert.equal(current.renders, 2);
    view.refreshViewState();
    assert.equal(current.renders, 2, 'una actualización sin cambios conserva lo que se escribe');
});

test('el formulario descarta la consulta anterior y carga el acta nueva tras una actualización del panel', async () => {
    const old = deferred();
    let requests = 0;
    const current = decisionView(endpoint => {
        if (endpoint === 'AutoInicio') return Promise.resolve({list: []});
        return ++requests === 1 ? old.promise : Promise.resolve({list: [{id: 'new', formatoManoAdjuntoIds: ['signed']}]});
    });
    current.view.setup();
    current.view.profileRoles = ['Inspector Ambiental'];
    current.view.loadState();
    current.model.emit('visitas:updated', {});
    old.resolve({list: [{id: 'old', formatoManoAdjuntoIds: []}]});
    await flush();
    assert.equal(requests, 2);
    assert.equal(current.view.currentActa.id, 'new');
    assert.equal(current.view.data().showRevisar, true);
    current.view.emit('remove');
});

test('una respuesta tardía no cambia una vista que ya fue cerrada', async () => {
    const pending = deferred();
    const current = decisionView(() => pending.promise);
    current.view.setup();
    current.view.profileRoles = ['Inspector Ambiental'];
    current.view.loadState();
    current.view.emit('remove');
    pending.resolve({list: [{id: 'late', formatoManoAdjuntoIds: ['signed']}]});
    await flush();
    assert.equal(current.view.currentActa, undefined);
    assert.equal(current.renders, 0);
});

test('actualizar la tarjeta conserva el formulario insertado y serializa renders simultáneos', async () => {
    let attached = true;
    let destroyed = false;
    let renders = 0;
    const pending = deferred();
    const host = {length: 1, detach() { attached = false; return this; }};
    const card = {length: 1, first() { return this; }, append(value) { assert.equal(value, host); attached = true; }};
    const el = {find(selector) { return selector === '.case-visita-decision' ? host : card; }};
    const methods = definition('views/case/fields/acta-visita-action.js', [
        {extend: value => value, prototype: {reRender() {
            renders++;
            if (attached) destroyed = true; // Replacing the parent's HTML would remove the nested form.
            return renders === 1 ? pending.promise : Promise.resolve();
        }}}, {}, {}, {}, {}, {}, {},
    ]);
    const view = {...methods, $el: el};
    const first = view.reRender();
    view.reRender();
    assert.equal(renders, 1);
    pending.resolve();
    await first;
    assert.equal(renders, 2);
    assert.equal(destroyed, false);
    assert.equal(attached, true);
});
