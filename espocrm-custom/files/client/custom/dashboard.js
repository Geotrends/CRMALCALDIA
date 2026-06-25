(function () {
    var estado = document.getElementById('estado');

    document.getElementById('fecha-actual').textContent =
        new Date().toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            timeZone: 'America/Bogota',
        });

    /* Paleta institucional — verdes, slate y tonos apagados */
    var PALETA = [
        '#2a5934', '#3d6b47', '#4a7c59', '#5c8d6a',
        '#64748b', '#475569', '#52667a', '#1d8a6e',
    ];

    var COLORES_ESTADO = {
        'Pendiente de radicacion': '#a16207',
        'Radicado': '#52667a',
        'Asignado': '#3d6b47',
        'En proceso': '#2a5934',
        'Visita realizada': '#1d8a6e',
        'Visita aprobada': '#166534',
        'Finalizado': '#64748b',
        'Proceso cerrado': '#94a3b8',
    };

    var COLORES_SEMAFORO = {
        'Al día': '#4a7c59',
        'Próximo a vencer': '#a16207',
        'Vencido': '#b91c1c',
        'Sin fecha': '#cbd5e1',
    };

    var COLORES_CANAL = {
        'Teléfono': '#52667a',
        'Correo': '#475569',
        'Personal': '#2a5934',
        'Sin canal': '#cbd5e1',
    };

    var CANAL_CATALOGO = [
        {valor: 'Telefono', etiqueta: 'Teléfono'},
        {valor: 'Correo', etiqueta: 'Correo'},
        {valor: 'Personal', etiqueta: 'Personal'},
    ];

    var ESTADOS_FIN = ['Finalizado', 'Proceso cerrado'];
    var ESTADOS_GESTION = ['Asignado', 'En proceso', 'Visita realizada', 'Visita aprobada'];

    var EMBUDO_ETAPAS = [
        {status: 'Pendiente de radicacion', label: 'Pendiente de radicación'},
        {status: 'Radicado', label: 'Radicado'},
        {status: 'Asignado', label: 'Asignado'},
        {status: 'En proceso', label: 'En proceso'},
        {status: 'Visita realizada', label: 'Visita realizada'},
        {status: 'Visita aprobada', label: 'Visita aprobada'},
        {status: 'Finalizado', label: 'Finalizado'},
        {status: 'Proceso cerrado', label: 'Proceso cerrado'},
    ];

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
        var expediente = String(caso.cExpediente || '').trim();

        return radicado !== '' && expediente !== '';
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

        canvas.parentElement.innerHTML =
            '<p style="margin:0;padding:48px 16px;text-align:center;color:#6b7280;font-size:13px;">'
            + texto + '</p>';
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
        var base = rgb || {r: 42, g: 89, b: 52};
        var max = Math.max.apply(null, valores.concat([1]));

        return valores.map(function (valor) {
            var intensidad = 0.4 + (valor / max) * 0.6;

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
                color: COLORES_ESTADO[etapa.status] || '#9ca3af',
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

            if (paso.status === 'Finalizado' || paso.status === 'Proceso cerrado') {
                barra.style.color = '#f9fafb';
            }

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
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 12,
                            font: {size: 12, family: 'Inter, sans-serif'},
                            color: '#64748b',
                            usePointStyle: true,
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
                    borderColor: cfg.color || '#2a5934',
                    backgroundColor: cfg.fill || 'rgba(42, 89, 52, 0.12)',
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4,
                    pointBackgroundColor: cfg.color || '#2a5934',
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
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
                    legend: {
                        position: 'bottom',
                        labels: {padding: 10, font: {size: 12}, usePointStyle: true},
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

    var fetchUrl = '/api/v1/Case?select=cRecursoTema,cCanalDeReportePeticionario,status,assignedUserId,createdAt,cFechaCaso,cFechaVencimiento,cNumeroRadicado,cExpediente,cNombrePeticionario,cApellidoPeticionario,cBarrioPeticionario'
        + '&maxSize=200&orderBy=cFechaCaso&order=desc';

    if (assignedUserId) {
        fetchUrl += '&where[0][type]=equals&where[0][attribute]=assignedUserId&where[0][value]='
            + encodeURIComponent(assignedUserId);
    }

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
                estado.textContent = dashboardProfile === 'radicacion'
                    ? 'Aún no hay casos visibles para su perfil de radicación.'
                    : 'Aún no hay casos registrados.';
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
                return c.status || 'Sin estado';
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
                    coloresPorValor: {r: 42, g: 89, b: 52},
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
                        colorBarra: '#52667a',
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
                    ['rgba(42, 89, 52, 0.72)', 'rgba(148, 163, 184, 0.78)']
                );
            }

            ajustarAlturaIframe();
            setTimeout(ajustarAlturaIframe, 250);
            setTimeout(ajustarAlturaIframe, 1200);
        })
        .catch(function (err) {
            console.error('Dashboard error:', err);
            estado.textContent = 'Error al leer casos: ' + (err.message || err);
            estado.classList.add('error');
            ajustarAlturaIframe();
        });
})();
