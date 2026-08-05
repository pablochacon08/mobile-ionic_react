import React, { useState } from 'react';
import { 
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, 
  IonCardContent, IonItem, IonLabel, IonList, IonProgressBar, 
  IonFab, IonFabButton, IonIcon, IonModal, IonButton, IonInput, 
  IonButtons, IonText, IonListHeader
} from '@ionic/react';
import { add, close, chevronForward, trashOutline, addCircleOutline } from 'ionicons/icons';
import './Tab1.css';

// --- Interfaces de Datos ---
interface Categoria {
  id: string;
  nombre: string;
  peso: number;
  notaObtenida: number;
}

interface Materia {
  id: string;
  nombre: string;
  color: string; // Ahora usaremos colores nativos de Ionic: 'primary', 'secondary', etc.
  notaDeseada: number;
  categorias: Categoria[];
}

// Colores nativos de Ionic para garantizar el contraste
const ionicColors = ['primary', 'secondary', 'tertiary', 'success', 'warning'];

const Tab1: React.FC = () => {
  // --- Estados Globales ---
  const [materias, setMaterias] = useState<Materia[]>([
    {
      id: '1',
      nombre: 'Sistemas Digitales',
      color: 'primary',
      notaDeseada: 70,
      categorias: [
        { id: 'c1', nombre: 'Parcial 1', peso: 40, notaObtenida: 85 },
        { id: 'c2', nombre: 'Lecciones', peso: 20, notaObtenida: 90 }
      ]
    },
    {
      id: '2',
      nombre: 'Estadística',
      color: 'secondary',
      notaDeseada: 70,
      categorias: [
        { id: 'c3', nombre: 'Examen', peso: 50, notaObtenida: 65 }
      ]
    }
  ]);

  const [nuevaMateriaNombre, setNuevaMateriaNombre] = useState('');
  const [isAddMateriaOpen, setIsAddMateriaOpen] = useState(false);
  
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<Materia | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // --- Funciones para Materias ---
  const agregarMateria = () => {
    if (!nuevaMateriaNombre.trim()) return;
    const colorRandom = ionicColors[Math.floor(Math.random() * ionicColors.length)];
    const nuevaMateria: Materia = {
      id: Date.now().toString(),
      nombre: nuevaMateriaNombre,
      color: colorRandom,
      notaDeseada: 70,
      categorias: []
    };
    setMaterias([...materias, nuevaMateria]);
    setNuevaMateriaNombre('');
    setIsAddMateriaOpen(false);
  };

  const abrirDetalle = (materia: Materia) => {
    setMateriaSeleccionada(materia);
    setIsDetailOpen(true);
  };

  // --- Funciones para Categorías (Dentro del Modal) ---
  const agregarCategoria = () => {
    if (!materiaSeleccionada) return;
    const nuevaCategoria: Categoria = {
      id: Date.now().toString(),
      nombre: 'Nueva Evaluación',
      peso: 0,
      notaObtenida: 0
    };
    const materiaActualizada = {
      ...materiaSeleccionada,
      categorias: [...materiaSeleccionada.categorias, nuevaCategoria]
    };
    setMateriaSeleccionada(materiaActualizada);
    setMaterias(materias.map(m => m.id === materiaActualizada.id ? materiaActualizada : m));
  };

  const actualizarCategoria = (idCat: string, campo: keyof Categoria, valor: string | number) => {
    if (!materiaSeleccionada) return;
    const categoriasActualizadas = materiaSeleccionada.categorias.map(cat => 
      cat.id === idCat ? { ...cat, [campo]: valor } : cat
    );
    const materiaActualizada = { ...materiaSeleccionada, categorias: categoriasActualizadas };
    setMateriaSeleccionada(materiaActualizada);
    setMaterias(materias.map(m => m.id === materiaActualizada.id ? materiaActualizada : m));
  };

  const actualizarNotaDeseada = (valor: number) => {
    if (!materiaSeleccionada) return;
    const materiaActualizada = { ...materiaSeleccionada, notaDeseada: valor };
    setMateriaSeleccionada(materiaActualizada);
    setMaterias(materias.map(m => m.id === materiaActualizada.id ? materiaActualizada : m));
  }

  const eliminarCategoria = (idCat: string) => {
    if (!materiaSeleccionada) return;
    const categoriasActualizadas = materiaSeleccionada.categorias.filter(cat => cat.id !== idCat);
    const materiaActualizada = { ...materiaSeleccionada, categorias: categoriasActualizadas };
    setMateriaSeleccionada(materiaActualizada);
    setMaterias(materias.map(m => m.id === materiaActualizada.id ? materiaActualizada : m));
  };

  // --- Lógica Matemática Predictiva ---
  const calcularEstadisticas = (materia: Materia) => {
    const pesoTotal = materia.categorias.reduce((acc, cat) => acc + cat.peso, 0);
    const notaAcumulada = materia.categorias.reduce((acc, cat) => acc + (cat.notaObtenida * (cat.peso / 100)), 0);
    const pesoRestante = 100 - pesoTotal;
    
    let notaNecesaria = 0;
    if (pesoRestante > 0) {
      notaNecesaria = (materia.notaDeseada - notaAcumulada) / (pesoRestante / 100);
    }

    return { pesoTotal, notaAcumulada, pesoRestante, notaNecesaria };
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ fontWeight: '800' }}>Mis Materias</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent fullscreen className="ion-padding">
        
        {/* Lista de Materias Dinámica */}
        <IonList style={{ background: 'transparent' }}>
          {materias.map((materia) => {
            const stats = calcularEstadisticas(materia);
            return (
              <IonCard 
                key={materia.id} 
                onClick={() => abrirDetalle(materia)}
                style={{ 
                  borderRadius: '16px', 
                  marginBottom: '16px', 
                  cursor: 'pointer',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.08)', // Sombra moderna
                  borderLeft: `8px solid var(--ion-color-${materia.color})` // Borde dinámico con variables de Ionic
                }}
              >
                <IonItem lines="none">
                  <IonLabel>
                    <h2 style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '4px' }}>{materia.nombre}</h2>
                    <p>Rendimiento Acumulado: <strong>{stats.notaAcumulada.toFixed(1)} / 100</strong></p>
                  </IonLabel>
                  <IonIcon icon={chevronForward} slot="end" color="medium" />
                </IonItem>
                <div style={{ padding: '0 20px 20px 20px' }}>
                  <IonProgressBar value={stats.notaAcumulada / 100} color={materia.color} style={{ height: '8px', borderRadius: '4px' }}></IonProgressBar>
                </div>
              </IonCard>
            );
          })}
        </IonList>

        {/* Botón Flotante para Agregar Materia */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ marginBottom: '20px', marginRight: '10px' }}>
          <IonFabButton color="primary" onClick={() => setIsAddMateriaOpen(true)}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Modal: Agregar Nueva Materia */}
        <IonModal isOpen={isAddMateriaOpen} initialBreakpoint={0.6} breakpoints={[0, 0.6]} onDidDismiss={() => setIsAddMateriaOpen(false)}>
          <IonContent className="ion-padding">
            <IonHeader className="ion-no-border">
              <IonToolbar>
                <IonTitle>Nueva Asignatura</IonTitle>
                <IonButtons slot="end">
                  <IonButton onClick={() => setIsAddMateriaOpen(false)}>Cerrar</IonButton>
                </IonButtons>
              </IonToolbar>
            </IonHeader>
            <IonItem className="ion-margin-top">
              <IonLabel position="floating">Nombre de la asignatura</IonLabel>
              <IonInput value={nuevaMateriaNombre} onIonChange={e => setNuevaMateriaNombre(e.detail.value!)} />
            </IonItem>
            <IonButton expand="block" color="primary" className="ion-margin-top" onClick={agregarMateria} style={{ margin: '20px' }}>
              Guardar Materia
            </IonButton>
          </IonContent>
        </IonModal>

        {/* Modal: Detalle de la Materia */}
        <IonModal isOpen={isDetailOpen} onDidDismiss={() => setIsDetailOpen(false)}>
          {materiaSeleccionada && (
            <IonContent>
              <IonHeader className="ion-no-border">
                <IonToolbar>
                  <IonTitle color={materiaSeleccionada.color} style={{ fontWeight: '800' }}>{materiaSeleccionada.nombre}</IonTitle>
                  <IonButtons slot="end">
                    <IonButton onClick={() => setIsDetailOpen(false)}>
                      <IonIcon icon={close} style={{ fontSize: '1.5rem' }} />
                    </IonButton>
                  </IonButtons>
                </IonToolbar>
              </IonHeader>

              <div className="ion-padding">
                {/* Tarjeta de Proyección (Diseño Limpio) */}
                {(() => {
                  const stats = calcularEstadisticas(materiaSeleccionada);
                  return (
                    <>
                      <IonCard style={{ borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                        <IonCardContent className="ion-text-center">
                          <IonItem lines="none" style={{ textAlign: 'center' }}>
                             <IonLabel position="stacked" color="medium">Meta de aprobación final (Ej: 70):</IonLabel>
                             <IonInput type="number" value={materiaSeleccionada.notaDeseada} onIonChange={e => actualizarNotaDeseada(parseFloat(e.detail.value!) || 0)} style={{ fontSize: '2rem', fontWeight: 'bold', textAlign: 'center' }} />
                          </IonItem>
                          <div style={{ marginTop: '15px', padding: '10px', background: 'var(--ion-color-light)', borderRadius: '12px' }}>
                            <p style={{ margin: '0' }} className="ion-text-wrap">Con <strong>{stats.pesoRestante}%</strong> de la nota aún en juego, necesitas un promedio de:</p>
                            <h1 style={{ fontSize: '3.5rem', fontWeight: '800', color: stats.notaNecesaria > 100 ? 'var(--ion-color-danger)' : `var(--ion-color-${materiaSeleccionada.color})`, margin: '10px 0' }}>
                              {stats.pesoRestante === 0 ? '-' : (stats.notaNecesaria > 0 ? stats.notaNecesaria.toFixed(1) : '0')}
                            </h1>
                            <IonText color={stats.pesoTotal > 100 ? 'danger' : 'medium'}>
                              <p style={{ margin: 0, fontSize: '0.9rem' }}>Ponderación ingresada: {stats.pesoTotal}% / 100%</p>
                            </IonText>
                          </div>
                        </IonCardContent>
                      </IonCard>

                      <IonListHeader style={{ marginTop: '20px', padding: '0 10px' }}>
                        <IonLabel style={{ fontSize: '1.2rem', fontWeight: '700' }}>Registro de Calificaciones</IonLabel>
                      </IonListHeader>
                      
                      {/* Lista de Componentes */}
                      {materiaSeleccionada.categorias.map((cat) => (
                        <IonCard key={cat.id} style={{ borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '10px' }}>
                          <IonItem lines="full">
                            <IonInput value={cat.nombre} onIonChange={e => actualizarCategoria(cat.id, 'nombre', e.detail.value!)} style={{ fontWeight: 'bold' }} placeholder="Ej: Control de Lectura" />
                            <IonButton slot="end" fill="clear" color="danger" onClick={() => eliminarCategoria(cat.id)}>
                              <IonIcon icon={trashOutline} />
                            </IonButton>
                          </IonItem>
                          <IonItem lines="none">
                            <div style={{ display: 'flex', width: '100%', gap: '15px', paddingTop: '10px' }}>
                              <div style={{ flex: 1 }}>
                                <IonLabel position="stacked" color="medium">Peso (%)</IonLabel>
                                <IonInput type="number" value={cat.peso} onIonChange={e => actualizarCategoria(cat.id, 'peso', parseFloat(e.detail.value!) || 0)} style={{ fontSize: '1.2rem' }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <IonLabel position="stacked" color="medium">Nota (/100)</IonLabel>
                                <IonInput type="number" value={cat.notaObtenida} onIonChange={e => actualizarCategoria(cat.id, 'notaObtenida', parseFloat(e.detail.value!) || 0)} style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--ion-color-success)' }} />
                              </div>
                            </div>
                          </IonItem>
                        </IonCard>
                      ))}

                      <IonButton expand="block" fill="outline" color={materiaSeleccionada.color} className="ion-margin-top" onClick={agregarCategoria} style={{ borderStyle: 'dashed', borderWidth: '2px', borderRadius: '12px', height: '50px', marginTop: '20px' }}>
                        <IonIcon icon={addCircleOutline} slot="start" />
                        Añadir Nuevo Componente
                      </IonButton>
                    </>
                  );
                })()}
              </div>
            </IonContent>
          )}
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;