import React from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonList,
  IonItem, IonLabel, IonInput, IonButton, IonIcon, IonText
} from '@ionic/react';
import { addCircleOutline, trashOutline } from 'ionicons/icons';
import { useEscalas } from '../context/EscalasContext';

const Tab3: React.FC = () => {
  const { escalas, agregarRango, actualizarRango, eliminarRango } = useEscalas();

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ fontWeight: '800' }}>Escalas de Calificación</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
        <IonText color="medium">
          <p style={{ fontSize: '0.85rem' }}>Personaliza los rangos y etiquetas de tu escala de notas.</p>
        </IonText>

        <IonList style={{ background: 'transparent' }}>
          {escalas.map((rango) => (
            <IonItem key={rango.id} style={{ '--border-radius': '10px', marginBottom: '10px' } as any}>
              <IonInput
                value={rango.etiqueta}
                onIonChange={e => actualizarRango(rango.id, 'etiqueta', e.detail.value ?? '')}
                style={{ fontWeight: '700' }}
                placeholder="Etiqueta"
              />
              <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <IonInput
                  type="number"
                  value={rango.minimo}
                  onIonChange={e => actualizarRango(rango.id, 'minimo', parseFloat(e.detail.value!) || 0)}
                  style={{ width: '50px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px' }}
                />
                <span style={{ color: 'var(--ion-color-medium)' }}>-</span>
                <IonInput
                  type="number"
                  value={rango.maximo}
                  onIonChange={e => actualizarRango(rango.id, 'maximo', parseFloat(e.detail.value!) || 0)}
                  style={{ width: '50px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px' }}
                />
                <IonIcon icon={trashOutline} color="danger" style={{ fontSize: '1.2rem', marginLeft: '8px', cursor: 'pointer' }} onClick={() => eliminarRango(rango.id)} />
              </div>
            </IonItem>
          ))}
        </IonList>

        <IonButton expand="block" fill="outline" onClick={agregarRango} style={{ marginTop: '15px', fontWeight: '700', borderStyle: 'dashed' }}>
          <IonIcon icon={addCircleOutline} slot="start" /> AGREGAR RANGO
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;