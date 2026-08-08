import React from 'react';
import { IonInput } from '@ionic/react';

const clamp = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

export interface CampoNotaProps {
  value: number;
  onChange: (valor: number) => void;
  max?: number;
  min?: number;
  ultimoCampo?: boolean;
  readonly?: boolean;
  style?: React.CSSProperties;
  campoId?: string;
  siguienteId?: string;
  refsMap?: React.MutableRefObject<Record<string, any>>;
}

/**
 * Input numérico reutilizable con las mejoras de ingreso de notas:
 * - Teclado decimal en móvil
 * - Selecciona todo el texto al enfocar (evita tener que borrar el "0" a mano)
 * - Enter/Next salta al siguiente campo si se le pasa refsMap + siguienteId
 */
const CampoNota: React.FC<CampoNotaProps> = ({ value, onChange, max = 100, min = 0, ultimoCampo, readonly, style, campoId, siguienteId, refsMap }) => {
  const seleccionarAlEnfocar = async (e: any) => {
    try {
      const nativeInput = await e.target.getInputElement();
      nativeInput.select();
    } catch { /* en desktop sin soporte, simplemente no selecciona */ }
  };

  const manejarTecla = async (e: React.KeyboardEvent, elemento: any) => {
    if (e.key !== 'Enter') return;
    if (siguienteId && refsMap?.current[siguienteId]) {
      refsMap.current[siguienteId].setFocus();
    } else {
      const nativeInput = await elemento?.getInputElement();
      nativeInput?.blur();
    }
  };

  return (
    <IonInput
      ref={el => { if (campoId && refsMap) refsMap.current[campoId] = el; }}
      type="number"
      inputmode="decimal"
      enterkeyhint={ultimoCampo ? 'done' : 'next'}
      readonly={readonly}
      value={value}
      onIonFocus={seleccionarAlEnfocar}
      onKeyDown={e => manejarTecla(e, refsMap?.current[campoId ?? ''])}
      onIonChange={e => {
        const parsed = parseFloat(e.detail.value!);
        onChange(isNaN(parsed) ? 0 : clamp(parsed, min, max));
      }}
      style={style}
    />
  );
};

export default CampoNota;