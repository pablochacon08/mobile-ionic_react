import React, { useState } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonItem, IonLabel, IonInput, IonButton, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonText } from '@ionic/react';
import './Tab2.css';

const Tab2: React.FC = () => {
  const [notaDeseada, setNotaDeseada] = useState<number>(70);
  const [notaActual, setNotaActual] = useState<number>(0);
  const [pesoExamen, setPesoExamen] = useState<number>(40); // 40% del parcial
  const [resultado, setResultado] = useState<number | null>(null);

  const calcularNotaNecesaria = () => {
    // Fórmula matemática para calcular cuánto falta sacar en el examen
    const pesoDecimal = pesoExamen / 100;
    const notaParcial = notaActual * (1 - pesoDecimal);
    const requerida = (notaDeseada - notaParcial) / pesoDecimal;
    setResultado(parseFloat(requerida.toFixed(2)));
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="dark">
          <IonTitle>Calculadora Predictiva</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        
        <IonCard>
          <IonCardHeader>
            <IonCardTitle>¿Cuánto necesito sacar?</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonItem>
              <IonLabel position="floating">Nota Final Deseada (Ej. 70 para pasar)</IonLabel>
              <IonInput type="number" value={notaDeseada} onIonChange={e => setNotaDeseada(parseFloat(e.detail.value!))} />
            </IonItem>
            <IonItem>
              <IonLabel position="floating">Nota Acumulada Actual (Promedio)</IonLabel>
              <IonInput type="number" value={notaActual} onIonChange={e => setNotaActual(parseFloat(e.detail.value!))} />
            </IonItem>
            <IonItem>
              <IonLabel position="floating">Peso del Examen Final (%)</IonLabel>
              <IonInput type="number" value={pesoExamen} onIonChange={e => setPesoExamen(parseFloat(e.detail.value!))} />
            </IonItem>
            
            <IonButton expand="block" className="ion-margin-top" onClick={calcularNotaNecesaria}>
              Calcular Proyección
            </IonButton>
          </IonCardContent>
        </IonCard>

        {resultado !== null && (
          <IonCard color={resultado > 100 ? "danger" : "success"}>
            <IonCardContent className="ion-text-center">
              <IonText>
                <h2>Necesitas sacar un:</h2>
                <h1 style={{ fontSize: '3rem', fontWeight: 'bold' }}>{resultado}</h1>
                <p>{resultado > 100 ? "Misión Imposible. Ya no pasas." : "¡Aún es matemáticamente posible!"}</p>
              </IonText>
            </IonCardContent>
          </IonCard>
        )}

      </IonContent>
    </IonPage>
  );
};

export default Tab2;