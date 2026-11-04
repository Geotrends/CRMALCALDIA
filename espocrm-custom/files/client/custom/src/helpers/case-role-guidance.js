define('custom:helpers/case-role-guidance', [
    'custom:helpers/radicacion-fields',
], function (RadicacionFields) {

    const ESTADOS_VISITA = ['Asignado', 'En gestión técnica', 'Revisión técnica', 'Revisión jurídica', 'Revisión de hallazgos'];
    const ESTADOS_CIERRE = ['Pendiente de respuesta final', 'Remitido por competencia'];
    // Con el expediente archivado el caso sigue el cierre de cualquier solicitud (evaluación de resultado y
    // respuesta final): ya no se guía por el expediente.
    const tieneExpediente = view => (!!view.model.get('expedienteId') || view.model.get('cDecisionTramite') === 'Apertura de actuación')
        && !ESTADOS_CIERRE.includes(view.model.get('status'));
    const faltaEvaluacion = view => ((view._crmCierreGuia || {}).requisitos || [])
        .some(r => r.key === 'evaluacionResultado' && !r.ok);

    const escapeHtml = function (value) {
        return $('<span>').text(value || '').html();
    };

    const estadoVisita = function (view) {
        return ESTADOS_VISITA.includes(view.model.get('status'));
    };

    const enVisita = function (view) {
        return !RadicacionFields.isAdminUser(view.getUser()) && estadoVisita(view);
    };

    // Paso del proceso en que va la solicitud y quién debe dar el siguiente: se muestra en todos los
    // banners, para cualquier usuario. «mio» indica que la acción le corresponde a quien mira.
    // Quien puede hacer la revisión técnico-jurídica (la misma regla del panel «Revisión técnico-jurídica»).
    const puedeRevisar = function (view) {
        const user = view.getUser();

        return !RadicacionFields.isAdminUser(user)
            && (RadicacionFields.isInspeccionUser(user)
                || RadicacionFields.isAsignadorUser(user)
                || RadicacionFields.isJuridicaUser(user)
                || RadicacionFields.isInspectorAmbientalUser(user)
                || (view._crmRoles || []).includes('Inspector Ambiental'));
    };

    const getAvanceVisitas = function (view) {
        const programaciones = ((view._crmVisitasGuia || {}).programaciones || []).filter(p => p.estado !== 'Cancelada');
        const pendiente = programaciones.find(p => !p.actaId || p.actaEstado === 'Pendiente' || p.actaFirmada === false);
        // El servidor ordena las programaciones por creación. Una decisión de una visita
        // anterior no debe volver a pedir programación después de registrar la siguiente.
        const ultima = programaciones[programaciones.length - 1];
        // Otra visita: la decisión legada «Visita complementaria» o la nueva visita pedida por el
        // Director Técnico (la visita anterior ya quedó avalada y el caso volvió a gestión técnica).
        const status = view.model.get('status');
        const nuevaVisita = !!(ultima && ultima.avalTecnico && ['Asignado', 'En gestión técnica'].includes(status));
        const complementaria = nuevaVisita || !!(ultima && ultima.actaId && ultima.actaRevisada
            && ultima.actaDecisionTramite === 'Visita complementaria');
        // El informe es opcional; solo una solicitud explícita de correcciones bloquea el avance.
        const pendienteInforme = programaciones.find(p => p.intervencionId && !p.avalTecnico
            && p.actaId && p.actaEstado !== 'Pendiente' && p.correccionSolicitada);

        return {programaciones, pendiente, complementaria, pendienteInforme};
    };

    // Con el acta registrada y sin otra visita pendiente, el siguiente paso es la revisión técnico-jurídica.
    const enRevision = function (view) {
        const {programaciones, pendiente, complementaria} = getAvanceVisitas(view);

        return view.model.get('status') === 'Revisión de hallazgos'
            && programaciones.length > 0 && !pendiente && !complementaria;
    };

    const getEtapa = function (view) {
        if (tieneExpediente(view)) {
            return view._crmExpedienteGuia || {
                estado: 'Seguimiento del expediente', actor: 'Por confirmar', mio: false,
                accion: view._crmExpedienteError || view._crmExpedienteLoaded
                    ? 'Consultar el proceso del expediente' : 'Consultando la actuación pendiente del expediente…',
            };
        }
        const model = view.model;
        const user = view.getUser();
        const status = model.get('status') || '';
        const responsable = model.get('assignedUserName') || 'el responsable asignado';
        const esResponsable = model.get('assignedUserId') === user.id;
        const admin = RadicacionFields.isAdminUser(user);
        const etapa = {estado: status, actor: 'Responsable por definir', accion: 'Revisar el estado de la solicitud', mio: false};

        if (status === 'Pendiente de radicacion') {
            etapa.actor = 'Auxiliar Administrativo · Radicador';
            etapa.accion = 'Radicar la solicitud';
            etapa.mio = !admin && RadicacionFields.isRadicacionUser(user);
        } else if (status === 'Radicado') {
            etapa.actor = 'Director Técnico';
            etapa.accion = model.get('cCompetenciaConfirmada')
                ? 'Asignar la solicitud a un responsable'
                : 'Revisar la competencia y asignar la solicitud';
            etapa.mio = !admin && RadicacionFields.isAsignadorUser(user);
        } else if (status === 'Revisión técnica') {
            etapa.actor = 'Director Técnico';
            etapa.accion = 'Revisar el acta de visita y el informe técnico, y decidir: nueva visita, correcciones, revisión jurídica o remisión por competencia';
            etapa.mio = !admin && RadicacionFields.isAsignadorUser(user);
        } else if (status === 'Revisión jurídica') {
            etapa.actor = 'Apoyo Jurídico';
            etapa.accion = 'Decidir si se abre actuación o no (dejando sus observaciones)';
            etapa.mio = !admin && RadicacionFields.isJuridicaUser(user);
        } else if (estadoVisita(view)) {
            const visitas = view._crmVisitasGuia;
            if (!visitas) {
                etapa.actor = responsable;
                etapa.accion = view._crmVisitasGuiaError
                    ? 'Consulte el panel Visitas para verificar el siguiente paso'
                    : 'Consultando el avance de las visitas…';

                return etapa;
            }
            const {programaciones, pendiente, complementaria, pendienteInforme} = getAvanceVisitas(view);
            const hayActa = programaciones.length > 0 && !pendiente;
            // El servidor exige el acta firmada para registrar la revisión técnico-jurídica.
            const sinFirma = pendiente && pendiente.actaId && pendiente.actaEstado !== 'Pendiente' && pendiente.actaFirmada === false;

            const ultima = programaciones[programaciones.length - 1];
            const evaluaciones = visitas.evaluaciones || [];

            // Revisada el acta y definido el trámite, el siguiente paso es la evaluación de resultado.
            if (hayActa && !complementaria && ultima.actaRevisada && status === 'Revisión de hallazgos'
                && (visitas.puedeRegistrarEvaluacion || evaluaciones.some(e => e.abierta))) {
                etapa.actor = 'Inspector Ambiental';
                etapa.accion = evaluaciones.some(e => e.abierta) ? 'Completar la evaluación de resultado' : 'Registrar la evaluación de resultado';
                etapa.mio = !admin && RadicacionFields.isInspectorAmbientalUser(user);
            } else if (hayActa && !complementaria && !sinFirma && pendienteInforme) {
                etapa.actor = pendienteInforme.responsableName || responsable;
                etapa.accion = pendienteInforme.correccionSolicitada
                    ? 'Atender las correcciones del Director Técnico (informe técnico o acta) y volver a adjuntar'
                    : 'Adjuntar el informe técnico diligenciado y firmado';
                etapa.mio = !admin && (pendienteInforme.esResponsable || esResponsable);
            } else if (hayActa && !complementaria && !sinFirma && status === 'Revisión de hallazgos') {
                etapa.actor = 'Inspector Ambiental';
                etapa.accion = 'Hacer la revisión técnico-jurídica del acta y definir el trámite';
                etapa.mio = puedeRevisar(view);
            } else if (hayActa && !complementaria && !sinFirma) {
                etapa.actor = 'Director Técnico';
                etapa.accion = 'Revisión técnica del acta de visita y el informe técnico';
                etapa.mio = !admin && RadicacionFields.isAsignadorUser(user);
            } else {
                const quien = pendiente && pendiente.responsableName ? pendiente.responsableName : responsable;

                etapa.actor = quien;
                etapa.accion = sinFirma && !complementaria
                    ? 'Adjuntar el acta de visita firmada'
                    : !programaciones.length || (hayActa && complementaria)
                    ? (complementaria ? 'Programar la visita complementaria' : 'Programar la visita')
                    : 'Adjuntar acta de visita';
                etapa.mio = !admin && (pendiente ? !!pendiente.esResponsable : esResponsable);
            }
        } else if (ESTADOS_CIERRE.includes(status)) {
            if (!view._crmCierreGuia) {
                etapa.actor = responsable;
                etapa.accion = view._crmCierreError ? 'Consultar los requisitos del cierre' : 'Consultando los requisitos del cierre…';
                return etapa;
            }
            if (faltaEvaluacion(view)) {
                etapa.actor = 'Inspector Ambiental';
                etapa.accion = 'Evaluación de resultado';
                etapa.mio = !admin && RadicacionFields.isInspectorAmbientalUser(user);
                return etapa;
            }
            etapa.actor = responsable;
            etapa.accion = 'Completar el cierre de la solicitud';
            etapa.mio = esResponsable;
        } else if (['Finalizado', 'Proceso cerrado'].includes(status)) {
            etapa.accion = 'Ninguna: la solicitud está cerrada';
            etapa.actor = 'Sin acciones pendientes';
        }

        return etapa;
    };

    // Siguientes pasos del responsable asignado (cualquier rol), según lo que la solicitud ya
    // tiene registrado: programación, acta firmada y revisión técnico-jurídica.
    const getPasosResponsable = function (view) {
        const visitas = view._crmVisitasGuia;

        if (!visitas) {
            return null;
        }

        const {programaciones, pendiente, complementaria, pendienteInforme} = getAvanceVisitas(view);
        const ultima = programaciones[programaciones.length - 1];
        const status = view.model.get('status');
        const actaOk = programaciones.length > 0 && !pendiente && !complementaria;
        const informeOk = actaOk && !pendienteInforme;
        // Avalada la visita por el Director Técnico, la solicitud pasa al Apoyo Jurídico.
        const tecnicaOk = informeOk && (!!(ultima && ultima.avalTecnico) || status === 'Revisión de hallazgos');
        // Revisada la visita y definido el trámite, sigue la evaluación de resultado.
        const revisada = !!(ultima && ultima.actaRevisada) && !pendiente && !complementaria
            && status === 'Revisión de hallazgos'
            && (visitas.puedeRegistrarEvaluacion || (visitas.evaluaciones || []).some(e => e.abierta));
        const pasos = [
            {label: 'Programar la visita', ok: programaciones.length > 0 && !complementaria},
            {label: 'Adjuntar el acta de visita', ok: actaOk},
            {label: 'Informe técnico (opcional)', ok: informeOk},
            {label: 'Revisión técnica (Director Técnico)', ok: tecnicaOk},
            {label: 'Revisión jurídica (Apoyo Jurídico)', ok: status === 'Revisión de hallazgos' || revisada},
        ];

        if (revisada) {
            pasos.push({label: 'Evaluación de resultado', ok: false});
        }

        const actual = pasos.findIndex(p => !p.ok);

        if (actual === -1) {
            return null;
        }

        const textos = [
            [complementaria ? 'Programe la visita complementaria' : 'Programe la visita', 'En el panel Visitas seleccione «Programar visita». Confirme la fecha y la hora, o asigne la visita a otra persona.'],
            pendiente && pendiente.actaId && pendiente.actaEstado === 'Pendiente'
                ? ['Complete el acta de visita', 'En el panel Visitas, en la tarjeta «Acta de visita» de ' + pendiente.name + ', seleccione «Completar acta de visita» y registre los hallazgos.']
                : pendiente && pendiente.actaId && pendiente.actaFirmada === false
                ? ['Adjunte el acta de visita firmada', 'Abra el acta de la visita ' + pendiente.name + ' y adjunte el documento firmado para continuar con la revisión.']
                : ['Adjunte el acta de visita', 'En el panel Visitas, en la tarjeta «Acta de visita» de ' + (pendiente ? pendiente.name : 'la visita programada') + ', descargue el acta en blanco para llevarla a campo y, después de la visita, seleccione «Adjuntar acta diligenciada».'],
            pendienteInforme && pendienteInforme.correccionSolicitada
                ? ['Atienda las correcciones del Director Técnico', 'En el panel Visitas, tarjeta «Informe técnico» de ' + pendienteInforme.name + ', corrija el informe (o el acta) y vuelva a adjuntarlo. ' + (pendienteInforme.observacionesRevision || '')]
                : ['Adjunte el informe técnico', 'En el panel Visitas, tarjeta «Informe técnico» de ' + (pendienteInforme ? pendienteInforme.name : 'la visita') + ', descargue la plantilla, diligéncielo y fírmelo, y adjúntelo. Con el acta y el informe, el Director Técnico inicia la revisión.'],
            ['Espere la revisión técnica', 'El Director Técnico revisa el acta y el informe técnico. Puede pedir correcciones, otra visita, enviar a revisión jurídica o remitir por competencia.'],
            ['Espere la revisión jurídica', 'El Apoyo Jurídico decide si el caso necesita la apertura de una actuación.'],
            ['Complete la evaluación de resultado', 'Un Inspector Ambiental registra el resultado técnico en el panel «Evaluación de resultado» y la marca como «Completada».'],
        ];

        return {
            role: 'responsable',
            eyebrow: 'Siguientes pasos · Gestión técnica',
            icon: 'fas fa-list-check',
            title: textos[actual][0],
            text: textos[actual][1],
            pasos: pasos.map((p, i) => ({label: p.label, ok: p.ok, actual: i === actual})),
        };
    };

    // Quien recibió una visita delegada (p. ej. el técnico) ve qué le falta de esa visita.
    const getVisitaDelegada = function (view) {
        const programacion = ((view._crmVisitasGuia || {}).programaciones || [])
            .find(p => p.esResponsable && p.puedeAdjuntar && (!p.actaId || p.actaEstado === 'Pendiente'));

        if (!programacion) {
            return null;
        }

        return {
            role: 'responsable',
            eyebrow: 'Siguientes pasos · Visita delegada',
            icon: 'fas fa-list-check',
            title: 'Realice la visita ' + programacion.name + ' y adjunte el acta',
            text: programacion.actaId
                ? 'En el panel Visitas seleccione «Completar acta de visita» y registre los hallazgos.'
                : 'En el panel Visitas descargue el acta en blanco para llevarla a campo y, después de la visita, seleccione «Adjuntar acta de visita». El formulario trae los datos de la solicitud y de la visita.',
        };
    };

    const cargarVisitas = function (view) {
        if (view._crmVisitasGuiaCargando || view._crmVisitasGuiaError || view._crmGuidanceRemoved) {
            return;
        }

        view._crmVisitasGuiaCargando = true;
        const revision = view._crmVisitasGuiaRevision || 0;

        Espo.Ajax.getRequest('Case/action/visitas', {id: view.model.id})
            .then(visitas => {
                if (view._crmGuidanceRemoved || revision !== (view._crmVisitasGuiaRevision || 0)) {
                    return;
                }
                view._crmVisitasGuia = visitas;
                view._crmVisitasFirma = JSON.stringify([view.model.get('status'), visitas.programaciones]);
                render(view);
            })
            .catch(() => {
                if (revision !== (view._crmVisitasGuiaRevision || 0)) {
                    return;
                }
                view._crmVisitasGuiaError = true;
                if (!view._crmGuidanceRemoved) {
                    render(view);
                }
            })
            .finally(() => {
                view._crmVisitasGuiaCargando = false;
                // Un guardado durante esta consulta invalida su respuesta y necesita datos nuevos.
                if (!view._crmGuidanceRemoved && !view._crmVisitasGuia
                    && revision !== (view._crmVisitasGuiaRevision || 0)) {
                    cargarVisitas(view);
                }
            });
    };

    const cargarExpediente = function (view) {
        if (view._crmExpedienteLoading || view._crmExpedienteError || view._crmGuidanceRemoved) return;
        view._crmExpedienteLoading = true;
        const revision = view._crmExpedienteRevision || 0;
        Espo.Ajax.getRequest('Case/action/aperturaEstado', {id: view.model.id}).then(estado => {
            if (view._crmGuidanceRemoved || revision !== (view._crmExpedienteRevision || 0)) return;
            view._crmExpedienteGuia = estado.seguimiento;
            view._crmExpedienteLoaded = true;
            render(view);
        }).catch(() => {
            if (view._crmGuidanceRemoved || revision !== (view._crmExpedienteRevision || 0)) return;
            view._crmExpedienteError = true;
            render(view);
        }).finally(() => {
            view._crmExpedienteLoading = false;
            if (!view._crmGuidanceRemoved && !view._crmExpedienteLoaded && revision !== (view._crmExpedienteRevision || 0)) {
                cargarExpediente(view);
            }
        });
    };

    const cargarCierre = function (view) {
        if (view._crmCierreLoading || view._crmCierreError || view._crmGuidanceRemoved) {
            return;
        }
        view._crmCierreLoading = true;
        const revision = view._crmCierreRevision || 0;
        Espo.Ajax.getRequest('Case/action/cierreEstado', {id: view.model.id}).then(estado => {
            if (view._crmGuidanceRemoved || revision !== (view._crmCierreRevision || 0)) return;
            view._crmCierreGuia = estado;
            if (typeof view.trigger === 'function') { view.trigger('crm:cierre-guia'); }
            render(view);
        }).catch(() => {
            if (view._crmGuidanceRemoved || revision !== (view._crmCierreRevision || 0)) return;
            view._crmCierreError = true;
            render(view);
        }).finally(() => {
            view._crmCierreLoading = false;
            if (!view._crmGuidanceRemoved && !view._crmCierreGuia && revision !== (view._crmCierreRevision || 0)) {
                cargarCierre(view);
            }
        });
    };

    const getGuidanceRol = function (view) {
        if (!view || !view.model || view.model.isNew()) {
            return null;
        }

        const user = view.getUser();
        const isRadicado = RadicacionFields.isCaseRadicado(view.model);
        const isAssigned = Boolean(view.model.get('assignedUserId'));

        if (ESTADOS_CIERRE.includes(view.model.get('status')) && faltaEvaluacion(view)) {
            if (RadicacionFields.isInspectorAmbientalUser(user)) {
                return {
                    role: 'responsable',
                    eyebrow: 'Acción requerida · Evaluación de resultado',
                    icon: 'fas fa-clipboard-check',
                    title: 'Complete la evaluación de resultado',
                    text: 'En el panel «Evaluación de resultado» registre el resultado técnico y marque la evaluación como «Completada». Después se registra la respuesta final al peticionario.',
                };
            }

            if (!RadicacionFields.isAdminUser(user)) {
                return {
                    role: 'seguimiento',
                    eyebrow: 'Seguimiento · Evaluación de resultado',
                    icon: 'fas fa-clipboard-check',
                    title: 'Evaluación de resultado pendiente',
                    text: 'Le corresponde a un Inspector Ambiental completarla; después se registra la respuesta final. Usted puede consultar la solicitud y su historia.',
                };
            }
        }

        if (RadicacionFields.isAdminUser(user)) {
            return {
                role: 'gestion',
                eyebrow: 'Acción requerida · Gestión del caso',
                title: 'Administre el caso y controle su trazabilidad',
                text: 'Puede corregir o actualizar cualquier dato del caso. Verifique la información, el término de respuesta y la etapa actual; toda modificación queda registrada en la Historia.',
            };
        }

        if (view.model.get('status') === 'Revisión técnica' && RadicacionFields.isAsignadorUser(user)) {
            return {
                role: 'asignacion',
                eyebrow: 'Acción requerida · Revisión técnica',
                icon: 'fas fa-scale-balanced',
                title: 'Revise el acta de visita y el informe técnico',
                text: 'En el panel «Revisión técnico-jurídica» decida: solicitar una nueva visita, pedir correcciones, enviar a revisión jurídica (con un comentario) o remitir por competencia.',
            };
        }

        if (view.model.get('status') === 'Revisión jurídica' && RadicacionFields.isJuridicaUser(user)) {
            return {
                role: 'juridica',
                eyebrow: 'Acción requerida · Revisión jurídica',
                icon: 'fas fa-scale-balanced',
                title: 'Decida si se abre actuación',
                text: 'El Director Técnico avaló la visita. En el panel «Revisión técnico-jurídica» elija abrir actuación, o no abrirla y deje sus observaciones.',
            };
        }

        if (enRevision(view) && puedeRevisar(view)) {
            return {
                role: 'inspeccion',
                eyebrow: 'Siguientes pasos · Revisión técnico-jurídica',
                icon: 'fas fa-scale-balanced',
                title: 'Haga la revisión técnico-jurídica del acta',
                text: 'En el panel «Revisión técnico-jurídica» revise los hallazgos del acta y defina el trámite: visita complementaria, cierre de la atención, remisión por competencia o apertura de actuación.',
            };
        }

        if (enVisita(view) && view.model.get('assignedUserId') === user.id) {
            return getPasosResponsable(view);
        }

        if (!RadicacionFields.isAdminUser(user) && view.model.get('assignedUserId') === user.id) {
            const status = view.model.get('status');

            if (['Pendiente de respuesta final', 'Remitido por competencia'].includes(status)) {
                return {
                    role: 'responsable',
                    eyebrow: 'Siguientes pasos · Cierre',
                    icon: 'fas fa-list-check',
                    title: 'Complete el cierre de la solicitud',
                    text: 'En el panel lateral revise los requisitos del cierre, cargue lo que falte y seleccione «Finalizar caso» cuando todos estén completos.',
                };
            }

            if (['Finalizado', 'Proceso cerrado'].includes(status)) {
                return {
                    role: 'responsable',
                    eyebrow: 'Solicitud cerrada',
                    icon: 'fas fa-lock',
                    title: 'No hay pasos pendientes',
                    text: 'La solicitud está cerrada: puede consultarla, pero ya no admite nuevos registros.',
                };
            }
        }

        const delegada = enVisita(view) ? getVisitaDelegada(view) : null;

        if (delegada) {
            return delegada;
        }

        if (RadicacionFields.isRadicacionUser(user)) {
            return {
                role: 'radicacion',
                eyebrow: 'Acción requerida · Radicación',
                icon: 'fas fa-pen-to-square',
                title: isRadicado
                    ? 'Revise y, si procede, corrija la radicación'
                    : 'Formalice la radicación de la solicitud',
                text: isRadicado
                    ? 'Para modificar un campo autorizado, ubique el cursor sobre él hasta que aparezca el ícono de lápiz. Haga clic, realice la corrección y seleccione Guardar. Toda modificación queda registrada en la Historia.'
                    : 'Verifique la información. Para diligenciar un campo autorizado, ubique el cursor sobre él hasta que aparezca el ícono de lápiz; haga clic, registre el dato y seleccione Guardar.',
            };
        }

        if (RadicacionFields.isAsignadorUser(user)) {
            return {
                role: 'asignacion',
                eyebrow: 'Acción requerida · Asignación',
                title: isAssigned
                    ? 'Verifique la asignación vigente'
                    : 'Asigne el caso al patrullero competente',
                text: isAssigned
                    ? 'Confirme que el responsable asignado conserva competencia y capacidad para continuar la gestión en campo.'
                    : 'Revise el radicado, el asunto y la ubicación antes de asignar el responsable de la gestión en campo.',
            };
        }

        if (RadicacionFields.isPatrulleroUser(user)) {
            return {
                role: 'patrullaje',
                eyebrow: 'Acción requerida · Gestión en campo',
                title: 'Realice y registre la visita',
                text: 'Consulte los datos del caso, practique la visita cuando corresponda y registre el acta con sus hallazgos.',
            };
        }

        if (RadicacionFields.isJuridicaUser(user)) {
            return {
                role: 'juridica',
                eyebrow: 'Acción requerida · Valoración jurídica',
                title: 'Defina la ruta jurídica aplicable',
                text: 'Valore la competencia y los hechos. Si corresponde, vincule el expediente y defina la actuación administrativa o el Proceso Único de Policía.',
            };
        }

        if (RadicacionFields.isInspeccionUser(user)) {
            return {
                role: 'inspeccion',
                eyebrow: 'Acción requerida · Inspección',
                title: 'Verifique la recepción y el trámite inicial',
                text: 'Confirme la información recibida, la clase de escrito y el régimen de respuesta antes de continuar con la gestión del caso.',
            };
        }

        return null;
    };

    // Banner de seguimiento para quien no tiene una acción propia en esta etapa.
    const getSeguimiento = function (view, etapa) {
        if (!etapa.estado) {
            return null;
        }

        return {
            role: 'seguimiento',
            eyebrow: 'Seguimiento · ' + etapa.estado,
            icon: 'fas fa-route',
            title: etapa.actor ? 'Siguiente acción: ' + etapa.accion : etapa.accion,
            text: etapa.actor
                ? 'Le corresponde a ' + etapa.actor + '. Usted puede consultar la solicitud y su historia.'
                : 'Puede consultar la solicitud y su historia.',
        };
    };

    const getGuidance = function (view) {
        if (!view || !view.model || view.model.isNew()) {
            return null;
        }

        const etapa = getEtapa(view);
        if (tieneExpediente(view)) {
            return {
                role: etapa.mio ? 'responsable' : 'seguimiento',
                eyebrow: 'Seguimiento · Expediente', icon: 'fas fa-folder-open',
                title: etapa.accion,
                text: etapa.detalle || (etapa.mio
                    ? 'Esta actuación le corresponde. Continúe desde el panel del expediente o de Comunicaciones, según la acción indicada.'
                    : 'Le corresponde a ' + etapa.actor + '. Puede consultar el expediente y su historia.'),
                etapa: etapa,
            };
        }
        // La etapa manda: un rol que consulta su historial no debe recibir instrucciones
        // para radicar, asignar o visitar cuando el siguiente paso le toca a otra persona.
        const guidance = (etapa.mio ? getGuidanceRol(view) : null) || getSeguimiento(view, etapa);

        if (guidance) {
            guidance.etapa = etapa;
        }

        return guidance;
    };

    const etapaHtml = function (etapa) {
        if (!etapa || !etapa.estado) {
            return '';
        }

        return '<dl class="crm-case-role-guidance__etapa">'
            + '<div><dt>Etapa actual</dt><dd>' + escapeHtml(etapa.estado) + '</dd></div>'
            + '<div><dt>Siguiente acción</dt><dd>' + escapeHtml(etapa.accion) + '</dd></div>'
            + '<div><dt>A cargo de</dt><dd>' + escapeHtml(etapa.actor)
            + (etapa.mio ? ' (usted)' : '') + '</dd></div></dl>';
    };

    const render = function (view) {
        if (!view || !view.$el || view._crmGuidanceRemoved) {
            return;
        }

        view.$el.filter('.crm-case-role-guidance').add(view.$el.find('.crm-case-role-guidance')).remove();

        if (!view.model.isNew() && tieneExpediente(view) && !view._crmExpedienteLoaded) {
            cargarExpediente(view);
        }
        if (!view.model.isNew() && !tieneExpediente(view) && estadoVisita(view) && !view._crmVisitasGuia) {
            cargarVisitas(view);
        }
        if (!view.model.isNew() && ESTADOS_CIERRE.includes(view.model.get('status')) && !view._crmCierreGuia) {
            cargarCierre(view);
        }

        const guidance = getGuidance(view);

        if (!guidance) {
            return;
        }

        const $grid = view.$el.filter('.record-grid').add(view.$el.find('.record-grid')).first();

        if (!$grid.length) {
            return;
        }

        $grid.before(
            '<aside class="crm-case-role-guidance crm-case-role-guidance--' + guidance.role + '" role="status">'
            + '<span class="crm-case-role-guidance__icon ' + (guidance.icon || 'fas fa-circle-check') + '" aria-hidden="true"></span>'
            + '<div class="crm-case-role-guidance__content"><span class="crm-case-role-guidance__eyebrow">' + escapeHtml(guidance.eyebrow) + '</span>'
            + '<strong>' + escapeHtml(guidance.title) + '</strong><p>' + escapeHtml(guidance.text) + '</p>'
            + etapaHtml(guidance.etapa)
            + (guidance.pasos
                ? '<ol class="crm-case-role-guidance__pasos">' + guidance.pasos.map(p => '<li class="'
                    + (p.ok ? 'is-done' : (p.actual ? 'is-current' : '')) + '">' + escapeHtml(p.label) + '</li>').join('') + '</ol>'
                : '')
            + '</div>'
            + '</aside>'
        );
    };

    const schedule = function (view) {
        [0, 180, 700, 1600].forEach(delay => window.setTimeout(() => render(view), delay));
    };

    // Sin recargar la página: si otra persona programa, adjunta o revisa algo, la solicitud se
    // actualiza sola (y con ella el banner y la revisión técnico-jurídica).
    const vigilarCambios = function (view) {
        const revisar = function () {
            if (document.hidden || !view.model.id || view._crmVigilando || view.mode === 'edit') {
                return;
            }

            view._crmVigilando = true;

            Promise.all([
                Espo.Ajax.getRequest('Case/action/visitas', {id: view.model.id}),
                Espo.Ajax.getRequest('Case/' + view.model.id, {select: 'status,cDecisionTramite,expedienteId,assignedUserId,assignedUserName,cCompetenciaConfirmada'}),
                ESTADOS_CIERRE.includes(view.model.get('status'))
                    ? Espo.Ajax.getRequest('Case/action/cierreEstado', {id: view.model.id}) : Promise.resolve(null),
                tieneExpediente(view)
                    ? Espo.Ajax.getRequest('Case/action/aperturaEstado', {id: view.model.id}) : Promise.resolve(null),
            ]).then(([visitas, caso, cierre, apertura]) => {
                if (view._crmGuidanceRemoved) return;
                if (apertura && JSON.stringify(apertura.seguimiento) !== JSON.stringify(view._crmExpedienteGuia)) {
                    view.model.trigger('expediente:updated', apertura.seguimiento);
                }
                if (cierre && JSON.stringify(cierre) !== JSON.stringify(view._crmCierreGuia)) {
                    view.model.trigger('cierre:updated', cierre);
                }
                const firma = JSON.stringify([caso.status, visitas.programaciones]);
                const cambio = caso.status !== view.model.get('status')
                    || (caso.assignedUserId || null) !== (view.model.get('assignedUserId') || null)
                    || (caso.assignedUserName || null) !== (view.model.get('assignedUserName') || null)
                    || caso.cCompetenciaConfirmada !== view.model.get('cCompetenciaConfirmada')
                    || (caso.cDecisionTramite || null) !== (view.model.get('cDecisionTramite') || null)
                    || (view._crmVisitasFirma && view._crmVisitasFirma !== firma);

                if (cambio) {
                    view.model.fetch();
                }
            }).catch(() => {}).finally(() => {
                view._crmVigilando = false;
            });
        };
        const timer = window.setInterval(revisar, 20000);

        document.addEventListener('visibilitychange', revisar);
        view.once('remove', () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', revisar);
        });
    };

    const setup = function (view) {
        view.once('remove', () => { view._crmGuidanceRemoved = true; });
        vigilarCambios(view);
        RadicacionFields.ensureProfile(view.getUser()).then(profile => {
            view._crmRoles = (profile && profile.roles) || [];
            render(view);
        }).catch(() => {});
        RadicacionFields.onProfileReady(() => schedule(view));
        view.listenTo(view.model, 'change:status change:cNumeroRadicado change:cExpediente change:assignedUserId change:assignedUserName change:cDecisionTramite change:cCompetenciaConfirmada change:expedienteId', () => render(view));
        // El panel Visitas comparte la respuesta que acaba de cargar, incluso cuando el
        // guardado no cambia el estado ni ningún atributo de la solicitud.
        view.listenTo(view.model, 'visitas:updated', visitas => {
            view._crmVisitasGuiaRevision = (view._crmVisitasGuiaRevision || 0) + 1;
            view._crmVisitasGuia = visitas;
            view._crmVisitasGuiaError = false;
            view._crmVisitasFirma = JSON.stringify([view.model.get('status'), visitas.programaciones]);
            render(view);
        });
        view.listenTo(view.model, 'cierre:updated', estado => {
            view._crmCierreRevision = (view._crmCierreRevision || 0) + 1;
            view._crmCierreGuia = estado;
            if (typeof view.trigger === 'function') { view.trigger('crm:cierre-guia'); }
            view._crmCierreError = false;
            render(view);
        });
        view.listenTo(view.model, 'expediente:updated', seguimiento => {
            view._crmExpedienteRevision = (view._crmExpedienteRevision || 0) + 1;
            view._crmExpedienteGuia = seguimiento;
            view._crmExpedienteLoaded = true;
            view._crmExpedienteError = false;
            render(view);
        });
        // Programar la visita o adjuntar el acta recarga la solicitud: los pasos se recalculan.
        view.listenTo(view.model, 'sync', () => {
            view._crmExpedienteRevision = (view._crmExpedienteRevision || 0) + 1;
            view._crmExpedienteLoaded = false;
            view._crmExpedienteGuia = null;
            view._crmExpedienteError = false;
            view._crmCierreRevision = (view._crmCierreRevision || 0) + 1;
            view._crmCierreGuia = null;
            view._crmCierreError = false;
            view._crmVisitasGuiaRevision = (view._crmVisitasGuiaRevision || 0) + 1;
            view._crmVisitasGuia = null;
            view._crmVisitasGuiaError = false;
            render(view);
        });
    };

    return {setup: setup, schedule: schedule};
});
