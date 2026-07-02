define('custom:helpers/safe-ui-promise', [], function () {

    const absorb = function (promise) {
        if (promise && typeof promise.catch === 'function') {
            promise.catch(function () {});
        }

        return promise;
    };

    const abortAjaxRequest = function (request) {
        if (!request) {
            return;
        }

        absorb(request);

        if (typeof request.abort === 'function') {
            request.abort();
        }
    };

    const safeReRender = function (view) {
        if (!view || typeof view.reRender !== 'function') {
            return null;
        }

        if (view.isRendered && !view.isRendered()) {
            return null;
        }

        return absorb(view.reRender());
    };

    return {
        absorb: absorb,
        abortAjaxRequest: abortAjaxRequest,
        safeReRender: safeReRender,
    };
});
