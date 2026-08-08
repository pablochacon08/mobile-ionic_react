import React, { useState, useEffect } from 'react';
import { IonModal, IonContent, IonButton, IonIcon } from '@ionic/react';
import { pieChart, calculator, settings, arrowForwardOutline, checkmarkOutline } from 'ionicons/icons';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'onboarding_visto';

const pasos = [
  {
    icono: pieChart,
    color: 'primary',
    titulo: 'Dashboard',
    texto: 'Aquí verás todas tus materias, tu promedio general y cuáles necesitan más atención primero.'
  },
  {
    icono: calculator,
    color: 'secondary',
    titulo: 'Predictor',
    texto: 'Elige una materia y simula distintas notas para ver si alcanzarías tu meta, sin guardar nada hasta que estés seguro.'
  },
  {
    icono: settings,
    color: 'tertiary',
    titulo: 'Escalas',
    texto: 'Personaliza tus escalas de calificación y el tema de la app (claro, oscuro o automático) a tu gusto.'
  }
];

const Onboarding: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    const revisar = async () => {
      try {
        const { value } = await Preferences.get({ key: STORAGE_KEY });
        if (!value) setVisible(true);
      } catch (error) {
        console.error('Error revisando onboarding:', error);
      }
    };
    revisar();
  }, []);

  const cerrar = () => {
    setVisible(false);
    Preferences.set({ key: STORAGE_KEY, value: 'true' }).catch(err => console.error('Error guardando onboarding:', err));
  };

  const actual = pasos[paso];
  const esUltimo = paso === pasos.length - 1;

  return (
    <IonModal isOpen={visible} backdropDismiss={false}>
      <IonContent className="ion-padding" style={{ '--background': 'var(--ion-background-color)' } as any}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '20px' }}>

          <div style={{
            width: '90px', height: '90px', borderRadius: '24px', background: `var(--ion-color-${actual.color})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '28px'
          }}>
            <IonIcon icon={actual.icono} style={{ fontSize: '2.6rem', color: `var(--ion-color-${actual.color}-contrast)` }} />
          </div>

          <h1 style={{ fontWeight: '800', fontSize: '1.4rem', margin: '0 0 12px 0', color: 'var(--ion-text-color)' }}>{actual.titulo}</h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--ion-color-medium)', maxWidth: '280px', lineHeight: '1.5', margin: '0 0 32px 0' }}>{actual.texto}</p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            {pasos.map((_, i) => (
              <div key={i} style={{
                width: i === paso ? '22px' : '8px', height: '8px', borderRadius: '4px',
                background: i === paso ? `var(--ion-color-${actual.color})` : 'var(--ion-color-step-150)',
                transition: 'all 0.25s ease'
              }} />
            ))}
          </div>

          <IonButton
            expand="block"
            style={{ width: '100%', maxWidth: '280px', fontWeight: '700', borderRadius: '10px' }}
            onClick={() => esUltimo ? cerrar() : setPaso(p => p + 1)}
          >
            {esUltimo ? 'Comenzar' : 'Siguiente'}
            <IonIcon icon={esUltimo ? checkmarkOutline : arrowForwardOutline} slot="end" />
          </IonButton>

          {!esUltimo && (
            <IonButton fill="clear" size="small" color="medium" style={{ marginTop: '8px' }} onClick={cerrar}>
              Saltar
            </IonButton>
          )}
        </div>
      </IonContent>
    </IonModal>
  );
};

export default Onboarding;