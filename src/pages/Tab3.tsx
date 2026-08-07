import React from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard,
  IonItem, IonLabel, IonInput, IonButton, IonIcon, IonText,
  IonGrid, IonRow, IonCol
} from '@ionic/react';
import { addCircleOutline, trashOutline, colorPaletteOutline, sunnyOutline, moonOutline, phonePortraitOutline } from 'ionicons/icons';
import { useEscalas } from '../context/EscalasContext';
import { useTema, ModoTema } from '../context/TemaContext';

const Tab3: React.FC = () => {
  const { escalas, agregarRango, actualizarRango, eliminarRango } = useEscalas();
  const { modo, setModo } = useTema();

  const opcionesTema: { valor: ModoTema; etiqueta: string; icono: string }[] = [
    { valor: 'claro', etiqueta: 'Claro', icono: sunnyOutline },
    { valor: 'oscuro', etiqueta: 'Oscuro', icono: moonOutline },
    { valor: 'sistema', etiqueta: 'Sistema', icono: phonePortraitOutline }
  ];

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ fontWeight: '800' }}>Escalas de Calificación</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">

        <p style={{ margin: '0 0 8px 5px', fontSize: '0.8rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>Apariencia</p>
        <IonCard style={{ borderRadius: '14px', marginBottom: '22px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
          <IonGrid style={{ padding: '10px' }}>
            <IonRow>
              {opcionesTema.map(op => (
                <IonCol key={op.valor} size="4">
                  <div
                    onClick={() => setModo(op.valor)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      padding: '12px 4px', borderRadius: '10px', cursor: 'pointer',
                      border: modo === op.valor ? 'none' : '1px solid var(--ion-color-step-200)',
                      background: modo === op.valor ? 'var(--ion-color-primary)' : 'var(--ion-color-step-50)'
                    }}
                  >
                    <IonIcon icon={op.icono} style={{ fontSize: '1.3rem', color: modo === op.valor ? 'var(--ion-color-primary-contrast)' : 'var(--ion-text-color)' }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', color: modo === op.valor ? 'var(--ion-color-primary-contrast)' : 'var(--ion-text-color)' }}>{op.etiqueta}</span>
                  </div>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        </IonCard>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 5px' }}>
          <IonIcon icon={colorPaletteOutline} color="medium" style={{ fontSize: '1.1rem' }} />
          <IonText color="medium">
            <p style={{ fontSize: '0.85rem', margin: 0 }}>Personaliza los rangos y etiquetas de tu escala de notas</p>
          </IonText>
        </div>

        {escalas.map((rango) => (
          <IonCard key={rango.id} style={{ borderRadius: '14px', marginBottom: '10px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <IonItem lines="none" color="transparent">
              <IonInput
                value={rango.etiqueta}
                onIonChange={e => actualizarRango(rango.id, 'etiqueta', e.detail.value ?? '')}
                style={{ fontWeight: '700', fontSize: '0.95rem' }}
                placeholder="Etiqueta"
              />
              <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IonInput
                  type="number"
                  value={rango.minimo}
                  onIonChange={e => actualizarRango(rango.id, 'minimo', parseFloat(e.detail.value!) || 0)}
                  style={{ width: '48px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '8px', fontWeight: '700' }}
                />
                <span style={{ color: 'var(--ion-color-medium)', fontSize: '0.9rem' }}>-</span>
                <IonInput
                  type="number"
                  value={rango.maximo}
                  onIonChange={e => actualizarRango(rango.id, 'maximo', parseFloat(e.detail.value!) || 0)}
                  style={{ width: '48px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '8px', fontWeight: '700' }}
                />
                <IonIcon icon={trashOutline} color="danger" style={{ fontSize: '1.15rem', marginLeft: '6px', cursor: 'pointer', opacity: 0.8 }} onClick={() => eliminarRango(rango.id)} />
              </div>
            </IonItem>
          </IonCard>
        ))}

        <IonButton expand="block" fill="outline" onClick={agregarRango} style={{ marginTop: '15px', fontWeight: '700', borderRadius: '10px', borderStyle: 'dashed' }}>
          <IonIcon icon={addCircleOutline} slot="start" /> AGREGAR RANGO
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;