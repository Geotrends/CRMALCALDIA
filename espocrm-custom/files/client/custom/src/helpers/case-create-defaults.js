define('custom:helpers/case-create-defaults', [], function () {

    let cachedDefaults = null;
    let loadPromise = null;

    const load = function () {
        if (cachedDefaults) {
            return Promise.resolve(cachedDefaults);
        }

        if (loadPromise) {
            return loadPromise;
        }

        if (typeof Espo === 'undefined' || !Espo.Ajax) {
            return Promise.resolve({});
        }

        loadPromise = Espo.Ajax.getRequest('Case/action/createDefaults')
            .then(function (data) {
                cachedDefaults = data || {};

                return cachedDefaults;
            })
            .catch(function () {
                cachedDefaults = {};

                return cachedDefaults;
            });

        return loadPromise;
    };

    const apply = function (model) {
        if (!model || !model.isNew()) {
            return Promise.resolve();
        }

        return load().then(function (defaults) {
            const data = {
                assignedUserId: null,
                assignedUserName: null,
            };

            if (!model.get('cRecibidaPorId') && defaults.cRecibidaPorId) {
                data.cRecibidaPorId = defaults.cRecibidaPorId;
                data.cRecibidaPorName = defaults.cRecibidaPorName;
            }

            if (!model.get('cRemitidoAId') && defaults.cRemitidoAId) {
                data.cRemitidoAId = defaults.cRemitidoAId;
                data.cRemitidoAName = defaults.cRemitidoAName;
            }

            model.set(data);
        });
    };

    return {
        load: load,
        apply: apply,
    };
});
