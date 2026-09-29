/**
 * Barra superior: nombre y rol del usuario, a la izquierda del buscador.
 */
define('custom:views/site/navbar/user-identity', [
    'view',
    'custom:helpers/radicacion-fields',
], function (Dep, RadicacionFields) {

    return Dep.extend({

        templateContent:
            '<a class="alcaldia-user-identity" href="#User/view/{{userId}}" title="{{name}} · {{role}}">' +
            '<span class="alcaldia-user-identity__name">{{name}}</span>' +
            '{{#if role}}<span class="alcaldia-user-identity__role">{{role}}</span>{{/if}}' +
            '</a>',

        setup: function () {
            this.role = this.resolveRole([]);

            RadicacionFields.ensureProfile(this.getUser()).then(function (profile) {
                const role = this.resolveRole((profile && profile.roles) || []);

                if (role !== this.role) {
                    this.role = role;

                    if (this.isRendered()) {
                        this.reRender();
                    }
                }
            }.bind(this));
        },

        data: function () {
            const name = (this.getUser().get('name') || this.getUser().get('userName') || '').trim();

            return {
                userId: this.getUser().id,
                name: name,
                // Si el rol repite el nombre (p. ej. «Administrador»), no se muestra dos veces.
                role: this.role && this.role !== name ? this.role : '',
            };
        },

        /**
         * @param {string[]} roles
         * @return {string}
         */
        resolveRole: function (roles) {
            const names = (roles || []).filter(Boolean);

            if (names.length) {
                return names.join(' · ');
            }

            return this.getUser().isAdmin() ? 'Administrador' : '';
        },
    });
});
