define('custom:helpers/team-member-cards', ['handlebars'], function (Handlebars) {

    var escapeHtml = function (value) {
        return Handlebars.Utils.escapeExpression(String(value || ''));
    };

    var getValue = function (user, key) {
        if (user && typeof user.get === 'function') {
            return user.get(key);
        }

        return user ? user[key] : null;
    };

    var getUserId = function (user) {
        if (user && typeof user.get === 'function') {
            return user.id;
        }

        return user ? user.id : null;
    };

    return {

        buildCardHtml: function (user, view) {
            var id = getUserId(user);
            var name = getValue(user, 'name') || getValue(user, 'userName') || '—';
            var title = getValue(user, 'title') || '—';
            var teamRole = getValue(user, 'teamRole') || '—';
            var email = getValue(user, 'emailAddress') || '—';
            var phone = getValue(user, 'phoneNumber') || '—';
            var createdAt = getValue(user, 'createdAt') || '—';
            var isActive = getValue(user, 'isActive') !== false;
            var avatarHtml = view.getHelper().getAvatarHtml(id, 'medium', 48);

            if (createdAt !== '—') {
                createdAt = view.getDateTime().toDisplayDate(createdAt);
            }

            return (
                '<article class="team-member-card">' +
                    '<div class="team-member-card-top">' +
                        '<div class="team-member-avatar-wrap">' +
                            avatarHtml +
                            '<span class="team-member-status ' + (isActive ? 'is-active' : 'is-inactive') + '"></span>' +
                        '</div>' +
                        '<div class="team-member-menu dropdown">' +
                            '<a class="team-member-menu-btn dropdown-toggle" data-toggle="dropdown" href="#">' +
                                '<span class="fas fa-ellipsis-v"></span>' +
                            '</a>' +
                            '<ul class="dropdown-menu pull-right">' +
                                '<li><a href="#User/view/' + escapeHtml(id) + '" data-action="openUser" data-id="' + escapeHtml(id) + '">Ver perfil</a></li>' +
                            '</ul>' +
                        '</div>' +
                    '</div>' +
                    '<div class="team-member-identity">' +
                        '<a class="team-member-name" href="#User/view/' + escapeHtml(id) + '" data-action="openUser" data-id="' + escapeHtml(id) + '">' +
                            escapeHtml(name) +
                        '</a>' +
                        '<div class="team-member-title">' + escapeHtml(title) + '</div>' +
                    '</div>' +
                    '<div class="team-member-meta">' +
                        '<div class="team-member-meta-item">' +
                            '<span class="team-member-meta-label">Rol en equipo</span>' +
                            '<span class="team-member-meta-value">' + escapeHtml(teamRole) + '</span>' +
                        '</div>' +
                        '<div class="team-member-meta-item">' +
                            '<span class="team-member-meta-label">Desde</span>' +
                            '<span class="team-member-meta-value">' + escapeHtml(createdAt) + '</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="team-member-contact">' +
                        '<div class="team-member-contact-row">' +
                            '<span class="fas fa-envelope team-member-contact-icon"></span>' +
                            '<span class="team-member-contact-text">' + escapeHtml(email) + '</span>' +
                        '</div>' +
                        '<div class="team-member-contact-row">' +
                            '<span class="fas fa-phone team-member-contact-icon"></span>' +
                            '<span class="team-member-contact-text">' + escapeHtml(phone) + '</span>' +
                        '</div>' +
                    '</div>' +
                '</article>'
            );
        },

        buildGridHtml: function (users, view) {
            if (!users || !users.length) {
                return '<p class="team-members-empty text-muted">No hay miembros en este equipo.</p>';
            }

            return users.map(function (user) {
                return this.buildCardHtml(user, view);
            }.bind(this)).join('');
        },

        bindUserClicks: function ($container, view) {
            $container.find('[data-action="openUser"]').off('click').on('click', function (e) {
                e.preventDefault();
                var id = $(e.currentTarget).data('id');

                if (id) {
                    view.getRouter().navigate('#User/view/' + id, {trigger: true});
                }
            });
        },
    };
});
