define('custom:helpers/case-status-colors', [], function () {

    /** @type {string[]} */
    const ORDERED_STATUSES = [
        'Pendiente de radicacion',
        'Radicado',
        'Asignado',
        'En proceso',
        'Visita realizada',
        'Visita aprobada',
        'Finalizado',
        'Proceso cerrado',
    ];

    /**
     * Paleta pastel — cada etapa con matiz distinto.
     * @type {Object<string, {bg: string, text: string, border: string, kanban: string, kanbanCol: string, kanbanText: string}>}
     */
    const PALETTE = {
        'Pendiente de radicacion': {
            bg: '#ffedd5',
            text: '#c2410c',
            border: '#fdba74',
            kanban: '#fb923c',
            kanbanCol: '#fff7ed',
            kanbanText: '#c2410c',
        },
        'Radicado': {
            bg: '#dbeafe',
            text: '#1e40af',
            border: '#93c5fd',
            kanban: '#60a5fa',
            kanbanCol: '#eff6ff',
            kanbanText: '#1d4ed8',
        },
        'Asignado': {
            bg: '#cffafe',
            text: '#0e7490',
            border: '#67e8f9',
            kanban: '#22d3ee',
            kanbanCol: '#ecfeff',
            kanbanText: '#0e7490',
        },
        'En proceso': {
            bg: '#fae8ff',
            text: '#a21caf',
            border: '#e879f9',
            kanban: '#d946ef',
            kanbanCol: '#fdf4ff',
            kanbanText: '#a21caf',
        },
        'Visita realizada': {
            bg: '#ecfccb',
            text: '#4d7c0f',
            border: '#bef264',
            kanban: '#a3e635',
            kanbanCol: '#f7fee7',
            kanbanText: '#4d7c0f',
        },
        'Visita aprobada': {
            bg: '#dcfce7',
            text: '#15803d',
            border: '#86efac',
            kanban: '#4ade80',
            kanbanCol: '#f0fdf4',
            kanbanText: '#15803d',
        },
        'Finalizado': {
            bg: '#ccfbf1',
            text: '#0f766e',
            border: '#5eead4',
            kanban: '#2dd4bf',
            kanbanCol: '#f0fdfa',
            kanbanText: '#0f766e',
        },
        'Proceso cerrado': {
            bg: '#f1f5f9',
            text: '#64748b',
            border: '#cbd5e1',
            kanban: '#94a3b8',
            kanbanCol: '#f8fafc',
            kanbanText: '#64748b',
        },
    };

    const LABEL_CLASS = {
        'Pendiente de radicacion': 'casePendiente',
        'Radicado': 'caseRadicado',
        'Asignado': 'caseAsignado',
        'En proceso': 'caseEnProceso',
        'Visita realizada': 'caseVisitaRealizada',
        'Visita aprobada': 'caseVisitaAprobada',
        'Finalizado': 'caseFinalizado',
        'Proceso cerrado': 'caseCerrado',
    };

    const GENERIC_LABEL_CLASSES = [
        'label-primary',
        'label-success',
        'label-info',
        'label-warning',
        'label-danger',
        'label-default',
    ].join(' ');

    const get = function (status) {
        return PALETTE[String(status || '').trim()] || null;
    };

    const getLabelClass = function (status) {
        const key = String(status || '').trim();

        return LABEL_CLASS[key] ? 'label-' + LABEL_CLASS[key] : null;
    };

    const resolveStatusKey = function (columnKey, index) {
        const key = String(columnKey || '').trim();

        if (key && PALETTE[key]) {
            return key;
        }

        if (typeof index === 'number' && ORDERED_STATUSES[index]) {
            return ORDERED_STATUSES[index];
        }

        return '';
    };

    const applyToLabel = function ($label, status) {
        if (!$label || !$label.length) {
            return;
        }

        const colors = get(status);
        const labelClass = getLabelClass(status);

        if (!colors) {
            return;
        }

        $label
            .attr('data-case-status', status)
            .removeClass(GENERIC_LABEL_CLASSES)
            .css({
                backgroundColor: colors.bg,
                color: colors.text,
                borderLeft: '3px solid ' + colors.border,
                fontWeight: '600',
            });

        if (labelClass) {
            $label.addClass(labelClass);
        }
    };

  /**
   * Pinta columna y encabezado del kanban con colores pastel (inline, sin depender de ::before).
   */
    const applyKanbanColumn = function ($column, $header, $label, status) {
        const colors = get(status);

        if (!colors || !$column || !$column.length) {
            return;
        }

        $column.attr('data-case-status', status).addClass('case-kanban-status-col');
        $header.attr('data-case-status', status).addClass('case-kanban-status-header');

        $column.css({
            backgroundColor: colors.kanbanCol,
        });

        $header.css({
            backgroundColor: colors.kanbanCol,
        });

        if ($label && $label.length) {
            var $dot = $label.find('.case-kanban-status-dot');

            if (!$dot.length) {
                $dot = $('<span class="case-kanban-status-dot" aria-hidden="true"></span>');
                $label.prepend($dot);
            }

            $dot.css({
                backgroundColor: colors.kanban,
            });

            $label.find('.kanban-group-title').css({
                color: colors.kanbanText,
            });
        }

        $column.find('.item .panel').css({
            borderLeft: '4px solid ' + colors.kanban,
        });
    };

    return {
        ORDERED_STATUSES: ORDERED_STATUSES,
        PALETTE: PALETTE,
        get: get,
        getLabelClass: getLabelClass,
        resolveStatusKey: resolveStatusKey,
        applyToLabel: applyToLabel,
        applyKanbanColumn: applyKanbanColumn,
    };
});
