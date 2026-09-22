define('custom:helpers/case-detail-side-panels', [
    'custom:helpers/radicacion-fields',
    'custom:helpers/asignador-assignment-ui',
    'custom:helpers/patrullero-acta',
], function (RadicacionFields, AsignadorAssignmentUi, PatrulleroActa) {

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

    const mountAssignmentSidecarLauncher = function (recordView, $panel) {
        const $cell = $panel.find('.cell[data-name="assignedUser"]').first();

        if (!$cell.length) {
            return;
        }

        $cell.addClass('alcaldia-sidecar-only-control');
        $cell.find('.alcaldia-assignment-sidecar-launcher').remove();

        const selectedName = String(
            $panel.find('[data-name="assignedUser"] input').val() || ''
        ).trim();
        const label = selectedName && selectedName !== 'Seleccionar'
            ? 'Gestionar asignación: ' + selectedName
            : 'Asignar responsable';
        const $button = $(
            '<button type="button" class="btn alcaldia-assignment-sidecar-launcher">' +
            '<span class="fas fa-user-plus" aria-hidden="true"></span>' +
            '<span class="alcaldia-assignment-sidecar-launcher__label"></span>' +
            '<span class="fas fa-chevron-right" aria-hidden="true"></span>' +
            '</button>'
        );

        $button.find('.alcaldia-assignment-sidecar-launcher__label').text(label);
        $button.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            // Un único flujo para asignar: el mismo utilizado por la acción
            // «Editar». El diálogo permite seleccionar un usuario activo y
            // exige confirmar con Guardar antes de registrar la asignación.
            AsignadorAssignmentUi.openAssignmentEditPage(recordView);
        });

        $cell.append($button);
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
