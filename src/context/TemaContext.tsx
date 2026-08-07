import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';

export type ModoTema = 'claro' | 'oscuro' | 'sistema';

const STORAGE_KEY = 'tema';

interface TemaContextType {
  modo: ModoTema;
  setModo: (modo: ModoTema) => void;
}

const TemaContext = createContext<TemaContextType | undefined>(undefined);

const aplicarTema = (modo: ModoTema) => {
  const prefiereOscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const debeSerOscuro = modo === 'oscuro' || (modo === 'sistema' && prefiereOscuro);
  document.documentElement.classList.toggle('ion-palette-dark', debeSerOscuro);
};

export const TemaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modo, setModoState] = useState<ModoTema>('sistema');

  useEffect(() => {
    const cargar = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        const modoGuardado = (value as ModoTema) || 'sistema';
        setModoState(modoGuardado);
        aplicarTema(modoGuardado);
      } catch (error) {
        console.error('Error cargando tema:', error);
        aplicarTema('sistema');
      }
    };
    cargar();

    // Si el modo es 'sistema', reacciona a cambios del sistema operativo en vivo
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      setModoState(actual => {
        if (actual === 'sistema') aplicarTema('sistema');
        return actual;
      });
    };
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const setModo = (nuevoModo: ModoTema) => {
    setModoState(nuevoModo);
    aplicarTema(nuevoModo);
    Preferences.set({ key: STORAGE_KEY, value: nuevoModo }).catch(err => console.error('Error guardando tema:', err));
  };

  return (
    <TemaContext.Provider value={{ modo, setModo }}>
      {children}
    </TemaContext.Provider>
  );
};

export const useTema = (): TemaContextType => {
  const context = useContext(TemaContext);
  if (!context) throw new Error('useTema debe usarse dentro de un TemaProvider');
  return context;
};