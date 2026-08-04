import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList, IonItem, IonLabel, IonNote } from '@ionic/react';
import './Tab3.css';

const Tab3: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="dark">
          <IonTitle>Escalas de Calificación</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonList>
          <IonItem>
            <IonLabel>Excelente (A)</IonLabel>
            <IonNote slot="end">90 - 100</IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>Bueno (B)</IonLabel>
            <IonNote slot="end">80 - 89</IonNote>
          </IonItem>
          <IonItem>
            <IonLabel>Regular (C)</IonLabel>
            <IonNote slot="end">70 - 79</IonNote>
          </IonItem>
          <IonItem color="danger">
            <IonLabel>Reprobado (F)</IonLabel>
            <IonNote slot="end">Menos de 70</IonNote>
          </IonItem>
        </IonList>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;