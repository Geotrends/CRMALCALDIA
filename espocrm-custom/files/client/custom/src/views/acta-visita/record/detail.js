define('custom:views/acta-visita/record/detail', [
    'views/record/detail',
    'custom:helpers/formato-acta-visita-access',
], function (Dep, FormatoActaVisitaAccess) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.listenTo(this.model, 'change:cFormatoActaVisitaPdfId', function () {
                this.toggleFormatoGeneradoPanel();
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.toggleFormatoGeneradoPanel();
            this.organizeActaLayout();
            this.makePanelsCollapsible();
        },

        findPanel: function (name) {
            return this.$el.find(
                '.panel[data-name="' + name + '"], ' +
                '.record-panel[data-name="' + name + '"], ' +
                '[data-name="' + name + '"].panel'
            );
        },

        toggleFormatoGeneradoPanel: function () {
            const show = FormatoActaVisitaAccess.canDownloadFormatoActaVisita(this.getUser(), this.model)
                && FormatoActaVisitaAccess.isFormatoActaHabilitado(this.model)
                && !!this.model.get('cFormatoActaVisitaPdfId');

            this.findPanel('formatoGenerado').toggle(show);
        },

        organizeActaLayout: function () {
            const $grid = this.$el.find('.record-grid').first();
            const $side = $grid.children('.side').first();
            const $middle = $grid.children('.left').find('> .middle').first();

            if (!$side.length || !$middle.length || $side.hasClass('alcaldia-acta-funcionario')) {
                return;
            }

            // El responsable y sus equipos son el primer dato operativo de
            // la visita. Se conservan sus campos, pero en una sola columna.
            $side.addClass('alcaldia-acta-funcionario');
            $middle.prepend($side);
        },

        makePanelsCollapsible: function () {
            this.$el.find('.panel, .record-panel').each(function () {
                const $panel = $(this);
                const $heading = $panel.children('.panel-heading').first();

                if (!$heading.length || $panel.hasClass('alcaldia-acta-collapsible')) {
                    return;
                }

                $panel.addClass('alcaldia-acta-collapsible');
                $heading.attr({role: 'button', tabindex: '0', 'aria-expanded': 'true'});
                $heading.append('<span class="alcaldia-acta-collapsible__chevron fas fa-chevron-up" aria-hidden="true"></span>');

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

                $heading.on('click.actaCollapse', toggle);
                $heading.on('keydown.actaCollapse', function (event) {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggle();
                    }
                });
            });
        },
    });
});
