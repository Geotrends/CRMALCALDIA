define('custom:views/expediente/record/panels/documentos', [
    'view',
    'custom:helpers/expediente-ancho',
    'custom:helpers/silent-ajax',
], function (Dep, ExpedienteAncho, SilentAjax) {

    const esc = function (v) {
        return $('<span>').text(v == null ? '' : String(v)).html();
    };

    // Fecha y hora de Bogotá a partir del datetime UTC del adjunto.
    const fechaHora = function (utc) {
        const d = new Date(String(utc || '').replace(' ', 'T') + 'Z');

        if (isNaN(d.getTime())) {
            return '';
        }

        return d.toLocaleString('es-CO', {
            timeZone: 'America/Bogota', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
    };

    // Fecha del acto: solo fecha si viene sin hora; si trae hora, en hora de Bogotá.
    const fechaActo = function (v) {
        if (!v) {
            return '';
        }

        return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v.split('-').reverse().join('/') : fechaHora(v);
    };

    const icono = function (tipo, nombre) {
        if (/pdf/i.test(tipo) || /\.pdf$/i.test(nombre)) { return 'fa-file-pdf'; }
        if (/word|officedocument\.wordprocessing/i.test(tipo) || /\.docx?$/i.test(nombre)) { return 'fa-file-word'; }
        if (/^image\//i.test(tipo)) { return 'fa-file-image'; }
        if (/^(audio|video)\//i.test(tipo)) { return 'fa-file-audio'; }

        return 'fa-file';
    };

    // Documentos de los casos vinculados y del proceso, para consulta (Expediente/action/documentos).
    return Dep.extend({

        templateContent: '<div class="alcaldia-docs"><p class="text-muted small">Cargando documentos…</p></div>',

        setup: function () {
            this.datos = null;
            this.filtro = {etapa: '', caso: '', texto: ''};
            this.listenTo(this.model, 'sync', function () { this.cargar(); });
        },

        afterRender: function () {
            ExpedienteAncho.ubicar(this, 4);

            if (this.datos) {
                this.pintar();
            } else {
                this.cargar();
            }
        },

        cargar: function () {
            SilentAjax.getRequest('Expediente/action/documentos', {id: this.model.id}).then((r) => {
                this.datos = r || {documentos: []};

                if (this.isRendered()) {
                    this.pintar();
                }
            });
        },

        pintar: function () {
            const d = this.datos;
            const f = this.filtro;
            const texto = f.texto.toLowerCase();
            const filas = (d.documentos || []).filter(function (x) {
                return (!f.etapa || x.etapa === f.etapa) && (!f.caso || x.caso === f.caso)
                    && (!texto || (x.documento + ' ' + x.nombre + ' ' + x.origen).toLowerCase().indexOf(texto) !== -1);
            });
            const opciones = function (lista, sel, todos) {
                return '<option value="">' + todos + '</option>' + (lista || []).map(function (v) {
                    return '<option value="' + esc(v) + '"' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>';
                }).join('');
            };

            const $c = this.$el.find('.alcaldia-docs');

            if (!(d.documentos || []).length) {
                $c.html('<p class="text-muted small">Aún no hay documentos en los casos ni en el proceso de este expediente.</p>');

                return;
            }

            $c.html('<div class="alcaldia-docs__filtros">'
                + '<select class="form-control input-sm js-docs-etapa">' + opciones(d.etapas, f.etapa, 'Todas las etapas') + '</select>'
                + ((d.casos || []).length > 1 ? '<select class="form-control input-sm js-docs-caso">' + opciones(d.casos, f.caso, 'Todos los casos') + '</select>' : '')
                + '<input type="search" class="form-control input-sm js-docs-texto" placeholder="Buscar documento…" value="' + esc(f.texto) + '">'
                + '<span class="text-muted small">' + filas.length + ' de ' + d.documentos.length + ' documento(s)</span></div>'
                + '<div class="alcaldia-docs__tabla"><table class="table table-condensed"><thead><tr>'
                + '<th>Fecha del acto</th><th>Fecha de carga</th><th>Documento</th><th>Etapa</th><th>Origen</th><th>Caso</th><th>Cargado por</th><th></th></tr></thead><tbody>'
                + filas.map(function (x) {
                    const url = '?entryPoint=download&id=' + encodeURIComponent(x.id);

                    return '<tr><td class="alcaldia-docs__fecha"><b>' + esc(fechaActo(x.fechaActo) || '—') + '</b></td>'
                        + '<td class="alcaldia-docs__fecha text-muted">' + esc(fechaHora(x.fecha)) + '</td>'
                        + '<td><span class="fas ' + icono(x.tipoArchivo, x.nombre) + '"></span> <b>' + esc(x.documento) + '</b><br><small class="text-muted">' + esc(x.nombre) + '</small></td>'
                        + '<td>' + esc(x.etapa) + '</td>'
                        + '<td>' + esc(x.origen) + '</td>'
                        + '<td>' + (x.casoId ? '<a href="#Case/view/' + esc(x.casoId) + '">' + esc(x.caso) + '</a>' : '') + '</td>'
                        + '<td>' + esc(x.cargadoPor) + '</td>'
                        + '<td class="alcaldia-docs__acciones"><a class="btn btn-default btn-xs" href="' + url + '" target="_blank" title="Abrir"><span class="fas fa-eye"></span></a> '
                        + '<a class="btn btn-default btn-xs" href="' + url + '" download title="Descargar"><span class="fas fa-download"></span></a></td></tr>';
                }).join('')
                + '</tbody></table></div>');

            $c.find('.js-docs-etapa').on('change', (e) => { this.filtro.etapa = e.target.value; this.pintar(); });
            $c.find('.js-docs-caso').on('change', (e) => { this.filtro.caso = e.target.value; this.pintar(); });
            $c.find('.js-docs-texto').on('input', (e) => {
                this.filtro.texto = e.target.value;
                clearTimeout(this._t);
                this._t = setTimeout(() => {
                    this.pintar();
                    const $i = this.$el.find('.js-docs-texto');
                    $i.trigger('focus');
                    $i[0].setSelectionRange($i.val().length, $i.val().length);
                }, 250);
            });
        },
    });
});
