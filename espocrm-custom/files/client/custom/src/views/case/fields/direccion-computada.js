define('custom:views/case/fields/direccion-computada', [
    'views/fields/varchar',
    'custom:helpers/direccion-estructurada',
    'custom:helpers/safe-ui-promise',
], function (Dep, DireccionEstructurada, SafeUiPromise) {

    return Dep.extend({

        setup: function () {
            Dep.prototype.setup.call(this);

            this._direccionConfig = this.name === 'cDireccionPerjudicante'
                ? DireccionEstructurada.PERJUDICANTE
                : DireccionEstructurada.PETICIONARIO;

            this._direccionConfig.componentFields.forEach((field) => {
                this.listenTo(this.model, 'change:' + field, () => {
                    if (this.name === 'cDireccionPerjudicante'
                        && this.model.get('cTipoPersonaPerjudicante') === 'No se conoce') {
                        return;
                    }

                    this.syncToModel();
                    this.reRenderIfRendered();
                });
            });

            this.listenTo(this.model, 'change:cTipoPersonaPerjudicante', () => {
                if (this.name !== 'cDireccionPerjudicante') {
                    return;
                }

                this.syncToModel();
                this.reRenderIfRendered();
            });
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.syncToModel();
        },

        reRenderIfRendered: function () {
            SafeUiPromise.safeReRender(this);
        },

        syncToModel: function () {
            if (this.name === 'cDireccionPerjudicante'
                && this.model.get('cTipoPersonaPerjudicante') === 'No se conoce') {
                this.model.set(this.name, null, {silent: true});

                return;
            }

            const value = DireccionEstructurada.buildFromModel(this.model, this._direccionConfig);

            this.model.set(this.name, value, {silent: true});
        },

        getValueForDisplay: function () {
            if (this.name === 'cDireccionPerjudicante'
                && this.model.get('cTipoPersonaPerjudicante') === 'No se conoce') {
                return Dep.prototype.getValueForDisplay.call(this);
            }

            const value = DireccionEstructurada.buildFromModel(this.model, this._direccionConfig);

            if (value !== '') {
                return value;
            }

            return Dep.prototype.getValueForDisplay.call(this);
        },

        fetch: function () {
            this.syncToModel();

            const data = {};

            data[this.name] = this.model.get(this.name) || null;

            return data;
        },
    });
});
