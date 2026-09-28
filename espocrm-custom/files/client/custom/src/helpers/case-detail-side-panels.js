define('custom:helpers/case-detail-side-panels', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/asignador-assignment-ui',
    'custom:helpers/patrullero-acta',
    'custom:helpers/silent-ajax',
], function (RadicacionFields, AsignadorAssignmentUi, PatrulleroActa, SilentAjax) {

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

            // Patrullaje trabaja con el Word de preparación y los archivos
            // adjuntos de cada visita; no requiere el panel institucional de
            // formatos generados en esta vista.
            $formatoGenerado.addClass('hidden').hide();
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
    };
});
