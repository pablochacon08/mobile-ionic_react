import React, { useState, useMemo } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardContent,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonInput, IonIcon, IonText, IonNote, IonSpinner
} from '@ionic/react';
import { warningOutline, checkmarkCircleOutline, flaskOutline } from 'ionicons/icons';
import { useMaterias, Categoria } from '../context/MateriasContext';
import { getActiveKey, calcularNotaDeCategoria, calcularEstadisticas } from '../utils/calculos';
import { obtenerIcono } from '../utils/iconos';

const Tab2: React.FC = () => {
  const { materias, cargando } = useMaterias();
  const [materiaId, setMateriaId] = useState<string>(materias[0]?.id ?? '');
  const [simulacion, setSimulacion] = useState<Record<string, number>>({});

  const materia = materias.find(m => m.id === materiaId) ?? materias[0];

  const handleCambiarMateria = (id: string) => {
    setMateriaId(id);
    setSimulacion({});
  };

  const statsReales = materia ? calcularEstadisticas(materia) : null;

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

  if (cargando) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle style={{ fontWeight: '800' }}>Predictor</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
            <IonSpinner name="crescent" style={{ width: '36px', height: '36px', color: 'var(--ion-color-primary)' }} />
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem', marginTop: '12px' }}>Cargando tus materias...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!materia || !statsReales || !statsSimulados) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle style={{ fontWeight: '800' }}>Predictor</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding">
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <IonIcon icon={flaskOutline} style={{ fontSize: '2.4rem', color: 'var(--ion-color-medium)' }} />
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.9rem', marginTop: '12px' }}>
              Todavía no tienes materias creadas. Ve al Dashboard y agrega una para usar el predictor.
            </p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const tituloEtapa = materia.etapa === 1 ? 'Primer Parcial' : materia.etapa === 2 ? 'Segundo Parcial' : 'Componente Práctico';
  const hayCambiosSimulados = Object.keys(simulacion).length > 0;
  const alcanzaMeta = statsSimulados.acumuladoGlobal >= materia.notaDeseada;

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ fontWeight: '800' }}>Predictor</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">

        <IonCard style={{ borderRadius: '14px', marginBottom: '18px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <IonItem lines="none" color="transparent">
            <div style={{
              width: '38px', height: '38px', minWidth: '38px', borderRadius: '10px',
              background: `var(--ion-color-${materia.color})`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginRight: '12px'
            }}>
              <IonIcon icon={obtenerIcono(materia.icono || 'school')} style={{ fontSize: '1.1rem', color: `var(--ion-color-${materia.color}-contrast)` }} />
            </div>
            <IonLabel>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>Materia</p>
              <IonSelect
                value={materiaId || materia.id}
                onIonChange={e => handleCambiarMateria(e.detail.value)}
                interface="popover"
                style={{ fontWeight: '700', fontSize: '1rem', '--placeholder-color': 'var(--ion-text-color)' }}
              >
                {materias.map(m => (
                  <IonSelectOption key={m.id} value={m.id}>{m.nombre}</IonSelectOption>
                ))}
              </IonSelect>
            </IonLabel>
          </IonItem>
        </IonCard>

        <IonCard style={{ borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
          <IonCardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>Meta</p>
                <p style={{ margin: '6px 0 0', fontWeight: '800', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{materia.notaDeseada}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>Acumulado Actual</p>
                <p style={{ margin: '6px 0 0', fontWeight: '800', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{statsReales.acumuladoGlobal.toFixed(1)}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>
                  {hayCambiosSimulados ? 'Simulado' : 'Acumulado'}
                </p>
                <p style={{ margin: '6px 0 0', fontWeight: '800', fontSize: '1.4rem', color: hayCambiosSimulados ? `var(--ion-color-${materia.color})` : 'var(--ion-text-color)' }}>
                  {statsSimulados.acumuladoGlobal.toFixed(1)}
                </p>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '25px 0 12px 5px' }}>
          <IonIcon icon={flaskOutline} color="medium" style={{ fontSize: '1.1rem' }} />
          <IonText color="medium"><p style={{ margin: 0, fontSize: '0.85rem' }}>Simula notas para <strong style={{ color: 'var(--ion-text-color)' }}>{tituloEtapa}</strong> sin guardarlas</p></IonText>
        </div>

        {statsReales.listaActiva.map((cat) => {
          const notaReal = calcularNotaDeCategoria(cat);
          const valorSimulado = simulacion[cat.id];

          return (
            <IonCard key={cat.id} style={{ borderRadius: '14px', margin: '0 0 10px 0', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
              <IonItem lines="none" color="transparent">
                <IonLabel>
                  <h3 style={{ fontWeight: '700', fontSize: '0.95rem', margin: '0 0 2px 0' }}>{cat.nombre}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--ion-color-medium)', margin: 0 }}>Peso {cat.peso}% • Nota real: {notaReal.toFixed(1)}</p>
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
                  style={{ width: '60px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '8px', fontWeight: '700' }}
                />
              </IonItem>
            </IonCard>
          );
        })}

        <div style={{
          background: alcanzaMeta ? 'rgba(45, 211, 111, 0.15)' : 'var(--ion-color-step-50)',
          marginTop: '20px', borderRadius: '14px', padding: '20px', textAlign: 'center'
        }}>
          {alcanzaMeta ? (
            <>
              <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '1.8rem', color: 'var(--ion-color-success)' }} />
              <p style={{ color: 'var(--ion-color-success)', fontWeight: '800', margin: '8px 0 0', fontSize: '0.95rem' }}>Con estos valores, alcanzas tu meta</p>
            </>
          ) : (
            <>
              <IonIcon icon={warningOutline} style={{ fontSize: '1.8rem', color: 'var(--ion-color-medium)' }} />
              <p style={{ color: 'var(--ion-text-color)', fontWeight: '800', margin: '8px 0 2px', fontSize: '0.95rem' }}>
                Te faltan {(materia.notaDeseada - statsSimulados.acumuladoGlobal).toFixed(1)} puntos para tu meta
              </p>
              <IonNote style={{ fontSize: '0.8rem' }}>Necesitas en promedio {statsSimulados.notaNecesaria.toFixed(1)}/100 en lo que falta</IonNote>
            </>
          )}
        </div>

      </IonContent>
    </IonPage>
  );
};

export default Tab2;