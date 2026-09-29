define('custom:helpers/case-detail-side-panels', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/asignador-assignment-ui',
    'custom:helpers/patrullero-acta',
    'custom:helpers/silent-ajax',
    'custom:helpers/auto-inicio-modal',
], function (RadicacionFields, AsignadorAssignmentUi, PatrulleroActa, SilentAjax, AutoInicioModal) {

    const TOP_PANELS = [
        'caseTimeline',
        'caseCronograma',
    ];

    const FIELD_PANELS = [
        'actaVisita',
        'decisionJuridica',
        'formatoGenerado',
    ];

    const BOTTOM_PANELS = [
        'caseStream',
        'comunicacionesCasoPanel',
    ];

    const LEFT_HISTORY_PANEL_NAMES = TOP_PANELS.concat(BOTTOM_PANELS).concat([
        'actasVisita',
        'history',
        'activities',
        'tasks',
        'stream',
    ]);

    const CONTAINER_CLASS = 'alcaldia-case-detail-side-fields';
    const ASIGNACION_PANEL = 'gestionPosteriorRadicacion';
    const ACTA_VISITA_PANEL = 'actaVisita';
    const DECISION_PANEL = 'decisionJuridica';
    const FORMATO_GENERADO_PANEL = 'formatoGenerado';

    const panelSelector = function (name) {
        return '.panel[data-name="' + name + '"], ' +
            '.panel[data-panel-name="' + name + '"], ' +
            '.record-panel[data-name="' + name + '"], ' +
            '[data-name="' + name + '"].panel';
    };

    const findIn = function ($root, name) {
        return $root.find(panelSelector(name)).first();
    };

    const escapeHtml = function (value) {
        return $('<div>').text(String(value == null ? '' : value)).html();
    };

    const formatFecha = function (recordView, value) {
        if (!value) {
            return '';
        }

        try {
            return recordView.getDateTime().toDisplay(value);
        } catch (e) {
            return String(value);
        }
    };

    const userLinkHtml = function (id, name, fallback) {
        const label = escapeHtml(name || fallback || 'Sin asignar');

        return id ? '<a href="#User/view/' + encodeURIComponent(id) + '">' + label + '</a>' : label;
    };

    // Histórico por caso + responsable actual: se consulta una vez y se reusa
    // en los re-montajes que dispara schedule().
    const historialCache = {};

    const fetchHistorial = function (caseId, assignedUserId) {
        const key = caseId + '|' + (assignedUserId || '');

        if (!historialCache[key]) {
            historialCache[key] = SilentAjax.getRequest('AsignacionHistorial', {
                where: [{type: 'equals', attribute: 'caseId', value: caseId}],
                select: 'id,fecha,asignadoPorId,asignadoPorName,responsableAnteriorId,'
                    + 'responsableAnteriorName,responsableNuevoId,responsableNuevoName,motivo',
                orderBy: 'fecha',
                order: 'desc',
                maxSize: 20,
            }).then(function (response) {
                return (response && response.list) || [];
            });
        }

        return historialCache[key];
    };

    const renderCurrentCard = function (recordView, $card, latest) {
        const model = recordView.model;
        const assignedUserId = model.get('assignedUserId');
        const $current = $card.find('.alcaldia-asignacion-actual');

        if (!assignedUserId) {
            $current.html(
                '<span class="alcaldia-asignacion-actual__empty">Sin responsable asignado</span>'
            );

            return;
        }

        let meta = '';

        if (latest && latest.responsableNuevoId === assignedUserId) {
            meta = 'Asignado ' + escapeHtml(formatFecha(recordView, latest.fecha))
                + (latest.asignadoPorName ? ' por ' + escapeHtml(latest.asignadoPorName) : '');
        }

        $current.html(
            '<span class="alcaldia-asignacion-actual__icon fas fa-user-check" aria-hidden="true"></span>'
            + '<div class="alcaldia-asignacion-actual__body">'
            + '<span class="alcaldia-asignacion-actual__label">Responsable actual</span>'
            + '<span class="alcaldia-asignacion-actual__name">'
            + userLinkHtml(assignedUserId, model.get('assignedUserName')) + '</span>'
            + (meta ? '<span class="alcaldia-asignacion-actual__meta">' + meta + '</span>' : '')
            + '</div>'
        );
    };

    const renderHistorial = function (recordView, $card, list) {
        const $historial = $card.find('.alcaldia-asignacion-historial');

        if (!list.length) {
            $historial.empty().addClass('hidden');

            return;
        }

        const items = list.map(function (row) {
            const anterior = row.responsableAnteriorId
                ? userLinkHtml(row.responsableAnteriorId, row.responsableAnteriorName)
                : '<em>Sin asignar</em>';
            const tipo = row.responsableAnteriorId ? 'Reasignación' : 'Asignación';

            return '<li class="alcaldia-asignacion-historial__item">'
                + '<div class="alcaldia-asignacion-historial__head">'
                + '<b>' + tipo + '</b>'
                + '<span>' + escapeHtml(formatFecha(recordView, row.fecha)) + '</span>'
                + '</div>'
                + '<div class="alcaldia-asignacion-historial__change">'
                + anterior + ' <span class="fas fa-arrow-right" aria-hidden="true"></span> '
                + userLinkHtml(row.responsableNuevoId, row.responsableNuevoName)
                + '</div>'
                + (row.asignadoPorName
                    ? '<div class="alcaldia-asignacion-historial__by">Por ' + escapeHtml(row.asignadoPorName) + '</div>'
                    : '')
                + (row.motivo
                    ? '<div class="alcaldia-asignacion-historial__motivo">Motivo: ' + escapeHtml(row.motivo) + '</div>'
                    : '')
                + '</li>';
        }).join('');

        $historial.removeClass('hidden').html(
            '<div class="alcaldia-asignacion-historial__title">Histórico de asignaciones</div>'
            + '<ol class="alcaldia-asignacion-historial__list">' + items + '</ol>'
        );
    };

    const COMPETENCIA_OPCIONES = [
        {value: 'Total', label: 'Total', help: 'La Alcaldía es competente; el caso continúa.'},
        {value: 'Parcial', label: 'Parcial', help: 'Se atiende la parte municipal y se remite la parte ajena.'},
        {value: 'Ninguna', label: 'Ninguna', help: 'Se remite el caso completo a la autoridad competente.'},
    ];

    const CLASIFICACION_CAMPOS = [
        {field: 'cClaseIngreso', label: 'Clase de escrito'},
        {field: 'cRecursoTema', label: 'Recurso / tema'},
        {field: 'cAsunto', label: 'Asunto'},
    ];

    const PLACEHOLDER = 'Seleccione una opción';

    const translateOption = function (recordView, field, value) {
        try {
            return recordView.getLanguage().translateOption(value, field, 'Case') || value;
        } catch (e) {
            return value;
        }
    };

    const clasificacionSelectHtml = function (recordView, def) {
        const current = recordView.model.get(def.field) || '';
        const options = (recordView.getMetadata()
            .get(['entityDefs', 'Case', 'fields', def.field, 'options']) || [])
            .filter(function (value) {
                return value && value !== PLACEHOLDER;
            });

        return '<label>' + escapeHtml(def.label) + ' <span class="text-danger">*</span></label>'
            + '<select class="form-control js-clasificacion" data-field="' + def.field + '">'
            + '<option value="">Seleccione…</option>'
            + options.map(function (value) {
                return '<option value="' + escapeHtml(value) + '"' + (value === current ? ' selected' : '') + '>'
                    + escapeHtml(translateOption(recordView, def.field, value)) + '</option>';
            }).join('')
            + '</select>';
    };

    const clasificacionTextoHtml = function (recordView) {
        const parts = CLASIFICACION_CAMPOS.map(function (def) {
            const value = recordView.model.get(def.field);

            return value && value !== PLACEHOLDER ? translateOption(recordView, def.field, value) : '';
        }).filter(Boolean);

        return parts.length
            ? '<span class="alcaldia-competencia-resumen__clasificacion">' + escapeHtml(parts.join(' · ')) + '</span>'
            : '';
    };

    const competenciaSummaryHtml = function (recordView) {
        const model = recordView.model;
        const competencia = model.get('cCompetencia') || 'Total';
        const autoridad = model.get('cEntidadRemision');
        const observacion = model.get('cCompetenciaObservacion');
        const fecha = formatFecha(recordView, model.get('cCompetenciaFecha'));
        const por = model.get('cCompetenciaRevisadaPorName');
        const tone = competencia === 'Total' ? 'ok' : (competencia === 'Parcial' ? 'warn' : 'danger');
        let remision = '';

        if (competencia === 'Parcial' && autoridad) {
            remision = 'Parte ajena remitida a <b>' + escapeHtml(autoridad) + '</b>.';
        } else if (competencia === 'Ninguna') {
            remision = 'Caso remitido por competencia'
                + (autoridad ? ' a <b>' + escapeHtml(autoridad) + '</b>' : '') + '. No se asigna responsable.';
        }

        return '<div class="alcaldia-competencia-resumen is-' + tone + '">'
            + '<span class="alcaldia-competencia-resumen__label">Competencia y clasificación</span>'
            + '<span class="alcaldia-competencia-resumen__value">' + escapeHtml(competencia) + '</span>'
            + (fecha || por
                ? '<span class="alcaldia-competencia-resumen__meta">Confirmada '
                    + escapeHtml(fecha) + (por ? ' por ' + escapeHtml(por) : '') + '</span>'
                : '')
            + clasificacionTextoHtml(recordView)
            + (remision ? '<span class="alcaldia-competencia-resumen__remision">' + remision + '</span>' : '')
            + (observacion
                ? '<span class="alcaldia-competencia-resumen__obs">' + escapeHtml(observacion) + '</span>'
                : '')
            + '</div>';
    };

    const competenciaFormHtml = function (recordView, asignadoSinRevision) {
        const actual = recordView.model.get('cCompetencia') || 'Total';
        const radios = COMPETENCIA_OPCIONES.map(function (opt) {
            return '<label class="alcaldia-competencia-opcion">'
                + '<input type="radio" name="alcaldia-competencia" value="' + opt.value + '"'
                + (opt.value === actual ? ' checked' : '') + '>'
                + '<span><b>' + opt.label + '</b><small>' + escapeHtml(opt.help) + '</small></span>'
                + '</label>';
        }).join('');

        return '<div class="alcaldia-competencia-form">'
            + '<div class="alcaldia-competencia-form__title">1 · Competencia y clasificación'
            + ' <span class="text-danger">*</span></div>'
            + '<p class="alcaldia-competencia-form__help">' + (asignadoSinRevision
                ? 'Este caso se asignó antes de que la revisión fuera obligatoria. Registre la competencia y la clasificación.'
                : 'Confirme la competencia y la clasificación antes de asignar el caso.') + '</p>'
            + '<div class="alcaldia-competencia-opciones">' + radios + '</div>'
            + '<div class="alcaldia-competencia-clasificacion">'
            + '<div class="alcaldia-competencia-form__subtitle">Clasificación</div>'
            + CLASIFICACION_CAMPOS.map(function (def) {
                return clasificacionSelectHtml(recordView, def);
            }).join('')
            + '</div>'
            + '<div class="alcaldia-competencia-remision hidden">'
            + '<label>Autoridad a la que se remite <span class="text-danger">*</span></label>'
            + '<input type="text" class="form-control js-competencia-autoridad" maxlength="255"'
            + ' placeholder="Ej.: Corantioquia, Área Metropolitana, Fiscalía…">'
            + '</div>'
            + '<label class="alcaldia-competencia-obs-label">Observación</label>'
            + '<textarea class="form-control js-competencia-observacion" rows="2"'
            + ' placeholder="Fundamento de la decisión (opcional)"></textarea>'
            + '<button type="button" class="btn btn-primary js-competencia-confirmar">Confirmar competencia y clasificación</button>'
            + '</div>';
    };

    const bindCompetenciaForm = function (recordView, $block) {
        const syncRemision = function () {
            const value = $block.find('input[name="alcaldia-competencia"]:checked').val();

            $block.find('.alcaldia-competencia-remision').toggleClass('hidden', value === 'Total');
        };

        $block.on('change', 'input[name="alcaldia-competencia"]', syncRemision);
        syncRemision();

        $block.on('click', '.js-competencia-confirmar', function (event) {
            event.preventDefault();

            const $btn = $(this);
            const competencia = $block.find('input[name="alcaldia-competencia"]:checked').val() || 'Total';
            const autoridad = String($block.find('.js-competencia-autoridad').val() || '').trim();
            const observacion = String($block.find('.js-competencia-observacion').val() || '').trim();

            const clasificacion = {};
            let faltante = null;

            CLASIFICACION_CAMPOS.forEach(function (def) {
                const value = String($block.find('.js-clasificacion[data-field="' + def.field + '"]').val() || '');

                clasificacion[def.field] = value;

                if (!value && !faltante) {
                    faltante = def.label;
                }
            });

            if (faltante) {
                Espo.Ui.error('Seleccione: ' + faltante + '.');

                return;
            }

            if (competencia !== 'Total' && !autoridad) {
                Espo.Ui.error('Indique la autoridad a la que se remite.');

                return;
            }

            $btn.prop('disabled', true);
            Espo.Ui.notify('Guardando…');

            Espo.Ajax.postRequest('Case/action/revisarCompetencia', {
                id: recordView.model.id,
                competencia: competencia,
                autoridadDestino: autoridad,
                observacion: observacion,
                cClaseIngreso: clasificacion.cClaseIngreso,
                cRecursoTema: clasificacion.cRecursoTema,
                cAsunto: clasificacion.cAsunto,
            }).then(function () {
                Espo.Ui.notify(false);
                Espo.Ui.success(competencia === 'Total'
                    ? 'Competencia confirmada. Ya puede asignar el caso.'
                    : 'Competencia confirmada y remisión registrada.');

                return recordView.model.fetch();
            }).catch(function () {
                Espo.Ui.notify(false);
                $btn.prop('disabled', false);
            });
        });
    };

    const mountAssignmentSidecarLauncher = function (recordView, $panel, options) {
        const canEdit = !options || options.canEdit !== false;

        const $cell = $panel.find('.cell[data-name="assignedUser"]').first();

        if (!$cell.length) {
            return;
        }

        // El motivo de la reasignación se muestra en el histórico; en detalle
        // la celda suelta solo mostraba «Ninguno».
        $panel.find('.cell[data-name="cMotivoReasignacion"]').addClass('hidden').each(function () {
            // En línea con !important: otras reglas del panel fuerzan display:block.
            this.style.setProperty('display', 'none', 'important');
        });

        $cell.addClass('alcaldia-sidecar-only-control');
        $cell.find('.alcaldia-assignment-sidecar-launcher, .alcaldia-asignacion-card').remove();

        const model = recordView.model;
        const assignedUserId = model.get('assignedUserId');
        const label = assignedUserId ? 'Reasignar responsable' : 'Asignar responsable';
        const competenciaConfirmada = !!model.get('cCompetenciaConfirmada');
        const sinCompetencia = competenciaConfirmada && model.get('cCompetencia') === 'Ninguna';
        const pendienteCompetencia = !competenciaConfirmada && RadicacionFields.isCaseRadicado(model);
        // Casos asignados antes de la revisión obligatoria: pueden registrarla
        // ahora y, mientras tanto, conservan la reasignación.
        const asignadoSinRevision = pendienteCompetencia && !!assignedUserId;
        const canAssign = canEdit && !sinCompetencia && (!pendienteCompetencia || asignadoSinRevision);
        let competenciaHtml = '';

        if (competenciaConfirmada) {
            competenciaHtml = competenciaSummaryHtml(recordView);
        } else if (pendienteCompetencia) {
            competenciaHtml = canEdit
                ? competenciaFormHtml(recordView, asignadoSinRevision)
                : '<div class="alcaldia-competencia-resumen is-pending">'
                    + '<span class="alcaldia-competencia-resumen__label">Competencia</span>'
                    + '<span class="alcaldia-competencia-resumen__value">Pendiente de revisión</span>'
                    + '</div>';
        }

        const $card = $(
            '<div class="alcaldia-asignacion-card">'
            + (competenciaHtml ? '<div class="alcaldia-competencia">' + competenciaHtml + '</div>' : '')
            + (sinCompetencia ? '' : '<div class="alcaldia-asignacion-actual"></div>')
            + (canAssign
                ? '<button type="button" class="btn alcaldia-assignment-sidecar-launcher">'
                    + '<span class="fas fa-user-plus" aria-hidden="true"></span>'
                    + '<span class="alcaldia-assignment-sidecar-launcher__label"></span>'
                    + '<span class="fas fa-chevron-right" aria-hidden="true"></span>'
                    + '</button>'
                : '')
            + '<div class="alcaldia-asignacion-historial hidden"></div>'
            + '</div>'
        );

        $card.find('.alcaldia-assignment-sidecar-launcher__label').text(label);
        $card.find('.alcaldia-assignment-sidecar-launcher').on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            // Un único flujo para asignar: el mismo utilizado por la acción
            // «Editar». El diálogo permite seleccionar un usuario activo y
            // exige confirmar con Guardar antes de registrar la asignación.
            AsignadorAssignmentUi.openAssignmentEditPage(recordView);
        });

        bindCompetenciaForm(recordView, $card.find('.alcaldia-competencia'));

        renderCurrentCard(recordView, $card, null);
        $cell.append($card);

        if (!recordView._alcaldiaAsignacionListener) {
            recordView._alcaldiaAsignacionListener = true;

            recordView.listenTo(model, 'change:assignedUserId sync', function () {
                Object.keys(historialCache).forEach(function (key) {
                    if (key.indexOf(model.id + '|') === 0) {
                        delete historialCache[key];
                    }
                });

                const $current = findIn(recordView.$el, ASIGNACION_PANEL);

                if ($current.length) {
                    mountAssignmentSidecarLauncher(recordView, $current, options);
                }
            });
        }

        fetchHistorial(model.id, assignedUserId).then(function (list) {
            if (!$card.closest('body').length) {
                return;
            }

            renderCurrentCard(recordView, $card, list[0] || null);
            renderHistorial(recordView, $card, list);
        });
    };

    const CIERRE_STATUSES = ['Pendiente de respuesta final', 'Remitido por competencia'];
    const cierreCache = {};

    /**
     * Bloque «Cierre del caso»: requisitos para finalizar (respuesta final y, en
     * remisión, oficio enviado) y botón «Finalizar caso» (todos menos Radicador).
     */
    const mountCierreBlock = function (recordView, $side) {
        const model = recordView.model;

        if (!recordView._alcaldiaCierreListener) {
            recordView._alcaldiaCierreListener = true;

            recordView.listenTo(model, 'sync change:status', function () {
                const $currentSide = recordView.$el.find('.record-grid > .side');

                if ($currentSide.length) {
                    $currentSide.find('.alcaldia-cierre-caso').removeData('cierreKey');
                    Object.keys(cierreCache).forEach(function (k) { delete cierreCache[k]; });
                    mountCierreBlock(recordView, $currentSide);
                }
            });
        }

        const status = String(model.get('status') || '').trim();
        let $block = $side.find('.alcaldia-cierre-caso');

        if (CIERRE_STATUSES.indexOf(status) === -1) {
            $block.remove();

            return;
        }

        if (!$block.length) {
            $block = $('<section class="alcaldia-cierre-caso panel panel-default"></section>');
            $side.prepend($block);
        } else if (!$block.is($side.children().first())) {
            $side.prepend($block);
        }

        // Case.modifiedAt no cambia al guardar: la clave caduca en unos segundos para
        // reflejar comunicaciones o remisiones registradas desde otros paneles.
        const key = model.id + '|' + status + '|' + Math.floor(Date.now() / 5000);

        if ($block.data('cierreKey') === key) {
            return;
        }

        $block.data('cierreKey', key);

        if (!cierreCache[key]) {
            cierreCache[key] = SilentAjax.getRequest('Case/action/cierreEstado', {id: model.id});
        }

        cierreCache[key].then(function (estado) {
            if (!estado || !estado.aplica) {
                $block.remove();

                return;
            }

            const esRemision = estado.tipo === 'remision';
            const items = (estado.requisitos || []).map(function (r) {
                return '<li class="' + (r.ok ? 'is-ok' : 'is-pending') + '">'
                    + '<span class="fas ' + (r.ok ? 'fa-circle-check' : 'fa-circle') + '" aria-hidden="true"></span>'
                    + '<span>' + escapeHtml(r.label) + (r.detalle ? ' · <b>' + escapeHtml(r.detalle) + '</b>' : '') + '</span>'
                    + '</li>';
            }).join('');
            const ayuda = esRemision
                ? 'Envíe el oficio (en «Remisiones a autoridad» cambie el estado a «Enviada» y cargue la constancia) e informe al peticionario desde Comunicaciones marcando «Respuesta final».'
                : 'Inspección proyecta la respuesta al peticionario: regístrela en Comunicaciones marcando «Respuesta final».';
            const puede = estado.completo && estado.canFinalizar;

            $block.html(
                '<div class="panel-heading"><h4 class="panel-title">Cierre del caso</h4>'
                + '<span class="alcaldia-cierre-caso__tipo">' + (esRemision ? 'Remisión por competencia' : 'Cierre de atención')
                + ' · <a role="button" class="js-cierre-actualizar">Actualizar</a></span></div>'
                + '<div class="panel-body">'
                + '<ul class="alcaldia-cierre-caso__lista">' + items + '</ul>'
                + '<p class="alcaldia-cierre-caso__ayuda">' + escapeHtml(ayuda) + '</p>'
                + (estado.canFinalizar
                    ? '<button type="button" class="btn btn-primary btn-sm js-finalizar-caso"' + (puede ? '' : ' disabled') + '>'
                        + '<span class="fas fa-flag-checkered"></span> Finalizar caso</button>'
                        + (puede ? '' : '<span class="alcaldia-cierre-caso__falta">Complete los requisitos para finalizar.</span>')
                    : '')
                + '</div>'
            );

            $block.find('.js-cierre-actualizar').on('click', function (event) {
                event.preventDefault();
                $block.removeData('cierreKey');
                Object.keys(cierreCache).forEach(function (k) { delete cierreCache[k]; });
                mountCierreBlock(recordView, $side);
            });

            $block.find('.js-finalizar-caso').on('click', function (event) {
                event.preventDefault();

                Espo.Ui.confirm('¿Confirma que desea finalizar el caso? Quedará cerrado y se avisará a los responsables.', {
                    title: 'Finalizar caso',
                    confirmText: 'Sí, finalizar',
                    cancelText: 'Cancelar',
                    confirmStyle: 'primary',
                }, function () {
                    Espo.Ajax.postRequest('Case/action/finalizarCaso', {id: model.id}).then(function () {
                        Espo.Ui.success('Caso finalizado.');
                        model.fetch();
                    }).catch(function () {});
                });
            });
        });

    };

    /* ───────────── Apertura de expediente (tramo G) ───────────── */

    // Con apertura, sus bloques van encima de la línea de tiempo (apertura y luego el proceso).
    const ubicarBloquesExpediente = function ($side) {
        const $timeline = $side.children('.panel-caseTimeline').first();
        const $apertura = $side.children('.alcaldia-apertura');
        const $proceso = $side.children('.alcaldia-proceso');

        if (!$timeline.length) {
            return;
        }

        if ($apertura.length && $apertura.next()[0] !== ($proceso[0] || $timeline[0])) {
            $timeline.before($apertura);
        }

        if ($proceso.length && $proceso.next()[0] !== $timeline[0]) {
            $timeline.before($proceso);
        }

        if ($apertura.length && $proceso.length && $apertura.next()[0] !== $proceso[0]) {
            $proceso.before($apertura);
        }
    };

    const descargaUrl = function (id) {
        return '?entryPoint=download&id=' + encodeURIComponent(id);
    };

    const aperturaAccion = function (recordView, datos, exito) {
        Espo.Ui.notify('Procesando…');

        return Espo.Ajax.postRequest('Case/action/aperturaAccion', Object.assign({id: recordView.model.id}, datos))
            .then(function () {
                Espo.Ui.notify(false);
                Espo.Ui.success(exito);
                recordView.model.fetch();
            })
            .catch(function () {
                Espo.Ui.notify(false);
            });
    };

    const htmlAperturaDecidir = function (estado) {
        if (!estado.puede.decidir) {
            return '<p class="alcaldia-apertura__texto">Pendiente: la apertura la deciden el Admin, el Director Técnico, el Inspector Ambiental o Apoyo Jurídico.</p>';
        }

        const rutas = (estado.rutas || []).map(function (r) {
            const sugerida = r === estado.rutaSugerida;

            return '<option value="' + escapeHtml(r) + '"' + (sugerida ? ' selected' : '') + '>'
                + escapeHtml(r) + (sugerida ? ' (sugerida)' : '') + '</option>';
        }).join('');
        const candidatos = (estado.candidatos || []).map(function (c) {
            return '<label class="alcaldia-apertura__opcion">'
                + '<input type="radio" name="alcaldia-apertura-destino" value="' + escapeHtml(c.expedienteId) + '">'
                + '<span><b>Incorporar al expediente ' + escapeHtml(c.numero) + '</b> · ' + escapeHtml(c.estado)
                + '<small>' + escapeHtml(c.tipoTramite) + '</small>'
                + '<small class="alcaldia-apertura__motivos">Coincide: ' + escapeHtml(c.motivos.join(' · ')) + '</small></span></label>';
        }).join('');

        return '<p class="alcaldia-apertura__texto">' + (candidatos
            ? 'Hay expedientes abiertos que podrían corresponder al mismo asunto. Revise si el caso debe incorporarse a uno de ellos.'
            : 'No se encontraron expedientes abiertos relacionados. Se abrirá uno nuevo.') + '</p>'
            + '<div class="alcaldia-apertura__opciones">'
            + '<label class="alcaldia-apertura__opcion"><input type="radio" name="alcaldia-apertura-destino" value="" checked>'
            + '<span><b>Abrir expediente nuevo</b><small>Queda en «Preparación» hasta que el Inspector firme el Auto de Inicio.</small></span></label>'
            + candidatos + '</div>'
            + '<div class="alcaldia-apertura__regimen"><label>Ruta jurídica <span class="text-danger">*</span></label>'
            + '<select class="form-control js-apertura-regimen"><option value="">Seleccione…</option>' + rutas + '</select>'
            + '<small class="alcaldia-apertura__ayuda">Sugerida según la clasificación del caso. Define los pasos del expediente'
            + ' (BPMN N2) y el formato del Auto de Inicio.</small></div>'
            + '<label>Motivación <span class="text-danger">*</span></label>'
            + '<textarea class="form-control js-apertura-motivo" rows="2" placeholder="Por qué procede abrir la actuación (o incorporar el caso)"></textarea>'
            + '<button type="button" class="btn btn-primary btn-sm js-apertura-decidir"><span class="fas fa-gavel"></span> Confirmar apertura</button>';
    };

    const htmlAperturaPreparar = function (estado) {
        const auto = estado.auto;
        const devuelto = estado.fase === 'devuelto';
        let html = '<p class="alcaldia-apertura__texto">Expediente <b>' + escapeHtml(estado.expediente.numero)
            + '</b> en preparación · ' + escapeHtml(estado.expediente.tipoTramite) + '</p>';

        if (devuelto && auto && auto.observacionesDevolucion) {
            html += '<div class="alcaldia-apertura__devuelto"><b>Devuelto por el Inspector:</b> ' + escapeHtml(auto.observacionesDevolucion) + '</div>';
        }

        if (!estado.puede.preparar) {
            return html + '<p class="alcaldia-apertura__texto">Apoyo Jurídico prepara el Auto de Inicio.</p>';
        }

        return html
            + '<p class="alcaldia-apertura__ayuda">Complete el Auto de Inicio (motivo, norma aplicable y, si ya se conoce, fecha y hora de la audiencia). Al enviarlo a firma se genera el formato prellenado para el Inspector.</p>'
            + '<div class="alcaldia-apertura__acciones">'
            + '<button type="button" class="btn btn-default btn-sm js-apertura-preparar"><span class="fas fa-pen"></span> ' + (auto ? 'Editar' : 'Preparar') + ' Auto de Inicio</button>'
            + '<button type="button" class="btn btn-primary btn-sm js-apertura-enviar"' + (auto && estado.expediente.numeroOficial ? '' : ' disabled')
            + (estado.expediente.numeroOficial ? '' : ' title="Registre primero el N.º de expediente"') + '><span class="fas fa-paper-plane"></span> Enviar a firma</button>'
            + '</div>';
    };

    const htmlAperturaFirma = function (estado) {
        const auto = estado.auto;
        const descargas = auto.formatoDocxId
            ? '<div class="alcaldia-apertura__descargas"><a class="btn btn-default btn-sm" href="' + descargaUrl(auto.formatoDocxId) + '" download>'
                + '<span class="fas fa-file-word"></span> Descargar formato prellenado (Word)</a></div>'
            : '';
        const cabecera = '<p class="alcaldia-apertura__texto">Auto de Inicio del expediente <b>' + escapeHtml(estado.expediente.numero) + '</b> listo para firma.</p>';

        if (!estado.puede.firmar) {
            return cabecera + descargas + '<p class="alcaldia-apertura__texto">Pendiente de la firma del Inspector.</p>';
        }

        return cabecera + descargas
            + '<p class="alcaldia-apertura__ayuda">Descargue el formato en Word, revíselo, fírmelo y cargue el PDF firmado.</p>'
            + '<label>Auto de Inicio firmado (PDF) <span class="text-danger">*</span></label>'
            + '<input type="file" class="form-control js-apertura-pdf" accept="application/pdf,.pdf">'
            + '<div class="alcaldia-apertura__acciones">'
            + '<button type="button" class="btn btn-primary btn-sm js-apertura-firmar"><span class="fas fa-signature"></span> Aprobar y abrir expediente</button>'
            + '<button type="button" class="btn btn-default btn-sm js-apertura-devolver-toggle"><span class="fas fa-rotate-left"></span> Devolver a Jurídica</button>'
            + '</div>'
            + '<div class="alcaldia-apertura__devolver hidden"><label>Qué debe corregirse <span class="text-danger">*</span></label>'
            + '<textarea class="form-control js-apertura-observaciones" rows="2"></textarea>'
            + '<button type="button" class="btn btn-default btn-sm js-apertura-devolver">Confirmar devolución</button></div>';
    };

    const htmlAperturaAbierto = function (estado) {
        const auto = estado.auto || {};

        return '<p class="alcaldia-apertura__texto">Expediente <a href="#Expediente/view/' + escapeHtml(estado.expediente.id) + '"><b>'
            + escapeHtml(estado.expediente.numero) + '</b></a> · ' + escapeHtml(estado.expediente.estado)
            + (estado.expediente.fechaAperturaFormal ? ' · abierto el ' + escapeHtml(String(estado.expediente.fechaAperturaFormal).slice(0, 10)) : '') + '</p>'
            + (auto.actoFirmadoId ? '<p><a href="' + descargaUrl(auto.actoFirmadoId) + '" target="_blank"><span class="fas fa-file-signature"></span> Auto de Inicio firmado</a></p>' : '');
    };

    // N.º de expediente: manual, lo registra cualquiera de los involucrados (no hay regla definida).
    const htmlAperturaNumero = function (estado) {
        const numero = estado.expediente.numeroOficial;
        const editor = '<div class="alcaldia-apertura__numero-editor' + (numero ? ' hidden' : '') + '">'
            + '<input type="text" class="form-control js-apertura-numero" maxlength="100" value="' + escapeHtml(numero) + '" placeholder="Ej.: 2026-015">'
            + '<button type="button" class="btn btn-default btn-sm js-apertura-numero-guardar"><span class="fas fa-check"></span> Guardar</button></div>';

        if (!estado.puede.numerar) {
            return '<p class="alcaldia-apertura__texto">N.º de expediente: <b>' + escapeHtml(numero || 'sin asignar') + '</b></p>';
        }

        return '<div class="alcaldia-apertura__numero"><label>N.º de expediente' + (numero ? '' : ' <span class="text-danger">*</span>') + '</label>'
            + (numero ? '<p class="alcaldia-apertura__texto"><b>' + escapeHtml(numero) + '</b> '
                + '<a href="javascript:" class="js-apertura-numero-editar"><span class="fas fa-pen"></span> Cambiar</a></p>' : '')
            + editor
            + (numero ? '' : '<small class="alcaldia-apertura__ayuda">Se asigna manualmente y no puede repetirse. Es obligatorio para enviar el Auto a firma: se imprime en el formato.</small>')
            + '</div>';
    };

    const bindApertura = function (recordView, $block) {
        $block.find('.js-apertura-numero-editar').on('click', function () {
            $block.find('.alcaldia-apertura__numero-editor').removeClass('hidden');
            $(this).closest('p').addClass('hidden');
        });

        $block.find('.js-apertura-numero-guardar').on('click', function () {
            const numero = String($block.find('.js-apertura-numero').val() || '').trim();

            if (!numero) { Espo.Ui.error('Indique el número del expediente.'); return; }

            aperturaAccion(recordView, {accion: 'numerar', numero: numero}, 'Número de expediente registrado.');
        });

        $block.find('.js-apertura-decidir').on('click', function () {
            const destino = String($block.find('input[name="alcaldia-apertura-destino"]:checked').val() || '');
            const regimen = String($block.find('.js-apertura-regimen').val() || '');
            const motivo = String($block.find('.js-apertura-motivo').val() || '').trim();

            if (!destino && !regimen) { Espo.Ui.error('Seleccione la ruta jurídica.'); return; }
            if (!motivo) { Espo.Ui.error('Escriba la motivación.'); return; }

            Espo.Ui.confirm(destino
                ? '¿Confirma incorporar el caso a ese expediente? Quedará registrado quién lo decidió y por qué.'
                : '¿Confirma abrir un expediente nuevo? Apoyo Jurídico recibirá el aviso para preparar el Auto de Inicio.', {
                title: 'Apertura de actuación', confirmText: 'Sí, confirmar', cancelText: 'Cancelar', confirmStyle: 'primary',
            }, function () {
                aperturaAccion(recordView, {accion: 'decidir', tipoTramite: regimen, expedienteId: destino, motivo: motivo},
                    destino ? 'Caso incorporado al expediente.' : 'Expediente en preparación. Se avisó a Apoyo Jurídico.');
            });
        });

        $block.find('.js-apertura-preparar').on('click', function () {
            AutoInicioModal.open(recordView, recordView.model, recordView.getUser(), {
                onAfterSave: function () { recordView.model.fetch(); },
            });
        });

        $block.find('.js-apertura-enviar').on('click', function () {
            aperturaAccion(recordView, {accion: 'enviarAFirma'}, 'Auto de Inicio enviado a firma. Se generó el formato prellenado.');
        });

        $block.find('.js-apertura-devolver-toggle').on('click', function () {
            $block.find('.alcaldia-apertura__devolver').toggleClass('hidden');
        });

        $block.find('.js-apertura-devolver').on('click', function () {
            const obs = String($block.find('.js-apertura-observaciones').val() || '').trim();

            if (!obs) { Espo.Ui.error('Indique qué debe corregirse.'); return; }

            aperturaAccion(recordView, {accion: 'devolver', observaciones: obs}, 'Auto de Inicio devuelto a Jurídica.');
        });

        $block.find('.js-apertura-firmar').on('click', function () {
            const file = ($block.find('.js-apertura-pdf').get(0) || {}).files;
            const pdf = file && file[0];

            if (!pdf) { Espo.Ui.error('Cargue el PDF del Auto de Inicio firmado.'); return; }
            if (!/pdf$/i.test(pdf.type) && !/\.pdf$/i.test(pdf.name)) { Espo.Ui.error('El acto firmado debe ser un PDF.'); return; }

            Espo.Ui.confirm('¿Confirma que el Auto de Inicio está firmado? El expediente quedará abierto formalmente.', {
                title: 'Aprobar y abrir expediente', confirmText: 'Sí, abrir', cancelText: 'Cancelar', confirmStyle: 'primary',
            }, function () {
                const reader = new FileReader();

                reader.onload = function () {
                    Espo.Ui.notify('Cargando PDF…');
                    Espo.Ajax.postRequest('Attachment', {
                        name: pdf.name, type: 'application/pdf', role: 'Attachment',
                        relatedType: 'AutoInicio', field: 'actoFirmado', file: reader.result,
                    }).then(function (att) {
                        aperturaAccion(recordView, {accion: 'firmar', attachmentId: att.id}, 'Expediente abierto formalmente.');
                    }).catch(function () { Espo.Ui.notify(false); });
                };
                reader.readAsDataURL(pdf);
            });
        });
    };

    const mountAperturaBlock = function (recordView, $side) {
        const model = recordView.model;

        if (!recordView._alcaldiaAperturaListener) {
            recordView._alcaldiaAperturaListener = true;
            recordView.listenTo(model, 'sync', function () {
                const $s = recordView.$el.find('.record-grid > .side');

                if ($s.length) {
                    $s.find('.alcaldia-apertura').removeData('aperturaKey');
                    mountAperturaBlock(recordView, $s);
                }
            });
        }

        let $block = $side.find('.alcaldia-apertura');

        if (!model.get('expedienteId') && model.get('cDecisionTramite') !== 'Apertura de actuación') {
            $block.remove();

            return;
        }

        if (!$block.length) {
            $block = $('<section class="alcaldia-apertura panel panel-default"></section>');
            $side.prepend($block);
        }

        const key = model.id + '|' + (model.get('expedienteId') || '') + '|' + Math.floor(Date.now() / 5000);

        if ($block.data('aperturaKey') === key) {
            return;
        }

        $block.data('aperturaKey', key);

        SilentAjax.getRequest('Case/action/aperturaEstado', {id: model.id}).then(function (estado) {
            if (!estado || !estado.aplica) {
                $block.remove();

                return;
            }

            const cuerpo = estado.fase === 'decidir' ? htmlAperturaDecidir(estado)
                : estado.fase === 'firma' ? htmlAperturaFirma(estado)
                    : estado.fase === 'abierto' ? htmlAperturaAbierto(estado)
                        : htmlAperturaPreparar(estado);
            const etiquetas = {decidir: 'Decisión de apertura', preparar: 'Preparación del Auto', devuelto: 'Auto devuelto', firma: 'Pendiente de firma', abierto: 'Expediente abierto'};

            $block.html('<div class="panel-heading"><h4 class="panel-title">Apertura de expediente</h4>'
                + '<span class="alcaldia-apertura__fase is-' + escapeHtml(estado.fase) + '">' + escapeHtml(etiquetas[estado.fase] || '') + '</span></div>'
                + '<div class="panel-body">' + (estado.expediente ? htmlAperturaNumero(estado) : '') + cuerpo + '</div>');

            bindApertura(recordView, $block);
            ubicarBloquesExpediente($side);
        });

    };

    /* ───────────── Proceso del expediente (ruta jurídica N2) ───────────── */

    const procesoAccion = function (recordView, datos, exito) {
        Espo.Ui.notify('Procesando…');

        return Espo.Ajax.postRequest('Case/action/procesoAccion', Object.assign({id: recordView.model.id}, datos))
            .then(function () {
                Espo.Ui.notify(false);
                Espo.Ui.success(exito);
                recordView.model.fetch();
            })
            .catch(function () {
                Espo.Ui.notify(false);
            });
    };

    // El servidor crea el archivo (varios perfiles del proceso no editan el caso) y lo pasa al registro del proceso.
    const subirArchivo = function (recordView, file) {
        if (!file) {
            return Promise.resolve('');
        }

        return new Promise(function (resolve, reject) {
            const reader = new FileReader();

            reader.onload = function () {
                Espo.Ajax.postRequest('Case/action/procesoArchivo', {
                    id: recordView.model.id, name: file.name, type: file.type || 'application/octet-stream', file: reader.result,
                }).then(function (att) { resolve(att.id); }).catch(reject);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const archivoDe = function ($block, selector) {
        const input = $block.find(selector).get(0);

        return input && input.files && input.files[0] ? input.files[0] : null;
    };

    const enlace = function (id, texto, icono) {
        return id ? '<a href="' + descargaUrl(id) + '" target="_blank"><span class="fas ' + icono + '"></span> ' + escapeHtml(texto) + '</a>' : '';
    };

    const opciones = function (lista, seleccion) {
        return lista.map(function (v) {
            const valor = typeof v === 'string' ? v : v.id;
            const texto = typeof v === 'string' ? v : v.name;

            return '<option value="' + escapeHtml(valor) + '"' + (valor === seleccion ? ' selected' : '') + '>' + escapeHtml(texto) + '</option>';
        }).join('');
    };

    const fechaDMA = function (valor) {
        const m = String(valor || '').match(/^(\d{4})-(\d{2})-(\d{2})/);

        return m ? m[3] + '/' + m[2] + '/' + m[1] : '';
    };

    const htmlProcesoPasos = function (estado) {
        const apertura = [{paso: 'Apertura de expediente', estado: 'done', fin: estado.expediente.fechaAperturaFormal}];

        return '<ol class="alcaldia-proceso__pasos">' + apertura.concat(estado.pasos).map(function (p) {
            const fecha = p.omitido ? 'No aplica'
                : p.estado === 'done' ? (p.fin ? 'Cumplido el ' + fechaDMA(p.fin) : 'Cumplido')
                : p.estado === 'current' ? 'En curso' + (p.inicio ? ' desde el ' + fechaDMA(p.inicio) : '')
                    : 'Referencia: ' + p.plazo + ' día(s)';

            return '<li class="is-' + (p.omitido ? 'omitido' : p.estado) + '"><span class="alcaldia-proceso__punto"></span>'
                + '<span><b>' + escapeHtml(p.paso) + '</b><small>' + escapeHtml(fecha)
                + (p.retornos ? ' · ↩ ' + p.retornos + ' retorno(s)' : '') + '</small></span></li>';
        }).join('') + '</ol>';
    };

    const htmlProcesoAudiencias = function (estado) {
        if (!estado.audiencias.length) {
            return '';
        }

        return '<div class="alcaldia-proceso__audiencias">' + estado.audiencias.slice().reverse().map(function (a) {
            const c = a.citacion || {};
            const lineas = (a.suspensiones || []).map(function (s) {
                let texto = s.tipo + (s.tipoPrueba ? ' · ' + s.tipoPrueba : '') + ': ' + s.causa;

                if (s.fechaLimiteJustificacion) {
                    texto += ' · justificar hasta el ' + fechaDMA(s.fechaLimiteJustificacion) + ' (' + s.decisionJustificacion + ')';
                }

                if (s.fechaLimiteActuacion) {
                    texto += ' · ' + s.responsable + ', plazo ' + fechaDMA(s.fechaLimiteActuacion);
                }

                return '<small>' + escapeHtml(texto) + ' ' + enlace(s.documentoSoporteId, 'soporte', 'fa-paperclip')
                    + enlace(s.justificacionDocumentoId, 'justificación', 'fa-paperclip') + '</small>';
            }).join('');

            return '<div class="alcaldia-proceso__audiencia">'
                + '<div><b>Audiencia N.º ' + a.numero + '</b> · ' + escapeHtml(a.fechaTexto)
                + ' <span class="alcaldia-apertura__fase">' + escapeHtml(a.estado) + '</span></div>'
                + '<small><span class="fas fa-location-dot"></span> ' + escapeHtml(a.lugar || '') + '</small>'
                + '<small>Citación: ' + escapeHtml(c.medio || '—') + (c.fechaEntrega ? ' · entregada el ' + fechaDMA(c.fechaEntrega) : ' · sin citación firmada') + '</small>'
                + '<div class="alcaldia-apertura__descargas">' + enlace(c.documentoId, 'Citación (Word)', 'fa-file-word')
                + enlace(c.soporteId, 'Citación firmada', 'fa-file-circle-check')
                + enlace(a.actaId, 'Acta firmada', 'fa-file-signature')
                + (a.audio && a.audio.id ? enlace(a.audio.id, 'Audio', 'fa-file-audio') : '')
                + (a.audio && a.audio.excepcion ? '<small>Sin grabación: ' + escapeHtml(a.audio.excepcion) + '</small>' : '') + '</div>'
                + (a.resultado ? '<small>Resultado: ' + escapeHtml(a.resultado) + '</small>' : '')
                + lineas + '</div>';
        }).join('') + '</div>';
    };

    const htmlCitar = function (estado, reprogramar) {
        const d = estado.defaults || {};

        return '<p class="alcaldia-apertura__ayuda">' + (reprogramar
            ? 'Fije la nueva fecha de la audiencia. Se genera su citación en Word.'
            : 'Programe la audiencia: se genera la citación en Word con los datos del caso. Luego se carga la citación firmada y escaneada, y con eso se cumple el paso.') + '</p>'
            + '<div class="alcaldia-proceso__fila"><div><label>Fecha de la audiencia <span class="text-danger">*</span></label>'
            + '<input type="date" class="form-control js-proceso-fecha" value="' + escapeHtml(reprogramar ? '' : d.fecha || '') + '"></div>'
            + '<div><label>Hora <span class="text-danger">*</span></label><input type="time" class="form-control js-proceso-hora" value="' + escapeHtml(reprogramar ? '' : d.hora || '') + '"></div></div>'
            + '<label>Lugar de la audiencia <span class="text-danger">*</span></label>'
            + '<select class="form-control js-proceso-lugar-tipo">' + opciones(estado.lugares || [], (estado.lugares || [])[0]) + '</select>'
            + '<input type="text" class="form-control js-proceso-lugar" maxlength="255" readonly value="' + escapeHtml(estado.lugarInspeccion || '') + '"'
            + ' data-inspeccion="' + escapeHtml(estado.lugarInspeccion || '') + '" data-hechos="' + escapeHtml(estado.lugarHechos || '') + '">'
            + '<label>Medio de citación <span class="text-danger">*</span></label>'
            + '<select class="form-control js-proceso-medio"><option value="">Seleccione…</option>' + opciones(estado.medios) + '</select>'
            + '<div class="alcaldia-apertura__acciones">'
            + '<button type="button" class="btn btn-default btn-sm js-proceso-citacion-previa"><span class="fas fa-file-word"></span> Ver citación (Word)</button>'
            + '<button type="button" class="btn btn-primary btn-sm js-proceso-citar"><span class="fas fa-calendar-check"></span> '
            + (reprogramar ? 'Reprogramar y generar citación' : 'Programar y generar citación') + '</button></div>';
    };

    const htmlSoporteCitacion = function (texto, citacionId) {
        return '<p class="alcaldia-apertura__ayuda">' + escapeHtml(texto) + '</p>'
            + (citacionId ? '<div class="alcaldia-apertura__descargas"><a class="btn btn-default btn-sm" href="' + descargaUrl(citacionId) + '" download>'
                + '<span class="fas fa-file-word"></span> Descargar citación (Word)</a></div>' : '')
            + '<label>Citación firmada y escaneada <span class="text-danger">*</span></label><input type="file" class="form-control js-proceso-soporte" accept=".pdf,image/*">'
            + '<label>Fecha de entrega</label><input type="date" class="form-control js-proceso-fecha-entrega">'
            + '<button type="button" class="btn btn-primary btn-sm js-proceso-soporte-citacion"><span class="fas fa-file-circle-check"></span> Cargar citación firmada</button>';
    };

    const htmlAudiencia = function (estado) {
        const ultima = estado.audiencias[estado.audiencias.length - 1] || {};
        const opcion = function (valor, titulo, detalle) {
            return '<label class="alcaldia-apertura__opcion"><input type="radio" name="alcaldia-proceso-resultado" value="' + valor + '">'
                + '<span><b>' + titulo + '</b><small>' + detalle + '</small></span></label>';
        };

        return (ultima.citacion && !ultima.citacion.soporteId
            ? '<details class="alcaldia-proceso__pendiente"><summary>Falta la citación firmada y escaneada</summary>'
                + htmlSoporteCitacion('Cárguela cuando la tenga.', ultima.citacion.documentoId) + '</details>' : '')
            + (estado.audienciaYaFue
                ? '<p class="alcaldia-apertura__texto">Registre qué pasó en la audiencia N.º ' + ultima.numero + ' (' + escapeHtml(ultima.fechaTexto) + '):</p>'
                : '<p class="alcaldia-apertura__ayuda">Audiencia N.º ' + ultima.numero + ' programada para el <b>' + escapeHtml(ultima.fechaTexto)
                    + '</b>. El resultado se registra desde ese día; antes solo puede aplazarse.</p>')
            + '<div class="alcaldia-apertura__opciones">'
            + (estado.audienciaYaFue
                ? opcion('realizada', 'Se realizó', 'Argumentos, hechos relevantes y pruebas. Luego se cargan el acta firmada y el audio.')
                    + opcion('inasistencia', 'No compareció el presunto infractor', 'Primera inasistencia: 3 días hábiles para justificar (Decreto 768/2025).')
                    + opcion('prueba', 'Se suspende: prueba o actuación externa', 'Inspección ocular, visita técnica, informe, ampliación o aclaración.')
                : '')
            + opcion('otra', estado.audienciaYaFue ? 'Se suspende por otra causa' : 'Aplazar la audiencia', 'Se registra la causa y luego se reprograma.')
            + '</div>'
            + '<div class="alcaldia-proceso__form hidden" data-opcion="realizada">'
            + '<label>Asistentes</label><textarea class="form-control js-proceso-participantes" rows="2"></textarea>'
            + '<label>Resultado de la diligencia <span class="text-danger">*</span></label>'
            + '<textarea class="form-control js-proceso-resultado" rows="3" placeholder="Argumentos, hechos jurídicamente relevantes y pruebas practicadas"></textarea>'
            + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-proceso-conciliacion"> Hubo conciliación o compromiso</label>'
            + '<div class="js-proceso-compromiso-box hidden"><label>Compromiso <span class="text-danger">*</span></label><textarea class="form-control js-proceso-compromiso" rows="2"></textarea>'
            + '<label>Fecha límite del compromiso</label><input type="date" class="form-control js-proceso-compromiso-fecha"></div></div>'
            + '<div class="alcaldia-proceso__form hidden" data-opcion="inasistencia"><label>Observación</label><textarea class="form-control js-proceso-observacion-inasistencia" rows="2"></textarea></div>'
            + '<div class="alcaldia-proceso__form hidden" data-opcion="prueba">'
            + '<label>Prueba o actuación <span class="text-danger">*</span></label><select class="form-control js-proceso-tipo-prueba"><option value="">Seleccione…</option>' + opciones(estado.tiposPrueba) + '</select>'
            + '<label>Qué se debe verificar <span class="text-danger">*</span></label><textarea class="form-control js-proceso-causa-prueba" rows="2"></textarea>'
            + '<label>Responsable <span class="text-danger">*</span></label><select class="form-control js-proceso-responsable"><option value="">Seleccione…</option>' + opciones(estado.responsables) + '</select>'
            + '<label>Plazo <span class="text-danger">*</span></label><input type="date" class="form-control js-proceso-plazo"></div>'
            + '<div class="alcaldia-proceso__form hidden" data-opcion="otra"><label>Causa <span class="text-danger">*</span></label><textarea class="form-control js-proceso-causa-otra" rows="2"></textarea></div>'
            + '<button type="button" class="btn btn-primary btn-sm js-proceso-resultado-audiencia hidden"><span class="fas fa-check"></span> Registrar</button>';
    };

    const htmlJustificacion = function (estado) {
        const s = (estado.audiencias[estado.audiencias.length - 1].suspensiones || []).slice(-1)[0] || {};

        return '<p class="alcaldia-apertura__ayuda">Primera inasistencia: el presunto infractor puede justificar hasta el <b>'
            + fechaDMA(s.fechaLimiteJustificacion) + '</b>. Registre la decisión y luego reprograme la audiencia.</p>'
            + '<label>Justificación <span class="text-danger">*</span></label><select class="form-control js-proceso-decision"><option value="">Seleccione…</option>'
            + opciones(['Aceptada', 'Rechazada', 'No presentada']) + '</select>'
            + '<label>Documento de justificación</label><input type="file" class="form-control js-proceso-documento" accept=".pdf,image/*">'
            + '<label>Observación</label><textarea class="form-control js-proceso-observacion" rows="2"></textarea>'
            + '<button type="button" class="btn btn-primary btn-sm js-proceso-justificacion"><span class="fas fa-scale-balanced"></span> Registrar decisión</button>';
    };

    const htmlSoportePrueba = function (estado) {
        const s = (estado.audiencias[estado.audiencias.length - 1].suspensiones || []).slice(-1)[0] || {};

        return '<p class="alcaldia-apertura__ayuda">Audiencia suspendida: ' + escapeHtml(s.tipoPrueba) + ' a cargo de <b>' + escapeHtml(s.responsable)
            + '</b>, plazo ' + fechaDMA(s.fechaLimiteActuacion) + '. Cargue el soporte para dejarla lista para reanudar.</p>'
            + '<label>Soporte de la prueba <span class="text-danger">*</span></label><input type="file" class="form-control js-proceso-documento" accept=".pdf,.doc,.docx,image/*">'
            + '<label>Observación</label><textarea class="form-control js-proceso-observacion" rows="2"></textarea>'
            + '<button type="button" class="btn btn-primary btn-sm js-proceso-soporte-prueba"><span class="fas fa-paperclip"></span> Cargar soporte</button>';
    };

    const htmlSoportesAudiencia = function (estado) {
        const a = estado.audiencias[estado.audiencias.length - 1] || {};

        return '<p class="alcaldia-apertura__ayuda">Audiencia N.º ' + a.numero + ' realizada. Para cerrarla cargue el acta firmada (PDF) y el audio; si no fue posible grabar, registre la constancia.</p>'
            + (a.actaId ? '<p class="alcaldia-apertura__texto">✓ Acta firmada cargada</p>'
                : '<label>Acta de audiencia firmada (PDF)</label><input type="file" class="form-control js-proceso-acta" accept=".pdf,application/pdf">')
            + (a.audio ? '<p class="alcaldia-apertura__texto">✓ ' + (a.audio.id ? 'Audio cargado' : 'Constancia de excepción registrada') + '</p>'
                : '<label>Audio de la audiencia</label><input type="file" class="form-control js-proceso-audio" accept="audio/*,video/*">'
                    + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-proceso-sin-audio"> No fue posible grabar</label>'
                    + '<textarea class="form-control js-proceso-excepcion hidden" rows="2" placeholder="Motivo, responsable, fecha y hora"></textarea>')
            + '<button type="button" class="btn btn-primary btn-sm js-proceso-soportes"><span class="fas fa-upload"></span> Cargar</button>';
    };

    const htmlCumplirPaso = function (estado) {
        if (estado.esPasoFinal) {
            return '<p class="alcaldia-apertura__ayuda">El Auto de Archivo se registra en el tramo de cierre del expediente.</p>';
        }

        return '<p class="alcaldia-apertura__ayuda">Registre cómo se cumplió «' + escapeHtml(estado.pasoActual) + '». El expediente pasa al paso siguiente.</p>'
            + '<textarea class="form-control js-proceso-observacion" rows="2" placeholder="Actuación realizada y soporte"></textarea>'
            + '<button type="button" class="btn btn-primary btn-sm js-proceso-cumplir"><span class="fas fa-check"></span> Registrar paso cumplido</button>';
    };

    /* ── Decisión y Notificación y recursos (tramo 2) ── */

    const hoyISO = function () {
        const d = new Date();

        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    const htmlRegla = function (conducta, r, previa) {
        const clave = conducta.id + '|' + r.measureId;
        const p = previa[clave] || {};
        const meta = '<small>' + escapeHtml(r.modoNombre) + ' · ' + escapeHtml(r.instanciaNombre) + ' · ' + escapeHtml(r.autoridad) + '</small>';
        const condiciones = '<input type="text" class="form-control input-sm js-regla-condiciones" placeholder="Condiciones particulares (valor, duración, bien…)" value="'
            + escapeHtml(p.condiciones || '') + '">';

        if (!r.compete) {
            return '<div class="alcaldia-proceso__regla is-bloqueada" data-clave="' + escapeHtml(clave) + '">'
                + '<b><span class="fas fa-lock"></span> ' + escapeHtml(r.nombre) + '</b>' + meta
                + '<small>No la impone este Inspector: se deriva a ' + escapeHtml(r.autoridad) + '.</small></div>';
        }

        if (r.modo === 'PRESCRITA') {
            return '<div class="alcaldia-proceso__regla is-prescrita" data-clave="' + escapeHtml(clave) + '">'
                + '<b><span class="fas fa-check"></span> ' + escapeHtml(r.nombre) + '</b>' + meta
                + '<small>Prescrita: se incorpora si la conducta está probada.</small>' + condiciones + '</div>';
        }

        const condicional = r.modo === 'CONDICIONAL';

        return '<div class="alcaldia-proceso__regla" data-clave="' + escapeHtml(clave) + '">'
            + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-regla-incluir"' + (p.estado === 'INCLUIDA' ? ' checked' : '') + '> '
            + '<b>' + escapeHtml(r.nombre) + '</b></label>' + meta
            + (condicional ? '<small>Condición: ' + escapeHtml(r.condicion || '') + '</small>'
                + '<textarea class="form-control input-sm js-regla-evidencia" rows="2" placeholder="Prueba que acredita la condición (obligatoria si se incluye)">' + escapeHtml(p.evidencia || '') + '</textarea>'
                : '<textarea class="form-control input-sm js-regla-motivacion" rows="2" placeholder="Motivación (obligatoria: por qué se incluye o no)">' + escapeHtml(p.motivacion || '') + '</textarea>')
            + condiciones + '</div>';
    };

    const htmlDecision = function (estado) {
        const dec = estado.decision || {};
        const d = dec.datos || {};
        const previa = {};
        const elegidas = (d.conductas || []).map(function (c) { return c.id; });

        (d.medidas || []).forEach(function (m) { previa[m.clave] = m; });

        const conductas = (dec.conductas || []).map(function (c) {
            const visible = c.enAuto || elegidas.indexOf(c.id) !== -1;

            return '<div class="alcaldia-proceso__conducta' + (visible ? '' : ' hidden') + '" data-conducta="' + escapeHtml(c.id) + '">'
                + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-conducta"' + (elegidas.indexOf(c.id) !== -1 ? ' checked' : '') + '> '
                + '<span><b>' + escapeHtml(c.articulo) + '</b> — ' + escapeHtml(c.titulo) + (c.enAuto ? ' <small>(del Auto de Inicio)</small>' : '') + '</span></label>'
                + '<div class="alcaldia-proceso__reglas' + (elegidas.indexOf(c.id) !== -1 ? '' : ' hidden') + '">'
                + (c.reglasEspeciales || []).map(function (t) { return '<small class="alcaldia-proceso__especial">' + escapeHtml(t) + '</small>'; }).join('')
                + c.reglas.map(function (r) { return htmlRegla(c, r, previa); }).join('') + '</div></div>';
        }).join('');
        const otras = (dec.conductas || []).filter(function (c) { return !c.enAuto; }).map(function (c) {
            return '<option value="' + escapeHtml(c.id) + '">' + escapeHtml(c.articulo + ' — ' + c.titulo) + '</option>';
        }).join('');
        const orden = d.orden || {};
        const descargas = d.borradorId
            ? '<div class="alcaldia-apertura__descargas"><a class="btn btn-default btn-sm" href="' + descargaUrl(d.borradorId) + '" download>'
                + '<span class="fas fa-file-word"></span> Descargar resolución IV-F-117 (Word)</a></div>'
                + '<label>Decisión firmada (PDF) <span class="text-danger">*</span></label>'
                + '<input type="file" class="form-control js-proceso-documento" accept="application/pdf,.pdf">'
                + '<button type="button" class="btn btn-primary btn-sm js-decision-firmar"><span class="fas fa-signature"></span> Cargar decisión firmada</button>'
                + '<p class="alcaldia-apertura__ayuda">Si hay que corregir algo, ajuste el formulario y vuelva a generar el proyecto.</p>'
            : '';

        return (d.ajustePorRecurso ? '<p class="alcaldia-apertura__devuelto">El recurso <b>modificó la decisión</b>: ajústela, genere el proyecto y cargue la versión firmada. Queda en firme sin nuevos recursos.</p>' : '')
            + '<p class="alcaldia-apertura__ayuda">Marque las conductas probadas. El CRM muestra solo las medidas que la matriz asocia a cada una: las prescritas se incorporan, las condicionales exigen la prueba de la condición y las de otra autoridad se derivan.</p>'
            + '<label>Conductas probadas</label>' + conductas
            + (otras ? '<select class="form-control input-sm js-conducta-agregar"><option value="">+ Agregar otra conducta del catálogo…</option>' + otras + '</select>' : '')
            + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-sin-medida"' + (d.sinMedida ? ' checked' : '') + '> No se probó ninguna conducta (abstenerse de imponer medida)</label>'
            + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-orden"' + (d.orden ? ' checked' : '') + '> La decisión contiene una orden de Policía</label>'
            + '<div class="alcaldia-proceso__form js-orden-box' + (d.orden ? '' : ' hidden') + '">'
            + '<textarea class="form-control js-orden-texto" rows="2" placeholder="Texto exacto de la orden">' + escapeHtml(orden.texto || '') + '</textarea>'
            + '<div class="alcaldia-proceso__fila"><div><label>Destinatario</label><input type="text" class="form-control js-orden-destinatario" value="' + escapeHtml(orden.destinatario || dec.citado || '') + '"></div>'
            + '<div><label>Plazo</label><input type="date" class="form-control js-orden-plazo" value="' + escapeHtml(orden.fechaLimite || '') + '"></div></div>'
            + '<input type="text" class="form-control js-orden-criterio" placeholder="Criterio de cumplimiento" value="' + escapeHtml(orden.criterio || '') + '">'
            + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-orden-verificar"' + (orden.requiereVerificacion ? ' checked' : '') + '> Requiere verificación posterior</label></div>'
            + '<label>Hechos probados <span class="text-danger">*</span></label><textarea class="form-control js-decision-hechos" rows="3">' + escapeHtml(d.hechos || '') + '</textarea>'
            + '<label>Tesis que plantea la Inspección</label><textarea class="form-control js-decision-tesis" rows="2" placeholder="Opcional: si queda vacío, se deja el espacio en la resolución">' + escapeHtml(d.tesis || '') + '</textarea>'
            + '<label>Motivación / conclusiones <span class="text-danger">*</span></label><textarea class="form-control js-decision-motivacion" rows="3" placeholder="Valoración de pruebas, fundamento y razones de cada medida">' + escapeHtml(d.motivacion || '') + '</textarea>'
            + '<button type="button" class="btn btn-' + (d.borradorId ? 'default' : 'primary') + ' btn-sm js-decision-guardar"><span class="fas fa-file-word"></span> '
            + (d.borradorId ? 'Corregir y regenerar resolución' : 'Generar resolución (IV-F-117)') + '</button>'
            + descargas;
    };

    const htmlNotificar = function (estado) {
        const dec = estado.decision || {};
        const n = (dec.datos || {}).notificacion || {};

        return (n.noEfectiva ? '<p class="alcaldia-apertura__devuelto">La notificación ' + escapeHtml((n.medio || '').toLowerCase()) + ' no fue efectiva: intente otro medio.</p>' : '')
            + '<p class="alcaldia-apertura__ayuda">Si la decisión se profirió en audiencia, queda notificada en estrados.</p>'
            + '<div class="alcaldia-proceso__fila"><div><label>Medio</label><select class="form-control js-notif-medio">' + opciones(dec.medios || [], n.noEfectiva ? '' : 'En estrados') + '</select></div>'
            + '<div><label>Fecha</label><input type="date" class="form-control js-notif-fecha" value="' + hoyISO() + '"></div></div>'
            + '<label>Se notifica a</label><input type="text" class="form-control js-notif-destinatario" value="' + escapeHtml(n.destinatario || dec.citado || '') + '">'
            + '<div class="alcaldia-proceso__form js-notif-formato hidden"><button type="button" class="btn btn-default btn-sm js-notif-generar"><span class="fas fa-file-word"></span> Generar formato prellenado (Word)</button>'
            + (n.formatoId ? ' ' + enlace(n.formatoId, 'Formato ' + (n.formatoMedio || ''), 'fa-file-word') : '')
            + '<label>Constancia firmada</label><input type="file" class="form-control js-proceso-documento" accept=".pdf,image/*">'
            + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-notif-no-efectiva"> No fue efectiva</label></div>'
            + '<button type="button" class="btn btn-primary btn-sm js-notif-registrar"><span class="fas fa-bullhorn"></span> Registrar notificación</button>';
    };

    const htmlRecursos = function (estado) {
        const dec = estado.decision || {};

        return '<p class="alcaldia-apertura__ayuda">¿Se interpusieron recursos en la audiencia? Si no, la decisión queda en firme.</p>'
            + '<select class="form-control js-recurso-tipo">' + opciones(dec.recursos || [], 'Ninguno') + '</select>'
            + '<div class="alcaldia-proceso__form js-recurso-box hidden"><label>Quién lo interpone</label><input type="text" class="form-control js-recurso-recurrente" value="' + escapeHtml(dec.citado || '') + '">'
            + '<label>Sustentación</label><textarea class="form-control js-recurso-sustentacion" rows="2"></textarea></div>'
            + '<button type="button" class="btn btn-primary btn-sm js-recurso-registrar"><span class="fas fa-check"></span> Registrar</button>';
    };

    const htmlReposicion = function (estado) {
        const dec = estado.decision || {};
        const rec = (dec.datos || {}).recursos || {};

        return '<p class="alcaldia-apertura__ayuda">Resuelva la reposición' + (rec.apelacionId ? ' (con apelación en subsidio: si no se revoca, se concede la apelación)' : '') + '.</p>'
            + '<label>Resultado</label><select class="form-control js-recurso-resultado"><option value="">Seleccione…</option>' + opciones(dec.resultados || []) + '</select>'
            + '<label>Fundamento</label><textarea class="form-control js-recurso-observacion" rows="2"></textarea>'
            + '<button type="button" class="btn btn-primary btn-sm js-reposicion-resolver"><span class="fas fa-scale-balanced"></span> Registrar</button>';
    };

    const htmlApelacionRemitir = function () {
        return '<p class="alcaldia-apertura__ayuda">Apelación concedida. Registre la remisión del expediente a segunda instancia (queda la salida del expediente físico).</p>'
            + '<label>Autoridad de segunda instancia</label><input type="text" class="form-control js-apelacion-autoridad">'
            + '<div class="alcaldia-proceso__fila"><div><label>Fecha de remisión</label><input type="date" class="form-control js-apelacion-fecha" value="' + hoyISO() + '"></div>'
            + '<div><label>Seguimiento a la devolución</label><input type="date" class="form-control js-apelacion-seguimiento"></div></div>'
            + '<label>Oficio o constancia de entrega</label><input type="file" class="form-control js-proceso-documento" accept=".pdf,image/*">'
            + '<button type="button" class="btn btn-primary btn-sm js-apelacion-remitir"><span class="fas fa-share"></span> Remitir</button>';
    };

    const htmlApelacionEspera = function (estado) {
        const dec = estado.decision || {};

        return '<p class="alcaldia-apertura__ayuda">Expediente en segunda instancia. Registre la decisión cuando se devuelva.</p>'
            + '<label>Resultado</label><select class="form-control js-recurso-resultado"><option value="">Seleccione…</option>' + opciones(dec.resultados || []) + '</select>'
            + '<label>Decisión de segunda instancia <span class="text-danger">*</span></label><input type="file" class="form-control js-proceso-documento" accept=".pdf,image/*">'
            + '<label>Fecha de devolución</label><input type="date" class="form-control js-apelacion-fecha" value="' + hoyISO() + '">'
            + '<button type="button" class="btn btn-primary btn-sm js-apelacion-resolver"><span class="fas fa-scale-balanced"></span> Registrar</button>';
    };

    const htmlDecisionResumen = function (estado) {
        const d = (estado.decision || {}).datos || {};

        if (!d.firmadaId) {
            return '';
        }

        const incluidas = (d.medidas || []).filter(function (m) { return m.estado === 'INCLUIDA'; });

        return '<div class="alcaldia-proceso__audiencia"><div><b>Decisión</b> · firmada el ' + fechaDMA(d.fechaFirma)
            + (d.fechaFirmeza ? ' · en firme el ' + fechaDMA(d.fechaFirmeza) : '') + (d.revocada ? ' · <b>revocada</b>' : '') + '</div>'
            + (d.sinMedida ? '<small>No se probó la conducta: sin medida.</small>' : '')
            + incluidas.map(function (m) { return '<small>Medida: ' + escapeHtml(m.nombre) + (m.condiciones ? ' · ' + escapeHtml(m.condiciones) : '') + '</small>'; }).join('')
            + (d.orden ? '<small>Orden de Policía: ' + escapeHtml(d.orden.texto) + '</small>' : '')
            + (d.derivaciones || []).map(function (t) { return '<small>Derivación: ' + escapeHtml(t) + '</small>'; }).join('')
            + (d.notificacion && d.notificacion.medio && !d.notificacion.noEfectiva ? '<small>Notificada ' + escapeHtml(d.notificacion.medio.toLowerCase()) + ' el ' + fechaDMA(d.notificacion.fecha) + '</small>' : '')
            + (d.recursos ? '<small>Recurso: ' + escapeHtml(d.recursos.tipo) + (d.recursos.resultadoReposicion ? ' · reposición: ' + escapeHtml(d.recursos.resultadoReposicion) : '')
                + (d.recursos.resultadoApelacion ? ' · apelación: ' + escapeHtml(d.recursos.resultadoApelacion) : '') + '</small>' : '')
            + '<div class="alcaldia-apertura__descargas">' + enlace(d.firmadaId, 'Decisión firmada', 'fa-file-signature') + '</div></div>';
    };

    const bindDecision = function (recordView, $block) {
        const val = function (selector) { return String($block.find(selector).val() || '').trim(); };
        const conArchivo = function (enviar) {
            Espo.Ui.notify('Cargando archivos…');
            subirArchivo(recordView, archivoDe($block, '.js-proceso-documento')).then(enviar).catch(function () { Espo.Ui.notify(false); });
        };

        $block.find('.js-conducta').on('change', function () {
            $(this).closest('.alcaldia-proceso__conducta').find('.alcaldia-proceso__reglas').toggleClass('hidden', !this.checked);
            if (this.checked) { $block.find('.js-sin-medida').prop('checked', false); }
        });

        $block.find('.js-conducta-agregar').on('change', function () {
            const $c = $block.find('.alcaldia-proceso__conducta[data-conducta="' + this.value + '"]');

            $c.removeClass('hidden').find('.js-conducta').prop('checked', true).trigger('change');
            $(this).find('option[value="' + this.value + '"]').remove();
            this.value = '';
        });

        $block.find('.js-sin-medida').on('change', function () {
            if (this.checked) { $block.find('.js-conducta:checked').prop('checked', false).trigger('change'); }
        });

        $block.find('.js-orden').on('change', function () {
            $block.find('.js-orden-box').toggleClass('hidden', !this.checked);
        });

        $block.find('.js-decision-guardar').on('click', function () {
            const conductas = [];
            const medidas = {};

            $block.find('.js-conducta:checked').each(function () {
                conductas.push($(this).closest('.alcaldia-proceso__conducta').data('conducta'));
            });

            $block.find('.alcaldia-proceso__conducta:not(.hidden) .alcaldia-proceso__regla').each(function () {
                const $r = $(this);

                medidas[$r.data('clave')] = {
                    incluir: $r.find('.js-regla-incluir').is(':checked'),
                    evidencia: String($r.find('.js-regla-evidencia').val() || ''),
                    motivacion: String($r.find('.js-regla-motivacion').val() || ''),
                    condiciones: String($r.find('.js-regla-condiciones').val() || ''),
                };
            });

            if (!conductas.length && !$block.find('.js-sin-medida').is(':checked')) { Espo.Ui.error('Marque la conducta probada o indique que no se probó ninguna.'); return; }
            if (!val('.js-decision-hechos') || !val('.js-decision-motivacion')) { Espo.Ui.error('Registre los hechos probados y la motivación.'); return; }

            procesoAccion(recordView, {
                accion: 'decisionGuardar', conductas: conductas, medidas: medidas, sinMedida: $block.find('.js-sin-medida').is(':checked'),
                hechos: val('.js-decision-hechos'), motivacion: val('.js-decision-motivacion'), tesis: val('.js-decision-tesis'),
                orden: $block.find('.js-orden').is(':checked') ? {
                    texto: val('.js-orden-texto'), destinatario: val('.js-orden-destinatario'), fechaLimite: val('.js-orden-plazo'),
                    criterio: val('.js-orden-criterio'), requiereVerificacion: $block.find('.js-orden-verificar').is(':checked'),
                } : null,
            }, 'Resolución IV-F-117 generada. Descárguela, fírmela y cargue el PDF.');
        });

        $block.find('.js-decision-firmar').on('click', function () {
            const pdf = archivoDe($block, '.js-proceso-documento');

            if (!pdf) { Espo.Ui.error('Cargue la decisión firmada (PDF).'); return; }

            Espo.Ui.confirm('¿Confirma que la decisión está firmada? Se registrarán las medidas y la orden de Policía.', {
                title: 'Decisión firmada', confirmText: 'Sí, cargar', cancelText: 'Cancelar', confirmStyle: 'primary',
            }, function () {
                conArchivo(function (id) { procesoAccion(recordView, {accion: 'decisionFirmar', documentoId: id}, 'Decisión cargada. Sigue la notificación.'); });
            });
        });

        const medioConFormato = function () {
            const medio = val('.js-notif-medio');

            $block.find('.js-notif-formato').toggleClass('hidden', medio !== 'Personal' && medio !== 'Por aviso');
        };

        $block.find('.js-notif-medio').on('change', medioConFormato);
        medioConFormato();

        $block.find('.js-notif-generar').on('click', function () {
            procesoAccion(recordView, {accion: 'formatoNotificacion', medio: val('.js-notif-medio'), destinatario: val('.js-notif-destinatario')},
                'Formato generado. Descárguelo desde el enlace.');
        });

        $block.find('.js-notif-registrar').on('click', function () {
            const datos = {
                accion: 'notificar', medio: val('.js-notif-medio'), fecha: val('.js-notif-fecha'), destinatario: val('.js-notif-destinatario'),
                noEfectiva: $block.find('.js-notif-no-efectiva').is(':checked'),
            };

            conArchivo(function (id) { procesoAccion(recordView, Object.assign(datos, {constanciaId: id}), 'Notificación registrada.'); });
        });

        $block.find('.js-recurso-tipo').on('change', function () {
            $block.find('.js-recurso-box').toggleClass('hidden', this.value === 'Ninguno');
        });

        $block.find('.js-recurso-registrar').on('click', function () {
            const tipo = val('.js-recurso-tipo');
            const texto = tipo === 'Ninguno' ? '¿Confirma que no se interpusieron recursos? La decisión quedará en firme.' : '¿Confirma el registro del recurso?';

            Espo.Ui.confirm(texto, {title: 'Recursos', confirmText: 'Sí, registrar', cancelText: 'Cancelar', confirmStyle: 'primary'}, function () {
                procesoAccion(recordView, {accion: 'recursos', tipo: tipo, recurrente: val('.js-recurso-recurrente'), sustentacion: val('.js-recurso-sustentacion')},
                    tipo === 'Ninguno' ? 'Decisión en firme.' : 'Recurso registrado.');
            });
        });

        $block.find('.js-reposicion-resolver').on('click', function () {
            if (!val('.js-recurso-resultado') || !val('.js-recurso-observacion')) { Espo.Ui.error('Indique el resultado y su fundamento.'); return; }

            procesoAccion(recordView, {accion: 'resolverReposicion', resultado: val('.js-recurso-resultado'), observacion: val('.js-recurso-observacion')}, 'Reposición resuelta.');
        });

        $block.find('.js-apelacion-remitir').on('click', function () {
            if (!val('.js-apelacion-autoridad')) { Espo.Ui.error('Indique la autoridad de segunda instancia.'); return; }

            conArchivo(function (id) {
                procesoAccion(recordView, {accion: 'remitirApelacion', autoridad: val('.js-apelacion-autoridad'), fecha: val('.js-apelacion-fecha'),
                    seguimiento: val('.js-apelacion-seguimiento'), documentoId: id}, 'Expediente remitido a segunda instancia.');
            });
        });

        $block.find('.js-archivo-generar').on('click', function () {
            procesoAccion(recordView, {
                accion: 'archivoGenerar', causal: val('.js-archivo-causal'), observacion: val('.js-archivo-observacion'),
                requiereNotificacion: $block.find('.js-archivo-notificar').is(':checked'),
            }, 'Auto de Archivo generado. Descárguelo, fírmelo y cárguelo.');
        });

        $block.find('.js-archivo-firmar').on('click', function () {
            if (!archivoDe($block, '.js-proceso-documento')) { Espo.Ui.error('Cargue el Auto de Archivo firmado (PDF).'); return; }

            Espo.Ui.confirm('¿Confirma que el Auto de Archivo está firmado? El expediente quedará archivado.', {
                title: 'Archivar expediente', confirmText: 'Sí, archivar', cancelText: 'Cancelar', confirmStyle: 'primary',
            }, function () {
                conArchivo(function (id) { procesoAccion(recordView, {accion: 'archivoFirmar', documentoId: id}, 'Expediente archivado.'); });
            });
        });

        $block.find('.js-apelacion-resolver').on('click', function () {
            if (!val('.js-recurso-resultado') || !archivoDe($block, '.js-proceso-documento')) { Espo.Ui.error('Indique el resultado y cargue la decisión de segunda instancia.'); return; }

            conArchivo(function (id) {
                procesoAccion(recordView, {accion: 'resolverApelacion', resultado: val('.js-recurso-resultado'), fecha: val('.js-apelacion-fecha'), documentoId: id},
                    'Decisión de segunda instancia registrada.');
            });
        });
    };

    /* ── Cumplimiento de la orden o medida ── */

    const htmlValoracion = function (cu, clave) {
        return '<small class="alcaldia-proceso__incumple">Incumplida: haga la valoración jurídica (el CRM no impone una medida nueva).</small>'
            + '<select class="form-control input-sm js-c-valoracion">' + opciones(cu.valoraciones || []) + '</select>'
            + '<textarea class="form-control input-sm js-c-motivacion" rows="2" placeholder="Motivación"></textarea>'
            + '<button type="button" class="btn btn-primary btn-xs js-c-accion" data-tipo="' + clave + '"><span class="fas fa-scale-balanced"></span> Registrar valoración</button>';
    };

    const htmlMedidaCumplimiento = function (cu, m) {
        const fase = m.fase;
        const archivo = '<input type="file" class="form-control input-sm js-c-archivo" accept=".pdf,image/*">';
        let form = '';

        if (fase === 'tesoreria') {
            form = '<div class="alcaldia-proceso__fila"><div><label>Valor de la multa</label><input type="text" class="form-control input-sm js-c-valor" placeholder="$"></div>'
                + '<div><label>Fecha de remisión</label><input type="date" class="form-control input-sm js-c-fecha" value="' + hoyISO() + '"></div></div>'
                + '<label>Oficio de remisión</label>' + archivo
                + '<button type="button" class="btn btn-primary btn-xs js-c-accion" data-tipo="tesoreria"><span class="fas fa-share"></span> Remitir a Tesorería</button>';
        } else if (fase === 'tesoreriaResultado') {
            form = '<small>Remitida a Tesorería · ' + escapeHtml((m.obligacion || {}).estado) + ' · control el ' + fechaDMA((m.obligacion || {}).fechaAlertaControl) + '</small>'
                + '<select class="form-control input-sm js-c-resultado">' + opciones(cu.resultadosTesoreria || []) + '</select>'
                + '<input type="text" class="form-control input-sm js-c-observacion" placeholder="Observación (recibo, acuerdo…)">'
                + '<label>Soporte</label>' + archivo
                + '<button type="button" class="btn btn-primary btn-xs js-c-accion" data-tipo="tesoreriaResultado"><span class="fas fa-check"></span> Registrar resultado de Tesorería</button>';
        } else if (fase === 'programarPedagogica') {
            form = '<div class="alcaldia-proceso__fila"><div><label>Programa o entidad</label><input type="text" class="form-control input-sm js-c-dependencia"></div>'
                + '<div><label>Fecha</label><input type="date" class="form-control input-sm js-c-fecha"></div></div>'
                + '<button type="button" class="btn btn-primary btn-xs js-c-accion" data-tipo="programarPedagogica"><span class="fas fa-calendar"></span> Programar actividad</button>';
        } else if (fase === 'asistencia') {
            form = '<small>Programada: ' + escapeHtml((m.ejecucion || {}).dependencia) + ' · ' + fechaDMA((m.ejecucion || {}).fechaProgramada) + '</small>'
                + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-c-asistio" checked> Asistió / cumplió la actividad</label>'
                + '<input type="text" class="form-control input-sm js-c-observacion" placeholder="Observación">'
                + '<label>Constancia</label>' + archivo
                + '<button type="button" class="btn btn-primary btn-xs js-c-accion" data-tipo="asistencia"><span class="fas fa-check"></span> Registrar asistencia</button>';
        } else if (fase === 'ejecucion') {
            form = '<div class="alcaldia-proceso__fila"><div><label>Fecha de ejecución</label><input type="date" class="form-control input-sm js-c-fecha" value="' + hoyISO() + '"></div>'
                + '<div><label>Quién la ejecutó / apoyo</label><input type="text" class="form-control input-sm js-c-dependencia"></div></div>'
                + '<textarea class="form-control input-sm js-c-resultado-texto" rows="2" placeholder="Cómo se ejecutó"></textarea>'
                + '<label>Acta o soporte</label>' + archivo
                + '<button type="button" class="btn btn-primary btn-xs js-c-accion" data-tipo="ejecucion"><span class="fas fa-check"></span> Registrar ejecución</button>';
        } else if (fase === 'valoracion') {
            form = htmlValoracion(cu, 'valorarMedida');
        } else {
            form = '<small class="alcaldia-proceso__ok"><span class="fas fa-circle-check"></span> ' + escapeHtml(m.estado) + (m.resultado ? ' · ' + escapeHtml(m.resultado) : '') + '</small>';
        }

        const rnmc = m.rnmc
            ? '<small class="alcaldia-proceso__ok"><span class="fas fa-circle-check"></span> RNMC: ' + escapeHtml(m.rnmc.medio) + ' · ' + fechaDMA(m.rnmc.fecha)
                + (m.rnmc.identificador ? ' · ' + escapeHtml(m.rnmc.identificador) : '') + ' ' + enlace(m.rnmc.constanciaId, 'constancia', 'fa-paperclip') + '</small>'
            : '<details class="alcaldia-proceso__pendiente"><summary>Falta el reporte al RNMC (art. 172 par. 2)</summary>'
                + '<div class="alcaldia-proceso__fila"><div><input type="date" class="form-control input-sm js-c-rnmc-fecha" value="' + hoyISO() + '"></div>'
                + '<div><select class="form-control input-sm js-c-rnmc-medio">' + opciones(['Aplicativo RNMC', 'Oficio a Policía Nacional', 'Correo electrónico']) + '</select></div></div>'
                + '<input type="text" class="form-control input-sm js-c-rnmc-id" placeholder="Identificador del registro (opcional)">'
                + '<input type="file" class="form-control input-sm js-c-rnmc-archivo" accept=".pdf,image/*">'
                + '<button type="button" class="btn btn-default btn-xs js-c-accion" data-tipo="rnmc"><span class="fas fa-upload"></span> Registrar reporte RNMC</button></details>';

        return '<div class="alcaldia-proceso__regla" data-medida="' + escapeHtml(m.id) + '">'
            + '<b>' + escapeHtml(m.nombre) + '</b> <span class="alcaldia-apertura__fase">' + escapeHtml(m.estado) + '</span>'
            + (m.condiciones ? '<small>' + escapeHtml(m.condiciones) + '</small>' : '') + form + rnmc + '</div>';
    };

    const htmlOrdenCumplimiento = function (estado, cu, o) {
        let form = '';

        if (o.fase === 'programarVerificacion') {
            form = '<div class="alcaldia-proceso__fila"><div><label>Responsable</label><select class="form-control input-sm js-c-responsable"><option value="">Seleccione…</option>' + opciones(estado.responsables || []) + '</select></div>'
                + '<div><label>Plazo</label><input type="date" class="form-control input-sm js-c-plazo" value="' + escapeHtml(o.fechaLimite || '') + '"></div></div>'
                + '<select class="form-control input-sm js-c-metodo">' + opciones(cu.metodos || []) + '</select>'
                + '<button type="button" class="btn btn-primary btn-xs js-c-accion" data-tipo="programarVerificacion"><span class="fas fa-user-check"></span> Programar verificación</button>';
        } else if (o.fase === 'verificacion') {
            form = '<small>Verificación a cargo de ' + escapeHtml(o.responsable) + (o.metodo ? ' · ' + escapeHtml(o.metodo) : '') + (o.fechaLimite ? ' · plazo ' + fechaDMA(o.fechaLimite) : '') + '</small>'
                + '<div class="alcaldia-proceso__fila"><div><select class="form-control input-sm js-c-resultado">' + opciones(cu.resultadosVerificacion || []) + '</select></div>'
                + '<div><input type="date" class="form-control input-sm js-c-fecha" value="' + hoyISO() + '"></div></div>'
                + '<textarea class="form-control input-sm js-c-observacion" rows="2" placeholder="Lo encontrado (obligatorio si no se cumplió)"></textarea>'
                + '<label>Evidencia</label><input type="file" class="form-control input-sm js-c-archivo" accept=".pdf,image/*">'
                + '<button type="button" class="btn btn-primary btn-xs js-c-accion" data-tipo="verificacion"><span class="fas fa-check"></span> Registrar verificación</button>';
        } else if (o.fase === 'cumplirOrden') {
            form = '<input type="text" class="form-control input-sm js-c-observacion" placeholder="Cómo se cumplió">'
                + '<label>Soporte</label><input type="file" class="form-control input-sm js-c-archivo" accept=".pdf,image/*">'
                + '<button type="button" class="btn btn-primary btn-xs js-c-accion" data-tipo="cumplirOrden"><span class="fas fa-check"></span> Registrar cumplimiento</button>';
        } else if (o.fase === 'valoracion') {
            form = (o.verificacion ? '<small>Verificación: ' + escapeHtml(o.verificacion.resultado) + ' · ' + escapeHtml(o.verificacion.observacion) + '</small>' : '') + htmlValoracion(cu, 'valorarOrden');
        } else {
            form = '<small class="alcaldia-proceso__ok"><span class="fas fa-circle-check"></span> ' + escapeHtml(o.estado)
                + (o.verificacion ? ' · verificada el ' + fechaDMA(o.verificacion.fecha) + ' ' + enlace(o.verificacion.soporteId, 'evidencia', 'fa-paperclip') : '') + '</small>';
        }

        return '<div class="alcaldia-proceso__regla" data-orden="' + escapeHtml(o.id) + '"><b>Orden de Policía</b> <span class="alcaldia-apertura__fase">' + escapeHtml(o.estado) + '</span>'
            + '<small>' + escapeHtml(o.texto) + ' · ' + escapeHtml(o.destinatario) + '</small>' + form + '</div>';
    };

    const htmlCumplimiento = function (estado) {
        const cu = estado.cumplimiento || {};
        const pend = cu.pendientes || [];

        if (!estado.puede.gestionar) {
            const o = cu.orden;

            return o && o.fase === 'verificacion' ? htmlOrdenCumplimiento(estado, cu, o)
                : '<p class="alcaldia-apertura__ayuda">Lo gestionan Apoyo Jurídico, el Inspector Ambiental y Aux. Administrativo · Inspección.</p>';
        }

        return '<p class="alcaldia-apertura__ayuda">Registre la ejecución de cada medida según su tipo, el reporte al RNMC y la verificación de la orden de Policía. Plazo de referencia: 5 días desde la firmeza (art. 223 num. 5).</p>'
            + (cu.medidas || []).map(function (m) { return htmlMedidaCumplimiento(cu, m); }).join('')
            + (cu.orden ? htmlOrdenCumplimiento(estado, cu, cu.orden) : '')
            + (pend.length
                ? '<p class="alcaldia-apertura__texto"><b>Pendiente para cerrar:</b></p><ul class="alcaldia-proceso__pendientes">'
                    + pend.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') + '</ul>'
                : '<button type="button" class="btn btn-primary btn-sm js-c-accion" data-tipo="cerrar"><span class="fas fa-flag-checkered"></span> Cerrar cumplimiento y pasar al Auto de Archivo</button>');
    };

    const bindCumplimiento = function (recordView, $block) {
        $block.find('.js-c-accion').on('click', function () {
            const tipo = $(this).data('tipo');
            const $card = $(this).closest('.alcaldia-proceso__regla');
            const v = function (sel) { return String($card.find(sel).val() || '').trim(); };
            const datos = {accion: 'cumplimiento', tipo: tipo, medidaId: $card.data('medida') || ''};
            let archivoSel = '.js-c-archivo';

            if (tipo === 'rnmc') {
                Object.assign(datos, {fecha: v('.js-c-rnmc-fecha'), medio: v('.js-c-rnmc-medio'), identificador: v('.js-c-rnmc-id')});
                archivoSel = '.js-c-rnmc-archivo';
            } else if (tipo === 'tesoreria') {
                if (!v('.js-c-valor')) { Espo.Ui.error('Indique el valor de la multa.'); return; }
                Object.assign(datos, {valor: v('.js-c-valor'), fecha: v('.js-c-fecha')});
            } else if (tipo === 'tesoreriaResultado' || tipo === 'verificacion') {
                Object.assign(datos, {resultado: v('.js-c-resultado'), observacion: v('.js-c-observacion'), fecha: v('.js-c-fecha')});
            } else if (tipo === 'programarPedagogica' || tipo === 'ejecucion') {
                Object.assign(datos, {dependencia: v('.js-c-dependencia'), fecha: v('.js-c-fecha'), resultado: v('.js-c-resultado-texto')});
            } else if (tipo === 'asistencia') {
                Object.assign(datos, {asistio: $card.find('.js-c-asistio').is(':checked'), observacion: v('.js-c-observacion')});
            } else if (tipo === 'valorarMedida' || tipo === 'valorarOrden') {
                if (!v('.js-c-motivacion')) { Espo.Ui.error('Escriba la motivación de la valoración.'); return; }
                Object.assign(datos, {valoracion: v('.js-c-valoracion'), motivacion: v('.js-c-motivacion')});
            } else if (tipo === 'programarVerificacion') {
                Object.assign(datos, {responsableId: v('.js-c-responsable'), plazo: v('.js-c-plazo'), metodo: v('.js-c-metodo')});
            } else if (tipo === 'cumplirOrden') {
                Object.assign(datos, {observacion: v('.js-c-observacion')});
            }

            const input = $card.find(archivoSel).get(0);
            const file = input && input.files && input.files[0];

            Espo.Ui.notify('Guardando…');
            subirArchivo(recordView, file || null).then(function (id) {
                procesoAccion(recordView, Object.assign(datos, {documentoId: id}), tipo === 'cerrar' ? 'Cumplimiento cerrado. Sigue el Auto de Archivo.' : 'Registrado.');
            }).catch(function () { Espo.Ui.notify(false); });
        });
    };

    /* ── Auto de Archivo (cierre del expediente) ── */

    const htmlArchivo = function (estado) {
        const ar = estado.archivo || {};
        const d = ar.datos || {};

        if ((ar.pendientes || []).length) {
            return '<p class="alcaldia-apertura__devuelto"><b>Aún no se puede archivar.</b> Quedan pendientes:</p>'
                + '<ul class="alcaldia-proceso__pendientes">' + ar.pendientes.map(function (t) { return '<li>' + escapeHtml(t) + '</li>'; }).join('') + '</ul>'
                + '<p class="alcaldia-apertura__ayuda">Resuélvalos en su paso o en su registro y vuelva a este paso.</p>';
        }

        return '<p class="alcaldia-apertura__ayuda">No hay recursos, órdenes ni medidas pendientes. Genere el Auto de Archivo, fírmelo y cárguelo: el expediente queda archivado y sus casos, finalizados.</p>'
            + '<label>Causal de archivo</label><input type="text" class="form-control js-archivo-causal" value="' + escapeHtml(d.causal || ar.causal || '') + '">'
            + '<label>Observación (opcional)</label><textarea class="form-control js-archivo-observacion" rows="2">' + escapeHtml(d.observacion || '') + '</textarea>'
            + '<label class="alcaldia-proceso__check"><input type="checkbox" class="js-archivo-notificar"' + (d.requiereNotificacion ? ' checked' : '') + '> Requiere notificación o comunicación</label>'
            + '<button type="button" class="btn btn-' + (d.formatoId ? 'default' : 'primary') + ' btn-sm js-archivo-generar"><span class="fas fa-file-word"></span> '
            + (d.formatoId ? 'Regenerar Auto de Archivo' : 'Generar Auto de Archivo (Word)') + '</button>'
            + (d.formatoId
                ? '<div class="alcaldia-apertura__descargas"><a class="btn btn-default btn-sm" href="' + descargaUrl(d.formatoId) + '" download>'
                    + '<span class="fas fa-file-word"></span> Descargar Auto de Archivo (Word)</a></div>'
                    + '<label>Auto de Archivo firmado (PDF) <span class="text-danger">*</span></label>'
                    + '<input type="file" class="form-control js-proceso-documento" accept="application/pdf,.pdf">'
                    + '<button type="button" class="btn btn-primary btn-sm js-archivo-firmar"><span class="fas fa-box-archive"></span> Cargar firmado y archivar</button>'
                : '');
    };

    const htmlArchivado = function (estado) {
        const d = (estado.archivo || {}).datos || {};

        return '<p class="alcaldia-apertura__texto"><span class="fas fa-box-archive"></span> <b>Expediente archivado</b> el ' + fechaDMA(d.fecha)
            + (d.por ? ' por ' + escapeHtml(d.por) : '') + '.</p>'
            + '<p class="alcaldia-apertura__ayuda">Los casos vinculados quedaron finalizados. Se pueden seguir registrando comunicaciones, como la respuesta al peticionario.</p>'
            + '<div class="alcaldia-apertura__descargas">' + enlace(d.firmadoId, 'Auto de Archivo firmado', 'fa-file-signature')
            + enlace(d.formatoId, 'Auto de Archivo (Word)', 'fa-file-word') + '</div>';
    };

    const htmlProcesoAccion = function (estado) {
        if (!estado.puede.gestionar && estado.fase === 'cumplimiento') {
            return htmlCumplimiento(estado);
        }

        if (!estado.puede.gestionar && estado.puede.soportePrueba) {
            return htmlSoportePrueba(estado);
        }

        if (!estado.puede.gestionar) {
            return '<p class="alcaldia-apertura__ayuda">Lo gestionan Apoyo Jurídico, el Inspector Ambiental y Aux. Administrativo · Inspección.</p>';
        }

        switch (estado.fase) {
            case 'citar': return htmlCitar(estado, false);
            case 'reprogramar': return htmlCitar(estado, true);
            case 'soporteCitacion': return htmlSoporteCitacion('La audiencia está programada. Descargue la citación, entréguela firmada y cargue la copia escaneada con la constancia de recibido.',
                ((estado.audiencias[estado.audiencias.length - 1] || {}).citacion || {}).documentoId);
            case 'audiencia': return htmlAudiencia(estado);
            case 'justificacion': return htmlJustificacion(estado);
            case 'soportePrueba': return htmlSoportePrueba(estado);
            case 'soportes': return htmlSoportesAudiencia(estado);
            case 'decision': return htmlDecision(estado);
            case 'notificar': return htmlNotificar(estado);
            case 'recursos': return htmlRecursos(estado);
            case 'reposicion': return htmlReposicion(estado);
            case 'apelacionRemitir': return htmlApelacionRemitir(estado);
            case 'apelacionEspera': return htmlApelacionEspera(estado);
            case 'cumplimiento': return htmlCumplimiento(estado);
            case 'archivo': return htmlArchivo(estado);
            case 'archivado': return htmlArchivado(estado);
            default: return htmlCumplirPaso(estado);
        }
    };

    const bindProceso = function (recordView, $block) {
        const val = function (selector) { return String($block.find(selector).val() || '').trim(); };
        const conArchivos = function (selectores, enviar) {
            Espo.Ui.notify('Cargando archivos…');
            Promise.all(selectores.map(function (sel) { return subirArchivo(recordView, archivoDe($block, sel)); }))
                .then(enviar)
                .catch(function () { Espo.Ui.notify(false); });
        };

        $block.find('.js-proceso-citar').on('click', function () {
            if (!val('.js-proceso-fecha') || !val('.js-proceso-hora')) { Espo.Ui.error('Indique la fecha y la hora de la audiencia.'); return; }
            if (!val('.js-proceso-medio')) { Espo.Ui.error('Indique el medio de citación.'); return; }
            if (!val('.js-proceso-lugar')) { Espo.Ui.error('Indique la dirección donde se realizará la audiencia.'); return; }

            procesoAccion(recordView, {
                accion: 'citar', fecha: val('.js-proceso-fecha'), hora: val('.js-proceso-hora'), medio: val('.js-proceso-medio'),
                lugarTipo: val('.js-proceso-lugar-tipo'), lugar: val('.js-proceso-lugar'),
            }, 'Audiencia programada. Descargue la citación en Word.');
        });

        // Despacho: dirección fija; lugar de los hechos: la del caso (editable); otra: libre.
        $block.find('.js-proceso-lugar-tipo').on('change', function () {
            const $l = $block.find('.js-proceso-lugar');
            const tipo = this.value;

            $l.prop('readonly', tipo === 'Despacho de la Inspección')
                .val(tipo === 'Despacho de la Inspección' ? $l.data('inspeccion') : (tipo === 'Lugar de los hechos' ? $l.data('hechos') : ''))
                .attr('placeholder', tipo === 'Otra dirección' ? 'Dirección, barrio y referencia del lugar' : '');

            if (tipo === 'Otra dirección') { $l.trigger('focus'); }
        });

        $block.find('.js-proceso-citacion-previa').on('click', function () {
            if (!val('.js-proceso-fecha') || !val('.js-proceso-hora')) { Espo.Ui.error('Indique la fecha y la hora de la audiencia.'); return; }

            Espo.Ui.notify('Generando citación…');
            Espo.Ajax.postRequest('Case/action/procesoAccion', {
                id: recordView.model.id, accion: 'citacionPrevia', fecha: val('.js-proceso-fecha'), hora: val('.js-proceso-hora'),
                lugarTipo: val('.js-proceso-lugar-tipo'), lugar: val('.js-proceso-lugar'),
            }).then(function (r) {
                Espo.Ui.notify(false);

                if (r && r.formatoId) {
                    window.location.href = descargaUrl(r.formatoId);
                }
            }).catch(function () { Espo.Ui.notify(false); });
        });

        $block.find('.js-proceso-soporte-citacion').on('click', function () {
            const $scope = $(this).parent();

            if (!archivoDe($scope, '.js-proceso-soporte')) { Espo.Ui.error('Cargue la citación firmada y escaneada.'); return; }

            Espo.Ui.notify('Cargando archivos…');
            subirArchivo(recordView, archivoDe($scope, '.js-proceso-soporte')).then(function (id) {
                procesoAccion(recordView, {accion: 'soporteCitacion', soporteId: id, fechaEntrega: String($scope.find('.js-proceso-fecha-entrega').val() || '')},
                    'Soporte de entrega registrado.');
            }).catch(function () { Espo.Ui.notify(false); });
        });

        $block.find('input[name="alcaldia-proceso-resultado"]').on('change', function () {
            $block.find('.alcaldia-proceso__form').addClass('hidden');
            $block.find('.alcaldia-proceso__form[data-opcion="' + this.value + '"]').removeClass('hidden');
            $block.find('.js-proceso-resultado-audiencia').removeClass('hidden');
        });

        $block.find('.js-proceso-conciliacion').on('change', function () {
            $block.find('.js-proceso-compromiso-box').toggleClass('hidden', !this.checked);
        });

        $block.find('.js-proceso-resultado-audiencia').on('click', function () {
            const opcion = String($block.find('input[name="alcaldia-proceso-resultado"]:checked').val() || '');

            if (opcion === 'realizada') {
                if (!val('.js-proceso-resultado')) { Espo.Ui.error('Registre el resultado de la diligencia.'); return; }

                procesoAccion(recordView, {
                    accion: 'realizada', resultado: val('.js-proceso-resultado'), participantes: val('.js-proceso-participantes'),
                    conciliacion: $block.find('.js-proceso-conciliacion').is(':checked'),
                    compromiso: val('.js-proceso-compromiso'), compromisoFechaLimite: val('.js-proceso-compromiso-fecha'),
                }, 'Audiencia registrada. Cargue el acta firmada y el audio.');
            } else if (opcion === 'inasistencia') {
                procesoAccion(recordView, {accion: 'inasistencia', observacion: val('.js-proceso-observacion-inasistencia')},
                    'Inasistencia registrada. Corre el término para justificar.');
            } else if (opcion === 'prueba') {
                if (!val('.js-proceso-tipo-prueba') || !val('.js-proceso-causa-prueba') || !val('.js-proceso-responsable') || !val('.js-proceso-plazo')) {
                    Espo.Ui.error('Complete la prueba, qué se debe verificar, el responsable y el plazo.');
                    return;
                }

                procesoAccion(recordView, {
                    accion: 'suspender', tipo: 'Prueba o actuación externa', tipoPrueba: val('.js-proceso-tipo-prueba'),
                    causa: val('.js-proceso-causa-prueba'), responsableId: val('.js-proceso-responsable'), plazo: val('.js-proceso-plazo'),
                }, 'Audiencia suspendida. Se avisó al responsable de la prueba.');
            } else if (opcion === 'otra') {
                if (!val('.js-proceso-causa-otra')) { Espo.Ui.error('Indique la causa.'); return; }

                procesoAccion(recordView, {accion: 'suspender', tipo: 'Otra causa', causa: val('.js-proceso-causa-otra')}, 'Audiencia suspendida.');
            }
        });

        $block.find('.js-proceso-justificacion').on('click', function () {
            if (!val('.js-proceso-decision')) { Espo.Ui.error('Indique la decisión sobre la justificación.'); return; }

            conArchivos(['.js-proceso-documento'], function (ids) {
                procesoAccion(recordView, {accion: 'resolverJustificacion', decision: val('.js-proceso-decision'), observacion: val('.js-proceso-observacion'), documentoId: ids[0]},
                    'Justificación resuelta. Reprograme la audiencia.');
            });
        });

        $block.find('.js-proceso-soporte-prueba').on('click', function () {
            if (!archivoDe($block, '.js-proceso-documento')) { Espo.Ui.error('Cargue el soporte de la prueba.'); return; }

            conArchivos(['.js-proceso-documento'], function (ids) {
                procesoAccion(recordView, {accion: 'soportePrueba', documentoId: ids[0], observacion: val('.js-proceso-observacion')},
                    'Soporte cargado. Reprograme la audiencia.');
            });
        });

        $block.find('.js-proceso-sin-audio').on('change', function () {
            $block.find('.js-proceso-excepcion').toggleClass('hidden', !this.checked);
        });

        $block.find('.js-proceso-soportes').on('click', function () {
            const acta = archivoDe($block, '.js-proceso-acta');
            const excepcion = $block.find('.js-proceso-sin-audio').is(':checked') ? val('.js-proceso-excepcion') : '';

            if (acta && !/pdf$/i.test(acta.type) && !/\.pdf$/i.test(acta.name)) { Espo.Ui.error('El acta firmada debe ser un PDF.'); return; }
            if ($block.find('.js-proceso-sin-audio').is(':checked') && !excepcion) { Espo.Ui.error('Indique por qué no fue posible grabar.'); return; }
            if (!acta && !archivoDe($block, '.js-proceso-audio') && !excepcion) { Espo.Ui.error('Cargue el acta, el audio o la constancia.'); return; }

            conArchivos(['.js-proceso-acta', '.js-proceso-audio'], function (ids) {
                procesoAccion(recordView, {accion: 'soportes', actaId: ids[0], audioId: ids[1], excepcionAudio: excepcion}, 'Soportes de la audiencia cargados.');
            });
        });

        $block.find('.js-proceso-cumplir').on('click', function () {
            if (!val('.js-proceso-observacion')) { Espo.Ui.error('Describa cómo se cumplió el paso.'); return; }

            procesoAccion(recordView, {accion: 'cumplirPaso', observacion: val('.js-proceso-observacion')}, 'Paso registrado como cumplido.');
        });
    };

    const mountProcesoBlock = function (recordView, $side) {
        const model = recordView.model;

        if (!recordView._alcaldiaProcesoListener) {
            recordView._alcaldiaProcesoListener = true;
            recordView.listenTo(model, 'sync', function () {
                const $s = recordView.$el.find('.record-grid > .side');

                if ($s.length) {
                    $s.find('.alcaldia-proceso').removeData('procesoKey');
                    mountProcesoBlock(recordView, $s);
                }
            });
        }

        let $block = $side.find('.alcaldia-proceso');

        if (!model.get('expedienteId')) {
            $block.remove();

            return;
        }

        const key = model.id + '|' + model.get('expedienteId') + '|' + Math.floor(Date.now() / 5000);

        if ($block.data('procesoKey') === key) {
            return;
        }

        SilentAjax.getRequest('Case/action/procesoEstado', {id: model.id}).then(function (estado) {
            $block = $side.find('.alcaldia-proceso');

            if (!estado || !estado.aplica) {
                $block.remove();

                return;
            }

            if (!$block.length) {
                $block = $('<section class="alcaldia-proceso panel panel-default"></section>');
                const $apertura = $side.find('.alcaldia-apertura');

                $apertura.length ? $apertura.after($block) : $side.prepend($block);
            }

            $block.data('procesoKey', key);
            pintarProceso($block, recordView, estado, true);
            ubicarBloquesExpediente($side);
        });
    };

    const pintarProceso = function ($block, ctx, estado, conEncabezado, ancho) {
        const proceso = '<p class="alcaldia-apertura__texto"><small>' + escapeHtml(estado.expediente.tipoTramite) + '</small></p>'
            + htmlProcesoPasos(estado);
        const accion = '<div class="alcaldia-proceso__accion">' + htmlProcesoAccion(estado) + '</div>';
        const registros = htmlDecisionResumen(estado) + htmlProcesoAudiencias(estado);

        // A todo el ancho (vista del expediente): formularios a la izquierda, proceso a la derecha.
        $block.toggleClass('alcaldia-proceso--ancho', !!ancho).html((conEncabezado ? '<div class="panel-heading"><h4 class="panel-title">Proceso del expediente</h4>'
                + '<span class="alcaldia-apertura__fase is-abierto">' + escapeHtml(estado.pasoActual) + '</span></div>' : '')
            + (ancho
                ? '<div class="panel-body alcaldia-proceso__grid"><div class="alcaldia-proceso__izq">'
                    + '<h5 class="alcaldia-proceso__titulo">' + escapeHtml(estado.pasoActual) + '</h5>' + accion + '</div>'
                    + '<div class="alcaldia-proceso__der">' + proceso + registros + '</div></div>'
                : '<div class="panel-body">' + proceso + accion + registros + '</div>'));

        bindProceso(ctx, $block);
        bindDecision(ctx, $block);
        bindCumplimiento(ctx, $block);
    };

    /**
     * Mismo bloque del proceso dentro de otra vista (p. ej. el expediente). Las acciones
     * se registran sobre el caso principal; al terminar se vuelve a pintar y se avisa.
     */
    const mountProcesoEn = function ($container, caseId, onChange, ancho) {
        const ctx = {
            model: {
                id: caseId,
                fetch: function () {
                    mountProcesoEn($container, caseId, onChange, ancho);

                    if (onChange) {
                        onChange();
                    }
                },
            },
        };

        return SilentAjax.getRequest('Case/action/procesoEstado', {id: caseId}).then(function (estado) {
            if (!estado || !estado.aplica) {
                return false;
            }

            let $block = $container.children('.alcaldia-proceso');

            if (!$block.length) {
                $block = $('<section class="alcaldia-proceso alcaldia-proceso--embebido"></section>');
                $container.empty().append($block);
            }

            pintarProceso($block, ctx, estado, false, ancho);

            return true;
        });
    };

    const removeLeftHistoryDuplicates = function (recordView) {
        const $left = recordView.$el.find('.record-grid > .left');

        if (!$left.length) {
            return;
        }

        LEFT_HISTORY_PANEL_NAMES.forEach(function (name) {
            $left.find(panelSelector(name)).remove();
        });

        $left.find('.panel-caseTimeline, .panel-caseCronograma').remove();

        $left.find('.panel, .record-panel').each(function () {
            const $panel = $(this);

            if (
                $panel.find('.case-timeline, .case-cronograma, .stream-panel, .comunicaciones-caso-panel').length
                && !$panel.closest('.record-grid > .side').length
            ) {
                $panel.remove();
            }
        });
    };

    // La definición no es una etapa aislada: nace de la visita vigente.
    // Por ello se inserta dentro de la tarjeta de la última visita diligenciada.
    const embedDecisionInCurrentVisit = function (recordView) {
        const $actaPanel = findIn(recordView.$el, ACTA_VISITA_PANEL);
        const $decisionPanel = findIn(recordView.$el, DECISION_PANEL);
        const $card = $actaPanel.find('.case-visita-archivo-card.is-current').first();

        if (!$card.length || !$decisionPanel.length) {
            return;
        }

        const $field = $decisionPanel.find('.case-decision-juridica').first().closest('.field');

        if (!$field.length || $field.closest('.case-visita-decision').length) {
            return;
        }

        const $host = $('<div class="case-visita-decision"></div>');
        $host.append($field);
        $card.append($host);
        $decisionPanel.hide();
    };

    const distribute = function (recordView) {
        if (!recordView || !recordView.$el || recordView.mode !== 'detail') {
            return;
        }

        const $side = recordView.$el.find('.record-grid > .side');
        const $leftMiddle = recordView.$el.find('.record-grid > .left > .middle');

        if (!$side.length) {
            return;
        }

        removeLeftHistoryDuplicates(recordView);
        embedDecisionInCurrentVisit(recordView);

        let $container = $side.find('.' + CONTAINER_CLASS);

        if (!$container.length) {
            $container = $('<div class="' + CONTAINER_CLASS + '"></div>');
        }

        FIELD_PANELS.forEach(function (name) {
            const $panel = findIn($leftMiddle, name);

            if ($panel.length && !$panel.closest('.' + CONTAINER_CLASS).length) {
                $container.append($panel);
            }
        });

        let $insertAfter = null;

        // Para Patrullaje, la preparación de la visita es la acción principal
        // y se muestra antes de la línea de tiempo.
        if (PatrulleroActa.isPatrulleroUser(recordView.getUser())) {
            const $actaVisita = findIn(recordView.$el, ACTA_VISITA_PANEL);
            const $formatoGenerado = findIn(recordView.$el, FORMATO_GENERADO_PANEL);

            if ($actaVisita.length) {
                $actaVisita
                    .addClass('alcaldia-patrullaje-principal')
                    .removeClass('hidden');
                $side.prepend($actaVisita);
                $insertAfter = $actaVisita;
            }

            // El panel «Formato generado» se retiró del detalle para todos los perfiles.
            $formatoGenerado.remove();
        }

        // Para Asignación, este es el panel de trabajo principal. Se ubica
        // antes de la línea de tiempo sin alterar la vista de los demás roles.
        if (RadicacionFields.isAsignadorUser(recordView.getUser())) {
            const $asignacion = findIn(recordView.$el, ASIGNACION_PANEL);

            if ($asignacion.length) {
                $asignacion
                    .addClass('alcaldia-asignacion-principal')
                    .removeClass('hidden alcaldia-inspeccion-asignacion-hidden');
                $side.prepend($asignacion);
                mountAssignmentSidecarLauncher(recordView, $asignacion);
                $insertAfter = $asignacion;
            }
        } else if (
            RadicacionFields.isAdminUser(recordView.getUser())
            || RadicacionFields.isInspeccionUser(recordView.getUser())
        ) {
            // Admin (puede reasignar) e Inspección (solo lectura) ven el mismo
            // resumen: responsable actual + histórico de asignaciones.
            const $asignacion = findIn(recordView.$el, ASIGNACION_PANEL);

            if ($asignacion.length && !recordView.model.isNew()) {
                // Arriba en la columna lateral, como para el Director Técnico:
                // en su posición por defecto quedaba al fondo de la columna izquierda.
                $asignacion
                    .addClass('alcaldia-asignacion-card-host')
                    .removeClass('hidden alcaldia-inspeccion-asignacion-hidden');
                $side.prepend($asignacion);
                $insertAfter = $asignacion;
                mountAssignmentSidecarLauncher(recordView, $asignacion, {
                    canEdit: RadicacionFields.isAdminUser(recordView.getUser()),
                });
            }
        }

        TOP_PANELS.forEach(function (name) {
            const $panel = findIn($side, name);

            if (!$panel.length) {
                return;
            }

            if (!$insertAfter) {
                $side.prepend($panel);
            } else {
                $insertAfter.after($panel);
            }

            $insertAfter = $panel;
        });

        if ($container.children().length) {
            if ($insertAfter) {
                $insertAfter.after($container);
            } else {
                $side.prepend($container);
            }

            $insertAfter = $container;
        }

        BOTTOM_PANELS.forEach(function (name) {
            const $panel = findIn($side, name);

            if (!$panel.length) {
                return;
            }

            if ($insertAfter) {
                $insertAfter.after($panel);
            } else {
                $side.prepend($panel);
            }

            $insertAfter = $panel;
        });

        removeLeftHistoryDuplicates(recordView);
        mountCierreBlock(recordView, $side);
        mountAperturaBlock(recordView, $side);
        mountProcesoBlock(recordView, $side);
        ubicarBloquesExpediente($side);
    };

    const schedule = function (recordView) {
        [0, 100, 400, 1000, 2000, 3500].forEach(function (delay) {
            window.setTimeout(function () {
                if (!recordView.isRendered || !recordView.isRendered()) {
                    return;
                }

                distribute(recordView);
            }, delay);
        });
    };

    return {
        distribute: distribute,
        schedule: schedule,
        mountProcesoEn: mountProcesoEn,
    };
});
