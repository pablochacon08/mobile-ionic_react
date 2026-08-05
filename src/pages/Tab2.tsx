import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonList, IonListHeader, IonText } from '@ionic/react';
import { addCircleOutline, warningOutline, checkmarkCircleOutline } from 'ionicons/icons';
import './Tab2.css';

interface Categoria {
  id: number;
  nombre: string;
  peso: number; // Porcentaje (ej. 20%)
  notaObtenida: number; // Sobre 100
}

const Tab2: React.FC = () => {
  const [notaDeseada, setNotaDeseada] = useState<number>(70);
  const [pesoExamen, setPesoExamen] = useState<number>(40);
  const [categorias, setCategorias] = useState<Categoria[]>([
    { id: 1, nombre: 'Lecciones', peso: 20, notaObtenida: 85 },
    { id: 2, nombre: 'Deberes', peso: 20, notaObtenida: 90 },
    { id: 3, nombre: 'Control de Lectura', peso: 20, notaObtenida: 75 }
  ]);

  // Lógica Matemática
  const notaAcumulada = categorias.reduce((acc, curr) => acc + (curr.notaObtenida * (curr.peso / 100)), 0);
  const pesoTotalCategorias = categorias.reduce((acc, curr) => acc + curr.peso, 0);
  const totalPeso = pesoTotalCategorias + pesoExamen; // Debería ser 100%
  
  // Cálculo de cuánto falta para la nota deseada
  const puntosFaltantes = notaDeseada - notaAcumulada;
  const notaExamenNecesaria = puntosFaltantes / (pesoExamen / 100);

  const actualizarCategoria = (id: number, campo: keyof Categoria, valor: number) => {
    const nuevasCategorias = categorias.map(c => c.id === id ? { ...c, [campo]: valor } : c);
    setCategorias(nuevasCategorias);
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar color="dark">
          <IonTitle style={{ fontWeight: 'bold' }}>Predictor de Parcial</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding" color="dark">
        
        {/* Panel de Configuración Global */}
        <IonCard style={{ background: '#1e1e1e', borderRadius: '15px' }}>
          <IonCardHeader>
            <IonCardTitle style={{ color: '#4c8dff', fontSize: '1.2rem' }}>Configuración del Parcial</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem color="transparent" lines="full">
              <IonLabel position="stacked" style={{ color: '#aaa' }}>Nota Mínima para Aprobar</IonLabel>
              <IonInput type="number" value={notaDeseada} onIonChange={e => setNotaDeseada(parseFloat(e.detail.value!) || 0)} style={{ color: '#fff', fontSize: '1.5rem' }} />
            </IonItem>
            <IonItem color="transparent" lines="full">
              <IonLabel position="stacked" style={{ color: '#aaa' }}>Peso del Examen Final (%)</IonLabel>
              <IonInput type="number" value={pesoExamen} onIonChange={e => setPesoExamen(parseFloat(e.detail.value!) || 0)} style={{ color: '#fff', fontSize: '1.5rem' }} />
            </IonItem>
          </IonCardContent>
        </IonCard>

        {/* Panel de Categorías (Lecciones, Deberes, etc.) */}
        <IonList style={{ background: 'transparent' }}>
          <IonListHeader style={{ paddingLeft: '5px' }}>
            <IonLabel style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 'bold' }}>Mis Calificaciones</IonLabel>
          </IonListHeader>
          
          {categorias.map((cat) => (
            <IonCard key={cat.id} style={{ background: '#2a2a2a', margin: '10px 0', borderRadius: '10px' }}>
              <IonItem color="transparent" lines="none">
                <IonLabel>
                  <h3 style={{ color: '#fff', fontWeight: 'bold' }}>{cat.nombre}</h3>
                </IonLabel>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <IonInput type="number" placeholder="Peso %" value={cat.peso} onIonChange={e => actualizarCategoria(cat.id, 'peso', parseFloat(e.detail.value!) || 0)} style={{ width: '60px', textAlign: 'center', background: '#1e1e1e', borderRadius: '5px', color: '#4c8dff' }} />
                  <IonInput type="number" placeholder="Nota" value={cat.notaObtenida} onIonChange={e => actualizarCategoria(cat.id, 'notaObtenida', parseFloat(e.detail.value!) || 0)} style={{ width: '60px', textAlign: 'center', background: '#1e1e1e', borderRadius: '5px', color: '#2dd36f' }} />
                </div>
              </IonItem>
            </IonCard>
          ))}
        </IonList>

        {/* Verificación de Integridad del 100% */}
        {totalPeso !== 100 && (
          <IonText color="danger">
            <p style={{ textAlign: 'center', fontSize: '0.9rem' }}>
              <IonIcon icon={warningOutline} style={{ verticalAlign: 'middle', marginRight: '5px' }} />
              ¡Atención! La suma de pesos es {totalPeso}%. Debe ser 100%.
            </p>
          </IonText>
        )}

        {/* Tarjeta de Resultado Dinámico */}
        <IonCard style={{ background: notaExamenNecesaria > 100 ? '#ff4961' : 'linear-gradient(135deg, #2dd36f 0%, #1b8a47 100%)', marginTop: '20px', borderRadius: '15px' }}>
          <IonCardContent className="ion-text-center">
            <h2 style={{ color: '#fff', margin: '0', fontSize: '1.2rem' }}>En el examen necesitas:</h2>
            <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#fff', margin: '10px 0' }}>
              {notaExamenNecesaria > 0 ? notaExamenNecesaria.toFixed(1) : '0'}
            </h1>
            <p style={{ color: '#fff', opacity: 0.9 }}>
              {notaExamenNecesaria > 100 
                ? "Matemáticamente imposible. Necesitas mejorar otros rubros."
                : <><IonIcon icon={checkmarkCircleOutline} style={{ verticalAlign: 'middle' }}/> ¡Es completamente lograble!</>}
            </p>
          </IonCardContent>
        </IonCard>

      </IonContent>
    </IonPage>
  );
};

export default Tab2;