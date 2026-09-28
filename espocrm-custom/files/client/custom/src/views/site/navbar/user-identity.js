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
            '<span class="alcaldia-user-identity__role">{{role}}</span>' +
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
            return {
                userId: this.getUser().id,
                name: this.getUser().get('name') || this.getUser().get('userName') || '',
                role: this.role,
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
