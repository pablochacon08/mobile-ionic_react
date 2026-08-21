import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';

export interface SubActividad {
  id: string;
  nombre: string;
  notaObtenida: number;
  notaMaxima: number;
}

export interface Categoria {
  id: string;
  nombre: string;
  peso: number;
  notaGlobalRapida: number;
  subActividades: SubActividad[];
}

export type EtapaEvaluacion = 1 | 2 | 3;

export interface HistorialPunto {
  fecha: string; // YYYY-MM-DD
  valor: number; // acumuladoGlobal en ese momento
}

export interface Materia {
  id: string;
  nombre: string;
  color: string;
  icono: string; // clave: 'school', 'flask', 'calculator', etc. (ver utils/iconos.ts)
  notaDeseada: number;
  etapa: EtapaEvaluacion;
  pesoTeorico: number;
  pesoPractico: number;
  categoriasP1: Categoria[];
  categoriasP2: Categoria[];
  categoriasPractico: Categoria[];
  historial: HistorialPunto[];
}

export interface CategoriaPlantilla {
  nombre: string;
  peso: number;
}

export const ionicColors = ['azul', 'verde', 'morado', 'ambar', 'rosa'];

const STORAGE_KEY = 'materias';
const RACHA_CONTEO_KEY = 'racha_conteo';
const RACHA_FECHA_KEY = 'racha_ultima_fecha';

const hoyISO = () => new Date().toISOString().slice(0, 10);
const ayerISO = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const materiaPorDefecto: Materia[] = [
  {
    id: '1',
    nombre: 'Sistemas Digitales',
    color: 'ambar', 
    icono: 'calculator',
    notaDeseada: 70,
    etapa: 3, // Etapa 3 porque ya se llenó P1 y P2
    pesoTeorico: 70,
    pesoPractico: 30,
    categoriasP1: [
      {
        id: 'c1', nombre: 'Control de Lectura', peso: 40, notaGlobalRapida: 0,
        subActividades: [
          { id: 's1', nombre: 'C1', notaObtenida: 4.5, notaMaxima: 5 },
          { id: 's2', nombre: 'C2', notaObtenida: 5, notaMaxima: 5 }
        ]
      },
      { id: 'c2', nombre: 'Examen P1', peso: 60, notaGlobalRapida: 75, subActividades: [] }
    ],
    categoriasP2: [
      { id: 'c3', nombre: 'Lecciones', peso: 30, notaGlobalRapida: 85, subActividades: [] },
      { id: 'c4', nombre: 'Examen P2', peso: 70, notaGlobalRapida: 68, subActividades: [] }
    ],
    categoriasPractico: [
      { id: 'c5', nombre: 'Laboratorio Práctico', peso: 100, notaGlobalRapida: 80, subActividades: [] }
    ],
    historial: [
      { fecha: '2026-06-15', valor: 15.5 },
      { fecha: '2026-06-28', valor: 32.0 },
      { fecha: '2026-07-15', valor: 55.5 },
      { fecha: '2026-08-09', valor: 76.8 } // Nota final acumulada aprox.
    ]
  },
  {
    id: '2',
    nombre: 'Estructuras de Datos',
    color: 'verde',
    icono: 'school', 
    notaDeseada: 80,
    etapa: 3,
    pesoTeorico: 70,
    pesoPractico: 30,
    categoriasP1: [
      { id: 'c6', nombre: 'Lecciones', peso: 30, notaGlobalRapida: 85, subActividades: [] },
      { id: 'c7', nombre: 'Examen P1', peso: 70, notaGlobalRapida: 72, subActividades: [] }
    ],
    categoriasP2: [
      { id: 'c8', nombre: 'Talleres', peso: 40, notaGlobalRapida: 90, subActividades: [] },
      { id: 'c9', nombre: 'Examen P2', peso: 60, notaGlobalRapida: 88, subActividades: [] }
    ],
    categoriasPractico: [
      { id: 'c10', nombre: 'Proyecto Web', peso: 100, notaGlobalRapida: 95, subActividades: [] }
    ],
    historial: [
      { fecha: '2026-06-10', valor: 18.0 },
      { fecha: '2026-06-25', valor: 38.5 },
      { fecha: '2026-07-20', valor: 68.2 },
      { fecha: '2026-08-15', valor: 85.3 } // Superó la meta de 80
    ]
  },
  {
    id: '3',
    nombre: 'Redes de Computadoras',
    color: 'morado', // Usamos el siguiente color en tu paleta
    icono: 'wifi', 
    notaDeseada: 75,
    etapa: 1, // Recién en el primer parcial
    pesoTeorico: 70,
    pesoPractico: 30,
    categoriasP1: [
      { id: 'c11', nombre: 'Laboratorios Cisco', peso: 40, notaGlobalRapida: 92, subActividades: [] },
      { id: 'c12', nombre: 'Examen Teórico', peso: 60, notaGlobalRapida: 60, subActividades: [] }
    ],
    categoriasP2: [],
    categoriasPractico: [],
    // Historial largo para probar la curva del gráfico Sparkline
    historial: [
      { fecha: '2026-05-01', valor: 0.0 },
      { fecha: '2026-05-15', valor: 3.5 },
      { fecha: '2026-06-02', valor: 8.8 },
      { fecha: '2026-06-18', valor: 12.4 },
      { fecha: '2026-07-05', valor: 16.9 },
      { fecha: '2026-07-20', valor: 19.1 },
      { fecha: '2026-08-05', valor: 22.5 },
      { fecha: '2026-08-18', valor: 25.4 }
    ]
  }
];

// Calcula el acumulado global de forma local para no depender de utils/calculos aquí
// (evita cualquier ambigüedad de orden de carga entre módulos).
const calcularAcumuladoGlobal = (mat: Materia): number => {
  const notaDeCategoria = (cat: Categoria): number => {
    if (cat.subActividades.length === 0) return cat.notaGlobalRapida;
    let sumaObtenida = 0;
    let sumaMaxima = 0;
    cat.subActividades.forEach(sub => { sumaObtenida += sub.notaObtenida; sumaMaxima += sub.notaMaxima; });
    if (sumaMaxima === 0) return 0;
    return (sumaObtenida / sumaMaxima) * 100;
  };
  const notaP1 = mat.categoriasP1.reduce((acc, cat) => acc + (notaDeCategoria(cat) * (cat.peso / 100)), 0);
  const notaP2 = mat.categoriasP2.reduce((acc, cat) => acc + (notaDeCategoria(cat) * (cat.peso / 100)), 0);
  const notaPr = mat.categoriasPractico.reduce((acc, cat) => acc + (notaDeCategoria(cat) * (cat.peso / 100)), 0);
  const pesoGlobalP1 = mat.pesoTeorico / 2;
  const pesoGlobalP2 = mat.pesoTeorico / 2;
  const pesoGlobalPr = mat.pesoPractico;
  return (notaP1 * (pesoGlobalP1 / 100)) + (notaP2 * (pesoGlobalP2 / 100)) + (notaPr * (pesoGlobalPr / 100));
};

const registrarSnapshot = (materia: Materia): Materia => {
  const valor = calcularAcumuladoGlobal(materia);
  const hoy = hoyISO();
  const historial = materia.historial ?? [];
  const ultimo = historial[historial.length - 1];

  let nuevoHistorial: HistorialPunto[];
  if (ultimo && ultimo.fecha === hoy) {
    nuevoHistorial = [...historial.slice(0, -1), { fecha: hoy, valor }];
  } else {
    nuevoHistorial = [...historial, { fecha: hoy, valor }].slice(-20);
  }
  return { ...materia, historial: nuevoHistorial };
};

const obtenerSiguienteColor = (materias: Materia[]): string => {
  const conteo: Record<string, number> = {};
  ionicColors.forEach(c => { conteo[c] = 0; });
  materias.forEach(m => { conteo[m.color] = (conteo[m.color] ?? 0) + 1; });
  return ionicColors.reduce((menos, actual) => (conteo[actual] < conteo[menos] ? actual : menos), ionicColors[0]);
};

interface MateriasContextType {
  materias: Materia[];
  cargando: boolean;
  rachaDias: number;
  setMaterias: React.Dispatch<React.SetStateAction<Materia[]>>;
  actualizarMateria: (materiaActualizada: Materia) => void;
  agregarMateria: (nombre: string, icono?: string, categoriasIniciales?: CategoriaPlantilla[]) => Materia;
  eliminarMateria: (id: string) => Materia | undefined;
  restaurarMateria: (materia: Materia, indiceOriginal?: number) => void;
  recargarMaterias: () => Promise<void>;
}

const MateriasContext = createContext<MateriasContextType | undefined>(undefined);

export const MateriasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rachaDias, setRachaDias] = useState(0);

  const migrar = (cargadas: any[]): Materia[] =>
    cargadas.map(m => ({ ...m, icono: m.icono || 'school', historial: m.historial ?? [] }));

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value) {
          setMaterias(migrar(JSON.parse(value)));
        } else {
          setMaterias(materiaPorDefecto);
        }
      } catch (error) {
        console.error('Error cargando materias:', error);
        setMaterias(materiaPorDefecto);
      } finally {
        setCargando(false);
      }
    };
    cargarDatos();
  }, []);

  useEffect(() => {
    const cargarRacha = async () => {
      const { value: conteo } = await Preferences.get({ key: RACHA_CONTEO_KEY });
      const { value: fecha } = await Preferences.get({ key: RACHA_FECHA_KEY });
      if (conteo && fecha && (fecha === hoyISO() || fecha === ayerISO())) {
        setRachaDias(parseInt(conteo, 10));
      } else {
        setRachaDias(0);
      }
    };
    cargarRacha();
  }, []);

  useEffect(() => {
    if (cargando) return;
    const guardarDatos = async () => {
      try {
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(materias) });
      } catch (error) {
        console.error('Error guardando materias:', error);
      }
    };
    guardarDatos();
  }, [materias, cargando]);

  const registrarActividadRacha = async () => {
    const hoy = hoyISO();
    const { value: fechaGuardada } = await Preferences.get({ key: RACHA_FECHA_KEY });
    if (fechaGuardada === hoy) return; // ya se contó hoy, no duplicar

    const { value: conteoGuardado } = await Preferences.get({ key: RACHA_CONTEO_KEY });
    const conteoAnterior = conteoGuardado ? parseInt(conteoGuardado, 10) : 0;
    const nuevoConteo = fechaGuardada === ayerISO() ? conteoAnterior + 1 : 1;

    await Preferences.set({ key: RACHA_CONTEO_KEY, value: String(nuevoConteo) });
    await Preferences.set({ key: RACHA_FECHA_KEY, value: hoy });
    setRachaDias(nuevoConteo);
  };

  const actualizarMateria = (materiaActualizada: Materia) => {
    const conSnapshot = registrarSnapshot(materiaActualizada);
    setMaterias(prev => prev.map(m => m.id === conSnapshot.id ? conSnapshot : m));
    registrarActividadRacha();
  };

  const agregarMateria = (nombre: string, icono: string = 'school', categoriasIniciales?: CategoriaPlantilla[]): Materia => {
    const color = obtenerSiguienteColor(materias);

    const categoriasP1 = categoriasIniciales && categoriasIniciales.length > 0
      ? categoriasIniciales.map((c, i) => ({
          id: `c${i + 1}-${Date.now()}`,
          nombre: c.nombre,
          peso: c.peso,
          notaGlobalRapida: 0,
          subActividades: []
        }))
      : [{ id: 'c1', nombre: 'Actividad 1', peso: 100, notaGlobalRapida: 0, subActividades: [] }];

    const nuevaMateria: Materia = {
      id: Date.now().toString(),
      nombre,
      color,
      icono,
      notaDeseada: 70, etapa: 1, pesoTeorico: 70, pesoPractico: 30,
      categoriasP1,
      categoriasP2: [], categoriasPractico: [],
      historial: []
    };
    setMaterias(prev => [...prev, nuevaMateria]);
    registrarActividadRacha();
    return nuevaMateria;
  };

  const eliminarMateria = (id: string): Materia | undefined => {
    const materiaEliminada = materias.find(m => m.id === id);
    setMaterias(prev => prev.filter(m => m.id !== id));
    return materiaEliminada;
  };

  const restaurarMateria = (materia: Materia, indiceOriginal?: number) => {
    setMaterias(prev => {
      if (indiceOriginal === undefined || indiceOriginal >= prev.length) {
        return [...prev, materia];
      }
      const copia = [...prev];
      copia.splice(indiceOriginal, 0, materia);
      return copia;
    });
  };

  const recargarMaterias = async () => {
    try {
      const { value } = await Preferences.get({ key: STORAGE_KEY });
      if (value) setMaterias(migrar(JSON.parse(value)));
    } catch (error) {
      console.error('Error recargando materias:', error);
    }
  };

  return (
    <MateriasContext.Provider value={{ materias, cargando, rachaDias, setMaterias, actualizarMateria, agregarMateria, eliminarMateria, restaurarMateria, recargarMaterias }}>
      {children}
    </MateriasContext.Provider>
  );
};

export const useMaterias = (): MateriasContextType => {
  const context = useContext(MateriasContext);
  if (!context) throw new Error('useMaterias debe usarse dentro de un MateriasProvider');
  return context;
};