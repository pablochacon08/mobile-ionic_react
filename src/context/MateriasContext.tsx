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
}

export const ionicColors = ['primary', 'secondary', 'tertiary', 'success', 'warning'];

const STORAGE_KEY = 'materias';

const materiaPorDefecto: Materia[] = [
  {
    id: '1',
    nombre: 'Sistemas Digitales',
    color: 'tertiary',
    icono: 'calculator',
    notaDeseada: 70,
    etapa: 1,
    pesoTeorico: 70,
    pesoPractico: 30,
    categoriasP1: [
      {
        id: 'c1', nombre: 'Control de Lectura', peso: 50, notaGlobalRapida: 0,
        subActividades: [
          { id: 's1', nombre: 'C1', notaObtenida: 4, notaMaxima: 5 },
          { id: 's2', nombre: 'C2', notaObtenida: 5, notaMaxima: 5 }
        ]
      },
      { id: 'c2', nombre: 'Examen', peso: 50, notaGlobalRapida: 60, subActividades: [] }
    ],
    categoriasP2: [],
    categoriasPractico: []
  }
];

interface MateriasContextType {
  materias: Materia[];
  cargando: boolean;
  setMaterias: React.Dispatch<React.SetStateAction<Materia[]>>;
  actualizarMateria: (materiaActualizada: Materia) => void;
  agregarMateria: (nombre: string, icono?: string) => Materia;
  eliminarMateria: (id: string) => Materia | undefined;
  restaurarMateria: (materia: Materia, indiceOriginal?: number) => void;
}

const MateriasContext = createContext<MateriasContextType | undefined>(undefined);

export const MateriasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value) {
          const cargadas: Materia[] = JSON.parse(value);
          const migradas = cargadas.map(m => ({ ...m, icono: m.icono || 'school' }));
          setMaterias(migradas);
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

  const actualizarMateria = (materiaActualizada: Materia) => {
    setMaterias(prev => prev.map(m => m.id === materiaActualizada.id ? materiaActualizada : m));
  };

  const agregarMateria = (nombre: string, icono: string = 'school'): Materia => {
    const color = ionicColors[materias.length % ionicColors.length];
    const nuevaMateria: Materia = {
      id: Date.now().toString(),
      nombre,
      color,
      icono,
      notaDeseada: 70, etapa: 1, pesoTeorico: 70, pesoPractico: 30,
      categoriasP1: [{ id: 'c1', nombre: 'Componente 1', peso: 100, notaGlobalRapida: 0, subActividades: [] }],
      categoriasP2: [], categoriasPractico: []
    };
    setMaterias(prev => [...prev, nuevaMateria]);
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

  return (
    <MateriasContext.Provider value={{ materias, cargando, setMaterias, actualizarMateria, agregarMateria, eliminarMateria, restaurarMateria }}>
      {children}
    </MateriasContext.Provider>
  );
};

export const useMaterias = (): MateriasContextType => {
  const context = useContext(MateriasContext);
  if (!context) throw new Error('useMaterias debe usarse dentro de un MateriasProvider');
  return context;
};