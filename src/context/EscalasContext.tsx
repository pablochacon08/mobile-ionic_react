import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';

export interface RangoEscala {
  id: string;
  etiqueta: string;
  minimo: number;
  maximo: number;
}

const STORAGE_KEY = 'escalas';

const escalaPorDefecto: RangoEscala[] = [
  { id: 'e1', etiqueta: 'Excelente (A)', minimo: 90, maximo: 100 },
  { id: 'e2', etiqueta: 'Bueno (B)', minimo: 80, maximo: 89 },
  { id: 'e3', etiqueta: 'Regular (C)', minimo: 70, maximo: 79 },
  { id: 'e4', etiqueta: 'Reprobado (F)', minimo: 0, maximo: 69 }
];

interface EscalasContextType {
  escalas: RangoEscala[];
  cargando: boolean;
  agregarRango: () => void;
  actualizarRango: (id: string, campo: keyof RangoEscala, valor: string | number) => void;
  eliminarRango: (id: string) => void;
}

const EscalasContext = createContext<EscalasContextType | undefined>(undefined);

export const EscalasProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [escalas, setEscalas] = useState<RangoEscala[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        setEscalas(value ? JSON.parse(value) : escalaPorDefecto);
      } catch (error) {
        console.error('Error cargando escalas:', error);
        setEscalas(escalaPorDefecto);
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
        await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(escalas) });
      } catch (error) {
        console.error('Error guardando escalas:', error);
      }
    };
    guardarDatos();
  }, [escalas, cargando]);

  const agregarRango = () => {
    const nuevo: RangoEscala = { id: Date.now().toString(), etiqueta: 'Nuevo Rango', minimo: 0, maximo: 100 };
    setEscalas(prev => [...prev, nuevo]);
  };

  const actualizarRango = (id: string, campo: keyof RangoEscala, valor: string | number) => {
    setEscalas(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r));
  };

  const eliminarRango = (id: string) => {
    setEscalas(prev => prev.filter(r => r.id !== id));
  };

  return (
    <EscalasContext.Provider value={{ escalas, cargando, agregarRango, actualizarRango, eliminarRango }}>
      {children}
    </EscalasContext.Provider>
  );
};

export const useEscalas = (): EscalasContextType => {
  const context = useContext(EscalasContext);
  if (!context) throw new Error('useEscalas debe usarse dentro de un EscalasProvider');
  return context;
};