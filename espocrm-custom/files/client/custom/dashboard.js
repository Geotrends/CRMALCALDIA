(function () {
    var estado = document.getElementById('estado');

    document.getElementById('fecha-actual').textContent =
        new Date().toLocaleDateString('es-CO', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        });

    var PALETA = [
        '#2e7d4f', '#1e88e5', '#fb8c00', '#8e24aa',
        '#e53935', '#00897b', '#6d4c41', '#3949ab',
    ];

    var COLORES_ESTADO = {
        'Pendiente de radicacion': '#f59e0b',
        'Radicado': '#1e88e5',
        'Asignado': '#8e24aa',
        'En proceso': '#fb8c00',
        'Visita realizada': '#00897b',
        'Visita aprobada': '#2e7d4f',
        'Finalizado': '#374151',
        'Proceso cerrado': '#6b7280',
    };

    var COLORES_SEMAFORO = {
        'Al día': '#2e7d4f',
        'Próximo a vencer': '#f59e0b',
        'Vencido': '#e53935',
        'Sin fecha': '#9ca3af',
    };

    var ESTADOS_FIN = ['Finalizado', 'Proceso cerrado'];
    var ESTADOS_GESTION = ['Asignado', 'En proceso', 'Visita realizada', 'Visita aprobada'];

    function capitalizar(t) {
        if (!t) {
            return 'Sin valor';
        }

        return t.charAt(0).toUpperCase() + t.slice(1);
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

    function dibujarBarras(canvasId, etiquetas, valores, colores) {
        var canvas = document.getElementById(canvasId);

        return new Chart(canvas, {
            type: 'bar',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: 'Cantidad',
                    data: valores,
                    backgroundColor: colores || etiquetas.map(function (_, i) {
                        return PALETA[i % PALETA.length];
                    }),
                    borderRadius: 6,
                    maxBarThickness: 60,
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
                    x: {grid: {display: false}, ticks: {color: '#4b5563', font: {size: 12}}},
                    y: {beginAtZero: true, ticks: {precision: 0, color: '#6b7280'}, grid: {color: '#eef0f3'}},
                },
            },
        });
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
                        labels: {padding: 12, font: {size: 12}, usePointStyle: true},
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

    function dibujarLinea(canvasId, etiquetas, valores) {
        var canvas = document.getElementById(canvasId);

        return new Chart(canvas, {
            type: 'line',
            data: {
                labels: etiquetas,
                datasets: [{
                    label: 'Casos creados',
                    data: valores,
                    borderColor: '#2a5934',
                    backgroundColor: 'rgba(42, 89, 52, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#2a5934',
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

    function agruparPorSemana(casos) {
        var semanas = {};

        casos.forEach(function (c) {
            if (!c.createdAt) {
                return;
            }

            var d = new Date(c.createdAt);
            var dia = d.getDay();
            var diff = d.getDate() - dia + (dia === 0 ? -6 : 1);
            var lunes = new Date(d.setDate(diff));
            var clave = lunes.toISOString().slice(0, 10);

            semanas[clave] = (semanas[clave] || 0) + 1;
        });

        var keys = Object.keys(semanas).sort();

        return {
            etiquetas: keys.map(function (k) {
                var p = k.split('-');

                return p[2] + '/' + p[1];
            }),
            valores: keys.map(function (k) {
                return semanas[k];
            }),
        };
    }

    var params = new URLSearchParams(window.location.search);
    var assignedUserId = params.get('assignedUserId') || '';

    var fetchUrl = '/api/v1/Case?select=cTipo,cCategoria,status,assignedUserId,createdAt,cFechaVencimiento,cNumeroRadicado,cPeticionario'
        + '&maxSize=200&orderBy=createdAt&order=desc';

    if (assignedUserId) {
        fetchUrl += '&where[0][type]=equals&where[0][attribute]=assignedUserId&where[0][value]='
            + encodeURIComponent(assignedUserId);
    }

    fetch(fetchUrl, {credentials: 'include'})
        .then(function (res) {
            if (!res.ok) {
                throw new Error('API ' + res.status);
            }

            return res.json();
        })
        .then(function (data) {
            var casos = data.list || [];
            var total = data.total != null ? data.total : casos.length;

            if (!casos.length) {
                estado.textContent = 'Aún no hay casos registrados.';
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
            var de = ordenarDesc(porEstado);

            dibujarDonut(
                'grafica-embudo',
                de.etiquetas,
                de.valores,
                de.etiquetas.map(function (e) {
                    return COLORES_ESTADO[e] || PALETA[de.etiquetas.indexOf(e) % PALETA.length];
                })
            );

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

            var porTipo = agrupar(casos, function (c) {
                return capitalizar(c.cTipo);
            });
            var dt = ordenarDesc(porTipo);

            dibujarBarras('grafica-tipos', dt.etiquetas, dt.valores);

            var semanas = agruparPorSemana(casos);

            dibujarLinea('grafica-tiempo', semanas.etiquetas, semanas.valores);
        })
        .catch(function (err) {
            console.error('Dashboard error:', err);
            estado.textContent = 'Error al leer casos: ' + (err.message || err);
            estado.classList.add('error');
        });
})();
