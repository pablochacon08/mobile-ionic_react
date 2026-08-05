import React, { useState } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, 
  IonCardContent, IonItem, IonLabel, IonList, 
  IonFab, IonFabButton, IonIcon, IonModal, IonButton, IonInput
} from '@ionic/react';
import { add, close, chevronForward, trashOutline, addCircleOutline, arrowForwardOutline, arrowUndoOutline } from 'ionicons/icons';
import './Tab1.css';

// --- Interfaces ---
interface Categoria {
  id: string;
  nombre: string;
  peso: number;
  notaObtenida: number;
}

type EtapaEvaluacion = 1 | 2 | 3; // 1: Solo P1, 2: P1 + P2, 3: P1 + P2 + Práctico

interface Materia {
  id: string;
  nombre: string;
  color: string;
  notaDeseada: number;
  etapa: EtapaEvaluacion;
  notaP1: number;
  notaP2: number;
  pesoP1: number; 
  pesoP2: number;
  pesoPractico: number;
  categorias: Categoria[]; 
}

const ionicColors = ['primary', 'secondary', 'tertiary', 'success', 'warning'];

const Tab1: React.FC = () => {
  const [materias, setMaterias] = useState<Materia[]>([
    {
      id: '1',
      nombre: 'Sistemas Digitales',
      color: 'tertiary',
      notaDeseada: 70,
      etapa: 1, // Empieza por defecto asumiendo que estás en tu primer parcial
      notaP1: 0,
      notaP2: 0,
      pesoP1: 100,
      pesoP2: 0,
      pesoPractico: 0,
      categorias: [
        { id: 'c1', nombre: 'Control de Lectura', notaObtenida: 80, peso: 20 },
        { id: 'c2', nombre: 'Lección', notaObtenida: 0, peso: 30 }
      ]
    }
  ]);

  const [isAddMateriaOpen, setIsAddMateriaOpen] = useState(false);
  const [nuevaMateriaNombre, setNuevaMateriaNombre] = useState('');
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<Materia | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // --- Funciones de Materias ---
  const agregarMateria = () => {
    if (!nuevaMateriaNombre.trim()) return;
    const nuevaMateria: Materia = {
      id: Date.now().toString(),
      nombre: nuevaMateriaNombre,
      color: ionicColors[Math.floor(Math.random() * ionicColors.length)],
      notaDeseada: 70,
      etapa: 1,
      notaP1: 0, notaP2: 0,
      pesoP1: 100, pesoP2: 0, pesoPractico: 0,
      categorias: [{ id: 'c1', nombre: 'Lección 1', notaObtenida: 0, peso: 100 }]
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
    let actualizaciones: Partial<Materia> = { etapa: nuevaEtapa };

    // Repartición mágica del 100%
    if (nuevaEtapa === 1) {
      actualizaciones.pesoP1 = 100;
      actualizaciones.pesoP2 = 0;
      actualizaciones.pesoPractico = 0;
    } else if (nuevaEtapa === 2) {
      actualizaciones.pesoP1 = 50;
      actualizaciones.pesoP2 = 50;
      actualizaciones.pesoPractico = 0;
    } else if (nuevaEtapa === 3) {
      actualizaciones.pesoP1 = 30;
      actualizaciones.pesoP2 = 30;
      actualizaciones.pesoPractico = 40;
    }

    const actualizada = { ...materiaSeleccionada, ...actualizaciones };
    setMateriaSeleccionada(actualizada);
    setMaterias(materias.map(m => m.id === actualizada.id ? actualizada : m));
  };

  
  const agregarCategoria = () => {
    if (!materiaSeleccionada) return;
    actualizarMateriaActual('categorias', [...materiaSeleccionada.categorias, { id: Date.now().toString(), nombre: 'Componente', peso: 0, notaObtenida: 0 }]);
  };

  const actualizarCategoria = (idCat: string, campo: keyof Categoria, valor: string | number) => {
    if (!materiaSeleccionada) return;
    actualizarMateriaActual('categorias', materiaSeleccionada.categorias.map(cat => cat.id === idCat ? { ...cat, [campo]: valor } : cat));
  };

  const eliminarCategoria = (idCat: string) => {
    if (!materiaSeleccionada) return;
    actualizarMateriaActual('categorias', materiaSeleccionada.categorias.filter(c => c.id !== idCat));
  };

  const calcularEstadisticas = (mat: Materia) => {
    // 1. Cálculos de la lista interna (lo que está en curso)
    const pesoTotalCats = mat.categorias.reduce((acc, cat) => acc + cat.peso, 0);
    const notaAcumuladaCats = mat.categorias.reduce((acc, cat) => acc + (cat.notaObtenida * (cat.peso / 100)), 0);
    const pesoRestanteCats = 100 - pesoTotalCats;

    // 2. Determinar el peso global del bloque activo y lo que ya está cerrado
    let pesoBloqueActivo = 100;
    let totalAcumuladoCerrado = 0;
    let sumaPesosGlobales = 100;

    if (mat.etapa === 1) {
      pesoBloqueActivo = mat.pesoP1;
      totalAcumuladoCerrado = 0;
      sumaPesosGlobales = mat.pesoP1;
    } else if (mat.etapa === 2) {
      pesoBloqueActivo = mat.pesoP2;
      totalAcumuladoCerrado = mat.notaP1 * (mat.pesoP1 / 100);
      sumaPesosGlobales = mat.pesoP1 + mat.pesoP2;
    } else if (mat.etapa === 3) {
      pesoBloqueActivo = mat.pesoPractico;
      totalAcumuladoCerrado = mat.notaP1 * (mat.pesoP1 / 100) + mat.notaP2 * (mat.pesoP2 / 100);
      sumaPesosGlobales = mat.pesoP1 + mat.pesoP2 + mat.pesoPractico;
    }

    // 3. Proyección Promedio
    const aporteActivoActual = notaAcumuladaCats * (pesoBloqueActivo / 100);
    const notaActualPromedio = totalAcumuladoCerrado + aporteActivoActual;

   
    let notaNecesaria = 0;
    const puntosGlobalesFaltantes = mat.notaDeseada - totalAcumuladoCerrado;
    const notaBloqueActivoNecesaria = puntosGlobalesFaltantes / (pesoBloqueActivo / 100);

    if (pesoRestanteCats > 0) {
      notaNecesaria = (notaBloqueActivoNecesaria - notaAcumuladaCats) / (pesoRestanteCats / 100);
    }

    return { pesoTotalCats, notaActualPromedio, pesoRestanteCats, notaNecesaria, sumaPesosGlobales };
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
                    <p style={{ color: 'var(--ion-color-medium)' }}>Promedio General: <strong style={{ color: 'var(--ion-text-color)' }}>{stats.notaActualPromedio.toFixed(1)} / 100</strong></p>
                  </IonLabel>
                  <IonIcon icon={chevronForward} slot="end" color="medium" />
                </IonItem>
              </IonCard>
            );
          })}
        </IonList>

        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ marginBottom: '20px', marginRight: '10px' }}>
          <IonFabButton color="primary" onClick={() => setIsAddMateriaOpen(true)}><IonIcon icon={add} /></IonFabButton>
        </IonFab>

        {/* --- MODAL DE DETALLE --- */}
        <IonModal isOpen={isDetailOpen} onDidDismiss={() => setIsDetailOpen(false)}>
          {materiaSeleccionada && (() => {
            const stats = calcularEstadisticas(materiaSeleccionada);
            return (
              <IonContent>
  
                <div style={{ background: `linear-gradient(135deg, var(--ion-color-${materiaSeleccionada.color}), var(--ion-color-${materiaSeleccionada.color}-shade))`, padding: '30px 20px 20px', color: 'var(--ion-color-primary-contrast)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.8rem' }}>{materiaSeleccionada.nombre}</h1>
                    <IonIcon icon={close} style={{ fontSize: '2rem', cursor: 'pointer', opacity: 0.8 }} onClick={() => setIsDetailOpen(false)} />
                  </div>
                  
                  <div style={{ background: 'var(--ion-card-background)', borderRadius: '12px', padding: '20px', marginTop: '25px', display: 'flex', justifyContent: 'space-between', textAlign: 'center', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Meta Final</p>
                      <IonInput type="number" value={materiaSeleccionada.notaDeseada} onIonChange={e => actualizarMateriaActual('notaDeseada', parseFloat(e.detail.value!) || 0)} style={{ fontWeight: '800', fontSize: '1.6rem', color: `var(--ion-color-${materiaSeleccionada.color})`, textAlign: 'center' }} />
                    </div>
                    <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Promedio</p>
                      <p style={{ margin: '12px 0 0', fontWeight: '700', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{stats.notaActualPromedio.toFixed(1)}</p>
                    </div>
                    <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px' }}>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Necesitas</p>
                      <p style={{ margin: '12px 0 0', fontWeight: '800', fontSize: '1.4rem', color: stats.notaNecesaria > 100 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }}>
                        {stats.pesoRestanteCats === 0 ? '-' : (stats.notaNecesaria > 0 ? stats.notaNecesaria.toFixed(1) : '0')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ion-padding">
                  
                  {/* Ponderaciones Globales (Aparece cuando hay más de 1 parcial) */}
                  {materiaSeleccionada.etapa >= 2 && (
                    <IonCard style={{ margin: '0 0 20px 0', borderRadius: '12px', background: 'var(--ion-color-step-50)', boxShadow: 'none' }}>
                      <div style={{ padding: '10px 15px', background: 'var(--ion-color-step-100)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--ion-color-medium)', letterSpacing: '1px' }}>
                        ESTRUCTURA DEL SEMESTRE
                      </div>
                      
                      <IonItem lines="full" color="transparent">
                        <IonLabel style={{ fontSize: '0.9rem', fontWeight: '600' }}>Parcial 1 (Cerrado)</IonLabel>
                        <div slot="end" style={{ display: 'flex', gap: '8px' }}>
                          <IonInput type="number" value={materiaSeleccionada.notaP1} onIonChange={e => actualizarMateriaActual('notaP1', parseFloat(e.detail.value!) || 0)} placeholder="Nota" style={{ width: '60px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px', fontWeight: 'bold' }} />
                          <IonInput type="number" value={materiaSeleccionada.pesoP1} onIonChange={e => actualizarMateriaActual('pesoP1', parseFloat(e.detail.value!) || 0)} placeholder="Peso%" style={{ width: '50px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px' }} />
                        </div>
                      </IonItem>

                      {materiaSeleccionada.etapa === 3 && (
                        <IonItem lines="full" color="transparent">
                          <IonLabel style={{ fontSize: '0.9rem', fontWeight: '600' }}>Parcial 2 (Cerrado)</IonLabel>
                          <div slot="end" style={{ display: 'flex', gap: '8px' }}>
                            <IonInput type="number" value={materiaSeleccionada.notaP2} onIonChange={e => actualizarMateriaActual('notaP2', parseFloat(e.detail.value!) || 0)} placeholder="Nota" style={{ width: '60px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px', fontWeight: 'bold' }} />
                            <IonInput type="number" value={materiaSeleccionada.pesoP2} onIonChange={e => actualizarMateriaActual('pesoP2', parseFloat(e.detail.value!) || 0)} placeholder="Peso%" style={{ width: '50px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px' }} />
                          </div>
                        </IonItem>
                      )}

                      <IonItem lines="none" color="transparent">
                        <IonLabel style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--ion-color-primary)' }}>
                          {materiaSeleccionada.etapa === 2 ? 'Parcial 2 (Evaluando)' : 'Práctico (Evaluando)'}
                        </IonLabel>
                        <div slot="end" style={{ display: 'flex', gap: '8px' }}>
                          <div style={{ width: '60px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--ion-color-medium)', paddingTop: '10px' }}>En curso</div>
                          <IonInput type="number" value={materiaSeleccionada.etapa === 2 ? materiaSeleccionada.pesoP2 : materiaSeleccionada.pesoPractico} onIonChange={e => actualizarMateriaActual(materiaSeleccionada.etapa === 2 ? 'pesoP2' : 'pesoPractico', parseFloat(e.detail.value!) || 0)} style={{ width: '50px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px' }} />
                        </div>
                      </IonItem>
                    </IonCard>
                  )}

                  {/* Alerta de Pesos */}
                  {stats.sumaPesosGlobales !== 100 && (
                    <div style={{ background: 'rgba(255, 73, 97, 0.1)', color: 'var(--ion-color-danger)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', marginBottom: '15px' }}>
                      ⚠️ Los pesos globales suman {stats.sumaPesosGlobales}%. Deben sumar 100%.
                    </div>
                  )}

                  {/* Encabezados de la lista Activa */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 15px 10px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--ion-color-medium)', fontWeight: '700' }}>
                    <span>Componentes de Evaluación</span>
                    <span style={{ display: 'flex', gap: '32px', marginRight: '35px' }}>
                      <span>Nota</span>
                      <span>Peso%</span>
                    </span>
                  </div>

                  {/* Lista de Calificaciones Activas */}
                  <IonList style={{ background: 'transparent' }}>
                    {materiaSeleccionada.categorias.map((cat) => (
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
                    <IonIcon icon={addCircleOutline} slot="start" /> AÑADIR COMPONENTE
                  </IonButton>

                  {/* Botones Mágicos de Progresión */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '30px', padding: '15px 0', borderTop: '1px dashed var(--ion-color-step-150)' }}>
                    {materiaSeleccionada.etapa === 1 && (
                      <IonButton expand="block" fill="outline" color="medium" style={{ flex: 1 }} onClick={() => cambiarEtapa(2)}>
                        Avanzar Semestre: 2do Parcial <IonIcon icon={arrowForwardOutline} slot="end" />
                      </IonButton>
                    )}
                    {materiaSeleccionada.etapa === 2 && (
                      <IonButton expand="block" fill="outline" color="medium" style={{ flex: 1 }} onClick={() => cambiarEtapa(3)}>
                        Avanzar Semestre: Práctico <IonIcon icon={arrowForwardOutline} slot="end" />
                      </IonButton>
                    )}
                    {materiaSeleccionada.etapa > 1 && (
                      <IonButton expand="block" fill="clear" color="medium" style={{ flex: 0.3 }} onClick={() => cambiarEtapa((materiaSeleccionada.etapa - 1) as EtapaEvaluacion)}>
                        <IonIcon icon={arrowUndoOutline} />
                      </IonButton>
                    )}
                  </div>

                </div>
              </IonContent>
            );
          })()}
        </IonModal>
        
        {/* Modal: Agregar Nueva Materia */}
        <IonModal isOpen={isAddMateriaOpen} initialBreakpoint={0.4} breakpoints={[0, 0.4]} onDidDismiss={() => setIsAddMateriaOpen(false)}>
          <IonContent className="ion-padding">
            <h2 style={{fontWeight:'800', marginTop:'15px'}}>Nueva Asignatura</h2>
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