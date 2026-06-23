define('custom:helpers/case-party-name', [], function () {

    const buildFullName = function (nombre, apellido, tipoPersona) {
        nombre = String(nombre || '').trim();
        apellido = String(apellido || '').trim();

        if (tipoPersona === 'Persona jurídica') {
            return nombre;
        }

        if (nombre === '') {
            return apellido;
        }

        if (apellido === '') {
            return nombre;
        }

        return nombre + ' ' + apellido;
    };

    const peticionarioFromModel = function (model) {
        return buildFullName(
            model.get('cNombrePeticionario'),
            model.get('cApellidoPeticionario'),
            model.get('cTipoPersonaPeticionario')
        );
    };

    const perjudicanteFromModel = function (model) {
        return buildFullName(
            model.get('cNombrePerjudicante'),
            model.get('cApellidoPerjudicante'),
            model.get('cTipoPersonaPerjudicante')
        );
    };

    return {
        buildFullName: buildFullName,
        peticionarioFromModel: peticionarioFromModel,
        perjudicanteFromModel: perjudicanteFromModel,
    };
});
