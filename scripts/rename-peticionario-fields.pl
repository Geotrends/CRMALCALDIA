#!/usr/bin/env perl
use strict;
use warnings;

# Renombra campos del peticionario en código (sufijo Peticionario).
my @files = @ARGV;
my @rules = (
    [qr/cCuadranteViaPrincipal(?!Perjudicante)/, 'cCuadranteViaPrincipalPeticionario'],
    [qr/cLetraViaPrincipal(?!Perjudicante)/, 'cLetraViaPrincipalPeticionario'],
    [qr/cNumViaPrincipal(?!Perjudicante)/, 'cNumViaPrincipalPeticionario'],
    [qr/cViaPrincipal(?!Perjudicante)/, 'cViaPrincipalPeticionario'],
    [qr/cCuadranteGeneradora(?!Perjudicante)/, 'cCuadranteGeneradoraPeticionario'],
    [qr/cLetraGeneradora(?!Perjudicante)/, 'cLetraGeneradoraPeticionario'],
    [qr/cGeneradora(?!Perjudicante)/, 'cGeneradoraPeticionario'],
    [qr/cCanalDeReporte/, 'cCanalDeReportePeticionario'],
    [qr/cZonaAlcaldia/, 'cZonaAlcaldiaPeticionario'],
    [qr/cDireccion(?!Perjudicante)/, 'cDireccionPeticionario'],
    [qr/cTelefono(?!Perjudicante)/, 'cTelefonoPeticionario'],
    [qr/cBarrio(?!Perjudicante|Residencia)/, 'cBarrioPeticionario'],
    [qr/cInterior(?!Perjudicante)/, 'cInteriorPeticionario'],
    [qr/cBloque(?!Perjudicante)/, 'cBloquePeticionario'],
    [qr/cPlaca(?!Perjudicante)/, 'cPlacaPeticionario'],
    [qr/cCorreo/, 'cCorreoPeticionario'],
);

for my $file (@files) {
    open my $fh, '<', $file or die "No se puede leer $file: $!";
    my $content = do { local $/; <$fh> };
    close $fh;

    my $original = $content;

    for my $rule (@rules) {
        my ($pattern, $replacement) = @$rule;
        $content =~ s/$pattern/$replacement/g;
    }

    if ($file !~ m{Contact|Account}) {
        $content =~ s/cMunicipio/cMunicipioPeticionario/g;
    }

    next if $content eq $original;

    open my $out, '>', $file or die "No se puede escribir $file: $!";
    print $out $content;
    close $out;
    print "Actualizado: $file\n";
}
