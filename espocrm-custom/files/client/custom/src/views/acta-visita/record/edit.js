define('custom:views/acta-visita/record/edit', [
    'views/record/edit',
], function (Dep) {

    return Dep.extend({
        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.organizeActaLayout();
            this.makePanelsCollapsible();
        },

        organizeActaLayout: function () {
            const $grid = this.$el.find('.record-grid').first();
            const $side = $grid.children('.side').first();
            const $middle = $grid.children('.left').find('> .middle').first();

            if (!$side.length || !$middle.length || $side.hasClass('alcaldia-acta-funcionario')) {
                return;
            }

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
