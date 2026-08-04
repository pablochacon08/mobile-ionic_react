import React from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard, IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, IonList, IonItem, IonLabel, IonProgressBar } from '@ionic/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Tab1.css';

// Datos simulados del semestre
const data = [
  { materia: 'Sist. Digitales', nota: 85 },
  { materia: 'Estadística', nota: 68 },
  { materia: 'Diseño de Soft.', nota: 92 },
  { materia: 'Programación', nota: 78 }
];

const Tab1: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="dark">
          <IonTitle>Rendimiento Académico</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        
        <IonCard color="tertiary">
          <IonCardHeader>
            <IonCardSubtitle>Promedio General (GPA)</IonCardSubtitle>
            <IonCardTitle>80.75 / 100</IonCardTitle>
          </IonCardHeader>
        </IonCard>

        <IonCard>
          <IonCardHeader>
            <IonCardTitle>Proyección por Materia</IonCardTitle>
          </IonCardHeader>
          <IonCardContent style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="materia" fontSize={10} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="nota" fill="#8884d8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </IonCardContent>
        </IonCard>

        <IonList>
          <IonItem lines="none">
            <IonLabel>
              <h2>Estadística</h2>
              <p>Riesgo detectado - Faltan 2 puntos para asegurar el pase</p>
            </IonLabel>
          </IonItem>
          <IonItem lines="none">
            <IonProgressBar value={0.68} color="warning"></IonProgressBar>
          </IonItem>
        </IonList>

      </IonContent>
    </IonPage>
  );
};

export default Tab1;