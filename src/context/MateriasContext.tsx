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
  agregarMateria: (nombre: string) => void;
  eliminarMateria: (id: string) => void;
}

const MateriasContext = createContext<MateriasContextType | undefined>(undefined);

export const MateriasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [materias, setMaterias] = useState<Materia[]>([]);
  const [cargando, setCargando] = useState(true);

  // Cargar datos guardados al abrir la app
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (value) {
          setMaterias(JSON.parse(value));
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

  // Guardar automáticamente cada vez que cambian las materias
  useEffect(() => {
    if (cargando) return; // evita sobreescribir mientras aún carga
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

  const agregarMateria = (nombre: string) => {
    if (!nombre.trim()) return;
    const nuevaMateria: Materia = {
      id: Date.now().toString(),
      nombre,
      color: ionicColors[Math.floor(Math.random() * ionicColors.length)],
      notaDeseada: 70, etapa: 1, pesoTeorico: 70, pesoPractico: 30,
      categoriasP1: [{ id: 'c1', nombre: 'Componente 1', peso: 100, notaGlobalRapida: 0, subActividades: [] }],
      categoriasP2: [], categoriasPractico: []
    };
    setMaterias(prev => [...prev, nuevaMateria]);
  };

  const eliminarMateria = (id: string) => {
    setMaterias(prev => prev.filter(m => m.id !== id));
  };

  return (
    <MateriasContext.Provider value={{ materias, cargando, setMaterias, actualizarMateria, agregarMateria, eliminarMateria }}>
      {children}
    </MateriasContext.Provider>
  );
};

export const useMaterias = (): MateriasContextType => {
  const context = useContext(MateriasContext);
  if (!context) throw new Error('useMaterias debe usarse dentro de un MateriasProvider');
  return context;
};