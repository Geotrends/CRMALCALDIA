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
     * Pasteles — una familia cromática distinta por etapa (sin repetir verdes/azules parecidos).
     * Naranja · Azul · Rosa · Violeta · Amarillo · Verde · Marrón · Gris
     */
    const PALETTE = {
        'Pendiente de radicacion': {
            bg: '#ffedd5',
            text: '#9a3412',
            border: '#fdba74',
            kanban: '#f97316',
            kanbanCol: '#fff7ed',
            kanbanText: '#9a3412',
        },
        'Radicado': {
            bg: '#dbeafe',
            text: '#1e3a8a',
            border: '#93c5fd',
            kanban: '#3b82f6',
            kanbanCol: '#eff6ff',
            kanbanText: '#1d4ed8',
        },
        'Asignado': {
            bg: '#fce7f3',
            text: '#9d174d',
            border: '#f9a8d4',
            kanban: '#ec4899',
            kanbanCol: '#fdf2f8',
            kanbanText: '#9d174d',
        },
        'En proceso': {
            bg: '#ede9fe',
            text: '#5b21b6',
            border: '#c4b5fd',
            kanban: '#8b5cf6',
            kanbanCol: '#f5f3ff',
            kanbanText: '#6d28d9',
        },
        'Visita realizada': {
            bg: '#fef9c3',
            text: '#854d0e',
            border: '#fde047',
            kanban: '#eab308',
            kanbanCol: '#fefce8',
            kanbanText: '#a16207',
        },
        'Visita aprobada': {
            bg: '#dcfce7',
            text: '#166534',
            border: '#86efac',
            kanban: '#22c55e',
            kanbanCol: '#f0fdf4',
            kanbanText: '#15803d',
        },
        'Finalizado': {
            bg: '#ede0d4',
            text: '#6b4423',
            border: '#c4a484',
            kanban: '#a18072',
            kanbanCol: '#faf5f0',
            kanbanText: '#78350f',
        },
        'Proceso cerrado': {
            bg: '#e2e8f0',
            text: '#334155',
            border: '#94a3b8',
            kanban: '#64748b',
            kanbanCol: '#f8fafc',
            kanbanText: '#475569',
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
