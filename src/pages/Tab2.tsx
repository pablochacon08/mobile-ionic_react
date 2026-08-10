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
            <IonTitle style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>Predictor</IonTitle>
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
            <IonTitle style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>Predictor</IonTitle>
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
          <IonTitle style={{ fontWeight: '800', letterSpacing: '-0.5px' }}>Predictor</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">

        <IonCard style={{ 
          background: 'var(--ion-card-background, #ffffff)', 
          borderRadius: '16px', 
          marginBottom: '20px', 
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          border: '1px solid var(--ion-color-step-50)'
        }}>
          <IonItem lines="none" color="transparent" style={{ '--padding-top': '4px', '--padding-bottom': '4px' }}>
            <div style={{
              width: '42px', height: '42px', minWidth: '42px', borderRadius: '12px',
              background: `var(--ion-color-${materia.color})`, display: 'flex', alignItems: 'center',
              justifyContent: 'center', marginRight: '14px',
              boxShadow: `0 4px 10px rgba(var(--ion-color-${materia.color}-rgb), 0.3)`
            }}>
              <IonIcon icon={obtenerIcono(materia.icono || 'school')} style={{ fontSize: '1.2rem', color: `var(--ion-color-${materia.color}-contrast)` }} />
            </div>
            <IonLabel>
              <p style={{ margin: '0 0 4px 0', fontSize: '0.65rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Materia</p>
              <IonSelect
                value={materiaId || materia.id}
                onIonChange={e => handleCambiarMateria(e.detail.value)}
                interface="action-sheet"
                style={{ fontWeight: '800', fontSize: '1.1rem', '--placeholder-color': 'var(--ion-text-color)', margin: 0 }}
              >
                {materias.map(m => (
                  <IonSelectOption key={m.id} value={m.id}>{m.nombre}</IonSelectOption>
                ))}
              </IonSelect>
            </IonLabel>
          </IonItem>
        </IonCard>

        <style>{`
          .predictor-glass-input::-webkit-inner-spin-button,
          .predictor-glass-input::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .predictor-glass-input {
            -moz-appearance: textfield;
          }
        `}</style>

        <IonSegment 
          mode="ios"
          value={modoPrediccion} 
          onIonChange={e => setModoPrediccion(e.detail.value as ModoPrediccion)} 
          style={{ 
            marginBottom: '22px', 
            background: 'rgba(var(--ion-text-color-rgb, 0,0,0), 0.035)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '999px', 
            padding: '5px',
            border: '1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.06)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.18), inset 0 -1px 2px rgba(255,255,255,0.04), 0 6px 18px rgba(0,0,0,0.05)'
          } as React.CSSProperties}
        >
          <IonSegmentButton value="todo" style={{ 
            '--color-checked': 'var(--ion-text-color)', 
            '--indicator-color': `rgba(var(--ion-color-${materia.color}-rgb), 0.16)`,
            '--indicator-box-shadow': 'inset 0 1px 1px rgba(255,255,255,0.25), 0 3px 8px rgba(0,0,0,0.18)',
            fontWeight: '900', fontSize: '0.68rem', letterSpacing: '0.9px', textTransform: 'uppercase', minHeight: '38px'
          } as React.CSSProperties}>Global</IonSegmentButton>
          <IonSegmentButton value="p1" style={{ 
            '--color-checked': 'var(--ion-text-color)', 
            '--indicator-color': `rgba(var(--ion-color-${materia.color}-rgb), 0.16)`,
            '--indicator-box-shadow': 'inset 0 1px 1px rgba(255,255,255,0.25), 0 3px 8px rgba(0,0,0,0.18)',
            fontWeight: '900', fontSize: '0.68rem', letterSpacing: '0.9px', textTransform: 'uppercase', minHeight: '38px'
          } as React.CSSProperties}>P1</IonSegmentButton>
          <IonSegmentButton value="p2" style={{ 
            '--color-checked': 'var(--ion-text-color)', 
            '--indicator-color': `rgba(var(--ion-color-${materia.color}-rgb), 0.16)`,
            '--indicator-box-shadow': 'inset 0 1px 1px rgba(255,255,255,0.25), 0 3px 8px rgba(0,0,0,0.18)',
            fontWeight: '900', fontSize: '0.68rem', letterSpacing: '0.9px', textTransform: 'uppercase', minHeight: '38px'
          } as React.CSSProperties}>P2</IonSegmentButton>
          {materia.pesoPractico > 0 && <IonSegmentButton value="pr" style={{ 
            '--color-checked': 'var(--ion-text-color)', 
            '--indicator-color': `rgba(var(--ion-color-${materia.color}-rgb), 0.16)`,
            '--indicator-box-shadow': 'inset 0 1px 1px rgba(255,255,255,0.25), 0 3px 8px rgba(0,0,0,0.18)',
            fontWeight: '900', fontSize: '0.68rem', letterSpacing: '0.9px', textTransform: 'uppercase', minHeight: '38px'
          } as React.CSSProperties}>Práctico</IonSegmentButton>}
        </IonSegment>

        <IonCard style={{ 
          background: `linear-gradient(145deg, var(--ion-card-background), rgba(var(--ion-color-${materia.color}-rgb), 0.05))`, 
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderRadius: '22px', 
          boxShadow: '0 12px 32px rgba(0,0,0,0.10), inset 0 1px 1px rgba(255,255,255,0.05)', 
          border: `1px solid rgba(var(--ion-color-${materia.color}-rgb), 0.14)`,
          overflow: 'hidden' 
        }}>
          <IonCardContent style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Meta {modoPrediccion !== 'todo' && 'Local'}</p>
                <p style={{ margin: '6px 0 0', fontWeight: '900', fontSize: '1.5rem', color: 'var(--ion-text-color)' }}>{materia.notaDeseada}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Actual</p>
                <p style={{ margin: '6px 0 0', fontWeight: '900', fontSize: '1.5rem', color: 'var(--ion-text-color)' }}>{notaActualVisual.toFixed(1)}</p>
              </div>
              <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)' }}>
                <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>
                  {hayCambiosSimulados ? 'Simulado' : 'Acumulado'}
                </p>
                <p style={{ 
                  margin: '6px 0 0', fontWeight: '900', fontSize: '1.5rem', 
                  color: hayCambiosSimulados ? (alcanzaMeta ? 'var(--ion-color-success)' : `var(--ion-color-${materia.color})`) : 'var(--ion-text-color)',
                  textShadow: hayCambiosSimulados && alcanzaMeta ? '0 0 12px rgba(var(--ion-color-success-rgb), 0.4)' : 'none',
                  transition: 'color 0.3s ease, text-shadow 0.3s ease'
                }}>
                  {notaSimuladaVisual.toFixed(1)}
                </p>
              </div>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ 
                position: 'relative', height: '26px', 
                background: 'rgba(var(--ion-text-color-rgb, 0,0,0), 0.04)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '999px', overflow: 'visible', 
                border: '1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.06)',
                boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.22), inset 0 -1px 2px rgba(255,255,255,0.05)',
                padding: '3px'
              }}>
                <div style={{ position: 'relative', height: '100%', width: '100%', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ 
                    position: 'absolute', top: 0, left: 0, height: '100%', 
                    width: `${Math.min(notaSimuladaVisual, 100)}%`, 
                    background: alcanzaMeta 
                      ? 'linear-gradient(90deg, #1fae56, #2dd36f, #6df5a0)' 
                      : `linear-gradient(90deg, var(--ion-color-${materia.color}-shade), var(--ion-color-${materia.color}), var(--ion-color-${materia.color}-tint))`, 
                    boxShadow: alcanzaMeta 
                      ? '0 0 20px 4px rgba(45,211,111,0.75), 0 0 40px 10px rgba(45,211,111,0.35)' 
                      : `0 0 10px 1px rgba(var(--ion-color-${materia.color}-rgb), 0.45)`,
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease, box-shadow 0.4s ease', 
                    borderRadius: '999px' 
                  }} />
                </div>
                {/* Marcador de Meta flotante */}
                <div style={{ 
                  position: 'absolute', top: '50%', left: `${materia.notaDeseada}%`, 
                  transform: 'translate(-50%, -50%)',
                  width: '6px', height: '34px', background: '#ffffff', borderRadius: '3px',
                  boxShadow: '0 0 10px 2px rgba(255,255,255,0.85), 0 2px 6px rgba(0,0,0,0.45)', zIndex: 2
                }} />
              </div>

              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.65rem', fontWeight: '800', color: 'var(--ion-color-medium)' }}>
                <span>0</span>
                <span style={{ position: 'absolute', left: `calc(${materia.notaDeseada}% - 14px)`, color: 'var(--ion-text-color)', letterSpacing: '0.5px' }}>META</span>
                <span>100</span>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', margin: '28px 0 14px 5px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IonIcon icon={flaskOutline} color="medium" style={{ fontSize: '1.1rem' }} />
            <IonText color="medium">
              <p style={{ margin: 0, fontSize: '0.85rem' }}>
                Simulando: <strong style={{ color: 'var(--ion-text-color)' }}>{modoPrediccion === 'todo' ? 'Todo el semestre' : modoPrediccion === 'p1' ? 'Primer Parcial' : modoPrediccion === 'p2' ? 'Segundo Parcial' : 'Práctico'}</strong>
              </p>
            </IonText>
          </div>
          {hayCambiosSimulados && (
            <IonButton fill="clear" color="danger" onClick={() => { limpiarSimulacion(); }} style={{ fontWeight: '800', '--padding-end': '0' }}>
              <IonIcon icon={refreshOutline} slot="start" /> Limpiar
            </IonButton>
          )}
        </div>

  
        {(!alcanzaMeta && statsReales.notaNecesaria <= 100) && (
          <IonButton expand="block" fill="outline" color={materia.color} onClick={usarNotaNecesaria} style={{ marginBottom: '20px', fontWeight: '800', borderRadius: '12px', height: '48px' }}>
            <IonIcon icon={sparklesOutline} slot="start" />
            {modoPrediccion === 'todo' ? `Usar nota global necesaria (${statsReales.notaNecesaria.toFixed(1)})` : `Llenar para llegar a ${materia.notaDeseada}`}
          </IonButton>
        )}

        {seccionesARenderizar.map(seccion => (
          <div key={seccion.id} style={{ marginBottom: '24px' }}>
            {modoPrediccion === 'todo' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '18px 0 12px 5px' }}>
                <IonIcon icon={layersOutline} color="medium" style={{ fontSize: '1rem' }} />
                <h3 style={{ margin: 0, fontSize: '0.8rem', fontWeight: '800', color: 'var(--ion-color-medium)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {seccion.titulo}
                </h3>
              </div>
            )}

            {seccion.categorias.map(cat => {
              const notaReal = calcularNotaDeCategoria(cat);
              const valorSimulado = simulacion[cat.id] ?? notaReal;
              const estaAlterado = simulacion[cat.id] !== undefined;

              return (
                <IonCard key={cat.id} style={{ 
                  background: estaAlterado 
                    ? `linear-gradient(145deg, rgba(var(--ion-color-${materia.color}-rgb), 0.10), rgba(var(--ion-color-${materia.color}-rgb), 0.02))`
                    : 'var(--ion-card-background, #ffffff)', 
                  backdropFilter: estaAlterado ? 'blur(12px)' : undefined,
                  WebkitBackdropFilter: estaAlterado ? 'blur(12px)' : undefined,
                  borderRadius: '18px', 
                  margin: '0 0 16px 0', 
                  boxShadow: estaAlterado 
                    ? `0 10px 28px rgba(var(--ion-color-${materia.color}-rgb), 0.24), inset 0 1px 1px rgba(255,255,255,0.06)` 
                    : '0 2px 10px rgba(0,0,0,0.04)', 
                  border: estaAlterado ? `1.5px solid rgba(var(--ion-color-${materia.color}-rgb), 0.55)` : '1px solid transparent',
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                  <div style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontWeight: '800', fontSize: '1.1rem', margin: '0 0 4px 0', color: 'var(--ion-text-color)' }}>{cat.nombre}</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)', margin: 0, fontWeight: '600' }}>Peso en la etapa: {cat.peso}% • Nota Base: {notaReal.toFixed(1)}</p>
                      </div>
                      <IonButton fill="clear" size="small" color="warning" onClick={() => aplicarMagiaEnActividad(cat, seccion.id)} title="Auto-completar nota necesaria aquí">
                        <IonIcon icon={sparklesOutline} slot="icon-only" style={{ fontSize: '1.4rem' }} />
                      </IonButton>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '10px' }}>
                      <IonRange 
                        min={0} max={100} step={1} 
                        value={valorSimulado} 
                        color={alcanzaMeta ? 'success' : materia.color}
                        onIonChange={e => {
                          const val = e.detail.value as number;
                          setSimulacion(prev => ({ ...prev, [cat.id]: val }));
                        }}
                        style={{ 
                          padding: 0, flex: 1,
                          '--bar-background': 'rgba(var(--ion-color-medium-rgb), 0.18)', 
                          '--bar-background-active': `linear-gradient(90deg, var(--ion-color-${alcanzaMeta ? 'success' : materia.color}-shade), var(--ion-color-${alcanzaMeta ? 'success' : materia.color}))`,
                          '--bar-height': '6px',
                          '--bar-border-radius': '999px',
                          '--knob-size': '24px',
                          '--knob-background': `var(--ion-color-${alcanzaMeta ? 'success' : materia.color})`,
                          '--knob-box-shadow': `0 3px 10px rgba(var(--ion-color-${alcanzaMeta ? 'success' : materia.color}-rgb), 0.55)`
                        } as React.CSSProperties}
                      />
                      <input
                        type="number"
                        className="predictor-glass-input"
                        min={0}
                        max={100}
                        value={Number.isFinite(valorSimulado) ? valorSimulado : 0}
                        onChange={e => {
                          const raw = e.target.value;
                          if (raw === '') { setSimulacion(prev => ({ ...prev, [cat.id]: 0 })); return; }
                          const val = clamp(Number(raw), 0, 100);
                          if (!isNaN(val)) setSimulacion(prev => ({ ...prev, [cat.id]: val }));
                        }}
                        style={{ 
                          width: '64px', textAlign: 'center', fontWeight: 800, fontSize: '1.15rem',
                          padding: '10px 4px', borderRadius: '12px', minWidth: '60px',
                          border: estaAlterado ? `1.5px solid var(--ion-color-${materia.color})` : '1px solid rgba(var(--ion-text-color-rgb, 0,0,0), 0.08)',
                          background: estaAlterado ? `var(--ion-color-${materia.color})` : 'var(--ion-color-step-100)', 
                          color: estaAlterado ? `var(--ion-color-${materia.color}-contrast)` : 'var(--ion-text-color)',
                          outline: 'none', fontFamily: 'inherit',
                          boxShadow: estaAlterado ? `0 4px 14px rgba(var(--ion-color-${materia.color}-rgb), 0.35)` : 'inset 0 1px 3px rgba(0,0,0,0.12)',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                </IonCard>
              );
            })}
          </div>
        ))}

        <div style={{
          background: alcanzaMeta ? 'rgba(var(--ion-color-success-rgb), 0.15)' : 'var(--ion-color-step-100)',
          marginTop: '10px', borderRadius: '16px', padding: '24px', textAlign: 'center',
          border: alcanzaMeta ? '1px solid rgba(var(--ion-color-success-rgb), 0.3)' : '1px solid transparent',
          transition: 'all 0.4s ease'
        }}>
          {alcanzaMeta ? (
            <>
              <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-success)' }} />
              <p style={{ color: 'var(--ion-color-success)', fontWeight: '800', margin: '10px 0 0', fontSize: '1rem', letterSpacing: '0.3px' }}>
                ¡Con estos valores, alcanzas la meta de {modoPrediccion === 'todo' ? 'la materia' : 'este parcial'}!
              </p>
            </>
          ) : (
            <>
              <IonIcon icon={warningOutline} style={{ fontSize: '2rem', color: 'var(--ion-color-medium)' }} />
              <p style={{ color: 'var(--ion-text-color)', fontWeight: '800', margin: '10px 0 2px', fontSize: '1rem', letterSpacing: '0.3px' }}>
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