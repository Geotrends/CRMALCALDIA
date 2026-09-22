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
        'Finalizado': {bg: '#ede0d4', text: '#6b4423'},
        'Proceso cerrado': {bg: '#e2e8f0', text: '#334155'},
    };

    var COLORES_ESTADO = {
        'Pendiente de radicacion': ESTADO_PALETTE['Pendiente de radicacion'].bg,
        'Radicado': ESTADO_PALETTE['Radicado'].bg,
        'Asignado': ESTADO_PALETTE['Asignado'].bg,
        'En gestión técnica': ESTADO_PALETTE['En gestión técnica'].bg,
        'Revisión de hallazgos': ESTADO_PALETTE['Revisión de hallazgos'].bg,
        'Finalizado': ESTADO_PALETTE['Finalizado'].bg,
        'Proceso cerrado': ESTADO_PALETTE['Proceso cerrado'].bg,
    };

    var COLORES_ESTADO_TEXTO = {
        'Pendiente de radicacion': ESTADO_PALETTE['Pendiente de radicacion'].text,
        'Radicado': ESTADO_PALETTE['Radicado'].text,
        'Asignado': ESTADO_PALETTE['Asignado'].text,
        'En gestión técnica': ESTADO_PALETTE['En gestión técnica'].text,
        'Revisión de hallazgos': ESTADO_PALETTE['Revisión de hallazgos'].text,
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
    var ESTADOS_GESTION = ['Radicado', 'Asignado', 'En gestión técnica', 'Revisión de hallazgos'];

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
    var CHART_IDS = ['grafica-semaforo', 'grafica-canal', 'grafica-recurso', 'grafica-tiempo', 'grafica-barrio', 'grafica-radicados-dia', 'grafica-sin-asignar'];

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

        ajustarAlturaIframe();
        setTimeout(ajustarAlturaIframe, 250);
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

    var fetchUrl = '/api/v1/Case?select=cRecursoTema,cCanalDeReportePeticionario,status,assignedUserId,createdAt,cFechaCaso,cFechaVencimiento,cNumeroRadicado,cExpediente,cNombrePeticionario,cApellidoPeticionario,cBarrioPeticionario'
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

    fetch(fetchUrl, {credentials: 'include'})
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
