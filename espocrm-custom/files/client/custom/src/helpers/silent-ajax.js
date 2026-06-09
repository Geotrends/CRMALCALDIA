define('custom:helpers/silent-ajax', [], function () {

    /**
     * GET sin toast ni promesa rechazada (403 u otros errores → null).
     */
    const getRequest = function (url, params) {
        return new Promise(function (resolve) {
            Espo.Ajax.request(url, 'GET', params, {
                success: function (response) {
                    resolve(response);
                },
                error: function (xhr) {
                    xhr.errorIsHandled = true;
                    resolve(null);
                },
            });
        });
    };

    return {
        getRequest: getRequest,
    };
});
