import {
  schoolOutline, flaskOutline, calculatorOutline, libraryOutline,
  globeOutline, codeSlashOutline, colorPaletteOutline, medkitOutline
} from 'ionicons/icons';

export interface OpcionIcono {
  clave: string;
  icono: string;
}

// La 'clave' es lo que se guarda en la materia. El 'icono' es el valor real que entiende IonIcon.
export const iconosDisponibles: OpcionIcono[] = [
  { clave: 'school', icono: schoolOutline },
  { clave: 'flask', icono: flaskOutline },
  { clave: 'calculator', icono: calculatorOutline },
  { clave: 'library', icono: libraryOutline },
  { clave: 'globe', icono: globeOutline },
  { clave: 'code', icono: codeSlashOutline },
  { clave: 'palette', icono: colorPaletteOutline },
  { clave: 'medkit', icono: medkitOutline }
];

const mapaIconos: Record<string, string> = iconosDisponibles.reduce((acc, op) => {
  acc[op.clave] = op.icono;
  return acc;
}, {} as Record<string, string>);

export const obtenerIcono = (clave: string): string => {
  return mapaIconos[clave] || schoolOutline;
};