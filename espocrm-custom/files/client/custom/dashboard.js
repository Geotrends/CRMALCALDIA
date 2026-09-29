/* Carrusel de grupos: uno a la vez, numeración debajo, flechas, teclado y deslizamiento. */
(function () {
    if (window.parent !== window) {
        document.documentElement.classList.add('en-iframe');
    }

    var raiz = document.getElementById('dash-carrusel');
    var nav = document.getElementById('dash-carrusel-nav');
    var mini = document.getElementById('dash-carrusel-mini');

    if (!raiz || !nav) {
        return;
    }

    var ventana = raiz.querySelector('.dash-carrusel__ventana');
    var pista = raiz.querySelector('.dash-carrusel__pista');
    var slides = Array.prototype.slice.call(pista.children).filter(function (el) { return el.classList.contains('dash-grupo'); });
    var CLAVE = 'crm-dashboard-grupo';
    var actual = 0;

    try {
        actual = Math.min(slides.length - 1, Math.max(0, parseInt(localStorage.getItem(CLAVE) || '0', 10) || 0));
    } catch (e) { actual = 0; }

    nav.innerHTML = slides.map(function (sl, i) {
        var titulo = (sl.querySelector('.dash-grupo__header h2') || {}).textContent || ('Grupo ' + i);
        var corto = titulo.replace(/\s*\(.*\)$/, '');

        return '<button type="button" class="dash-carrusel__punto" data-slide="' + i + '" aria-label="' + titulo + '" title="' + titulo + '">'
            + '<span class="dash-carrusel__num">' + i + '</span><span class="dash-carrusel__txt">' + corto + '</span></button>';
    }).join('');

    if (mini) {
        mini.innerHTML = slides.map(function (sl, i) {
            var titulo = (sl.querySelector('.dash-grupo__header h2') || {}).textContent || '';

            return '<button type="button" data-slide="' + i + '" title="' + titulo + '" aria-label="' + titulo + '">' + i + '</button>';
        }).join('');
        mini.addEventListener('click', function (e) {
            var b = e.target.closest('[data-slide]');

            if (b) { ir(Number(b.getAttribute('data-slide'))); }
        });
    }

    var avisarAltura = function () {
        var sl = slides[actual];

        if (!sl) { return; }

        ventana.style.height = sl.offsetHeight + 'px';
        window.dispatchEvent(new CustomEvent('crm-dashboard-relayout'));

        if (window.parent !== window) {
            var root = document.querySelector('.dashboard');
            window.parent.postMessage({type: 'crm-dashboard-height', height: Math.ceil(root.getBoundingClientRect().height) + 16}, window.location.origin);
        }
    };

    var ir = function (i, foco) {
        actual = (i + slides.length) % slides.length;
        pista.style.transform = 'translateX(' + (-100 * actual) + '%)';
        slides.forEach(function (sl, k) {
            sl.setAttribute('aria-hidden', k === actual ? 'false' : 'true');
            sl.classList.toggle('is-activo', k === actual);
        });
        [nav, mini].forEach(function (cont) {
            if (!cont) { return; }
            Array.prototype.forEach.call(cont.children, function (b, k) {
                b.classList.toggle('is-activo', k === actual);
                b.setAttribute('aria-current', k === actual ? 'true' : 'false');
            });
        });

        try { localStorage.setItem(CLAVE, String(actual)); } catch (e) { /* sin almacenamiento */ }

        // Los gráficos y el mapa recalculan su tamaño al quedar visibles.
        window.dispatchEvent(new Event('resize'));
        setTimeout(avisarAltura, 60);
        setTimeout(avisarAltura, 400);

        if (foco) {
            nav.children[actual].focus({preventScroll: true});
        }
    };

    nav.addEventListener('click', function (e) {
        var b = e.target.closest('[data-slide]');

        if (b) { ir(Number(b.getAttribute('data-slide'))); }
    });

    raiz.querySelector('[data-carrusel="prev"]').addEventListener('click', function () { ir(actual - 1); });
    raiz.querySelector('[data-carrusel="next"]').addEventListener('click', function () { ir(actual + 1); });

    // Al cambiar desde la numeración de abajo, se vuelve al inicio del grupo.
    nav.addEventListener('click', function () {
        try { raiz.scrollIntoView({behavior: 'smooth', block: 'start'}); } catch (e) { /* sin soporte */ }
        if (window.parent !== window) { window.parent.postMessage({type: 'crm-dashboard-scroll-top'}, window.location.origin); }
    });

    document.addEventListener('keydown', function (e) {
        var tag = (e.target && e.target.tagName) || '';

        if (/INPUT|SELECT|TEXTAREA/.test(tag)) { return; }
        if (e.key === 'ArrowRight') { ir(actual + 1, true); }
        if (e.key === 'ArrowLeft') { ir(actual - 1, true); }
    });

    // Deslizamiento táctil (horizontal y claro, para no confundirlo con el desplazamiento vertical).
    var x0 = null;
    var y0 = null;

    ventana.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, {passive: true});
    ventana.addEventListener('touchend', function (e) {
        if (x0 === null) { return; }
        var dx = e.changedTouches[0].clientX - x0;
        var dy = e.changedTouches[0].clientY - y0;

        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { ir(actual + (dx < 0 ? 1 : -1)); }
        x0 = null;
    });

    if (window.ResizeObserver) {
        new ResizeObserver(function () { avisarAltura(); }).observe(pista);
    }

    window.addEventListener('crm-dashboard-cases', function () { setTimeout(avisarAltura, 300); });
    ir(actual);
})();

(function () {
    var estado = document.getElementById('estado');

    function hideDashboardLoading() {
        var loader = document.getElementById('dashboard-loading');
        var dash = document.querySelector('.dashboard');

        if (dash) {
            dash.classList.remove('dashboard--booting');
        }

        if (!loader) {
            notifyDashboardReady();
            return;
        }

        loader.classList.add('is-hidden');
        loader.setAttribute('aria-busy', 'false');

        setTimeout(function () {
            if (loader.parentNode) {
                loader.parentNode.removeChild(loader);
            }
        }, 320);

        notifyDashboardReady();
    }

    function notifyDashboardReady() {
        if (window.parent === window) {
            return;
        }

        window.parent.postMessage({
            type: 'crm-dashboard-ready',
        }, window.location.origin);
    }

    document.getElementById('fecha-actual').textContent =
        new Date().toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'America/Bogota',
        });

    /* Paleta apagada — solo gráficas Chart.js (barras, donuts, polar, líneas) */
    var PALETA = [
        '#9eb8a8', '#9eb5c8', '#b5a8b8', '#ada8c4',
        '#c4b88a', '#c9b8a8', '#a8b0a0', '#b0b8c0',
        '#9eb0b0', '#c4a8a0', '#b0a8c0', '#b0b89e',
    ];

    /* Etiquetas numéricas sin dependencia externa adicional para Chart.js. */
    var NumericValuesPlugin = {
        id: 'crmNumericValues',
        afterDatasetsDraw: function (chart) {
            var options = chart.options.plugins && chart.options.plugins.crmNumericValues;

            if (!options || !options.display) {
                return;
            }

            if (['doughnut', 'polarArea'].indexOf(chart.config.type) !== -1) {
                drawCircularLabels(chart);
                return;
            }

            var ctx = chart.ctx;
            var horizontal = chart.options.indexAxis === 'y';
            ctx.save();
            ctx.fillStyle = '#475569';
            ctx.font = '600 11px Inter, sans-serif';
            ctx.textAlign = horizontal ? 'left' : 'center';
            ctx.textBaseline = horizontal ? 'middle' : 'bottom';

            chart.data.datasets.forEach(function (dataset, datasetIndex) {
                var meta = chart.getDatasetMeta(datasetIndex);

                meta.data.forEach(function (element, index) {
                    var value = Number(dataset.data[index]) || 0;

                    if (value === 0 && options.showZero !== true) {
                        return;
                    }

                    var point = element.tooltipPosition();
                    var x = horizontal ? point.x + 6 : point.x;
                    var y = horizontal ? point.y : point.y - 6;
                    ctx.fillText(String(value), x, y);
                });
            });

            ctx.restore();
        },
        afterDraw: function (chart) {
            var options = chart.options.plugins && chart.options.plugins.crmNumericValues;

            if (!options || !options.total || ['doughnut', 'polarArea'].indexOf(chart.config.type) === -1) {
                return;
            }

            var total = (chart.data.datasets[0].data || []).reduce(function (sum, value) {
                return sum + (Number(value) || 0);
            }, 0);
            var ctx = chart.ctx;
            var area = chart.chartArea;
            ctx.save();
            ctx.fillStyle = '#334155';
            ctx.font = '700 19px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(total), (area.left + area.right) / 2, (area.top + area.bottom) / 2 - 5);
            ctx.fillStyle = '#64748b';
            ctx.font = '600 9px Inter, sans-serif';
            ctx.fillText('TOTAL', (area.left + area.right) / 2, (area.top + area.bottom) / 2 + 12);
            ctx.restore();
        },
    };

    function drawCircularLabels(chart) {
        var dataset = chart.data.datasets[0] || {};
        var meta = chart.getDatasetMeta(0);
        var ctx = chart.ctx;

        if (!meta || !meta.data) {
            return;
        }

        ctx.save();
        ctx.strokeStyle = '#94a3b8';
        ctx.fillStyle = '#475569';
        ctx.lineWidth = 1;
        ctx.font = '600 10px Inter, sans-serif';
        ctx.textBaseline = 'middle';

        meta.data.forEach(function (element, index) {
            var value = Number(dataset.data[index]) || 0;

            if (value <= 0 || !isFinite(element.startAngle) || !isFinite(element.endAngle)) {
                return;
            }

            var angle = (element.startAngle + element.endAngle) / 2;
            var direction = Math.cos(angle) >= 0 ? 1 : -1;
            var radius = element.outerRadius || 0;
            var startX = element.x + Math.cos(angle) * (radius + 2);
            var startY = element.y + Math.sin(angle) * (radius + 2);
            var elbowX = element.x + Math.cos(angle) * (radius + 15);
            var elbowY = element.y + Math.sin(angle) * (radius + 15);
            var endX = elbowX + direction * 19;
            var label = String(chart.data.labels[index] || 'Serie') + ': ' + value;

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(elbowX, elbowY);
            ctx.lineTo(endX, elbowY);
            ctx.stroke();
            ctx.textAlign = direction > 0 ? 'left' : 'right';
            ctx.fillText(label, endX + direction * 4, elbowY);
        });

        ctx.restore();
    }

    function generateLegendWithValues(chart) {
        var dataset = chart.data.datasets[0] || {};
        var colors = dataset.backgroundColor || [];

        return (chart.data.labels || []).map(function (label, index) {
            return {
                text: String(label) + (Number(dataset.data[index]) > 0 ? ' (' + dataset.data[index] + ')' : ''),
                fillStyle: colors[index] || '#94a3b8',
                strokeStyle: '#ffffff',
                lineWidth: 1,
                hidden: !chart.getDataVisibility(index),
                index: index,
            };
        });
    }

    Chart.register(NumericValuesPlugin);

    /* Pasteles por estado — embudo (igual que el listado de casos) */
    var ESTADO_PALETTE = {
        'Pendiente de radicacion': {bg: '#ffedd5', text: '#9a3412'},
        'Radicado': {bg: '#e0f2fe', text: '#0369a1'},
        'Asignado': {bg: '#fce7f3', text: '#9d174d'},
        'En gestión técnica': {bg: '#fef9c3', text: '#854d0e'},
        'Revisión de hallazgos': {bg: '#dcfce7', text: '#166534'},
        'Pendiente de respuesta final': {bg: '#e0e7ff', text: '#3730a3'},
        'Remitido por competencia': {bg: '#f3e8ff', text: '#6b21a8'},
        'Finalizado': {bg: '#ede0d4', text: '#6b4423'},
        'Proceso cerrado': {bg: '#e2e8f0', text: '#334155'},
    };

    var COLORES_ESTADO = {
        'Pendiente de radicacion': ESTADO_PALETTE['Pendiente de radicacion'].bg,
        'Radicado': ESTADO_PALETTE['Radicado'].bg,
        'Asignado': ESTADO_PALETTE['Asignado'].bg,
        'En gestión técnica': ESTADO_PALETTE['En gestión técnica'].bg,
        'Revisión de hallazgos': ESTADO_PALETTE['Revisión de hallazgos'].bg,
        'Pendiente de respuesta final': ESTADO_PALETTE['Pendiente de respuesta final'].bg,
        'Remitido por competencia': ESTADO_PALETTE['Remitido por competencia'].bg,
        'Finalizado': ESTADO_PALETTE['Finalizado'].bg,
        'Proceso cerrado': ESTADO_PALETTE['Proceso cerrado'].bg,
    };

    var COLORES_ESTADO_TEXTO = {
        'Pendiente de radicacion': ESTADO_PALETTE['Pendiente de radicacion'].text,
        'Radicado': ESTADO_PALETTE['Radicado'].text,
        'Asignado': ESTADO_PALETTE['Asignado'].text,
        'En gestión técnica': ESTADO_PALETTE['En gestión técnica'].text,
        'Revisión de hallazgos': ESTADO_PALETTE['Revisión de hallazgos'].text,
        'Pendiente de respuesta final': ESTADO_PALETTE['Pendiente de respuesta final'].text,
        'Remitido por competencia': ESTADO_PALETTE['Remitido por competencia'].text,
        'Finalizado': ESTADO_PALETTE['Finalizado'].text,
        'Proceso cerrado': ESTADO_PALETTE['Proceso cerrado'].text,
    };

    var COLORES_SEMAFORO = {
        'Al día': '#9ec4a8',
        'Próximo a vencer': '#d4c48a',
        'Vencido': '#c9a0a0',
        'Sin fecha': '#c5ccd3',
    };

    var COLORES_CANAL = {
        'Teléfono': '#a8b0b8',
        'Correo': '#9eb5c8',
        'Personal': '#9eb8a8',
        'Sin canal': '#d8dde3',
    };

    var CANAL_CATALOGO = [
        {valor: 'Telefono', etiqueta: 'Teléfono'},
        {valor: 'Correo', etiqueta: 'Correo'},
        {valor: 'Personal', etiqueta: 'Personal'},
    ];

    var ESTADOS_FIN = ['Finalizado', 'Proceso cerrado'];
    // Una vez radicada, la solicitud entra en gestión administrativa aunque aún no tenga asignación.
    var ESTADOS_GESTION = ['Radicado', 'Asignado', 'En gestión técnica', 'Revisión de hallazgos',
        'Pendiente de respuesta final', 'Remitido por competencia'];
    var ESTADOS_POR_FINALIZAR = ['Pendiente de respuesta final', 'Remitido por competencia'];

    /* Datos de apoyo para los indicadores de visitas, decisiones y remisiones.
     * Si el rol no puede leer alguna entidad, el indicador se muestra como «–». */
    var APOYO = {listo: false, actasPorCaso: {}, gestionEnCursoPorCaso: {}, remisionesPorCaso: {}, sinAcceso: {}};

    function fetchLista(url, clave) {
        return fetch(url, {credentials: 'include'})
            .then(function (res) {
                if (!res.ok) { APOYO.sinAcceso[clave] = true; return {list: []}; }
                return res.json();
            })
            .then(function (data) { return data.list || []; })
            .catch(function () { APOYO.sinAcceso[clave] = true; return []; });
    }

    function fetchDatosApoyo() {
        return Promise.all([
            fetchLista('/api/v1/ActaVisita?select=caseId,estado,cDecisionTramite,cRevisadoPor,fechaAprobacion,createdAt&maxSize=200&orderBy=createdAt&order=asc', 'actas'),
            fetchLista('/api/v1/GestionTecnica?select=caseId,estado,createdAt&maxSize=200&orderBy=createdAt&order=asc', 'gestion'),
            fetchLista('/api/v1/RemisionAutoridad?select=caseId,estadoSeguimiento&maxSize=200', 'remisiones'),
        ]).then(function (res) {
            res[0].forEach(function (a) { (APOYO.actasPorCaso[a.caseId] = APOYO.actasPorCaso[a.caseId] || []).push(a); });
            // La última gestión técnica del caso manda: «En ejecución»/«Reprogramada» = visita en curso.
            res[1].forEach(function (g) { APOYO.gestionEnCursoPorCaso[g.caseId] = ['En ejecución', 'Reprogramada'].indexOf(g.estado) !== -1; });
            res[2].forEach(function (r) { (APOYO.remisionesPorCaso[r.caseId] = APOYO.remisionesPorCaso[r.caseId] || []).push(r); });
            APOYO.listo = true;
        });
    }

    function actaDiligenciada(a) { return ['Diligenciada', 'Aprobada'].indexOf(a.estado) !== -1; }

    function actaRevisada(a) {
        return !!String(a.cDecisionTramite || '').trim()
            && (!!String(a.cRevisadoPor || '').trim() || !!String(a.fechaAprobacion || '').trim());
    }

    function visitaPendiente(c) {
        return c.status === 'Asignado'
            || (c.status === 'En gestión técnica' && !!APOYO.gestionEnCursoPorCaso[c.id]);
    }

    /* Indicadores del flujo (competencia, visitas, decisión, cierre) sobre los casos filtrados. */
    function calcularFlujo(casos) {
        var r = {competenciaPendiente: 0, visitasPendientes: 0, visitasRealizadas: 0, actasSinRevisar: 0, actasRevisadas: 0,
            porDefinir: 0, porFinalizar: 0, remisionesSinEnviar: 0, decisiones: {}, competencia: {}};

        casos.forEach(function (c) {
            var fin = ESTADOS_FIN.indexOf(c.status) !== -1;
            var actas = APOYO.actasPorCaso[c.id] || [];
            var diligenciadas = actas.filter(actaDiligenciada);
            var ultima = diligenciadas[diligenciadas.length - 1];

            if (c.status === 'Radicado' && !c.cCompetenciaConfirmada) { r.competenciaPendiente++; }
            if (!fin && visitaPendiente(c)) { r.visitasPendientes++; }
            if (ESTADOS_POR_FINALIZAR.indexOf(c.status) !== -1) { r.porFinalizar++; }

            if (!fin && ['En gestión técnica', 'Revisión de hallazgos'].indexOf(c.status) !== -1
                && !APOYO.gestionEnCursoPorCaso[c.id] && ultima && !actaRevisada(ultima)) {
                r.porDefinir++;
            }

            diligenciadas.forEach(function (a) {
                r.visitasRealizadas++;
                if (actaRevisada(a)) {
                    r.actasRevisadas++;
                    r.decisiones[a.cDecisionTramite] = (r.decisiones[a.cDecisionTramite] || 0) + 1;
                } else {
                    r.actasSinRevisar++;
                }
            });

            (APOYO.remisionesPorCaso[c.id] || []).forEach(function (rem) {
                if (!rem.estadoSeguimiento || rem.estadoSeguimiento === 'Preparación') { r.remisionesSinEnviar++; }
            });

            if (tieneRadicado(c)) {
                var comp = c.cCompetenciaConfirmada ? (c.cCompetencia || 'Total') : (fin ? null : 'Por revisar');
                if (comp) { r.competencia[comp] = (r.competencia[comp] || 0) + 1; }
            }
        });

        return r;
    }

    function setKpi(id, valor, clave) {
        var el = document.getElementById(id);
        if (el) { el.textContent = (clave && APOYO.sinAcceso[clave]) || (clave && !APOYO.listo) ? '–' : valor; }
    }

    /* Casos que escalaron a proceso policivo (tienen Auto de Inicio). Se
     * carga aparte porque Case no trae esa info en su propio select. */
    var casosPolicivoIds = null;

    function fetchCasosPolicivoIds() {
        return fetch('/api/v1/AutoInicio?select=caseId&maxSize=200', {credentials: 'include'})
            .then(function (res) { return res.ok ? res.json() : {list: []}; })
            .then(function (data) {
                var ids = {};
                (data.list || []).forEach(function (a) {
                    if (a.caseId) { ids[a.caseId] = true; }
                });
                casosPolicivoIds = ids;
                return ids;
            })
            .catch(function () {
                casosPolicivoIds = casosPolicivoIds || {};
                return casosPolicivoIds;
            });
    }

    var SEMAFORO_LABEL = {
        vencido: 'Vencido',
        proximo_vencer: 'Próximo a vencer',
    };

    var SEMAFORO_CLASS = {
        vencido: 'policivo-semaforo--vencido',
        proximo_vencer: 'policivo-semaforo--proximo',
    };

    function fetchExpedientesResumen() {
        return fetch('/api/v1/Expediente/action/resumenDashboard', {credentials: 'include'})
            .then(function (res) { return res.ok ? res.json() : {list: []}; })
            .then(function (data) { return data.list || []; })
            .catch(function () { return []; });
    }

    function renderPolicivosSeccion(rows) {
        var $tbody = document.getElementById('policivos-tbody');
        var $vencidos = document.getElementById('policivos-vencidos');
        var $proximos = document.getElementById('policivos-proximos');
        if (!$tbody) { return; }

        if (!rows.length) {
            $tbody.innerHTML = '<tr><td colspan="5" class="text-muted">No hay procesos policivos abiertos.</td></tr>';
            if ($vencidos) { $vencidos.textContent = '0 vencidos'; }
            if ($proximos) { $proximos.textContent = '0 próximos'; }
            return;
        }

        var vencidos = 0;
        var proximos = 0;

        var html = rows.map(function (row) {
            if (row.semaforo === 'vencido') { vencidos++; }
            if (row.semaforo === 'proximo_vencer') { proximos++; }

            var semaforoLabel = SEMAFORO_LABEL[row.semaforo] || 'Al día';
            var semaforoClass = SEMAFORO_CLASS[row.semaforo] || 'policivo-semaforo--ok';
            var radicadoCell = row.caseId
                ? '<a href="#Case/view/' + row.caseId + '" target="_blank" rel="noopener">' + (row.numeroRadicado || row.numero) + '</a>'
                : (row.numeroRadicado || row.numero);
            var dias = (row.diasEnPaso === null || row.diasEnPaso === undefined) ? '–' : row.diasEnPaso;

            return '<tr>'
                + '<td>' + radicadoCell + '</td>'
                + '<td>' + (row.tipoTramite || '') + '</td>'
                + '<td>' + (row.estado || '') + '</td>'
                + '<td>' + dias + '</td>'
                + '<td><span class="policivo-semaforo ' + semaforoClass + '">' + semaforoLabel + '</span></td>'
                + '</tr>';
        }).join('');

        $tbody.innerHTML = html;
        if ($vencidos) { $vencidos.textContent = vencidos + ' vencido(s)'; }
        if ($proximos) { $proximos.textContent = proximos + ' próximo(s)'; }
    }

    var EMBUDO_ETAPAS = [
        {status: 'Pendiente de radicacion', label: 'Pendiente de radicación'},
        {status: 'Radicado', label: 'Radicado'},
        {status: 'Asignado', label: 'Asignado'},
        {status: 'En gestión técnica', label: 'En gestión técnica'},
        {status: 'Revisión de hallazgos', label: 'Revisión de hallazgos'},
        {status: 'Pendiente de respuesta final', label: 'Pendiente de respuesta final'},
        {status: 'Remitido por competencia', label: 'Remitido por competencia'},
        {status: 'Finalizado', label: 'Finalizado'},
        {status: 'Proceso cerrado', label: 'Proceso cerrado'},
    ];

    function normalizarEstadoEmbudo(status) {
        var value = String(status || '').trim();

        return value;
    }

    var RECURSO_CATALOGO = [
        {valor: 'AIRE', siglas: 'AIR', etiqueta: 'Aire'},
        {valor: 'ESPACIO PUBLICOS VERDES', siglas: 'EPV', etiqueta: 'Espacio públicos verdes'},
        {valor: 'FAUNA DOMÉSTICA', siglas: 'FDO', etiqueta: 'Fauna doméstica'},
        {valor: 'FAUNA SILVESTRE', siglas: 'FSI', etiqueta: 'Fauna silvestre'},
        {valor: 'FLORA', siglas: 'FLO', etiqueta: 'Flora'},
        {valor: 'HÍDRICO', siglas: 'HID', etiqueta: 'Hídrico'},
        {valor: 'LOTE-PREDIO', siglas: 'LPR', etiqueta: 'Lote-predio'},
        {valor: 'RESIDUOS SOLIDOS', siglas: 'RSO', etiqueta: 'Residuos sólidos'},
        {valor: 'SUELO', siglas: 'SUE', etiqueta: 'Suelo'},
    ];

    function claveRecurso(caso) {
        var recurso = String(caso.cRecursoTema || '').trim();

        if (!recurso || recurso === 'Seleccione una opción') {
            return '';
        }

        return recurso;
    }

    function claveCanal(caso) {
        var canal = String(caso.cCanalDeReportePeticionario || '').trim();

        if (!canal || canal === 'Seleccione una opción') {
            return '';
        }

        return canal;
    }

    function agruparPorCanal(casos) {
        var conteo = agrupar(casos, claveCanal);
        var etiquetas = [];
        var valores = [];

        CANAL_CATALOGO.forEach(function (item) {
            etiquetas.push(item.etiqueta);
            valores.push(conteo[item.valor] || 0);
        });

        var sinCanal = conteo[''] || 0;

        if (sinCanal > 0) {
            etiquetas.push('Sin canal');
            valores.push(sinCanal);
        }

        return {
            etiquetas: etiquetas,
            valores: valores,
        };
    }

    function agruparPorRecurso(casos) {
        var conteo = agrupar(casos, claveRecurso);
        var etiquetas = [];
        var valores = [];
        var tooltips = [];

        RECURSO_CATALOGO.forEach(function (item) {
            etiquetas.push(item.siglas);
            tooltips.push(item.etiqueta);
            valores.push(conteo[item.valor] || 0);
        });

        var sinRecurso = conteo[''] || 0;

        if (sinRecurso > 0) {
            etiquetas.push('—');
            tooltips.push('Sin recurso');
            valores.push(sinRecurso);
        }

        return {
            etiquetas: etiquetas,
            valores: valores,
            tooltips: tooltips,
        };
    }

    function agrupar(lista, fn) {
        var c = {};

        lista.forEach(function (item) {
            var k = fn(item) || 'Sin valor';
            c[k] = (c[k] || 0) + 1;
        });

        return c;
    }

    function ordenarDesc(conteo) {
        var e = Object.entries(conteo).sort(function (a, b) {
            return b[1] - a[1];
        });

        return {
            etiquetas: e.map(function (x) { return x[0]; }),
            valores: e.map(function (x) { return x[1]; }),
        };
    }

    function topN(conteo, limite) {
        var ordenado = ordenarDesc(conteo);

        return {
            etiquetas: ordenado.etiquetas.slice(0, limite),
            valores: ordenado.valores.slice(0, limite),
        };
    }

    function tieneRadicado(caso) {
        var radicado = String(caso.cNumeroRadicado || '').trim();

        return radicado !== '';
    }

    function etiquetaBarrio(valor) {
        var texto = String(valor || '').trim();

        if (!texto || texto === 'Seleccione una opción') {
            return 'Sin barrio';
        }

        return texto;
    }

    function mensajeVacio(canvasId, texto) {
        var canvas = document.getElementById(canvasId);

        if (!canvas || !canvas.parentElement) {
            return;
        }

        canvas.style.display = 'none';
        var empty = document.createElement('p');
        empty.className = 'dashboard-chart-empty';
        empty.textContent = texto;
        canvas.parentElement.appendChild(empty);
    }

    function semaforo(caso) {
        if (!caso.cFechaVencimiento) {
            return 'Sin fecha';
        }

        var hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        var vence = new Date(caso.cFechaVencimiento + 'T00:00:00');
        var diff = Math.ceil((vence - hoy) / (1000 * 60 * 60 * 24));

        if (diff < 0) {
            return 'Vencido';
        }

        if (diff <= 3) {
            return 'Próximo a vencer';
        }

        return 'Al día';
    }

    function tonosPorValor(valores, rgb) {
        var base = rgb || {r: 158, g: 181, b: 198};
        var max = Math.max.apply(null, valores.concat([1]));

        return valores.map(function (valor) {
            var intensidad = 0.72 + (valor / max) * 0.22;

            return 'rgba(' + base.r + ', ' + base.g + ', ' + base.b + ', ' + intensidad.toFixed(2) + ')';
        });
    }

    function dibujarBarras(canvasId, etiquetas, valores, opciones) {
        var canvas = document.getElementById(canvasId);
        var cfg = opciones || {};
        var tooltips = cfg.tooltips || etiquetas;
        var colores = cfg.colores;
        var unidad = cfg.unidad || 'caso(s)';
        var borderRadius = cfg.borderRadiusBarra != null ? cfg.borderRadiusBarra : 6;

        if (!colores && cfg.coloresPorValor) {
            colores = tonosPorValor(valores, cfg.coloresPorValor);
        }

        if (!colores && cfg.colorBarra) {
            colores = valores.map(function () {
                return cfg.colorBarra;
            });
        }

        return new Chart(canvas, {
            type: 'bar',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: cfg.etiquetaDataset || 'Casos por recurso',
                    data: valores,
                    backgroundColor: colores || etiquetas.map(function (_, i) {
                        return PALETA[i % PALETA.length];
                    }),
                    borderRadius: borderRadius,
                    maxBarThickness: cfg.maxBarThickness != null ? cfg.maxBarThickness : 60,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    crmNumericValues: {display: true, showZero: cfg.showZeroValues === true},
                    legend: {display: false},
                    tooltip: {
                        callbacks: {
                            title: function (items) {
                                var idx = items[0] && items[0].dataIndex;

                                return tooltips[idx] || items[0].label;
                            },
                            label: function (ctx) {
                                return ' ' + ctx.parsed.y + ' ' + unidad;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {display: false},
                        ticks: {
                            color: '#64748b',
                            font: {size: cfg.ticksX || 12, family: 'Inter, sans-serif'},
                            maxRotation: cfg.rotacionX != null ? cfg.rotacionX : 0,
                        },
                    },
                    y: {beginAtZero: true, ticks: {precision: 0, color: '#94a3b8', font: {family: 'Inter, sans-serif'}}, grid: {color: '#f1f5f9'}},
                },
            },
        });
    }

    function dibujarEmbudo(containerId, conteoPorEstado) {
        var container = document.getElementById(containerId);

        if (!container) {
            return;
        }

        var pasos = EMBUDO_ETAPAS.map(function (etapa) {
            return {
                status: etapa.status,
                label: etapa.label,
                valor: conteoPorEstado[etapa.status] || 0,
                color: COLORES_ESTADO[etapa.status] || '#e2e8f0',
                textColor: COLORES_ESTADO_TEXTO[etapa.status] || '#475569',
            };
        });

        var maxValor = 0;

        pasos.forEach(function (paso) {
            if (paso.valor > maxValor) {
                maxValor = paso.valor;
            }
        });

        if (!maxValor) {
            maxValor = 1;
        }

        container.innerHTML = '';
        container.className = 'funnel-chart';

        var wrap = document.createElement('div');
        wrap.className = 'funnel';

        pasos.forEach(function (paso, index) {
            var nivel = document.createElement('div');
            nivel.className = 'funnel-nivel';
            var ancho = Math.max(38, Math.round((paso.valor / maxValor) * 100));
            nivel.style.width = ancho + '%';

            var barra = document.createElement('div');
            barra.className = 'funnel-barra';
            barra.style.backgroundColor = paso.color;
            barra.style.color = paso.textColor;
            barra.style.border = '1px solid rgba(15, 23, 42, 0.08)';

            var etiqueta = document.createElement('span');
            etiqueta.className = 'funnel-etiqueta';
            etiqueta.textContent = paso.label;
            etiqueta.title = paso.label;

            var valor = document.createElement('span');
            valor.className = 'funnel-valor';
            valor.textContent = String(paso.valor);

            barra.appendChild(etiqueta);
            barra.appendChild(valor);
            nivel.appendChild(barra);
            wrap.appendChild(nivel);

            if (index < pasos.length - 1) {
                var conector = document.createElement('div');
                conector.className = 'funnel-conector';
                wrap.appendChild(conector);
            }
        });

        container.appendChild(wrap);
    }

    function dibujarDonut(canvasId, etiquetas, valores, colores) {
        var canvas = document.getElementById(canvasId);

        return new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: etiquetas,
                datasets: [{
                    data: valores,
                    backgroundColor: colores,
                    borderWidth: 2,
                    borderColor: '#fff',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '55%',
                layout: {padding: {left: 48, right: 48, top: 20}},
                plugins: {
                    crmNumericValues: {display: true, total: true},
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 12,
                            font: {size: 12, family: 'Inter, sans-serif'},
                            color: '#64748b',
                            usePointStyle: true,
                            generateLabels: generateLegendWithValues,
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                var total = ctx.dataset.data.reduce(function (a, b) {
                                    return a + b;
                                }, 0);

                                return ' ' + ctx.label + ': ' + ctx.parsed
                                    + ' (' + Math.round((ctx.parsed / total) * 100) + '%)';
                            },
                        },
                    },
                },
            },
        });
    }

    function dibujarLinea(canvasId, etiquetas, valores, opciones) {
        var canvas = document.getElementById(canvasId);
        var cfg = opciones || {};

        return new Chart(canvas, {
            type: 'line',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: cfg.label || 'Casos',
                    data: valores,
                    borderColor: cfg.color || '#8aa898',
                    backgroundColor: cfg.fill || 'rgba(158, 184, 168, 0.28)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: cfg.color || '#8aa898',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {padding: {left: 48, right: 48, top: 20}},
                plugins: {
                    crmNumericValues: {display: true, showZero: false},
                    legend: {display: false},
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ' ' + ctx.parsed.y + ' caso(s)';
                            },
                        },
                    },
                },
                scales: {
                    x: {grid: {display: false}, ticks: {color: '#4b5563', font: {size: 11}}},
                    y: {beginAtZero: true, ticks: {precision: 0, color: '#6b7280'}, grid: {color: '#eef0f3'}},
                },
            },
        });
    }

    function dibujarBarrasHorizontales(canvasId, etiquetas, valores) {
        var canvas = document.getElementById(canvasId);

        return new Chart(canvas, {
            type: 'bar',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: 'Casos',
                    data: valores,
                    backgroundColor: etiquetas.map(function (_, i) {
                        return PALETA[i % PALETA.length];
                    }),
                    borderRadius: 6,
                    barThickness: 18,
                }],
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    crmNumericValues: {display: true, showZero: false},
                    legend: {display: false},
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ' ' + ctx.parsed.x + ' caso(s)';
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {precision: 0, color: '#6b7280'},
                        grid: {color: '#eef0f3'},
                    },
                    y: {
                        grid: {display: false},
                        ticks: {color: '#4b5563', font: {size: 11}},
                    },
                },
            },
        });
    }

    function dibujarPolar(canvasId, etiquetas, valores, colores) {
        var canvas = document.getElementById(canvasId);

        return new Chart(canvas, {
            type: 'polarArea',
            data: {
                labels: etiquetas,
                datasets: [{
                    data: valores,
                    backgroundColor: colores,
                    borderWidth: 2,
                    borderColor: '#fff',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    crmNumericValues: {display: true, total: true},
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 10,
                            font: {size: 12},
                            usePointStyle: true,
                            generateLabels: generateLegendWithValues,
                        },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ' ' + ctx.label + ': ' + ctx.parsed.r + ' caso(s)';
                            },
                        },
                    },
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: {precision: 0, backdropColor: 'transparent'},
                        grid: {color: '#e5e7eb'},
                    },
                },
            },
        });
    }

    function parseFechaCaso(caso) {
        // Fecha del caso (la que diligencia Inspección), no createdAt del sistema.
        var raw = caso.cFechaCaso || caso.createdAt;

        if (!raw) {
            return null;
        }

        var texto = String(raw).trim();
        var partes = texto.split(/[T ]/)[0].split('-');

        if (partes.length !== 3) {
            return null;
        }

        var anio = parseInt(partes[0], 10);
        var mes = parseInt(partes[1], 10) - 1;
        var dia = parseInt(partes[2], 10);
        var d = new Date(anio, mes, dia);

        if (isNaN(d.getTime())) {
            return null;
        }

        return d;
    }

    function claveDia(d) {
        var mes = String(d.getMonth() + 1);
        var dia = String(d.getDate());

        if (mes.length < 2) {
            mes = '0' + mes;
        }

        if (dia.length < 2) {
            dia = '0' + dia;
        }

        return d.getFullYear() + '-' + mes + '-' + dia;
    }

    function etiquetaDia(clave) {
        var p = clave.split('-');

        return p[2] + '/' + p[1];
    }

    function agruparPorDia(casos) {
        var dias = {};

        casos.forEach(function (c) {
            var d = parseFechaCaso(c);

            if (!d) {
                return;
            }

            var clave = claveDia(d);

            dias[clave] = (dias[clave] || 0) + 1;
        });

        var keys = Object.keys(dias).sort();

        if (!keys.length) {
            return {etiquetas: [], valores: []};
        }

        var inicio = new Date(keys[0] + 'T00:00:00');
        var fin = new Date(keys[keys.length - 1] + 'T00:00:00');
        var cursor = new Date(inicio);
        var rango = [];

        while (cursor <= fin) {
            rango.push(claveDia(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }

        return {
            etiquetas: rango.map(etiquetaDia),
            valores: rango.map(function (k) {
                return dias[k] || 0;
            }),
        };
    }

    function ajustarAlturaIframe() {
        if (window.parent === window) {
            return;
        }

        var root = document.querySelector('.dashboard');
        var height = root ? Math.ceil(root.getBoundingClientRect().height) + 16 : 0;

        if (!height || height < 200) {
            height = Math.ceil(document.documentElement.scrollHeight);
        }

        window.parent.postMessage({
            type: 'crm-dashboard-height',
            height: height,
        }, window.location.origin);
    }

    window.addEventListener('load', ajustarAlturaIframe);

    window.addEventListener('message', function (event) {
        if (event.origin !== window.location.origin) {
            return;
        }

        if (event.data && event.data.type === 'crm-dashboard-resize-request') {
            ajustarAlturaIframe();
        }
    });

    if (typeof ResizeObserver !== 'undefined') {
        document.addEventListener('DOMContentLoaded', function () {
            var dash = document.querySelector('.dashboard');

            if (!dash) {
                return;
            }

            new ResizeObserver(function () {
                ajustarAlturaIframe();
            }).observe(dash);
        });
    }

    var params = new URLSearchParams(window.location.search);
    var assignedUserId = params.get('assignedUserId') || '';
    var dashboardProfile = params.get('profile') || 'gestion';

    function buildReporteUrl(format) {
        var url = '/?entryPoint=ReporteGerencial&format=' + encodeURIComponent(format);

        if (assignedUserId) {
            url += '&assignedUserId=' + encodeURIComponent(assignedUserId);
        }

        return url;
    }

    function bindReporteButtons() {
        var btnPdf = document.getElementById('btn-reporte-pdf');
        var btnExcel = document.getElementById('btn-reporte-excel');

        if (btnPdf) {
            btnPdf.addEventListener('click', function () {
                window.open(buildReporteUrl('pdf'), '_blank');
            });
        }

        if (btnExcel) {
            btnExcel.addEventListener('click', function () {
                window.open(buildReporteUrl('xlsx'), '_blank');
            });
        }
    }

    bindReporteButtons();

    var profileSubtitles = {
        radicacion: 'Secretaría de Medio Ambiente — Radicación',
        asignador: 'Secretaría de Medio Ambiente — Asignación de casos',
        patrullero: 'Secretaría de Medio Ambiente — Mis casos asignados',
        gestion: 'Secretaría de Medio Ambiente — Gestión de Casos',
    };
    var subtitleEl = document.querySelector('.dashboard-header__sub');

    if (subtitleEl) {
        subtitleEl.textContent = profileSubtitles[dashboardProfile] || profileSubtitles.gestion;
    }

    var FILTERS = {periodo: 'all', fechaDesde: '', fechaHasta: '', estado: '', recurso: '', barrio: '', responsable: ''};
    var FILTER_FIELDS = {
        estado: {id: 'filtro-estado', label: 'Todos los estados', get: function (c) { return String(c.status || '').trim(); }},
        recurso: {id: 'filtro-recurso', label: 'Todos los recursos', get: function (c) { return claveRecurso(c); }},
        barrio: {id: 'filtro-barrio', label: 'Todos los barrios', get: function (c) {
            var value = String(c.cBarrioPeticionario || '').trim();
            return value === 'Seleccione una opción' ? '' : value;
        }},
        responsable: {id: 'filtro-responsable', label: 'Todos los responsables', get: function (c) {
            return String(c.assignedUserName || c.assignedUserId || '').trim() || 'Sin asignar';
        }},
    };
    var CHART_IDS = ['grafica-visitas', 'grafica-decisiones', 'grafica-competencia', 'grafica-semaforo', 'grafica-canal', 'grafica-recurso', 'grafica-tiempo', 'grafica-barrio', 'grafica-radicados-dia', 'grafica-sin-asignar',
        'grafica-tendencia', 'grafica-etapas', 'grafica-carga', 'grafica-exp-paso', 'grafica-ruta', 'grafica-audiencias', 'grafica-recursos', 'grafica-medidas', 'grafica-multas'];

    function resetChartSurface(canvasId) {
        var canvas = document.getElementById(canvasId);

        if (!canvas) {
            return;
        }

        var chart = Chart.getChart(canvas);

        if (chart) {
            chart.destroy();
        }

        canvas.style.display = '';
        var empty = canvas.parentElement.querySelector('.dashboard-chart-empty');

        if (empty) {
            empty.remove();
        }
    }

    function resetDashboardCharts() {
        CHART_IDS.forEach(resetChartSurface);
    }

    function matchesPeriod(caso, period) {
        if (period === 'all') {
            return true;
        }

        var closed = ESTADOS_FIN.indexOf(caso.status) !== -1;
        var signal = semaforo(caso);

        if (period === 'overdue') {
            return !closed && signal === 'Vencido';
        }

        if (period === 'upcoming') {
            return !closed && signal === 'Próximo a vencer';
        }

        return period === 'without-date' && !caso.cFechaVencimiento;
    }

    function filterCases(cases, filters, skipKey) {
        return cases.filter(function (caseItem) {
            if (skipKey !== 'periodo' && !matchesPeriod(caseItem, filters.periodo)) {
                return false;
            }

            var caseDate = parseFechaCaso(caseItem);
            var caseDateKey = caseDate ? claveDia(caseDate) : '';

            if (filters.fechaDesde && (!caseDateKey || caseDateKey < filters.fechaDesde)) {
                return false;
            }

            if (filters.fechaHasta && (!caseDateKey || caseDateKey > filters.fechaHasta)) {
                return false;
            }

            return Object.keys(FILTER_FIELDS).every(function (key) {
                if (key === skipKey || !filters[key]) {
                    return true;
                }

                return FILTER_FIELDS[key].get(caseItem) === filters[key];
            });
        });
    }

    function populateFilter(cases, key) {
        var cfg = FILTER_FIELDS[key];
        var select = document.getElementById(cfg.id);

        if (!select) {
            return;
        }

        var values = {};
        filterCases(cases, FILTERS, key).forEach(function (caseItem) {
            var value = cfg.get(caseItem);

            if (value) {
                values[value] = true;
            }
        });

        var sorted = Object.keys(values).sort(function (a, b) { return a.localeCompare(b, 'es'); });

        if (FILTERS[key] && !values[FILTERS[key]]) {
            FILTERS[key] = '';
        }

        select.innerHTML = '';
        var all = document.createElement('option');
        all.value = '';
        all.textContent = cfg.label;
        select.appendChild(all);
        sorted.forEach(function (value) {
            var option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });
        select.value = FILTERS[key];
        select.disabled = sorted.length === 0;
    }

    function updateNestedFilters(cases) {
        Object.keys(FILTER_FIELDS).forEach(function (key) { populateFilter(cases, key); });
        var clear = document.getElementById('limpiar-filtros');
        var summary = document.getElementById('filtros-resumen');
        var filtered = filterCases(cases, FILTERS);
        var active = FILTERS.periodo !== 'all' || !!FILTERS.fechaDesde || !!FILTERS.fechaHasta
            || Object.keys(FILTER_FIELDS).some(function (key) { return !!FILTERS[key]; });

        if (clear) {
            clear.disabled = !active;
        }

        if (summary) {
            summary.textContent = filtered.length + ' de ' + cases.length + ' caso(s) en la selección.';
        }

        return filtered;
    }

    function renderDashboard(casos) {
        resetDashboardCharts();
        window.crmDashboardCases = casos;
        window.dispatchEvent(new CustomEvent('crm-dashboard-cases', {detail: {casos: casos}}));

        var pendiente = 0;
        var enGestion = 0;
        var finalizados = 0;
        var vencidos = 0;
        var proximos = 0;

        casos.forEach(function (c) {
            if (c.status === 'Pendiente de radicacion') { pendiente++; }
            if (ESTADOS_FIN.indexOf(c.status) !== -1) { finalizados++; } else if (ESTADOS_GESTION.indexOf(c.status) !== -1) { enGestion++; }
            if (ESTADOS_FIN.indexOf(c.status) !== -1) { return; }
            var sem = semaforo(c);
            if (sem === 'Vencido') { vencidos++; }
            if (sem === 'Próximo a vencer') { proximos++; }
        });

        document.getElementById('kpi-total').textContent = casos.length;
        document.getElementById('kpi-pendiente').textContent = pendiente;
        document.getElementById('kpi-gestion').textContent = enGestion;
        document.getElementById('kpi-finalizados').textContent = finalizados;
        document.getElementById('kpi-vencidos').textContent = vencidos;
        document.getElementById('kpi-proximos').textContent = proximos;
        document.getElementById('total-casos').textContent = 'Total: ' + casos.length;

        var flujo = calcularFlujo(casos);
        setKpi('kpi-competencia', flujo.competenciaPendiente);
        setKpi('kpi-visitas-pendientes', flujo.visitasPendientes, 'gestion');
        setKpi('kpi-visitas-realizadas', flujo.visitasRealizadas, 'actas');
        setKpi('kpi-por-definir', flujo.porDefinir, 'actas');
        setKpi('kpi-por-finalizar', flujo.porFinalizar);
        setKpi('kpi-remisiones', flujo.remisionesSinEnviar, 'remisiones');

        var badgeVisitas = document.getElementById('badge-visitas');
        if (badgeVisitas) { badgeVisitas.textContent = flujo.visitasRealizadas + ' realizada(s)'; }

        if (!APOYO.listo || APOYO.sinAcceso.actas) {
            mensajeVacio('grafica-visitas', APOYO.listo ? 'Sin acceso a las actas de visita.' : 'Cargando visitas…');
            mensajeVacio('grafica-decisiones', APOYO.listo ? 'Sin acceso a las actas de visita.' : 'Cargando decisiones…');
        } else {
            if (!(flujo.visitasPendientes + flujo.actasSinRevisar + flujo.actasRevisadas)) {
                mensajeVacio('grafica-visitas', 'Aún no hay visitas.');
            } else {
                dibujarDonut('grafica-visitas', ['Pendientes', 'Realizadas sin revisar', 'Revisadas'],
                    [flujo.visitasPendientes, flujo.actasSinRevisar, flujo.actasRevisadas], ['#f2c37e', '#9eb5c8', '#9ec4a8']);
            }

            var DECISIONES = ['Visita complementaria', 'Cierre de atención', 'Remisión por competencia', 'Apertura de actuación'];
            if (!flujo.actasRevisadas) {
                mensajeVacio('grafica-decisiones', 'Aún no hay revisiones de hallazgos.');
            } else {
                dibujarBarrasHorizontales('grafica-decisiones', DECISIONES, DECISIONES.map(function (d) { return flujo.decisiones[d] || 0; }));
            }
        }

        var COMPETENCIAS = ['Total', 'Parcial', 'Ninguna', 'Por revisar'];
        var totalCompetencia = COMPETENCIAS.reduce(function (sum, k) { return sum + (flujo.competencia[k] || 0); }, 0);
        if (!totalCompetencia) { mensajeVacio('grafica-competencia', 'Aún no hay casos radicados.'); } else {
            dibujarDonut('grafica-competencia', COMPETENCIAS, COMPETENCIAS.map(function (k) { return flujo.competencia[k] || 0; }),
                ['#9ec4a8', '#d4c48a', '#c9a0a0', '#c5ccd3']);
        }

        var kpiPolicivo = document.getElementById('kpi-policivo');
        if (kpiPolicivo) {
            if (casosPolicivoIds === null) {
                kpiPolicivo.textContent = '–';
            } else {
                var policivos = casos.filter(function (c) { return !!casosPolicivoIds[c.id]; }).length;
                kpiPolicivo.textContent = policivos;
            }
        }

        dibujarEmbudo('grafica-embudo', agrupar(casos, function (c) { return normalizarEstadoEmbudo(c.status || 'Sin estado'); }));
        var ds = ordenarDesc(agrupar(casos.filter(function (c) { return ESTADOS_FIN.indexOf(c.status) === -1; }), semaforo));
        dibujarDonut('grafica-semaforo', ds.etiquetas, ds.valores, ds.etiquetas.map(function (e) { return COLORES_SEMAFORO[e] || '#9ca3af'; }));

        var porCanal = agruparPorCanal(casos);
        if (!porCanal.valores.reduce(function (sum, n) { return sum + n; }, 0)) { mensajeVacio('grafica-canal', 'Sin datos de canal de reporte.'); } else {
            dibujarDonut('grafica-canal', porCanal.etiquetas, porCanal.valores, porCanal.etiquetas.map(function (e) { return COLORES_CANAL[e] || '#9ca3af'; }));
        }

        var porRecurso = agruparPorRecurso(casos);
        dibujarBarras('grafica-recurso', porRecurso.etiquetas, porRecurso.valores, {tooltips: porRecurso.tooltips, etiquetaDataset: 'Casos por recurso'});
        var porDia = agruparPorDia(casos);
        if (!porDia.etiquetas.length) { mensajeVacio('grafica-tiempo', 'Sin fechas de caso para mostrar.'); } else {
            dibujarBarras('grafica-tiempo', porDia.etiquetas, porDia.valores, {etiquetaDataset: 'Ingreso diario', coloresPorValor: {r: 158, g: 181, b: 198}, borderRadiusBarra: {topLeft: 8, topRight: 8, bottomLeft: 2, bottomRight: 2}, maxBarThickness: 48, unidad: 'caso(s)', ticksX: 11, rotacionX: 45});
        }

        var porBarrio = topN(agrupar(casos, function (c) { return etiquetaBarrio(c.cBarrioPeticionario); }), 8);
        if (!porBarrio.etiquetas.length) { mensajeVacio('grafica-barrio', 'Sin datos de barrio.'); } else { dibujarBarrasHorizontales('grafica-barrio', porBarrio.etiquetas, porBarrio.valores); }

        var casosRadicados = casos.filter(tieneRadicado);
        var porDiaRadicados = agruparPorDia(casosRadicados);
        if (!porDiaRadicados.etiquetas.length) { mensajeVacio('grafica-radicados-dia', 'Aún no hay casos radicados.'); } else {
            dibujarBarras('grafica-radicados-dia', porDiaRadicados.etiquetas, porDiaRadicados.valores, {etiquetaDataset: 'Radicados por día', colorBarra: '#9eb5c8', unidad: 'radicado(s)', ticksX: 11, rotacionX: 45});
        }

        var casosActivos = casos.filter(function (c) { return ESTADOS_FIN.indexOf(c.status) === -1; });
        var radicadosActivos = casosActivos.filter(tieneRadicado);
        var sinRadicado = casosActivos.length - radicadosActivos.length;
        var asignados = radicadosActivos.filter(function (c) { return !!c.assignedUserId; }).length;
        var sinAsignar = radicadosActivos.length - asignados;
        var badge = document.getElementById('badge-sin-asignar');
        if (badge) {
            badge.textContent = sinAsignar > 0
                ? sinAsignar + ' sin asignar'
                : (sinRadicado > 0 ? sinRadicado + ' sin radicado' : 'Todos asignados');
            badge.className = 'badge ' + (sinAsignar > 0 || sinRadicado > 0 ? 'badge--alerta' : 'badge--azul');
        }
        if (!casosActivos.length) { mensajeVacio('grafica-sin-asignar', 'No hay casos activos para asignar.'); } else {
            dibujarPolar('grafica-sin-asignar', ['Con patrullero', 'Sin asignar', 'Sin radicado'], [asignados, sinAsignar, sinRadicado], ['rgba(158, 184, 168, 0.78)', 'rgba(197, 204, 211, 0.85)', 'rgba(242, 195, 126, 0.9)']);
        }

        renderLectura(casos);

        ajustarAlturaIframe();
        setTimeout(ajustarAlturaIframe, 250);
    }

    /* ── Proceso de Policía, tiempos por etapa y lectura del tablero ── */

    var DATOS_PROCESO = null;

    function fetchDatosProceso() {
        return fetch('/api/v1/Case/action/dashboardProceso', {credentials: 'include'})
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (data) { DATOS_PROCESO = data || {tiempos: [], proceso: null}; })
            .catch(function () { DATOS_PROCESO = {tiempos: [], proceso: null}; });
    }

    function hoyClave() {
        var d = new Date();

        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    function diasEntre(a, b) {
        if (!a || !b) { return null; }
        var d = (new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000;

        return isNaN(d) || d < 0 ? null : d;
    }

    function promedio(lista) {
        var v = lista.filter(function (x) { return x !== null; });

        return v.length ? Math.round(v.reduce(function (s, x) { return s + x; }, 0) / v.length * 10) / 10 : null;
    }

    function pesos(n) {
        return '$ ' + Math.round(n || 0).toLocaleString('es-CO');
    }

    function textoKpi(id, valor) {
        var el = document.getElementById(id);

        if (el) { el.textContent = valor === null || valor === undefined ? '–' : valor; }
    }

    function insight(id, html) {
        var el = document.getElementById(id);

        if (el) { el.innerHTML = html; }
    }

    function dibujarSeries(canvasId, etiquetas, series) {
        return new Chart(document.getElementById(canvasId), {
            type: 'line',
            data: {
                labels: etiquetas,
                datasets: series.map(function (s) {
                    return {label: s.label, data: s.data, borderColor: s.color, backgroundColor: s.fondo || 'transparent', fill: !!s.fondo, tension: 0.3, pointRadius: 3, borderWidth: 2};
                }),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {legend: {display: true, position: 'bottom', labels: {boxWidth: 12, font: {family: 'Inter, sans-serif'}}}},
                scales: {
                    x: {grid: {display: false}, ticks: {color: '#64748b', font: {family: 'Inter, sans-serif'}}},
                    y: {beginAtZero: true, ticks: {precision: 0, color: '#94a3b8'}, grid: {color: '#f1f5f9'}},
                },
            },
        });
    }

    var MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    function renderLectura(casos) {
        var datos = DATOS_PROCESO || {tiempos: [], proceso: null};
        var ids = {};
        casos.forEach(function (c) { ids[c.id] = true; });
        var tiempos = (datos.tiempos || []).filter(function (t) { return ids[t.caseId]; });
        var tPorCaso = {};
        tiempos.forEach(function (t) { tPorCaso[t.caseId] = t; });
        var hoy = hoyClave();
        var activos = casos.filter(function (c) { return ESTADOS_FIN.indexOf(c.status) === -1; });

        /* 1 · Ingreso */
        var radicados = casos.filter(tieneRadicado).length;
        var mesActual = hoy.slice(0, 7);
        var mesPrevio = (function () { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); })();
        var claveMes = function (c) { var f = parseFechaCaso(c); return f ? f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0') : null; };
        var esteMes = casos.filter(function (c) { return claveMes(c) === mesActual; }).length;
        var mesAnterior = casos.filter(function (c) { return claveMes(c) === mesPrevio; }).length;
        textoKpi('kpi-radicados', radicados);
        textoKpi('kpi-mes', esteMes);
        var conDato = function (e) { return e && !/^sin /i.test(e); };
        var canalTop = ordenarDesc(agrupar(casos.filter(function (c) { return conDato(claveCanal(c)); }), claveCanal));
        var recursoTop = ordenarDesc(agrupar(casos.filter(function (c) { return conDato(claveRecurso(c)); }), claveRecurso));
        insight('insight-ingreso', '<b>' + esteMes + '</b> caso(s) este mes' + (mesAnterior ? ' frente a <b>' + mesAnterior + '</b> el mes anterior' : '') + '.'
            + (canalTop.etiquetas.length ? ' Canal más usado: <b>' + canalTop.etiquetas[0] + '</b>.' : '')
            + (recursoTop.etiquetas.length ? ' Recurso más afectado: <b>' + recursoTop.etiquetas[0] + '</b>.' : ''));

        /* 2 · Competencia y asignación */
        var radicadosActivos = activos.filter(tieneRadicado);
        var sinResp = radicadosActivos.filter(function (c) { return !c.assignedUserId; }).length;
        textoKpi('kpi-sin-asignar', sinResp);
        var diasAsig = promedio(tiempos.map(function (t) { return diasEntre(t.radicado, t.asignado); }));
        textoKpi('kpi-dias-asignacion', diasAsig);
        var carga = topN(agrupar(activos.filter(function (c) { return !!c.assignedUserId; }), function (c) { return c.assignedUserName || 'Sin nombre'; }), 10);
        if (!carga.etiquetas.length) { mensajeVacio('grafica-carga', 'No hay casos activos asignados.'); } else { dibujarBarrasHorizontales('grafica-carga', carga.etiquetas, carga.valores); }
        insight('insight-asignacion', (sinResp ? '<b>' + sinResp + '</b> caso(s) radicado(s) esperan responsable. ' : 'Todos los casos radicados activos tienen responsable. ')
            + (diasAsig !== null ? 'La asignación tarda en promedio <b>' + diasAsig + '</b> día(s) desde la radicación.' : '')
            + (carga.etiquetas.length ? ' Mayor carga: <b>' + carga.etiquetas[0] + '</b> (' + carga.valores[0] + ').' : ''));

        /* 3 · Gestión técnica */
        var diasVisita = promedio(tiempos.map(function (t) { return diasEntre(t.asignado, t.visita); }));
        textoKpi('kpi-dias-visita', diasVisita);
        var visPend = document.getElementById('kpi-visitas-pendientes');
        insight('insight-tecnica', '<b>' + (visPend ? visPend.textContent : '–') + '</b> visita(s) pendiente(s).'
            + (diasVisita !== null ? ' Entre la asignación y la visita pasan en promedio <b>' + diasVisita + '</b> día(s).' : ''));

        /* 4 · Definición y cierre */
        var diasCierre = promedio(tiempos.map(function (t) { return diasEntre(t.registro, t.finalizado); }));
        textoKpi('kpi-dias-cierre', diasCierre);
        var flujo = calcularFlujo(casos);
        var totalDec = Object.keys(flujo.decisiones || {}).reduce(function (s, k) { return s + flujo.decisiones[k]; }, 0);
        var aperturas = (flujo.decisiones || {})['Apertura de actuación'] || 0;
        insight('insight-definicion', (totalDec ? '<b>' + Math.round(aperturas / totalDec * 100) + ' %</b> de las revisiones terminó en apertura de actuación. ' : '')
            + '<b>' + flujo.porDefinir + '</b> por definir y <b>' + flujo.porFinalizar + '</b> por finalizar.'
            + (diasCierre !== null ? ' Un caso tarda en promedio <b>' + diasCierre + '</b> día(s) en cerrarse.' : ''));

        /* 6 · Oportunidad */
        var finConFecha = tiempos.filter(function (t) { return t.finalizado && t.vencimiento; });
        var aTiempo = finConFecha.filter(function (t) { return t.finalizado <= t.vencimiento; }).length;
        var pctATiempo = finConFecha.length ? Math.round(aTiempo / finConFecha.length * 100) : null;
        textoKpi('kpi-a-tiempo', pctATiempo === null ? '–' : pctATiempo + ' %');
        var vencidos = document.getElementById('kpi-vencidos');
        insight('insight-oportunidad', '<b>' + (vencidos ? vencidos.textContent : '–') + '</b> caso(s) vencido(s) sin cerrar.'
            + (pctATiempo !== null ? ' El <b>' + pctATiempo + ' %</b> de los finalizados respondió antes de su fecha límite.' : ''));

        /* Panorama · tendencia y tiempos por etapa */
        var meses = {};
        casos.forEach(function (c) { var m = claveMes(c); if (m) { meses[m] = meses[m] || {i: 0, f: 0}; meses[m].i++; } });
        tiempos.forEach(function (t) { if (t.finalizado) { var m = t.finalizado.slice(0, 7); meses[m] = meses[m] || {i: 0, f: 0}; meses[m].f++; } });
        var claves = Object.keys(meses).sort().slice(-12);
        if (!claves.length) { mensajeVacio('grafica-tendencia', 'Sin fechas para la tendencia.'); } else {
            dibujarSeries('grafica-tendencia', claves.map(function (k) { return MESES_CORTOS[Number(k.slice(5)) - 1] + ' ' + k.slice(2, 4); }), [
                {label: 'Ingresados', data: claves.map(function (k) { return meses[k].i; }), color: '#1f6a8a', fondo: 'rgba(31, 106, 138, 0.08)'},
                {label: 'Finalizados', data: claves.map(function (k) { return meses[k].f; }), color: '#1d8a6e'},
            ]);
        }

        var etapas = [
            ['Registro → radicación', 'registro', 'radicado'],
            ['Radicación → asignación', 'radicado', 'asignado'],
            ['Asignación → visita', 'asignado', 'visita'],
            ['Visita → definición', 'visita', 'definicion'],
            ['Definición → cierre', 'definicion', 'finalizado'],
        ];
        var prom = etapas.map(function (e) { return promedio(tiempos.map(function (t) { return diasEntre(t[e[1]], t[e[2]]); })); });
        if (!prom.some(function (x) { return x !== null; })) { mensajeVacio('grafica-etapas', 'Aún no hay etapas completas para medir.'); } else {
            dibujarBarras('grafica-etapas', etapas.map(function (e) { return e[0]; }), prom.map(function (x) { return x || 0; }), {etiquetaDataset: 'Días promedio', unidad: 'día(s)', colorBarra: '#9eb5c8'});
        }

        /* 5 · Proceso de Policía */
        var pr = datos.proceso;
        var historiaProceso = '';

        if (!pr) {
            ['grafica-exp-paso', 'grafica-ruta', 'grafica-audiencias', 'grafica-recursos', 'grafica-medidas', 'grafica-multas'].forEach(function (id) { mensajeVacio(id, 'Cargando el proceso…'); });
        } else {
            var exps = (pr.expedientes || []).filter(function (e) { return e.casos.some(function (id) { return ids[id]; }); });
            var expIds = {};
            exps.forEach(function (e) { expIds[e.id] = true; });
            var enExp = function (x) { return expIds[x.expedienteId]; };
            var auds = (pr.audiencias || []).filter(enExp);
            var meds = (pr.medidas || []).filter(enExp);
            var mults = (pr.multas || []).filter(enExp);
            var recs = (pr.recursos || []).filter(enExp);
            var ords = (pr.ordenes || []).filter(enExp);
            var en7 = (function () { var d = new Date(); d.setDate(d.getDate() + 7); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
            var abiertos = exps.filter(function (e) { return e.estado !== 'Archivado'; });
            var remitido = mults.reduce(function (s, m) { return s + m.valor; }, 0);
            var recaudado = mults.filter(function (m) { return m.estado === 'Pagada'; }).reduce(function (s, m) { return s + m.valor; }, 0);
            var coactivo = mults.filter(function (m) { return m.estado === 'En cobro coactivo'; }).reduce(function (s, m) { return s + m.valor; }, 0);

            textoKpi('kpi-exp-abiertos', abiertos.length);
            textoKpi('kpi-exp-vencidos', abiertos.filter(function (e) { return e.vencido; }).length);
            textoKpi('kpi-audiencias-proximas', auds.filter(function (a) { return a.estado === 'Programada' && a.fecha >= hoy && a.fecha <= en7; }).length);
            textoKpi('kpi-medidas', meds.length);
            textoKpi('kpi-multas', pesos(remitido));
            textoKpi('kpi-recaudo', pesos(recaudado));
            textoKpi('kpi-ordenes-incumplidas', ords.filter(function (o) { return o.estado === 'Incumplida'; }).length);
            textoKpi('kpi-rnmc', meds.filter(function (m) { return !m.rnmc; }).length);
            textoKpi('kpi-archivados', exps.filter(function (e) { return e.estado === 'Archivado'; }).length);

            var corto = function (t) { return String(t || '').replace(/^Decisión: /, 'Decisión: ').replace(/ de la orden o medida$/, '').replace(/^Apertura de expediente$/, 'Apertura (preparación)'); };
            var porPaso = (pr.pasos || []).map(function (p) { return exps.filter(function (e) { return e.paso === p; }).length; });
            if (!exps.length) {
                ['grafica-exp-paso', 'grafica-ruta', 'grafica-audiencias', 'grafica-recursos', 'grafica-medidas', 'grafica-multas'].forEach(function (id) { mensajeVacio(id, 'Aún no hay expedientes.'); });
            } else {
                dibujarBarrasHorizontales('grafica-exp-paso', (pr.pasos || []).map(corto), porPaso);
                var rutaCorta = function (r) {
                    r = String(r || '');
                    if (/Abreviado/.test(r)) { return 'PVA · Convivencia'; }
                    if (/Recursos Naturales/.test(r)) { return 'Recursos Naturales'; }
                    if (/animales/.test(r)) { return 'Convivencia con animales'; }
                    if (/Maltrato/.test(r)) { return 'Maltrato animal'; }
                    if (/Sancionatorio/.test(r)) { return 'Sancionatorio (anterior)'; }
                    if (/Código de policía/.test(r)) { return 'Policía (anterior)'; }
                    return r || 'Sin ruta';
                };
                var rutas = ordenarDesc(agrupar(exps, function (e) { return rutaCorta(e.ruta); }));
                dibujarDonut('grafica-ruta', rutas.etiquetas, rutas.valores, ['#9ec4a8', '#9eb5c8', '#d4c48a', '#c9a0a0', '#c5ccd3']);

                var catAud = function (a) {
                    if (a.estado === 'Completa documentalmente') { return 'Realizada'; }
                    if (a.estado === 'Pendiente de soportes') { return 'Realizada, sin soportes'; }
                    if (a.suspension === 'Primera inasistencia') { return 'Inasistencia'; }
                    if (a.suspension === 'Prueba o actuación externa') { return 'Suspendida por prueba'; }
                    if (a.suspension) { return 'Aplazada'; }
                    return a.estado === 'Programada' ? 'Programada' : a.estado;
                };
                var ca = ordenarDesc(agrupar(auds, catAud));
                if (!auds.length) { mensajeVacio('grafica-audiencias', 'Aún no hay audiencias.'); } else { dibujarDonut('grafica-audiencias', ca.etiquetas, ca.valores, ['#9ec4a8', '#f2c37e', '#c9a0a0', '#9eb5c8', '#d4c48a', '#c5ccd3']); }

                var cr = ordenarDesc(agrupar(recs, function (r) { return r.resultado; }));
                if (!recs.length) { mensajeVacio('grafica-recursos', 'No se han interpuesto recursos.'); } else { dibujarDonut('grafica-recursos', cr.etiquetas, cr.valores, ['#9ec4a8', '#d4c48a', '#c9a0a0', '#c5ccd3', '#9eb5c8']); }

                var cm = ordenarDesc(agrupar(meds, function (m) { return m.tipo; }));
                if (!meds.length) { mensajeVacio('grafica-medidas', 'Aún no hay medidas impuestas.'); } else { dibujarBarras('grafica-medidas', cm.etiquetas, cm.valores, {etiquetaDataset: 'Medidas', unidad: 'medida(s)', colorBarra: '#b8a3d6'}); }

                if (!mults.length) { mensajeVacio('grafica-multas', 'Aún no hay multas remitidas a Tesorería.'); } else {
                    var millones = function (v) { return Math.round(v / 100000) / 10; };
                    dibujarBarras('grafica-multas', ['Remitido', 'Recaudado', 'En cobro coactivo', 'Por recaudar'],
                        [millones(remitido), millones(recaudado), millones(coactivo), millones(Math.max(0, remitido - recaudado - coactivo))],
                        {etiquetaDataset: 'Millones de pesos', unidad: 'millones', colores: ['#9eb5c8', '#9ec4a8', '#c9a0a0', '#f2c37e'], maxBarThickness: 90});
                }
            }

            var pasoMayor = porPaso.length ? (pr.pasos || [])[porPaso.indexOf(Math.max.apply(null, porPaso))] : null;
            insight('insight-proceso', exps.length
                ? '<b>' + abiertos.length + '</b> expediente(s) abierto(s)' + (pasoMayor && Math.max.apply(null, porPaso) > 0 ? '; el paso con más expedientes es <b>' + corto(pasoMayor) + '</b>' : '')
                    + '. <b>' + meds.length + '</b> medida(s) impuesta(s)' + (remitido ? ', <b>' + pesos(recaudado) + '</b> recaudado de <b>' + pesos(remitido) + '</b> remitido.' : '.')
                : 'Aún no hay expedientes abiertos en los casos filtrados.');
            historiaProceso = exps.length ? '<b>' + exps.length + '</b> caso(s) llegaron a proceso de Policía; <b>' + exps.filter(function (e) { return e.estado === 'Archivado'; }).length + '</b> ya están archivados.' : '';
        }

        /* Panorama · historia */
        var items = [];
        items.push('<li>Hay <b>' + casos.length + '</b> caso(s): <b>' + activos.length + '</b> activo(s) y <b>' + (casos.length - activos.length) + '</b> cerrado(s).</li>');
        var vencNum = Number((document.getElementById('kpi-vencidos') || {}).textContent) || 0;
        items.push('<li' + (vencNum ? ' class="is-alerta"' : '') + '><b>' + vencNum + '</b> vencido(s) y <b>' + ((document.getElementById('kpi-proximos') || {}).textContent || 0) + '</b> por vencer en 3 días.</li>');
        var lentaIdx = prom.reduce(function (best, x, i) { return x !== null && (best === -1 || x > prom[best]) ? i : best; }, -1);
        if (lentaIdx !== -1) { items.push('<li>La etapa más lenta es <b>' + etapas[lentaIdx][0] + '</b>: ' + prom[lentaIdx] + ' día(s) en promedio.</li>'); }
        if (historiaProceso) { items.push('<li>' + historiaProceso + '</li>'); }
        if (pctATiempo !== null) { items.push('<li' + (pctATiempo < 80 ? ' class="is-alerta"' : '') + '>El <b>' + pctATiempo + ' %</b> de los casos finalizados respondió a tiempo.</li>'); }
        var hist = document.getElementById('dash-historia');
        if (hist) { hist.innerHTML = items.join(''); }
    }

    function bindDashboardFilters(cases) {
        document.getElementById('filtro-periodo').addEventListener('change', function (event) { FILTERS.periodo = event.target.value; renderDashboard(updateNestedFilters(cases)); });
        document.getElementById('filtro-fecha-desde').addEventListener('change', function (event) { FILTERS.fechaDesde = event.target.value; renderDashboard(updateNestedFilters(cases)); });
        document.getElementById('filtro-fecha-hasta').addEventListener('change', function (event) { FILTERS.fechaHasta = event.target.value; renderDashboard(updateNestedFilters(cases)); });
        Object.keys(FILTER_FIELDS).forEach(function (key) {
            document.getElementById(FILTER_FIELDS[key].id).addEventListener('change', function (event) { FILTERS[key] = event.target.value; renderDashboard(updateNestedFilters(cases)); });
        });
        document.getElementById('limpiar-filtros').addEventListener('click', function () {
            FILTERS = {periodo: 'all', fechaDesde: '', fechaHasta: '', estado: '', recurso: '', barrio: '', responsable: ''};
            document.getElementById('filtro-periodo').value = 'all';
            document.getElementById('filtro-fecha-desde').value = '';
            document.getElementById('filtro-fecha-hasta').value = '';
            renderDashboard(updateNestedFilters(cases));
        });
    }

    var fetchUrl = '/api/v1/Case?select=cRecursoTema,cCanalDeReportePeticionario,status,assignedUserId,assignedUserName,createdAt,cFechaCaso,cFechaVencimiento,cNumeroRadicado,cExpediente,cNombrePeticionario,cApellidoPeticionario,cBarrioPeticionario,cCompetencia,cCompetenciaConfirmada'
        + '&maxSize=200&orderBy=cFechaCaso&order=desc';

    if (assignedUserId) {
        fetchUrl += '&where[0][type]=equals&where[0][attribute]=assignedUserId&where[0][value]='
            + encodeURIComponent(assignedUserId);
    }

    fetchCasosPolicivoIds().then(function () {
        if (window.crmDashboardCases && window.crmDashboardCases.length) {
            renderDashboard(updateNestedFilters(window.crmDashboardCases));
        }
    });

    fetchExpedientesResumen().then(renderPolicivosSeccion);

    fetchDatosProceso().then(function () {
        if (window.crmDashboardCases && window.crmDashboardCases.length) {
            renderDashboard(updateNestedFilters(window.crmDashboardCases));
        }
    });

    fetchDatosApoyo().then(function () {
        if (window.crmDashboardCases && window.crmDashboardCases.length) {
            renderDashboard(window.crmDashboardCases);
        }
    });

    // Todas las páginas de casos (la API entrega hasta 200 por consulta).
    var fetchTodosLosCasos = function () {
        var todos = [];
        var pagina = function (offset) {
            return fetch(fetchUrl + '&offset=' + offset, {credentials: 'include'}).then(function (res) {
                if (!res.ok) { return res; }

                return res.json().then(function (data) {
                    todos = todos.concat(data.list || []);

                    if ((data.list || []).length === 200 && todos.length < (data.total || 0) && todos.length < 5000) {
                        return pagina(offset + 200);
                    }

                    return {ok: true, json: function () { return Promise.resolve({list: todos, total: todos.length}); }};
                });
            });
        };

        return pagina(0);
    };

    fetchTodosLosCasos()
        .then(function (res) {
            if (!res.ok) {
                if (res.status === 403) {
                    throw new Error('API 403 — sin permiso para leer casos. Asigne rol (Inspección, Radicación, etc.) en Administración → Usuarios.');
                }

                throw new Error('API ' + res.status);
            }

            return res.json();
        })
        .then(function (data) {
            var casos = data.list || [];
            var total = data.total != null ? data.total : casos.length;

            if (!casos.length) {
                window.crmDashboardCases = [];
                window.dispatchEvent(new CustomEvent('crm-dashboard-cases', {detail: {casos: []}}));
                document.getElementById('filtros-resumen').textContent = 'No hay casos para filtrar.';
                estado.textContent = dashboardProfile === 'radicacion'
                    ? 'Aún no hay casos visibles para su perfil de radicación.'
                    : 'Aún no hay casos registrados.';
                hideDashboardLoading();
                ajustarAlturaIframe();
                return;
            }

            estado.classList.add('oculto');
            bindDashboardFilters(casos);
            renderDashboard(updateNestedFilters(casos));
            hideDashboardLoading();
            return;

            /* Bloque de renderización anterior: sustituido por renderDashboard. Se conserva
             * temporalmente como referencia hasta la validación visual con datos operativos.
            // El mapa recibe solo el barrio y los atributos ya visibles en el
            // Dashboard. No se transmiten ni se infieren direcciones o puntos.
            window.crmDashboardCases = casos;
            window.dispatchEvent(new CustomEvent('crm-dashboard-cases', {
                detail: {casos: casos},
            }));

            if (!casos.length) {
                estado.textContent = dashboardProfile === 'radicacion'
                    ? 'Aún no hay casos visibles para su perfil de radicación.'
                    : 'Aún no hay casos registrados.';
                hideDashboardLoading();
                ajustarAlturaIframe();
                return;
            }

            estado.classList.add('oculto');

            var pendiente = 0;
            var enGestion = 0;
            var finalizados = 0;
            var vencidos = 0;
            var proximos = 0;

            casos.forEach(function (c) {
                if (c.status === 'Pendiente de radicacion') {
                    pendiente++;
                }

                if (ESTADOS_FIN.indexOf(c.status) !== -1) {
                    finalizados++;
                } else if (ESTADOS_GESTION.indexOf(c.status) !== -1) {
                    enGestion++;
                }

                // Semáforo: casos activos (no finalizados/cerrados).
                if (ESTADOS_FIN.indexOf(c.status) !== -1) {
                    return;
                }

                var sem = semaforo(c);

                if (sem === 'Vencido') {
                    vencidos++;
                }

                if (sem === 'Próximo a vencer') {
                    proximos++;
                }
            });

            document.getElementById('kpi-total').textContent = total;
            document.getElementById('kpi-pendiente').textContent = pendiente;
            document.getElementById('kpi-gestion').textContent = enGestion;
            document.getElementById('kpi-finalizados').textContent = finalizados;
            document.getElementById('kpi-vencidos').textContent = vencidos;
            document.getElementById('kpi-proximos').textContent = proximos;
            document.getElementById('total-casos').textContent = 'Total: ' + total;

            var porEstado = agrupar(casos, function (c) {
                return normalizarEstadoEmbudo(c.status || 'Sin estado');
            });

            dibujarEmbudo('grafica-embudo', porEstado);

            var porSemaforo = agrupar(
                casos.filter(function (c) {
                    return ESTADOS_FIN.indexOf(c.status) === -1;
                }),
                semaforo
            );
            var ds = ordenarDesc(porSemaforo);

            dibujarDonut(
                'grafica-semaforo',
                ds.etiquetas,
                ds.valores,
                ds.etiquetas.map(function (e) {
                    return COLORES_SEMAFORO[e] || '#9ca3af';
                })
            );

            var porCanal = agruparPorCanal(casos);
            var totalCanal = porCanal.valores.reduce(function (sum, n) {
                return sum + n;
            }, 0);

            if (!totalCanal) {
                mensajeVacio('grafica-canal', 'Sin datos de canal de reporte.');
            } else {
                dibujarDonut(
                    'grafica-canal',
                    porCanal.etiquetas,
                    porCanal.valores,
                    porCanal.etiquetas.map(function (e) {
                        return COLORES_CANAL[e] || '#9ca3af';
                    })
                );
            }

            var porRecurso = agruparPorRecurso(casos);

            dibujarBarras('grafica-recurso', porRecurso.etiquetas, porRecurso.valores, {
                tooltips: porRecurso.tooltips,
                etiquetaDataset: 'Casos por recurso',
            });

            var porDia = agruparPorDia(casos);

            if (!porDia.etiquetas.length) {
                mensajeVacio('grafica-tiempo', 'Sin fechas de caso para mostrar.');
            } else {
                dibujarBarras('grafica-tiempo', porDia.etiquetas, porDia.valores, {
                    etiquetaDataset: 'Ingreso diario',
                    coloresPorValor: {r: 158, g: 181, b: 198},
                    borderRadiusBarra: {topLeft: 8, topRight: 8, bottomLeft: 2, bottomRight: 2},
                    maxBarThickness: 48,
                    unidad: 'caso(s)',
                    ticksX: 11,
                    rotacionX: 45,
                });
            }

            var porBarrio = topN(agrupar(casos, function (c) {
                return etiquetaBarrio(c.cBarrioPeticionario);
            }), 8);

            if (!porBarrio.etiquetas.length) {
                mensajeVacio('grafica-barrio', 'Sin datos de barrio.');
            } else {
                dibujarBarrasHorizontales('grafica-barrio', porBarrio.etiquetas, porBarrio.valores);
            }

            var casosRadicados = casos.filter(tieneRadicado);
            var porDiaRadicados = agruparPorDia(casosRadicados);

            if (!porDiaRadicados.etiquetas.length) {
                mensajeVacio('grafica-radicados-dia', 'Aún no hay casos radicados.');
            } else {
                dibujarBarras(
                    'grafica-radicados-dia',
                    porDiaRadicados.etiquetas,
                    porDiaRadicados.valores,
                    {
                        etiquetaDataset: 'Radicados por día',
                        colorBarra: '#9eb5c8',
                        unidad: 'radicado(s)',
                        ticksX: 11,
                        rotacionX: 45,
                    }
                );
            }

            var radicadosActivos = casosRadicados.filter(function (c) {
                return ESTADOS_FIN.indexOf(c.status) === -1;
            });
            var asignados = radicadosActivos.filter(function (c) {
                return !!c.assignedUserId;
            }).length;
            var sinAsignar = radicadosActivos.length - asignados;
            var badgeSinAsignar = document.getElementById('badge-sin-asignar');

            if (badgeSinAsignar) {
                badgeSinAsignar.textContent = sinAsignar > 0
                    ? sinAsignar + ' sin asignar'
                    : 'Todos asignados';
                badgeSinAsignar.className = 'badge ' + (sinAsignar > 0 ? 'badge--alerta' : 'badge--azul');
            }

            if (!radicadosActivos.length) {
                mensajeVacio('grafica-sin-asignar', 'No hay casos radicados activos.');
            } else {
                dibujarPolar(
                    'grafica-sin-asignar',
                    ['Con patrullero', 'Sin asignar'],
                    [asignados, sinAsignar],
                    ['rgba(158, 184, 168, 0.78)', 'rgba(197, 204, 211, 0.85)']
                );
            }

            ajustarAlturaIframe();
            setTimeout(ajustarAlturaIframe, 250);
            setTimeout(ajustarAlturaIframe, 1200);
            hideDashboardLoading();
            Fin de referencia temporal. */
        })
        .catch(function (err) {
            estado.textContent = 'Error al leer casos: ' + (err.message || err);
            estado.classList.add('error');
            hideDashboardLoading();
            ajustarAlturaIframe();
        });
})();
