define('custom:handlers/task-default-assigned-user', [], function () {

    class Handler {

        /**
         * @param {import('view').default} view
         */
        constructor(view) {
            this.view = view;
        }

        process() {
            if (this.view.scope !== 'Task' || !this.view.model.isNew()) {
                return;
            }

            if (this.view.model.get('assignedUserId')) {
                return;
            }

            var user = this.view.getUser();

            if (!user || !user.id) {
                return;
            }

            this.view.model.set({
                assignedUserId: user.id,
                assignedUserName: user.get('name') || user.get('userName') || user.id,
            });
        }
    }

    return Handler;
});
