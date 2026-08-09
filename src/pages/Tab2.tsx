import React, { useState, useMemo } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardContent,
  IonItem, IonLabel, IonSelect, IonSelectOption, IonInput, IonIcon, IonText, IonNote, IonSpinner, IonButton, IonRange,
  IonSegment, IonSegmentButton
} from '@ionic/react';
import { warningOutline, checkmarkCircleOutline, flaskOutline, sparklesOutline, refreshOutline, layersOutline } from 'ionicons/icons';
import { useMaterias, Categoria } from '../context/MateriasContext';
import { calcularNotaDeCategoria, calcularEstadisticas } from '../utils/calculos';
import { obtenerIcono } from '../utils/iconos';

const clamp = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

type ModoPrediccion = 'todo' | 'p1' | 'p2' | 'pr';

const Tab2: React.FC = () => {
  const { materias, cargando } = useMaterias();
  const [materiaId, setMateriaId] = useState<string>(materias[0]?.id ?? '');
  const [simulacion, setSimulacion] = useState<Record<string, number>>({});
  const [modoPrediccion, setModoPrediccion] = useState<ModoPrediccion>('todo');

  const materia = materias.find(m => m.id === materiaId) ?? materias[0];

  const handleCambiarMateria = (id: string) => {
    setMateriaId(id);
    setSimulacion({});
    setModoPrediccion('todo');
  };

  const statsReales = materia ? calcularEstadisticas(materia as any) : null;

  const statsSimulados = useMemo(() => {
    if (!materia) return null;
    
    const aplicarSimulacion = (lista: Categoria[]) =>
      lista.map(cat => simulacion[cat.id] !== undefined ? { ...cat, subActividades: [], notaGlobalRapida: simulacion[cat.id] } : cat);

    const materiaSimulada = {
      ...materia,
      categoriasP1: aplicarSimulacion(materia.categoriasP1 || []),
      categoriasP2: aplicarSimulacion(materia.categoriasP2 || []),
      categoriasPractico: aplicarSimulacion(materia.categoriasPractico || [])
    };
    
    return calcularEstadisticas(materiaSimulada as any);
  }, [materia, simulacion]);

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

  let notaActualVisual = statsReales.acumuladoGlobal;
  let notaSimuladaVisual = statsSimulados.acumuladoGlobal;
  
  if (modoPrediccion === 'p1') {
    notaActualVisual = statsReales.notaP1;
    notaSimuladaVisual = statsSimulados.notaP1;
  } else if (modoPrediccion === 'p2') {
    notaActualVisual = statsReales.notaP2;
    notaSimuladaVisual = statsSimulados.notaP2;
  } else if (modoPrediccion === 'pr') {
    notaActualVisual = statsReales.notaPr;
    notaSimuladaVisual = statsSimulados.notaPr;
  }

  const hayCambiosSimulados = Object.keys(simulacion).length > 0;
  const alcanzaMeta = notaSimuladaVisual >= materia.notaDeseada;
  const faltanteVisual = Math.max(0, materia.notaDeseada - notaSimuladaVisual);

  const usarNotaNecesaria = () => {
    if (!materia || !statsReales) return;
    const nuevaSimulacion: Record<string, number> = { ...simulacion };

    if (modoPrediccion === 'todo') {
      const valor = clamp(Number(statsReales.notaNecesaria.toFixed(1)), 0, 100);
      [...(materia.categoriasP1||[]), ...(materia.categoriasP2||[]), ...(materia.categoriasPractico||[])].forEach(cat => {
        nuevaSimulacion[cat.id] = valor;
      });
    } else {
      const cats = modoPrediccion === 'p1' ? materia.categoriasP1 : modoPrediccion === 'p2' ? materia.categoriasP2 : materia.categoriasPractico;
      cats.forEach(cat => { nuevaSimulacion[cat.id] = materia.notaDeseada; });
    }
    setSimulacion(nuevaSimulacion);
  };

  const aplicarMagiaEnActividad = (cat: Categoria, seccionKey: string) => {
    if (!materia || !statsSimulados) return;
    
    const valorSimuladoActual = simulacion[cat.id] ?? calcularNotaDeCategoria(cat);
    let notaMagica = 0;

    if (modoPrediccion === 'todo') {
      const pesoEtapa = (seccionKey === 'p1' || seccionKey === 'p2') ? materia.pesoTeorico / 2 : materia.pesoPractico;
      const aporteGlobalActual = (valorSimuladoActual / 100) * (cat.peso / 100) * pesoEtapa;
      
      const globalSinEstaCat = statsSimulados.acumuladoGlobal - aporteGlobalActual;
      const faltanteGlobal = materia.notaDeseada - globalSinEstaCat;
      const aporteGlobalMaximo = (cat.peso / 100) * (pesoEtapa / 100) * 100;

      if (faltanteGlobal > 0 && aporteGlobalMaximo > 0) {
        notaMagica = Math.ceil((faltanteGlobal / aporteGlobalMaximo) * 100);
      }
    } else {
      const aporteParcialActual = valorSimuladoActual * (cat.peso / 100);
      
      let notaParcialSimulada = 0;
      if (seccionKey === 'p1') notaParcialSimulada = statsSimulados.notaP1;
      else if (seccionKey === 'p2') notaParcialSimulada = statsSimulados.notaP2;
      else notaParcialSimulada = statsSimulados.notaPr;

      const parcialSinEstaCat = notaParcialSimulada - aporteParcialActual;
      const faltanteParcial = materia.notaDeseada - parcialSinEstaCat;

      if (faltanteParcial > 0 && cat.peso > 0) {
        notaMagica = Math.ceil(faltanteParcial / (cat.peso / 100));
      }
    }

    setSimulacion(prev => ({ ...prev, [cat.id]: clamp(notaMagica, 0, 100) }));
  };

  const seccionesARenderizar = [];
  if (modoPrediccion === 'todo' || modoPrediccion === 'p1') seccionesARenderizar.push({ id: 'p1', titulo: 'Primer Parcial', categorias: materia.categoriasP1 || [] });
  if (modoPrediccion === 'todo' || modoPrediccion === 'p2') seccionesARenderizar.push({ id: 'p2', titulo: 'Segundo Parcial', categorias: materia.categoriasP2 || [] });
  if ((modoPrediccion === 'todo' || modoPrediccion === 'pr') && materia.pesoPractico > 0) seccionesARenderizar.push({ id: 'pr', titulo: 'Trabajo Práctico', categorias: materia.categoriasPractico || [] });

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

        {/* SEGMENTADOR DE ETAPAS */}
        <IonSegment 
          value={modoPrediccion} 
          onIonChange={e => setModoPrediccion(e.detail.value as ModoPrediccion)} 
          style={{ marginBottom: '18px', background: 'var(--ion-card-background)', borderRadius: '10px', padding: '4px' }}
        >
          <IonSegmentButton value="todo">Global</IonSegmentButton>
          <IonSegmentButton value="p1">P1</IonSegmentButton>
          <IonSegmentButton value="p2">P2</IonSegmentButton>
          {materia.pesoPractico > 0 && <IonSegmentButton value="pr">Práctico</IonSegmentButton>}
        </IonSegment>

        <IonCard style={{ background: 'var(--ion-card-background, #ffffff)', borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <IonCardContent style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800' }}>Meta {modoPrediccion !== 'todo' && 'Local'}</p>
                <p style={{ margin: '6px 0 0', fontWeight: '800', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{materia.notaDeseada}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800' }}>Actual</p>
                <p style={{ margin: '6px 0 0', fontWeight: '800', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{notaActualVisual.toFixed(1)}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800' }}>
                  {hayCambiosSimulados ? 'Simulado' : 'Acumulado'}
                </p>
                <p style={{ margin: '6px 0 0', fontWeight: '800', fontSize: '1.4rem', color: hayCambiosSimulados ? (alcanzaMeta ? 'var(--ion-color-success)' : `var(--ion-color-${materia.color})`) : 'var(--ion-text-color)' }}>
                  {notaSimuladaVisual.toFixed(1)}
                </p>
              </div>
            </div>

            <div style={{ position: 'relative', height: '14px', background: 'var(--ion-color-step-150)', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ 
                position: 'absolute', top: 0, left: 0, height: '100%', 
                width: `${Math.min(notaSimuladaVisual, 100)}%`, 
                background: alcanzaMeta ? 'var(--ion-color-success)' : `var(--ion-color-${materia.color})`, 
                transition: 'width 0.4s ease, background 0.4s ease', borderRadius: '10px' 
              }} />
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
            <IonText color="medium">
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Simulando: <strong style={{ color: 'var(--ion-text-color)' }}>{modoPrediccion === 'todo' ? 'Todo el semestre' : modoPrediccion === 'p1' ? 'Primer Parcial' : modoPrediccion === 'p2' ? 'Segundo Parcial' : 'Práctico'}</strong>
              </p>
            </IonText>
          </div>
          {hayCambiosSimulados && (
            <IonButton expand="block" fill="clear" color="danger" onClick={() => { limpiarSimulacion(); }} style={{ fontWeight: '800' }}>
              <IonIcon icon={refreshOutline} slot="start" /> Limpiar
            </IonButton>
          )}
        </div>

        {(!alcanzaMeta && statsReales.notaNecesaria <= 100) && (
          <IonButton expand="block" fill="outline" color={materia.color} onClick={usarNotaNecesaria} style={{ marginBottom: '16px', fontWeight: '700' }}>
            <IonIcon icon={sparklesOutline} slot="start" />
            {modoPrediccion === 'todo' ? `Usar nota global necesaria (${statsReales.notaNecesaria.toFixed(1)})` : `Llenar para llegar a ${materia.notaDeseada}`}
          </IonButton>
        )}

        {seccionesARenderizar.map(seccion => (
          <div key={seccion.id} style={{ marginBottom: '20px' }}>
            {modoPrediccion === 'todo' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '15px 0 10px 5px' }}>
                <IonIcon icon={layersOutline} color="medium" style={{ fontSize: '1rem' }} />
                <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '800', color: 'var(--ion-color-medium)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {seccion.titulo}
                </h3>
              </div>
            )}

            {seccion.categorias.map(cat => {
              const notaReal = calcularNotaDeCategoria(cat);
              const valorSimulado = simulacion[cat.id] ?? notaReal;
              const estaAlterado = simulacion[cat.id] !== undefined;

              return (
                <IonCard key={cat.id} style={{ background: 'var(--ion-card-background, #ffffff)', borderRadius: '14px', margin: '0 0 14px 0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: estaAlterado ? `1px solid var(--ion-color-${materia.color})` : '1px solid transparent' }}>
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div>
                        <h3 style={{ fontWeight: '800', fontSize: '1.05rem', margin: '0 0 4px 0', color: 'var(--ion-text-color)' }}>{cat.nombre}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)', margin: 0, fontWeight: '600' }}>Peso en la etapa: {cat.peso}% • Nota Base: {notaReal.toFixed(1)}</p>
                      </div>
                      <IonButton fill="clear" size="small" color="warning" onClick={() => aplicarMagiaEnActividad(cat, seccion.id)} title="Auto-completar nota necesaria aquí">
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
          </div>
        ))}

        <div style={{
          background: alcanzaMeta ? 'rgba(var(--ion-color-success-rgb), 0.15)' : 'var(--ion-color-step-100)',
          marginTop: '10px', borderRadius: '14px', padding: '20px', textAlign: 'center'
        }}>
          {alcanzaMeta ? (
            <>
              <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '1.8rem', color: 'var(--ion-color-success)' }} />
              <p style={{ color: 'var(--ion-color-success)', fontWeight: '800', margin: '8px 0 0', fontSize: '0.95rem' }}>
                Con estos valores, alcanzas la meta de {modoPrediccion === 'todo' ? 'la materia' : 'este parcial'}
              </p>
            </>
          ) : (
            <>
              <IonIcon icon={warningOutline} style={{ fontSize: '1.8rem', color: 'var(--ion-color-medium)' }} />
              <p style={{ color: 'var(--ion-text-color)', fontWeight: '800', margin: '8px 0 2px', fontSize: '0.95rem' }}>
                Te faltan {faltanteVisual.toFixed(1)} puntos para tu meta
              </p>
            </>
          )}
        </div>

      </IonContent>
    </IonPage>
  );
};

export default Tab2;