import { Materia, Categoria } from '../context/MateriasContext';

export const getActiveKey = (etapa: number): keyof Materia => {
  return etapa === 1 ? 'categoriasP1' : etapa === 2 ? 'categoriasP2' : 'categoriasPractico';
};

export const calcularNotaDeCategoria = (cat: Categoria): number => {
  if (cat.subActividades.length === 0) return cat.notaGlobalRapida;

  let sumaObtenida = 0;
  let sumaMaxima = 0;
  cat.subActividades.forEach(sub => {
    sumaObtenida += sub.notaObtenida;
    sumaMaxima += sub.notaMaxima;
  });

  if (sumaMaxima === 0) return 0;
  return (sumaObtenida / sumaMaxima) * 100;
};

export const calcularEstadisticas = (mat: Materia) => {
  const notaP1 = mat.categoriasP1.reduce((acc, cat) => acc + (calcularNotaDeCategoria(cat) * (cat.peso / 100)), 0);
  const notaP2 = mat.categoriasP2.reduce((acc, cat) => acc + (calcularNotaDeCategoria(cat) * (cat.peso / 100)), 0);
  const notaPr = mat.categoriasPractico.reduce((acc, cat) => acc + (calcularNotaDeCategoria(cat) * (cat.peso / 100)), 0);

  const pesoGlobalP1 = mat.pesoTeorico / 2;
  const pesoGlobalP2 = mat.pesoTeorico / 2;
  const pesoGlobalPr = mat.pesoPractico;

  const acumuladoGlobal = (notaP1 * (pesoGlobalP1 / 100)) +
                          (notaP2 * (pesoGlobalP2 / 100)) +
                          (notaPr * (pesoGlobalPr / 100));

  const listaActiva = mat[getActiveKey(mat.etapa)] as Categoria[];
  const pesoActivoCargado = listaActiva.reduce((acc, cat) => acc + cat.peso, 0);
  const notaActivaParcial = mat.etapa === 1 ? notaP1 : mat.etapa === 2 ? notaP2 : notaPr;

  const faltanteActivo = 100 - pesoActivoCargado;
  let pesoGlobalRestante = 0;

  if (mat.etapa === 1) pesoGlobalRestante = (faltanteActivo / 100 * pesoGlobalP1) + pesoGlobalP2 + pesoGlobalPr;
  else if (mat.etapa === 2) pesoGlobalRestante = (faltanteActivo / 100 * pesoGlobalP2) + pesoGlobalPr;
  else pesoGlobalRestante = (faltanteActivo / 100 * pesoGlobalPr);

  let notaNecesaria = 0;
  if (pesoGlobalRestante > 0) {
    notaNecesaria = (mat.notaDeseada - acumuladoGlobal) / (pesoGlobalRestante / 100);
  }

  return { notaP1, notaP2, notaPr, acumuladoGlobal, notaNecesaria, pesoActivoCargado, notaActivaParcial, listaActiva };
};