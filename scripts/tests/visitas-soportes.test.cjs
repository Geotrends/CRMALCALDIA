const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {resolve} = require('node:path');
const {runInNewContext} = require('node:vm');
let methods;
runInNewContext(readFileSync(resolve(__dirname, '../../espocrm-custom/files/client/custom/src/views/case/fields/acta-visita-action.js'), 'utf8'), {
    define: (_name, _deps, factory) => {
        methods = factory({extend: value => value}, {}, {}, {
            shouldShowActaInArchivo: a => a.estado === 'Diligenciada',
            isActaDiligenciada: a => a.estado === 'Diligenciada',
            hasActaVisitContent: a => a.estado === 'Diligenciada',
        }, {}, {}, {});
    },
});
function cards(programacion, actas = []) {
    const view = {...methods, visitas: {programaciones: [programacion]}, workflow: {actasHistorial: actas},
        getUser: () => ({}), canConsultarVisita: () => false,
        getLanguage: () => ({translateOption: value => value}),
        getDateTime: () => ({toDisplayDate: value => value}),
        model: {get: key => key === 'status' ? 'En gestión técnica' : null},
        shouldShowActaPanel: () => true, isVisitaHabilitada: () => false,
        translateCaseLabel: () => '', resolveVisitaAprobadaHelp: () => '', resolveShowCurrentVisitaSection: () => false,
    };
    return view.data();
}
const base = {id: 'visita', name: 'V1', estado: 'Programada', intervencionId: 'it', puedeAdjuntar: true, puedeAdjuntarInforme: true};
test('sin soportes aparece una sola visita programada', () => {
    const data = cards(base);
    assert.equal(data.programaciones.length, 1);
    assert.equal(data.visitasArchivo.length, 0);
});
test('solo informe: realizada una vez, con aviso y acción para adjuntar el acta', () => {
    const data = cards({...base, informeId: 'informe'});
    assert.equal(data.programaciones.length, 0);
    assert.equal(data.visitasArchivo.length, 1);
    const card = data.visitasArchivo[0];
    assert.equal(card.faltaActa, true);
    assert.equal(card.canAdjuntar, true);
    assert.equal(card.hasSoportes, true);
    assert.equal(card.actaId, undefined);
});
test('solo acta: realizada una vez, sin pedir informe obligatorio ni esperar aval', () => {
    const data = cards({...base, actaId: 'acta', actaEstado: 'Diligenciada', actaFirmada: true, avalTecnico: false}, [{id: 'acta', estado: 'Diligenciada', formatoManoAdjuntoIds: ['file']}]);
    assert.equal(data.programaciones.length, 0);
    assert.equal(data.visitasArchivo.length, 1);
    assert.equal(data.visitasArchivo[0].faltaActa, false);
    assert.equal(data.visitasArchivo[0].informeEstadoLabel, 'No adjunto (opcional)');
});
test('informe y acta: una sola tarjeta conserva los dos soportes', () => {
    const data = cards({...base, actaId: 'acta', actaEstado: 'Diligenciada', actaFirmada: true, informeId: 'informe'}, [{id: 'acta', estado: 'Diligenciada'}]);
    assert.equal(data.programaciones.length, 0);
    assert.equal(data.visitasArchivo.length, 1);
    assert.equal(data.visitasArchivo[0].informeId, 'informe');
});
test('informe con acta en borrador: una realizada, con acción para completar el acta', () => {
    const data = cards({...base, actaId: 'acta', actaEstado: 'Pendiente', informeId: 'informe'}, [{id: 'acta', estado: 'Pendiente'}]);
    assert.equal(data.programaciones.length, 0);
    assert.equal(data.visitasArchivo.length, 1);
    assert.equal(data.visitasArchivo[0].canCompletar, true);
    assert.equal(data.visitasArchivo[0].faltaActa, true);
});
