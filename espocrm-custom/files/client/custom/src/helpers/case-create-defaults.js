define('custom:helpers/case-create-defaults', [
    'custom:config/case-create-users',
], function (CaseCreateUsers) {

    const apply = function (model) {
        if (!model || !model.isNew()) {
            return;
        }

        const data = {
            assignedUserId: null,
            assignedUserName: null,
        };

        if (!model.get('cRecibidaPorId') && CaseCreateUsers.cRecibidaPorId) {
            data.cRecibidaPorId = CaseCreateUsers.cRecibidaPorId;
            data.cRecibidaPorName = CaseCreateUsers.cRecibidaPorName;
        }

        if (!model.get('cRemitidoAId') && CaseCreateUsers.cRemitidoAId) {
            data.cRemitidoAId = CaseCreateUsers.cRemitidoAId;
            data.cRemitidoAName = CaseCreateUsers.cRemitidoAName;
        }

        model.set(data);
    };

    return {
        apply: apply,
    };
});
