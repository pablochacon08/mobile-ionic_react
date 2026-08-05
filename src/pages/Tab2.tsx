import React, { useState, useMemo } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardContent,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonInput, IonIcon, IonText, IonNote
} from '@ionic/react';
import { warningOutline, checkmarkCircleOutline, flaskOutline } from 'ionicons/icons';
import { useMaterias, Categoria } from '../context/MateriasContext';
import { getActiveKey, calcularNotaDeCategoria, calcularEstadisticas } from '../utils/calculos';

const Tab2: React.FC = () => {
  const { materias } = useMaterias();
  const [materiaId, setMateriaId] = useState<string>(materias[0]?.id ?? '');
  // Notas simuladas por categoría (no se guardan, solo son para "qué pasaría si...")
  const [simulacion, setSimulacion] = useState<Record<string, number>>({});

  const materia = materias.find(m => m.id === materiaId);

  // Cuando cambia la materia seleccionada, reiniciamos la simulación
  const handleCambiarMateria = (id: string) => {
    setMateriaId(id);
    setSimulacion({});
  };

  const statsReales = materia ? calcularEstadisticas(materia) : null;

  // Aplicamos la simulación sobre una copia de la materia, sin tocar los datos guardados
  const statsSimulados = useMemo(() => {
    if (!materia) return null;
    const key = getActiveKey(materia.etapa);
    const listaActiva = materia[key] as Categoria[];
    const listaSimulada = listaActiva.map(cat =>
      simulacion[cat.id] !== undefined ? { ...cat, subActividades: [], notaGlobalRapida: simulacion[cat.id] } : cat
    );
    const materiaSimulada = { ...materia, [key]: listaSimulada };
    return calcularEstadisticas(materiaSimulada);
  }, [materia, simulacion]);

  if (!materia || !statsReales || !statsSimulados) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle style={{ fontWeight: '800' }}>Predictor</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding">
          <IonText color="medium">
            <p>Todavía no tienes materias creadas. Ve al Dashboard y agrega una para poder usar el predictor.</p>
          </IonText>
        </IonContent>
      </IonPage>
    );
  }

  const tituloEtapa = materia.etapa === 1 ? 'Primer Parcial' : materia.etapa === 2 ? 'Segundo Parcial' : 'Componente Práctico';
  const hayCambiosSimulados = Object.keys(simulacion).length > 0;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ fontWeight: '800' }}>Predictor</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">

        <IonItem style={{ borderRadius: '12px', marginBottom: '20px' }}>
          <IonLabel position="stacked" color="medium">Materia</IonLabel>
          <IonSelect value={materiaId} onIonChange={e => handleCambiarMateria(e.detail.value)} interface="popover">
            {materias.map(m => (
              <IonSelectOption key={m.id} value={m.id}>{m.nombre}</IonSelectOption>
            ))}
          </IonSelect>
        </IonItem>

        <IonCard style={{ borderRadius: '12px', borderTop: `4px solid var(--ion-color-${materia.color})` }}>
          <IonCardContent>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Meta</p>
                <p style={{ margin: '5px 0 0', fontWeight: '800', fontSize: '1.3rem' }}>{materia.notaDeseada}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Acumulado Actual</p>
                <p style={{ margin: '5px 0 0', fontWeight: '800', fontSize: '1.3rem' }}>{statsReales.acumuladoGlobal.toFixed(1)}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>
                  {hayCambiosSimulados ? 'Simulado' : 'Acumulado'}
                </p>
                <p style={{ margin: '5px 0 0', fontWeight: '800', fontSize: '1.3rem', color: hayCambiosSimulados ? `var(--ion-color-${materia.color})` : 'var(--ion-text-color)' }}>
                  {statsSimulados.acumuladoGlobal.toFixed(1)}
                </p>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '25px 0 10px 5px' }}>
          <IonIcon icon={flaskOutline} color="medium" />
          <IonText color="medium"><p style={{ margin: 0, fontSize: '0.85rem' }}>Simula notas para <strong>{tituloEtapa}</strong> sin guardarlas</p></IonText>
        </div>

        {statsReales.listaActiva.map((cat) => {
          const notaReal = calcularNotaDeCategoria(cat);
          const valorSimulado = simulacion[cat.id];

          return (
            <IonCard key={cat.id} style={{ borderRadius: '10px', margin: '0 0 10px 0' }}>
              <IonItem lines="none">
                <IonLabel>
                  <h3 style={{ fontWeight: '700', fontSize: '0.95rem' }}>{cat.nombre}</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>Peso {cat.peso}% • Nota real: {notaReal.toFixed(1)}</p>
                </IonLabel>
                <IonInput
                  type="number"
                  placeholder={notaReal.toFixed(0)}
                  value={valorSimulado ?? ''}
                  onIonChange={e => {
                    const val = e.detail.value;
                    setSimulacion(prev => {
                      const copia = { ...prev };
                      if (!val) delete copia[cat.id];
                      else copia[cat.id] = parseFloat(val) || 0;
                      return copia;
                    });
                  }}
                  style={{ width: '60px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontWeight: 'bold' }}
                />
              </IonItem>
            </IonCard>
          );
        })}

        <IonCard style={{ background: statsSimulados.acumuladoGlobal >= materia.notaDeseada ? 'var(--ion-color-success)' : 'var(--ion-color-step-100)', marginTop: '25px', borderRadius: '15px' }}>
          <IonCardContent className="ion-text-center">
            {statsSimulados.acumuladoGlobal >= materia.notaDeseada ? (
              <>
                <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-success-contrast)' }} />
                <p style={{ color: 'var(--ion-color-success-contrast)', fontWeight: '700', margin: '5px 0 0' }}>Con estos valores, alcanzas tu meta</p>
              </>
            ) : (
              <>
                <IonIcon icon={warningOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-medium)' }} />
                <p style={{ color: 'var(--ion-text-color)', fontWeight: '700', margin: '5px 0 0' }}>
                  Te faltan {(materia.notaDeseada - statsSimulados.acumuladoGlobal).toFixed(1)} puntos para tu meta
                </p>
                <IonNote>Necesitas en promedio {statsSimulados.notaNecesaria.toFixed(1)}/100 en lo que falta</IonNote>
              </>
            )}
          </IonCardContent>
        </IonCard>

      </IonContent>
    </IonPage>
  );
};

export default Tab2;