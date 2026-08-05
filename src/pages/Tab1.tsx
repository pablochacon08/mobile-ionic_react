import React, { useState, useRef } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, 
  IonItem, IonLabel, IonList, IonFab, IonFabButton, IonIcon, 
  IonModal, IonButton, IonInput
} from '@ionic/react';
import { add, close, chevronForward, trashOutline, addCircleOutline, arrowForwardOutline, arrowUndoOutline } from 'ionicons/icons';
import confetti from 'canvas-confetti';
import './Tab1.css';

// --- Interfaces ---
interface Categoria {
  id: string;
  nombre: string;
  peso: number;
  notaObtenida: number;
}

type EtapaEvaluacion = 1 | 2 | 3; // 1: P1, 2: P2, 3: Práctico

interface Materia {
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

const ionicColors = ['primary', 'secondary', 'tertiary', 'success', 'warning'];

const CircularProgress = ({ value, color }: { value: number, color: string }) => {
  const size = 50;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, minWidth: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle stroke="var(--ion-color-step-150)" fill="transparent" strokeWidth={strokeWidth} r={radius} cx={size / 2} cy={size / 2} />
        <circle 
          stroke={`var(--ion-color-${color})`} 
          fill="transparent" 
          strokeWidth={strokeWidth} 
          strokeLinecap="round" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset} 
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} 
          r={radius} cx={size / 2} cy={size / 2} 
        />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: 'var(--ion-text-color)' }}>
        {clampedValue.toFixed(0)}
      </div>
    </div>
  );
};

const Tab1: React.FC = () => {
  const [materias, setMaterias] = useState<Materia[]>([
    {
      id: '1',
      nombre: 'Sistemas Digitales',
      color: 'tertiary',
      notaDeseada: 70,
      etapa: 1,
      pesoTeorico: 70,
      pesoPractico: 30,
      categoriasP1: [
        { id: 'c1', nombre: 'Control de Lectura', notaObtenida: 90, peso: 50 },
        { id: 'c2', nombre: 'Examen', notaObtenida: 60, peso: 50 }
      ],
      categoriasP2: [],
      categoriasPractico: []
    }
  ]);

  const [isAddMateriaOpen, setIsAddMateriaOpen] = useState(false);
  const [nuevaMateriaNombre, setNuevaMateriaNombre] = useState('');
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<Materia | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const celebratedRef = useRef<Record<string, boolean>>({});

  // --- Funciones de Materias ---
  const agregarMateria = () => {
    if (!nuevaMateriaNombre.trim()) return;
    const nuevaMateria: Materia = {
      id: Date.now().toString(),
      nombre: nuevaMateriaNombre,
      color: ionicColors[Math.floor(Math.random() * ionicColors.length)],
      notaDeseada: 70,
      etapa: 1,
      pesoTeorico: 70,
      pesoPractico: 30,
      categoriasP1: [{ id: 'c1', nombre: 'Examen', notaObtenida: 0, peso: 100 }],
      categoriasP2: [], categoriasPractico: []
    };
    setMaterias([...materias, nuevaMateria]);
    setNuevaMateriaNombre('');
    setIsAddMateriaOpen(false);
  };

  const actualizarMateriaActual = (campo: keyof Materia, valor: any) => {
    if (!materiaSeleccionada) return;
    const actualizada = { ...materiaSeleccionada, [campo]: valor };
    setMateriaSeleccionada(actualizada);
    setMaterias(materias.map(m => m.id === actualizada.id ? actualizada : m));
  };

  const cambiarEtapa = (nuevaEtapa: EtapaEvaluacion) => {
    if (!materiaSeleccionada) return;
    
    let nuevasCatsP2 = materiaSeleccionada.categoriasP2;
    let nuevasCatsPr = materiaSeleccionada.categoriasPractico;
    
    if (nuevaEtapa === 2 && nuevasCatsP2.length === 0) {
      nuevasCatsP2 = [{ id: Date.now().toString(), nombre: 'Examen Parcial 2', notaObtenida: 0, peso: 100 }];
    }
    if (nuevaEtapa === 3 && nuevasCatsPr.length === 0) {
      nuevasCatsPr = [{ id: Date.now().toString(), nombre: 'Proyecto Práctico', notaObtenida: 0, peso: 100 }];
    }

    const actualizada = { ...materiaSeleccionada, etapa: nuevaEtapa, categoriasP2: nuevasCatsP2, categoriasPractico: nuevasCatsPr };
    setMateriaSeleccionada(actualizada);
    setMaterias(materias.map(m => m.id === actualizada.id ? actualizada : m));
  };

  const getActiveKey = (etapa: number): keyof Materia => {
    return etapa === 1 ? 'categoriasP1' : etapa === 2 ? 'categoriasP2' : 'categoriasPractico';
  };

  const agregarCategoria = () => {
    if (!materiaSeleccionada) return;
    const key = getActiveKey(materiaSeleccionada.etapa);
    const lista = materiaSeleccionada[key] as Categoria[];
    actualizarMateriaActual(key, [...lista, { id: Date.now().toString(), nombre: 'Nuevo Componente', peso: 0, notaObtenida: 0 }]);
  };

  const actualizarCategoria = (idCat: string, campo: keyof Categoria, valor: string | number) => {
    if (!materiaSeleccionada) return;
    const key = getActiveKey(materiaSeleccionada.etapa);
    const lista = materiaSeleccionada[key] as Categoria[];
    actualizarMateriaActual(key, lista.map(cat => cat.id === idCat ? { ...cat, [campo]: valor } : cat));
  };

  const eliminarCategoria = (idCat: string) => {
    if (!materiaSeleccionada) return;
    const key = getActiveKey(materiaSeleccionada.etapa);
    const lista = materiaSeleccionada[key] as Categoria[];
    actualizarMateriaActual(key, lista.filter(c => c.id !== idCat));
  };

  const calcularEstadisticas = (mat: Materia) => {
    const notaP1 = mat.categoriasP1.reduce((acc, cat) => acc + (cat.notaObtenida * (cat.peso / 100)), 0);
    const notaP2 = mat.categoriasP2.reduce((acc, cat) => acc + (cat.notaObtenida * (cat.peso / 100)), 0);
    const notaPr = mat.categoriasPractico.reduce((acc, cat) => acc + (cat.notaObtenida * (cat.peso / 100)), 0);

    const pesoGlobalP1 = mat.pesoTeorico / 2;
    const pesoGlobalP2 = mat.pesoTeorico / 2;
    const pesoGlobalPr = mat.pesoPractico;

    const acumuladoGlobal = (notaP1 * (pesoGlobalP1 / 100)) + 
                            (notaP2 * (pesoGlobalP2 / 100)) + 
                            (notaPr * (pesoGlobalPr / 100));

    const listaActiva = mat[getActiveKey(mat.etapa)] as Categoria[];
    const pesoActivoCargado = listaActiva.reduce((acc, cat) => acc + cat.peso, 0);
    const notaActivaParcial = mat.etapa === 1 ? notaP1 : mat.etapa === 2 ? notaP2 : notaPr;
    
    const faltanteActivo = 100 - pesoActivoCargado;
    let pesoGlobalRestante = 0;
    
    if (mat.etapa === 1) pesoGlobalRestante = (faltanteActivo / 100 * pesoGlobalP1) + pesoGlobalP2 + pesoGlobalPr;
    else if (mat.etapa === 2) pesoGlobalRestante = (faltanteActivo / 100 * pesoGlobalP2) + pesoGlobalPr;
    else pesoGlobalRestante = (faltanteActivo / 100 * pesoGlobalPr);

    let notaNecesaria = 0;
    if (pesoGlobalRestante > 0) {
      notaNecesaria = (mat.notaDeseada - acumuladoGlobal) / (pesoGlobalRestante / 100);
    }

    return { notaP1, notaP2, notaPr, acumuladoGlobal, notaNecesaria, pesoActivoCargado, notaActivaParcial, listaActiva };
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ fontWeight: '800' }}>Mis Calificaciones</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen className="ion-padding">
        <IonList style={{ background: 'transparent' }}>
          {materias.map((materia) => {
            const stats = calcularEstadisticas(materia);
            return (
              <IonCard key={materia.id} onClick={() => { setMateriaSeleccionada(materia); setIsDetailOpen(true); }}
                style={{ borderRadius: '12px', marginBottom: '16px', cursor: 'pointer', borderTop: `4px solid var(--ion-color-${materia.color})`, background: 'var(--ion-card-background)' }}>
                <IonItem lines="none" color="transparent">
                  <IonLabel>
                    <h2 style={{ fontWeight: '700', fontSize: '1.2rem', color: 'var(--ion-text-color)' }}>{materia.nombre}</h2>
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem' }}>Global Acumulado</p>
                  </IonLabel>
                  {/* Gráfico Radial Dinámico en lugar de texto */}
                  <CircularProgress value={stats.acumuladoGlobal} color={materia.color} />
                </IonItem>
              </IonCard>
            );
          })}
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ marginBottom: '20px', marginRight: '10px' }}>
          <IonFabButton color="primary" onClick={() => setIsAddMateriaOpen(true)}><IonIcon icon={add} /></IonFabButton>
        </IonFab>

        <IonModal isOpen={isDetailOpen} onDidDismiss={() => setIsDetailOpen(false)}>
          {materiaSeleccionada && (() => {
            const stats = calcularEstadisticas(materiaSeleccionada);
            const tituloEtapa = materiaSeleccionada.etapa === 1 ? 'Primer Parcial' : materiaSeleccionada.etapa === 2 ? 'Segundo Parcial' : 'Componente Práctico';

            if (stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada && !celebratedRef.current[materiaSeleccionada.id]) {
              celebratedRef.current[materiaSeleccionada.id] = true;
              confetti({ particleCount: 150, spread: 80, origin: { y: 0.3 }, zIndex: 99999, colors: ['#2dd36f', '#ffea00', '#4c8dff'] });
            } else if (stats.acumuladoGlobal < materiaSeleccionada.notaDeseada) {
              celebratedRef.current[materiaSeleccionada.id] = false;
            }

            return (
              <IonContent>
                <div style={{ background: `linear-gradient(135deg, var(--ion-color-${materiaSeleccionada.color}), var(--ion-color-${materiaSeleccionada.color}-shade))`, padding: '30px 20px 20px', color: 'var(--ion-color-primary-contrast)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.8rem' }}>{materiaSeleccionada.nombre}</h1>
                    <IonIcon icon={close} style={{ fontSize: '2rem', cursor: 'pointer', opacity: 0.8 }} onClick={() => setIsDetailOpen(false)} />
                  </div>
                  
                  <div style={{ background: 'var(--ion-card-background)', borderRadius: '12px', padding: '20px', marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Meta Final</p>
                        <IonInput type="number" value={materiaSeleccionada.notaDeseada} onIonChange={e => actualizarMateriaActual('notaDeseada', parseFloat(e.detail.value!) || 0)} style={{ fontWeight: '800', fontSize: '1.6rem', color: `var(--ion-color-${materiaSeleccionada.color})`, textAlign: 'center' }} />
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Nota Global</p>
                        <p style={{ margin: '12px 0 0', fontWeight: '700', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{stats.acumuladoGlobal.toFixed(1)}</p>
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Necesitas</p>
                        <p style={{ margin: '12px 0 0', fontWeight: '800', fontSize: '1.4rem', color: stats.notaNecesaria > 100 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }}>
                          {stats.notaNecesaria > 0 && stats.acumuladoGlobal < materiaSeleccionada.notaDeseada ? stats.notaNecesaria.toFixed(1) : '0'}
                        </p>
                      </div>
                    </div>

                    {/* Sello de Aprobación */}
                    {stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada && (
                      <div style={{ background: 'rgba(45, 211, 111, 0.15)', color: 'var(--ion-color-success)', padding: '10px', borderRadius: '8px', fontWeight: '800', textAlign: 'center', letterSpacing: '1px', fontSize: '0.85rem' }}>
                        🎉 ASIGNATURA APROBADA
                      </div>
                    )}
                  </div>
                </div>

                <div className="ion-padding">
           
                  <IonCard style={{ margin: '0 0 20px 0', borderRadius: '12px', background: 'var(--ion-color-step-50)', boxShadow: 'none' }}>
                    <div style={{ padding: '10px 15px', background: 'var(--ion-color-step-100)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--ion-color-medium)', letterSpacing: '1px' }}>
                      PONDERACIÓN GLOBAL DE LA MATERIA
                    </div>
                    <IonItem lines="none" color="transparent">
                      <IonLabel color="medium" style={{ fontSize: '0.85rem' }}>% Teórico (P1 + P2)</IonLabel>
                      <IonInput type="number" slot="end" value={materiaSeleccionada.pesoTeorico} onIonChange={e => actualizarMateriaActual('pesoTeorico', parseFloat(e.detail.value!) || 0)} style={{ maxWidth: '50px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px', fontWeight: 'bold' }} />
                      
                      <IonLabel color="medium" style={{ fontSize: '0.85rem', marginLeft: '15px' }}>% Práctico</IonLabel>
                      <IonInput type="number" slot="end" value={materiaSeleccionada.pesoPractico} onIonChange={e => actualizarMateriaActual('pesoPractico', parseFloat(e.detail.value!) || 0)} style={{ maxWidth: '50px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px', fontWeight: 'bold' }} />
                    </IonItem>
                  </IonCard>

                  {materiaSeleccionada.etapa > 1 && (
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1, padding: '10px', background: 'var(--ion-color-step-100)', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>Parcial 1 Cerrado</p>
                        <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>{stats.notaP1.toFixed(1)} / 100</p>
                      </div>
                      {materiaSeleccionada.etapa === 3 && (
                        <div style={{ flex: 1, padding: '10px', background: 'var(--ion-color-step-100)', borderRadius: '8px', textAlign: 'center' }}>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>Parcial 2 Cerrado</p>
                          <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>{stats.notaP2.toFixed(1)} / 100</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px', padding: '0 5px' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: `var(--ion-color-${materiaSeleccionada.color})` }}>{tituloEtapa}</h2>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>Nota Actual: <strong>{stats.notaActivaParcial.toFixed(1)} / 100</strong></p>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)', textAlign: 'right' }}>
                      <span style={{ display: 'block', marginBottom: '3px' }}>Nota</span>
                      <span>Peso%</span>
                    </div>
                  </div>

                  <IonList style={{ background: 'transparent' }}>
                    {stats.listaActiva.map((cat) => (
                      <IonCard key={cat.id} style={{ margin: '0 0 10px 0', borderRadius: '10px', background: 'var(--ion-color-step-50)', boxShadow: 'none' }}>
                        <IonItem lines="none" color="transparent" style={{ '--min-height': '50px' }}>
                          <IonInput value={cat.nombre} onIonChange={e => actualizarCategoria(cat.id, 'nombre', e.detail.value!)} style={{ fontSize: '0.95rem', fontWeight: '600' }} placeholder="Componente..." />
                          
                          <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <IonInput type="number" value={cat.notaObtenida} onIonChange={e => actualizarCategoria(cat.id, 'notaObtenida', parseFloat(e.detail.value!) || 0)} style={{ maxWidth: '50px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '8px', color: 'var(--ion-color-primary)', fontWeight: '800', fontSize: '1rem', padding: '8px 0' }} />
                            <IonInput type="number" value={cat.peso} onIonChange={e => actualizarCategoria(cat.id, 'peso', parseFloat(e.detail.value!) || 0)} style={{ maxWidth: '50px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '8px', fontWeight: '600', fontSize: '1rem', padding: '8px 0' }} />
                            <IonIcon icon={trashOutline} color="danger" style={{ cursor: 'pointer', fontSize: '1.2rem', opacity: 0.8 }} onClick={() => eliminarCategoria(cat.id)} />
                          </div>
                        </IonItem>
                      </IonCard>
                    ))}
                  </IonList>

                  <IonButton expand="block" fill="clear" color={materiaSeleccionada.color} onClick={agregarCategoria} style={{ marginTop: '10px', fontWeight: '700' }}>
                    <IonIcon icon={addCircleOutline} slot="start" /> AÑADIR A {tituloEtapa.toUpperCase()}
                  </IonButton>

                  {stats.pesoActivoCargado > 100 && (
                    <div style={{ background: 'rgba(255, 73, 97, 0.1)', color: 'var(--ion-color-danger)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', marginTop: '10px' }}>
                      ⚠️ El peso dentro de este bloque suma {stats.pesoActivoCargado}%. Debe ser 100%.
                    </div>
                  )}
                
                  {(materiaSeleccionada.pesoTeorico + materiaSeleccionada.pesoPractico) !== 100 && (
                    <div style={{ background: 'rgba(255, 73, 97, 0.1)', color: 'var(--ion-color-danger)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', marginTop: '10px' }}>
                      ⚠️ El % Teórico y % Práctico suman {materiaSeleccionada.pesoTeorico + materiaSeleccionada.pesoPractico}%.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '30px', padding: '15px 0', borderTop: '1px dashed var(--ion-color-step-150)' }}>
                    {materiaSeleccionada.etapa === 1 && (
                      <IonButton expand="block" fill="outline" color="medium" style={{ flex: 1 }} onClick={() => cambiarEtapa(2)}>
                        Cerrar P1 y Avanzar al P2 <IonIcon icon={arrowForwardOutline} slot="end" />
                      </IonButton>
                    )}
                    {materiaSeleccionada.etapa === 2 && (
                      <IonButton expand="block" fill="outline" color="medium" style={{ flex: 1 }} onClick={() => cambiarEtapa(3)}>
                        Cerrar P2 y Avanzar al Práctico <IonIcon icon={arrowForwardOutline} slot="end" />
                      </IonButton>
                    )}
                    {materiaSeleccionada.etapa > 1 && (
                      <IonButton expand="block" fill="clear" color="medium" style={{ flex: 0.2 }} onClick={() => cambiarEtapa((materiaSeleccionada.etapa - 1) as EtapaEvaluacion)}>
                        <IonIcon icon={arrowUndoOutline} />
                      </IonButton>
                    )}
                  </div>

                </div>
              </IonContent>
            );
          })()}
        </IonModal>
        
        <IonModal isOpen={isAddMateriaOpen} initialBreakpoint={0.4} breakpoints={[0, 0.4]} onDidDismiss={() => setIsAddMateriaOpen(false)}>
          <IonContent className="ion-padding">
            <h2 style={{fontWeight:'800', marginTop:'15px', color: 'var(--ion-text-color)'}}>Nueva Asignatura</h2>
            <IonItem className="ion-margin-top" color="transparent">
              <IonLabel position="floating" color="medium">Nombre de la materia</IonLabel>
              <IonInput value={nuevaMateriaNombre} onIonChange={e => setNuevaMateriaNombre(e.detail.value!)} style={{ fontWeight: '600' }} />
            </IonItem>
            <IonButton expand="block" style={{ marginTop: '30px', borderRadius: '8px', fontWeight: 'bold' }} onClick={agregarMateria}>Crear Asignatura</IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;