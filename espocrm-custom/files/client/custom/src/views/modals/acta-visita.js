define('custom:views/modals/acta-visita', [
    'views/modals/edit',
    'custom:helpers/acta-visita-from-case',
], function (Dep, ActaFromCase) {

    return Dep.extend({

        layoutName: 'edit',

        createRecordView: function (model, callback) {
            Dep.prototype.createRecordView.call(this, model, (view) => {
                if (callback) {
                    callback(view);
                }

                this.listenToOnce(view, 'before:save', () => {
                    ActaFromCase.ensureNameBeforeSave(view.model, this.getUser());
                });

                this.listenToOnce(view, 'after:render', () => {
                    ActaFromCase.lockAutoFields(view);
                    [0, 180, 600].forEach((delay) => window.setTimeout(() => {
                        this.applyCompactActaLayout(view);
                    }, delay));
                });
            });
        },

        applyCompactActaLayout: function (view) {
            if (!view || !view.$el || !view.$el.length) {
                return;
            }

            const $root = view.$el.addClass('alcaldia-acta-modal-layout');
            const $grid = $root.find('.record-grid').first();
            const $side = $grid.children('.side').first();
            const $left = $grid.children('.left').first();
            let $middle = $left.find('> .middle').first();

            // En el sidecar la columna izquierda puede no tener .middle.
            // En ese caso ella misma es el destino de todos los paneles.
            if (!$middle.length) {
                $middle = $left;
            }

            $grid.css({display: 'block', width: '100%'});
            $left.css({float: 'none', maxWidth: 'none', width: '100%'});

            // El funcionario que realizó la visita es el primer bloque de la ficha.
            if ($side.length && $middle.length && !$side.hasClass('alcaldia-acta-funcionario')) {
                $side.addClass('alcaldia-acta-funcionario');
                $side.css({float: 'none', marginBottom: '16px', width: '100%'});
                $middle.prepend($side);
            }

            $root.find('.panel, .record-panel').each(function () {
                const $panel = $(this);
                const $heading = $panel.children('.panel-heading').first();

                if (!$heading.length || $panel.hasClass('alcaldia-acta-collapsible')) {
                    return;
                }

                $panel.addClass('alcaldia-acta-collapsible');
                $panel.get(0).style.setProperty('border-left', '0', 'important');
                $heading.get(0).style.setProperty('border-left', '0', 'important');
                $heading.get(0).style.setProperty('box-shadow', 'none', 'important');
                $heading.attr({role: 'button', tabindex: '0', 'aria-expanded': 'true'});
                $heading.css({alignItems: 'center', display: 'flex'});
                $heading.find('.panel-title').css({display: 'block', marginRight: 'auto', width: 'auto'});
                $heading.append('<span class="alcaldia-acta-collapsible__chevron fas fa-chevron-up" aria-hidden="true"></span>');
                $heading.find('.alcaldia-acta-collapsible__chevron').css({marginLeft: 'auto', marginTop: 0});

                const toggle = function () {
                    const collapsed = !$panel.hasClass('alcaldia-acta-collapsed');
                    const $body = $panel.children('.panel-body').first();
                    $panel.toggleClass('alcaldia-acta-collapsed', collapsed);
                    $body.toggle(!collapsed);
                    $heading.attr('aria-expanded', collapsed ? 'false' : 'true');
                    $heading.find('.alcaldia-acta-collapsible__chevron')
                        .toggleClass('fa-chevron-up', !collapsed)
                        .toggleClass('fa-chevron-down', collapsed);
                };

                $heading.off('click.actaCollapse').on('click.actaCollapse', toggle);
                $heading.off('keydown.actaCollapse').on('keydown.actaCollapse', function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggle();
                    }
                });
            });
        },
    });
});
