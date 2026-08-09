import React, { useState, useMemo } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardContent,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonInput, IonIcon, IonText, IonNote, IonSpinner, IonButton, IonRange
} from '@ionic/react';
import { warningOutline, checkmarkCircleOutline, flaskOutline, sparklesOutline, refreshOutline } from 'ionicons/icons';
import { useMaterias, Categoria } from '../context/MateriasContext';
import { getActiveKey, calcularNotaDeCategoria, calcularEstadisticas } from '../utils/calculos';
import { obtenerIcono } from '../utils/iconos';

const clamp = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

const Tab2: React.FC = () => {
  const { materias, cargando } = useMaterias();
  const [materiaId, setMateriaId] = useState<string>(materias[0]?.id ?? '');
  const [simulacion, setSimulacion] = useState<Record<string, number>>({});

  const materia = materias.find(m => m.id === materiaId) ?? materias[0];

  const handleCambiarMateria = (id: string) => {
    setMateriaId(id);
    setSimulacion({});
  };

  const seleccionarAlEnfocar = async (e: any) => {
    try {
      const nativeInput = await e.target.getInputElement();
      nativeInput.select();
    } catch { }
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

  const usarNotaNecesaria = () => {
    if (!materia || !statsReales) return;
    const valor = clamp(Number(statsReales.notaNecesaria.toFixed(1)), 0, 100);
    const nuevaSimulacion: Record<string, number> = {};
    statsReales.listaActiva.forEach(cat => { nuevaSimulacion[cat.id] = valor; });
    setSimulacion(nuevaSimulacion);
  };

  const limpiarSimulacion = () => setSimulacion({});

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

  const tituloEtapa = materia.etapa === 1 ? 'Primer Parcial' : materia.etapa === 2 ? 'Segundo Parcial' : 'Trabajo Práctico';
  const hayCambiosSimulados = Object.keys(simulacion).length > 0;
  const alcanzaMeta = statsSimulados.acumuladoGlobal >= materia.notaDeseada;

  const yaAlcanzada = statsReales.acumuladoGlobal >= materia.notaDeseada;
  const sinPesoRestante = statsReales.pesoGlobalRestante <= 0;
  const metaInalcanzable = statsReales.notaNecesaria > 100;
  const mostrarBotonNotaNecesaria = !yaAlcanzada && !sinPesoRestante && !metaInalcanzable;

  const aplicarMagiaEnActividad = (cat: Categoria) => {
    if (!materia || !statsSimulados) return;
    const pesoEtapa = materia.etapa === 1 || materia.etapa === 2 ? materia.pesoTeorico / 2 : materia.pesoPractico;
    const pesoGlobalCat = (cat.peso / 100) * (pesoEtapa / 100);
    
    const valorSimuladoActual = simulacion[cat.id] || 0;
    const aporteActual = valorSimuladoActual * pesoGlobalCat;
    const acumuladoSinEstaCat = statsSimulados.acumuladoGlobal - aporteActual;
    const faltante = materia.notaDeseada - acumuladoSinEstaCat;

    let notaMagica = 0;
    if (faltante > 0 && pesoGlobalCat > 0) {
      notaMagica = Math.ceil(faltante / pesoGlobalCat);
    }
    setSimulacion(prev => ({ ...prev, [cat.id]: clamp(notaMagica, 0, 100) }));
    vibrar('ligero');
  };
  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ fontWeight: '800' }}>Predictor</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">

        <IonCard style={{ background: 'var(--ion-card-background, #ffffff)', borderRadius: '14px', marginBottom: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
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

        <IonCard style={{ background: 'var(--ion-card-background, #ffffff)', borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <IonCardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800' }}>Meta</p>
                <p style={{ margin: '6px 0 0', fontWeight: '800', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{materia.notaDeseada}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800' }}>Tu nota actual</p>
                <p style={{ margin: '6px 0 0', fontWeight: '800', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{statsReales.acumuladoGlobal.toFixed(1)}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800' }}>
                  {hayCambiosSimulados ? 'Simulado' : 'Acumulado'}
                </p>
                <p style={{ margin: '6px 0 0', fontWeight: '800', fontSize: '1.4rem', color: hayCambiosSimulados ? (alcanzaMeta ? 'var(--ion-color-success)' : `var(--ion-color-${materia.color})`) : 'var(--ion-text-color)' }}>
                  {statsSimulados.acumuladoGlobal.toFixed(1)}
                </p>
              </div>
            </div>

            {/* TERMÓMETRO VISUAL (GAUGE) */}
            <div style={{ position: 'relative', height: '14px', background: 'var(--ion-color-step-150)', borderRadius: '10px', overflow: 'hidden' }}>
              {/* Relleno Dinámico */}
              <div style={{ 
                position: 'absolute', top: 0, left: 0, height: '100%', 
                width: `${Math.min(statsSimulados.acumuladoGlobal, 100)}%`, 
                background: alcanzaMeta ? 'var(--ion-color-success)' : `var(--ion-color-${materia.color})`, 
                transition: 'width 0.4s ease, background 0.4s ease', borderRadius: '10px' 
              }} />
              
              {/* Línea de la Meta */}
              <div style={{ 
                position: 'absolute', top: 0, left: `${materia.notaDeseada}%`, 
                height: '100%', width: '4px', background: 'var(--ion-text-color)', 
                boxShadow: '0 0 4px rgba(0,0,0,0.5)', zIndex: 2
              }} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.65rem', fontWeight: '700', color: 'var(--ion-color-medium)' }}>
              <span>0</span>
              <span style={{ position: 'absolute', left: `calc(${materia.notaDeseada}% - 12px)`, color: 'var(--ion-text-color)' }}>META</span>
              <span>100</span>
            </div>
          </IonCardContent>
        </IonCard>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: '25px 0 12px 5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IonIcon icon={flaskOutline} color="medium" style={{ fontSize: '1.1rem' }} />
            <IonText color="medium"><p style={{ margin: 0, fontSize: '0.85rem' }}>Simula notas para <strong style={{ color: 'var(--ion-text-color)' }}>{tituloEtapa}</strong> sin guardarlas</p></IonText>
          </div>
          {hayCambiosSimulados && (
          <IonButton expand="block" fill="clear" color="danger" onClick={() => { limpiarSimulacion(); vibrar('medio'); }} style={{ marginBottom: '16px', fontWeight: '800' }}>
            <IonIcon icon={refreshOutline} slot="start" />
            RESETEAR SIMULACIÓN
          </IonButton>
        )}
        </div>

        {mostrarBotonNotaNecesaria && (
          <IonButton expand="block" fill="outline" color={materia.color} onClick={usarNotaNecesaria} style={{ marginBottom: '16px', fontWeight: '700' }}>
            <IonIcon icon={sparklesOutline} slot="start" />
            Usar nota necesaria ({statsReales.notaNecesaria.toFixed(1)})
          </IonButton>
        )}

        {statsReales.listaActiva.map((cat) => {
          const notaReal = calcularNotaDeCategoria(cat);
          const valorSimulado = simulacion[cat.id] ?? notaReal;
          const estaAlterado = simulacion[cat.id] !== undefined;

          return (
            <IonCard key={cat.id} style={{ background: 'var(--ion-card-background, #ffffff)', borderRadius: '14px', margin: '0 0 14px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: estaAlterado ? `1px solid var(--ion-color-${materia.color})` : '1px solid transparent' }}>
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <h3 style={{ fontWeight: '800', fontSize: '1.05rem', margin: '0 0 4px 0', color: 'var(--ion-text-color)' }}>{cat.nombre}</h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)', margin: 0, fontWeight: '600' }}>Peso: {cat.peso}% • Nota Base: {notaReal.toFixed(1)}</p>
                  </div>
                  
                  <IonButton fill="clear" size="small" color="warning" onClick={() => aplicarMagiaEnActividad(cat)} title="Auto-completar nota necesaria aquí">
                    <IonIcon icon={sparklesOutline} slot="icon-only" style={{ fontSize: '1.4rem' }} />
                  </IonButton>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
                  <IonRange 
                    min={0} max={100} step={1} 
                    value={valorSimulado} 
                    color={alcanzaMeta ? 'success' : materia.color}
                    onIonChange={e => {
                      const val = e.detail.value as number;
                      setSimulacion(prev => ({ ...prev, [cat.id]: val }));
                    }}
                    style={{ padding: 0, '--bar-background': 'var(--ion-color-step-150)', '--knob-size': '24px' }}
                  />
                  <div style={{ 
                    background: estaAlterado ? `var(--ion-color-${materia.color})` : 'var(--ion-color-step-100)', 
                    color: estaAlterado ? `var(--ion-color-${materia.color}-contrast)` : 'var(--ion-text-color)',
                    padding: '6px 12px', borderRadius: '8px', fontWeight: '800', fontSize: '1.1rem', minWidth: '55px', textAlign: 'center', transition: 'all 0.3s ease'
                  }}>
                    {valorSimulado.toFixed(0)}
                  </div>
                </div>
              </div>
            </IonCard>
          );
        })}

        <div style={{
          background: alcanzaMeta ? 'rgba(var(--ion-color-success-rgb), 0.15)' : 'var(--ion-color-step-100)',
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