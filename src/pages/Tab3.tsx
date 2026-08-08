import React, { useMemo } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard,
  IonItem, IonText, IonGrid, IonRow, IonCol, IonSpinner, IonIcon, IonInput, IonButton
} from '@ionic/react';
import { addCircleOutline, trashOutline, colorPaletteOutline, sunnyOutline, moonOutline, phonePortraitOutline, warningOutline } from 'ionicons/icons';
import { useEscalas, RangoEscala } from '../context/EscalasContext';
import { useTema, ModoTema } from '../context/TemaContext';
import CampoNota from '../components/CampoNota';

const detectarSuperposiciones = (escalas: RangoEscala[]): string[] => {
  const conflictos: string[] = [];
  for (let i = 0; i < escalas.length; i++) {
    for (let j = i + 1; j < escalas.length; j++) {
      const a = escalas[i], b = escalas[j];
      if (a.minimo <= b.maximo && b.minimo <= a.maximo) {
        conflictos.push(`"${a.etiqueta || 'Sin nombre'}" y "${b.etiqueta || 'Sin nombre'}" se traslapan (${Math.max(a.minimo, b.minimo)}-${Math.min(a.maximo, b.maximo)})`);
      }
    }
  }
  return conflictos;
};

const Tab3: React.FC = () => {
  const { escalas, cargando, agregarRango, actualizarRango, eliminarRango } = useEscalas();
  const { modo, setModo } = useTema();

  const conflictos = useMemo(() => detectarSuperposiciones(escalas), [escalas]);

  const opcionesTema: { valor: ModoTema; etiqueta: string; icono: string }[] = [
    { valor: 'claro', etiqueta: 'Claro', icono: sunnyOutline },
    { valor: 'oscuro', etiqueta: 'Oscuro', icono: moonOutline },
    { valor: 'sistema', etiqueta: 'Sistema', icono: phonePortraitOutline }
  ];

  if (cargando) {
    return (
      <IonPage>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle style={{ fontWeight: '800' }}>Escalas de Calificación</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent fullscreen className="ion-padding">
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
            <IonSpinner name="crescent" style={{ width: '36px', height: '36px', color: 'var(--ion-color-primary)' }} />
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem', marginTop: '12px' }}>Cargando tus escalas...</p>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ fontWeight: '800' }}>Escalas de Calificación</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">

        <p style={{ margin: '0 0 8px 5px', fontSize: '0.8rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>Apariencia</p>
        
        {/* Tarjeta de Apariencia con fondo forzado y sombra suave */}
        <IonCard style={{ background: 'var(--ion-card-background, #ffffff)', borderRadius: '14px', marginBottom: '22px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <IonGrid style={{ padding: '10px' }}>
            <IonRow>
              {opcionesTema.map(op => (
                <IonCol key={op.valor} size="4">
                  <div
                    onClick={() => setModo(op.valor)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      padding: '12px 4px', borderRadius: '10px', cursor: 'pointer',
                      border: modo === op.valor ? 'none' : '1px solid var(--ion-color-step-150)',
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
            <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: '600' }}>Personaliza los rangos y etiquetas de tu escala de notas</p>
          </IonText>
        </div>

        {conflictos.length > 0 && (
          <div style={{ background: 'rgba(var(--ion-color-danger-rgb), 0.1)', borderRadius: '12px', padding: '12px 15px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <IonIcon icon={warningOutline} style={{ color: 'var(--ion-color-danger)', fontSize: '1.1rem' }} />
              <span style={{ color: 'var(--ion-color-danger)', fontWeight: '700', fontSize: '0.85rem' }}>Rangos traslapados</span>
            </div>
            {conflictos.map((c, i) => (
              <p key={i} style={{ color: 'var(--ion-color-danger)', fontSize: '0.78rem', margin: '2px 0', fontWeight: '600' }}>{c}</p>
            ))}
          </div>
        )}

        {/* Lista de Escalas con profundidad visual */}
        {escalas.map((rango) => {
          const tieneConflicto = conflictos.some(c => c.includes(`"${rango.etiqueta || 'Sin nombre'}"`));
          return (
            <IonCard key={rango.id} style={{ 
              background: 'var(--ion-card-background, #ffffff)', 
              borderRadius: '14px', 
              marginBottom: '10px', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)', 
              border: tieneConflicto ? '1.5px solid var(--ion-color-danger)' : 'none' 
            }}>
              <IonItem lines="none" color="transparent">
                <IonInput
                  value={rango.etiqueta}
                  onIonChange={e => actualizarRango(rango.id, 'etiqueta', e.detail.value ?? '')}
                  style={{ fontWeight: '800', fontSize: '0.95rem' }}
                  placeholder="Etiqueta"
                />
                <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CampoNota
                    value={rango.minimo}
                    onChange={v => actualizarRango(rango.id, 'minimo', v)}
                    min={0}
                    max={100}
                    style={{ width: '48px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '8px', fontWeight: '700' }}
                  />
                  <span style={{ color: 'var(--ion-color-medium)', fontSize: '0.9rem', fontWeight: '800' }}>-</span>
                  <CampoNota
                    value={rango.maximo}
                    onChange={v => actualizarRango(rango.id, 'maximo', v)}
                    min={0}
                    max={100}
                    ultimoCampo
                    style={{ width: '48px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '8px', fontWeight: '700' }}
                  />
                  <IonIcon icon={trashOutline} color="danger" style={{ fontSize: '1.15rem', marginLeft: '6px', cursor: 'pointer', opacity: 0.8 }} onClick={() => eliminarRango(rango.id)} />
                </div>
              </IonItem>
            </IonCard>
          );
        })}

        <IonButton expand="block" fill="outline" onClick={agregarRango} style={{ marginTop: '15px', fontWeight: '700', borderRadius: '10px', borderStyle: 'dashed' }}>
          <IonIcon icon={addCircleOutline} slot="start" /> AGREGAR RANGO
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default Tab3;