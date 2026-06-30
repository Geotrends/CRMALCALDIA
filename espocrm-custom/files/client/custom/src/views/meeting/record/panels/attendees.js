define('custom:views/meeting/record/panels/attendees', [
    'crm:views/meeting/record/panels/attendees',
], function (Dep) {

    return Dep.extend({

        setupFields: function () {
            this.fieldList = [];

            this.fieldList.push('users');

            if (this.getAcl().check('Contact') && !this.getMetadata().get('scopes.Contact.disabled')) {
                this.fieldList.push('contacts');
            }

            if (this.getAcl().check('Account') && !this.getMetadata().get('scopes.Account.disabled')) {
                this.fieldList.push('accounts');
            }
        },
    });
});
