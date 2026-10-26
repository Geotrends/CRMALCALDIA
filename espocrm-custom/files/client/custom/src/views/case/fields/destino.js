define('custom:views/case/fields/destino', [
    'views/fields/link',
    'custom:helpers/radicacion-fields',
], function (Dep, RadicacionFields) {

    // El destino del caso solo lo cambian el Director Técnico (rol de asignación) y la persona
    // asignada, con Case/action/cambiarDestino (también si su rol no edita Casos).
    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this.puedeCambiar = false;

            if (this.model.isNew()) {
                return;
            }

            const user = this.getUser();

            this.wait(
                RadicacionFields.ensureProfile(user).then(() => {
                    this.puedeCambiar = this.model.get('assignedUserId') === user.id
                        || RadicacionFields.isAsignadorUser(user);
                })
            );
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            if (!this.puedeCambiar || !this.isDetailMode()) {
                return;
            }

            const $acciones = $('<div class="case-destino-acciones" style="margin-top: 6px;"></div>');

            $acciones.append(
                $('<button type="button" class="btn btn-default btn-sm">Cambiar destino</button>')
                    .on('click', () => this.elegirDestino())
            );

            if (this.model.get('destinoId')) {
                $acciones.append(' ').append(
                    $('<button type="button" class="btn btn-link btn-sm">Quitar</button>')
                        .on('click', () => this.guardarDestino(null))
                );
            }

            this.$el.append($acciones);
        },

        elegirDestino: function () {
            this.createView('dialogDestino', 'views/modals/select-records', {
                scope: 'Destino',
                multiple: false,
                createButton: this.getAcl().check('Destino', 'create'),
            }, dialog => {
                dialog.render();

                this.listenToOnce(dialog, 'select', models => {
                    const destino = Array.isArray(models) ? models[0] : models;

                    if (destino && destino.id) {
                        this.guardarDestino(destino.id);
                    }
                });
            });
        },

        guardarDestino: function (destinoId) {
            Espo.Ui.notifyWait();

            Espo.Ajax.postRequest('Case/action/cambiarDestino', {
                id: this.model.id,
                destinoId: destinoId,
            }).then(response => {
                this.model.set({destinoId: response.destinoId, destinoName: response.destinoName});
                Espo.Ui.success(destinoId ? 'Destino actualizado.' : 'Destino quitado.');
                this.reRender();
            }).catch(() => Espo.Ui.notify(false));
        },
    });
});
