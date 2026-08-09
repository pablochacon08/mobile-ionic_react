import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard,
  IonItem, IonLabel, IonList, IonFab, IonFabButton, IonIcon, IonButtons,
  IonModal, IonButton, IonInput, IonAccordionGroup, IonAccordion, IonListHeader,
  IonSkeletonText, IonToast, useIonAlert, useIonRouter, IonItemSliding, IonItemOptions, IonItemOption,
  IonActionSheet, IonRefresher, IonRefresherContent, IonToggle
} from '@ionic/react';
import { 
  add, close, addCircleOutline, trashOutline, 
  schoolOutline, trendingUpOutline, alertCircleOutline, shareOutline, createOutline, 
  eyeOutline, informationCircleOutline, statsChartOutline, flameOutline, notifications, 
  notificationsOutline, downloadOutline, helpCircleOutline, construct, constructOutline, 
  checkmarkCircleOutline, warningOutline, syncOutline, settingsOutline
} from 'ionicons/icons';
import confetti from 'canvas-confetti';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useMaterias, Materia, Categoria, SubActividad, EtapaEvaluacion, CategoriaPlantilla, HistorialPunto } from '../context/MateriasContext';
import { useEscalas } from '../context/EscalasContext';
import { obtenerEtiquetaEscala, obtenerProgresoEtapas } from '../utils/calculos';
import { iconosDisponibles, obtenerIcono } from '../utils/iconos';
import CampoNota from '../components/CampoNota';
import './Tab1.css';

const clamp = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

// Helper: Redondear siempre hacia arriba con 1 decimal
const roundUpOneDecimal = (num: number) => {
  return Math.ceil(num * 10) / 10;
};

// Helper: Redondeo estricto hacia arriba (entero, sin decimales) para la vista de predicción "Necesitas"
const necesitasEntero = (num: number) => {
  if (!isFinite(num)) return 0;
  return Math.max(0, Math.ceil(num));
};

const COACHMARK_KEY = 'coachmark_dashboard_v1';
const NOTIFICACIONES_KEY = 'notificaciones_activas';
const MODO_AVANZADO_KEY = 'modo_avanzado';
const NOTIF_ID = 991;

interface Plantilla {
  id: string;
  nombre: string;
  descripcion: string;
  categorias: CategoriaPlantilla[];
}

type ExtendedMateria = Materia & {
  usaMejoramiento?: boolean;
  notaMejoramiento?: number;
};

const PLANTILLAS_EVALUACION: Plantilla[] = [
  { id: 'dos-examenes', nombre: '2 Exámenes', descripcion: '50% y 50%', categorias: [{ nombre: 'Examen 1', peso: 50 }, { nombre: 'Examen 2', peso: 50 }] },
  { id: 'tareas-examen', nombre: 'Tareas + Examen', descripcion: '30% Tareas, 70% Examen', categorias: [{ nombre: 'Tareas', peso: 30 }, { nombre: 'Examen', peso: 70 }] },
  { id: 'personalizado', nombre: 'Personalizado', descripcion: 'Empezar desde cero', categorias: [] },
];

const FONDO_POR_RIESGO: Record<string, string> = {
  success: 'linear-gradient(135deg, var(--ion-card-background) 55%, rgba(var(--ion-color-success-rgb), 0.10))',
  warning: 'linear-gradient(135deg, var(--ion-card-background) 55%, rgba(var(--ion-color-warning-rgb), 0.12))',
  danger: 'linear-gradient(135deg, var(--ion-card-background) 55%, rgba(var(--ion-color-danger-rgb), 0.13))',
  medium: 'var(--ion-card-background)',
};

const FONDO_PROMEDIO_POR_RIESGO: Record<string, string> = {
  success: 'linear-gradient(135deg, rgba(var(--ion-color-success-rgb), 0.16), rgba(var(--ion-color-success-rgb), 0.02) 70%)',
  warning: 'linear-gradient(135deg, rgba(var(--ion-color-warning-rgb), 0.18), rgba(var(--ion-color-warning-rgb), 0.02) 70%)',
  danger: 'linear-gradient(135deg, rgba(var(--ion-color-danger-rgb), 0.18), rgba(var(--ion-color-danger-rgb), 0.02) 70%)',
  medium: 'var(--ion-card-background)',
};

const vibrar = async (tipo: 'ligero' | 'medio' | 'exito') => {
  try {
    if (tipo === 'ligero') await Haptics.impact({ style: ImpactStyle.Light });
    else if (tipo === 'medio') await Haptics.impact({ style: ImpactStyle.Medium });
    else if (tipo === 'exito') await Haptics.notification({ type: NotificationType.Success });
  } catch (error) {}
};

const colorPorRiesgo = (diferencia: number): string => {
  if (diferencia <= 0) return 'success';
  if (diferencia <= 10) return 'warning';
  return 'danger';
};

const generarMensajeAtencionLocal = (materia: ExtendedMateria, stats: any) => {
    if (!materia || !stats) return null;
    
    const diferencia = materia.notaDeseada - stats.acumuladoGlobal;
    
    // 1. Si ya pasó
    if (diferencia <= 0) {
        return { tipo: 'exito', texto: `¡Excelente en ${materia.nombre}! Ya aseguraste tu meta.` };
    }
    
    // 2. Si ya es imposible incluso con el mejoramiento
    if (stats.perdidaInclusoConMejoramiento) {
        return { tipo: 'peligro', texto: `La meta en ${materia.nombre} ya es matemáticamente inalcanzable.` };
    }
    
    // 3. Si solo le salva el mejoramiento
    if (stats.requiereMejoramientoParaPasar) {
        return { tipo: 'peligro', texto: `Atención en ${materia.nombre}: Tu única opción para alcanzar la meta es el examen de Mejoramiento.` };
    }

    // 4. Identificar qué partes le faltan de forma humana
    let partesFaltantes = "lo que falta";
    const faltantes = [];
    if (stats.faltanteGlobalP1 > 0) faltantes.push('el 1er Parcial');
    if (stats.faltanteGlobalP2 > 0) faltantes.push('el 2do Parcial');
    if (stats.faltanteGlobalPr > 0) faltantes.push('el Práctico');

    if (faltantes.length === 1) {
        partesFaltantes = faltantes[0];
    } else if (faltantes.length === 2) {
        partesFaltantes = `${faltantes[0]} y ${faltantes[1]}`;
    } else if (faltantes.length === 3) {
        partesFaltantes = "las evaluaciones restantes";
    }

    // 5. Redondear la nota que necesita (para que no salgan decimales raros)
    const notaReq = Math.max(0, Math.ceil(stats.notaNecesaria));

    // 6. Mensajes según el nivel de riesgo
    if (notaReq > 100) {
         return { tipo: 'peligro', texto: `En ${materia.nombre} necesitas una nota irreal (>100) en ${partesFaltantes}. ¡Apunta al Mejoramiento!` };
    }
    if (notaReq > 85) {
        return { tipo: 'peligro', texto: `Alerta en ${materia.nombre}: necesitas promediar mínimo ${notaReq}/100 en ${partesFaltantes}.` };
    }
    if (notaReq > 70) {
        return { tipo: 'precaucion', texto: `${materia.nombre} requiere atención: apunta a más de ${notaReq}/100 en ${partesFaltantes}.` };
    }
    
    return null;
};

const CircularProgress = ({ value, color }: { value: number, color: string }) => {
  const size = 50;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size, minWidth: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle stroke="var(--ion-color-step-150)" fill="transparent" strokeWidth={strokeWidth} r={radius} cx={size / 2} cy={size / 2} />
        <circle
          stroke={`var(--ion-color-${color})`} fill="transparent" strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          r={radius} cx={size / 2} cy={size / 2}
        />
      </svg>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800', color: 'var(--ion-text-color)' }}>
        {clampedValue.toFixed(0)}
      </div>
    </div>
  );
};

const AvatarMateria = ({ claveIcono, color }: { claveIcono: string, color: string }) => (
  <div style={{
    width: '42px', height: '42px', minWidth: '42px', borderRadius: '12px',
    background: `var(--ion-color-${color})`, display: 'flex', alignItems: 'center',
    justifyContent: 'center', marginRight: '14px', transition: 'background 0.3s ease'
  }}>
    <IonIcon icon={obtenerIcono(claveIcono)} style={{ fontSize: '1.3rem', color: `var(--ion-color-${color}-contrast)` }} />
  </div>
);

const ProgresoEtapas = ({ etapa, visible = true }: { etapa: EtapaEvaluacion, visible?: boolean }) => {
  if (!visible) return null;
  const progreso = obtenerProgresoEtapas(etapa);
  const pasos: { label: string; estado: 'completado' | 'en-progreso' | 'pendiente' }[] = [
    { label: 'P1', estado: progreso.p1 },
    { label: 'P2', estado: progreso.p2 },
    { label: 'Práctico', estado: progreso.practico },
  ];
  const colorPorEstado = { 'completado': 'success', 'en-progreso': 'warning', 'pendiente': 'medium' };

  return (
    <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
      {pasos.map(p => (
        <span key={p.label} style={{
          fontSize: '0.62rem', fontWeight: 700, padding: '2px 6px', borderRadius: '20px',
          background: `var(--ion-color-${colorPorEstado[p.estado]})`,
          color: `var(--ion-color-${colorPorEstado[p.estado]}-contrast)`,
          opacity: p.estado === 'pendiente' ? 0.45 : 1,
          transition: 'opacity 0.3s ease, background 0.3s ease'
        }}>
          {p.label}
        </span>
      ))}
    </div>
  );
};

const Sparkline = ({ datos, color }: { datos: HistorialPunto[], color: string }) => {
  const gradientId = useRef(`sparkline-grad-${Math.random().toString(36).slice(2)}`).current;

  if (!datos || datos.length < 2) {
    return (
      <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)', margin: '4px 0 0' }}>
        Aún no hay suficiente historial para mostrar una tendencia. Vuelve luego de actualizar tus notas otro día.
      </p>
    );
  }

  const width = 280;
  const height = 90;
  const padY = 14;
  const drawableHeight = height - padY * 2;

  const valores = datos.map(d => d.valor);
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const rango = (max - min) || 1;

  const puntos = datos.map((d, i) => ({
    x: (i / (datos.length - 1)) * width,
    y: padY + drawableHeight - ((d.valor - min) / rango) * drawableHeight,
    valor: d.valor,
  }));

  // Curva suavizada tipo dashboard (segmentos bezier entre cada punto)
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(puntos);
  const areaPath = `${linePath} L ${puntos[puntos.length - 1].x},${height} L ${puntos[0].x},${height} Z`;

  const idxMax = valores.indexOf(max);
  const idxMin = valores.indexOf(min);
  const hayVariacion = idxMax !== idxMin;

  const ultimo = datos[datos.length - 1];
  const ultimoPunto = puntos[puntos.length - 1];

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: '12px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--ion-color-${color})`} stopOpacity="0.35" />
              <stop offset="100%" stopColor={`var(--ion-color-${color})`} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
          <path d={linePath} fill="none" stroke={`var(--ion-color-${color})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {hayVariacion && (
            <circle cx={puntos[idxMax].x} cy={puntos[idxMax].y} r="3.5" fill="var(--ion-color-success)" stroke="var(--ion-card-background)" strokeWidth="1.5" />
          )}
          {hayVariacion && (
            <circle cx={puntos[idxMin].x} cy={puntos[idxMin].y} r="3.5" fill="var(--ion-color-danger)" stroke="var(--ion-card-background)" strokeWidth="1.5" />
          )}
          <circle cx={ultimoPunto.x} cy={ultimoPunto.y} r="4.5" fill={`var(--ion-color-${color})`} stroke="var(--ion-card-background)" strokeWidth="2" />
        </svg>
        <p style={{ margin: '6px 0 0', fontSize: '0.7rem', color: 'var(--ion-color-medium)' }}>
          Último registro: {new Date(ultimo.fecha).toLocaleDateString()} • {ultimo.valor.toFixed(1)}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px', minWidth: '76px', borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>Mejor nota</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--ion-color-success)' }}>{max.toFixed(1)}</p>
        </div>
        <div>
          <p style={{ margin: 0, fontSize: '0.6rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.4px' }}>Más baja</p>
          <p style={{ margin: '2px 0 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--ion-color-danger)' }}>{min.toFixed(1)}</p>
        </div>
      </div>
    </div>
  );
};

const TarjetaEsqueleto = () => (
  <div style={{
    display: 'flex', alignItems: 'center', padding: '14px', borderRadius: '14px',
    background: 'var(--ion-card-background)', marginBottom: '14px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
  }}>
    <IonSkeletonText animated style={{ width: '42px', height: '42px', borderRadius: '12px', marginRight: '14px', flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <IonSkeletonText animated style={{ width: '55%', height: '14px', marginBottom: '8px' }} />
      <IonSkeletonText animated style={{ width: '35%', height: '10px' }} />
    </div>
    <IonSkeletonText animated style={{ width: '50px', height: '50px', borderRadius: '50%', flexShrink: 0 }} />
  </div>
);

const EstadoVacio = ({ onCrear }: { onCrear: () => void }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }}>
    <div style={{
      width: '80px', height: '80px', borderRadius: '20px', background: 'var(--ion-color-primary)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', opacity: 0.9
    }}>
      <IonIcon icon={schoolOutline} style={{ fontSize: '2.4rem', color: 'var(--ion-color-primary-contrast)' }} />
    </div>
    <h2 style={{ fontWeight: '800', fontSize: '1.1rem', margin: '0 0 6px 0', color: 'var(--ion-text-color)' }}>Aún no tienes materias</h2>
    <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.9rem', margin: '0 0 20px 0', maxWidth: '260px' }}>
      Crea tu primera materia para empezar a calcular tus notas y saber qué necesitas para aprobar.
    </p>
    <IonButton onClick={onCrear} style={{ fontWeight: '700', borderRadius: '10px' }}>
      <IonIcon icon={add} slot="start" /> Crear materia
    </IonButton>
  </div>
);

const Tab1: React.FC = () => {
  const { materias, cargando, rachaDias, agregarMateria, actualizarMateria, eliminarMateria, restaurarMateria, recargarMaterias } = useMaterias();
  const { escalas } = useEscalas();
  const [presentAlert] = useIonAlert();
  const router = useIonRouter();

  const mostrarAyuda = (titulo: string, mensaje: string) => {
    presentAlert({ header: titulo, message: mensaje, buttons: ['Entendido'] });
  };

  const [isAddMateriaOpen, setIsAddMateriaOpen] = useState(false);
  const [nuevaMateriaNombre, setNuevaMateriaNombre] = useState('');
  const [nuevoIcono, setNuevoIcono] = useState(iconosDisponibles[0].clave);
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState<string>('dos-examenes');
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<ExtendedMateria | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNecesitasOpen, setIsNecesitasOpen] = useState(false);
  const [mostrarToast, setMostrarToast] = useState(false);
  const [mensajeToast, setMensajeToast] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editNombre, setEditNombre] = useState('');
  const [editIcono, setEditIcono] = useState('');
  const [accionesPara, setAccionesPara] = useState<Materia | null>(null);
  const [mostrarAccionesFab, setMostrarAccionesFab] = useState(false);
  const [mostrarSelectorNota, setMostrarSelectorNota] = useState(false);
  const [ultimaEliminada, setUltimaEliminada] = useState<Materia | null>(null);
  const [mostrarToastUndo, setMostrarToastUndo] = useState(false);
  const [mostrarCoachmark, setMostrarCoachmark] = useState(false);
  const [swipeRatios, setSwipeRatios] = useState<Record<string, number>>({});
  const [notificacionesActivas, setNotificacionesActivas] = useState(false);
  const [modoAvanzado, setModoAvanzado] = useState(false);
  
  // Estado para controlar qué acordeón está abierto sin que se disparen todos al recargar
  const [accordionValue, setAccordionValue] = useState<string | string[]>('p1');

  const celebratedRef = useRef<Record<string, boolean>>({});
  const slidingRefs = useRef<Record<string, any>>({});
  const inputRefs = useRef<Record<string, any>>({});
  const longPressTimer = useRef<any>(null);
  const longPressActivado = useRef(false);

  useEffect(() => {
    if (cargando || materias.length === 0) return;
    Preferences.get({ key: COACHMARK_KEY }).then(({ value }) => {
      if (!value) setMostrarCoachmark(true);
    });
  }, [cargando, materias.length]);

  useEffect(() => {
    Preferences.get({ key: NOTIFICACIONES_KEY }).then(({ value }) => setNotificacionesActivas(value === '1'));
  }, []);

  useEffect(() => {
    Preferences.get({ key: MODO_AVANZADO_KEY }).then(({ value }) => setModoAvanzado(value === '1'));
  }, []);

  const alternarModoAvanzado = async () => {
    const nuevoValor = !modoAvanzado;
    setModoAvanzado(nuevoValor);
    await Preferences.set({ key: MODO_AVANZADO_KEY, value: nuevoValor ? '1' : '0' });
    vibrar('ligero');
    setMensajeToast(nuevoValor ? 'Modo avanzado activado: ahora ves más opciones de configuración' : 'Modo simple activado: interfaz más limpia');
    setMostrarToast(true);
  };

  const cerrarCoachmark = () => {
    setMostrarCoachmark(false);
    Preferences.set({ key: COACHMARK_KEY, value: '1' });
  };

  const handleRefresh = async (event: CustomEvent) => {
    await recargarMaterias();
    vibrar('ligero');
    (event.target as HTMLIonRefresherElement).complete();
  };

  const alternarNotificaciones = async () => {
    if (notificacionesActivas) {
      try {
        await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] });
      } catch (error) {}
      await Preferences.set({ key: NOTIFICACIONES_KEY, value: '0' });
      setNotificacionesActivas(false);
      setMensajeToast('Recordatorios desactivados');
      setMostrarToast(true);
      return;
    }

    try {
      const permiso = await LocalNotifications.requestPermissions();
      if (permiso.display !== 'granted') {
        setMensajeToast('Necesitas dar permiso de notificaciones');
        setMostrarToast(true);
        return;
      }
      await LocalNotifications.schedule({
        notifications: [{
          id: NOTIF_ID,
          title: 'Registra tus notas 📚',
          body: 'Actualiza tus calificaciones de la semana para saber si vas bien.',
          schedule: { on: { weekday: 1, hour: 18, minute: 0 }, allowWhileIdle: true },
        }]
      });
      await Preferences.set({ key: NOTIFICACIONES_KEY, value: '1' });
      setNotificacionesActivas(true);
      vibrar('ligero');
      setMensajeToast('Te recordaremos cada lunes a las 6pm');
      setMostrarToast(true);
    } catch (error) {
      setMensajeToast('No se pudo activar el recordatorio en este dispositivo');
      setMostrarToast(true);
    }
  };

  const cerrarTodosSliding = () => {
    Object.values(slidingRefs.current).forEach((ref: any) => {
      try { ref?.close(); } catch (e) {}
    });
  };

  const iniciarPresionLarga = (materia: Materia) => {
    longPressActivado.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressActivado.current = true;
      vibrar('medio');
      cerrarTodosSliding();
      setAccionesPara(materia);
    }, 500);
  };

  const cancelarPresionLarga = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const manejarClickMateria = (materia: Materia) => {
    if (longPressActivado.current) {
      longPressActivado.current = false;
      return;
    }
    abrirDetalleMateria(materia);
  };

  const manejarDragSwipe = (id: string, event: CustomEvent) => {
    const ratio = event.detail?.ratio ?? 0;
    setSwipeRatios(prev => ({ ...prev, [id]: Math.min(Math.abs(ratio), 1) }));
  };

  const calcularNotaLocal = (cat: Categoria): number => {
    if (cat.subActividades.length === 0) return cat.notaGlobalRapida;
    let sumaObtenida = 0;
    let sumaMaxima = 0;
    cat.subActividades.forEach(sub => {
      sumaObtenida += sub.notaObtenida;
      sumaMaxima += sub.notaMaxima;
    });
    if (sumaMaxima === 0) return 0;
    return (sumaObtenida / sumaMaxima) * 100;
  };

  const calcularEstadisticas = (mat: ExtendedMateria) => {
    const notaP1 = (mat.categoriasP1 || []).reduce((acc, cat) => acc + (calcularNotaLocal(cat) * (cat.peso / 100)), 0);
    const notaP2 = (mat.categoriasP2 || []).reduce((acc, cat) => acc + (calcularNotaLocal(cat) * (cat.peso / 100)), 0);
    const notaPr = (mat.categoriasPractico || []).reduce((acc, cat) => acc + (calcularNotaLocal(cat) * (cat.peso / 100)), 0);

    const pesoGlobalP1 = mat.pesoTeorico / 2;
    const pesoGlobalP2 = mat.pesoTeorico / 2;
    const pesoGlobalPr = mat.pesoPractico;

    let notaP1Efectiva = notaP1;
    let notaP2Efectiva = notaP2;

    if (mat.usaMejoramiento && (mat.notaMejoramiento ?? 0) > 0) {
      const mejor = mat.notaMejoramiento!;
      if (notaP1 < notaP2 && mejor > notaP1) {
        notaP1Efectiva = mejor;
      } else if (notaP2 <= notaP1 && mejor > notaP2) {
        notaP2Efectiva = mejor;
      }
    }

    const acumuladoGlobal = (notaP1Efectiva * (pesoGlobalP1 / 100)) + 
                            (notaP2Efectiva * (pesoGlobalP2 / 100)) + 
                            (notaPr * (pesoGlobalPr / 100));

    const pesoCargadoP1 = (mat.categoriasP1 || []).reduce((acc, cat) => acc + cat.peso, 0);
    const pesoCargadoP2 = (mat.categoriasP2 || []).reduce((acc, cat) => acc + cat.peso, 0);
    const pesoCargadoPr = (mat.categoriasPractico || []).reduce((acc, cat) => acc + cat.peso, 0);

    const pesoUsadoP1 = (clamp(pesoCargadoP1, 0, 100) / 100) * pesoGlobalP1;
    const pesoUsadoP2 = (clamp(pesoCargadoP2, 0, 100) / 100) * pesoGlobalP2;
    const pesoUsadoPr = (clamp(pesoCargadoPr, 0, 100) / 100) * pesoGlobalPr;

    const faltanteGlobalP1 = Math.max(0, 100 - pesoCargadoP1) / 100 * pesoGlobalP1;
    const faltanteGlobalP2 = Math.max(0, 100 - pesoCargadoP2) / 100 * pesoGlobalP2;
    const faltanteGlobalPr = Math.max(0, 100 - pesoCargadoPr) / 100 * pesoGlobalPr;

    const pesoGlobalRestante = 100 - pesoUsadoP1 - pesoUsadoP2 - pesoUsadoPr;
    const puntosFaltantesParaMeta = mat.notaDeseada - acumuladoGlobal;

    let notaNecesaria = 0;
    let requiereMejoramientoParaPasar = false;
    let perdidaInclusoConMejoramiento = false;
    let notaMejoramientoNecesaria = 0;

    if (puntosFaltantesParaMeta <= 0) {
      notaNecesaria = 0;
    } else if (pesoGlobalRestante > 0) {
      notaNecesaria = roundUpOneDecimal((puntosFaltantesParaMeta / pesoGlobalRestante) * 100);
    } else {
      notaNecesaria = 999;
    }

    if (notaNecesaria > 100) {
      const peorNota = Math.min(notaP1Efectiva, notaP2Efectiva);
      const gananciaMaximaMejoramiento = (100 - peorNota) * (pesoGlobalP1 / 100);
      
      if (puntosFaltantesParaMeta <= pesoGlobalRestante + gananciaMaximaMejoramiento) {
        requiereMejoramientoParaPasar = true;
        const puntosAConseguirEnMej = puntosFaltantesParaMeta - pesoGlobalRestante; 
        notaMejoramientoNecesaria = roundUpOneDecimal(peorNota + (puntosAConseguirEnMej / (pesoGlobalP1 / 100)));

        // Escenario D a prueba de fallos: si tras el redondeo estricto la nota de mejoramiento
        // requerida sigue superando 100, la meta es matemáticamente inalcanzable ("Imposible").
        if (necesitasEntero(notaMejoramientoNecesaria) > 100) {
          requiereMejoramientoParaPasar = false;
          perdidaInclusoConMejoramiento = true;
        }
      } else {
        perdidaInclusoConMejoramiento = true;
      }
    }

    return { 
      notaP1, notaP2, notaPr, 
      notaP1Efectiva, notaP2Efectiva,
      acumuladoGlobal, notaNecesaria, 
      pesoCargadoP1, pesoCargadoP2, pesoCargadoPr,
      faltanteGlobalP1, faltanteGlobalP2, faltanteGlobalPr,
      pesoGlobalRestante,
      requiereMejoramientoParaPasar,
      perdidaInclusoConMejoramiento,
      notaMejoramientoNecesaria
    };
  };

  const materiasConStats = useMemo(() => {
    return materias.map(m => ({ materia: m as ExtendedMateria, stats: calcularEstadisticas(m as ExtendedMateria) }));
  }, [materias]);

  const materiasOrdenadas = useMemo(() => {
    return [...materiasConStats].sort((a, b) => {
      const riesgoA = a.materia.notaDeseada - a.stats.acumuladoGlobal;
      const riesgoB = b.materia.notaDeseada - b.stats.acumuladoGlobal;
      return riesgoB - riesgoA;
    });
  }, [materiasConStats]);

  const promedioGeneral = useMemo(() => {
    if (materiasConStats.length === 0) return 0;
    const suma = materiasConStats.reduce((acc, m) => acc + m.stats.acumuladoGlobal, 0);
    return suma / materiasConStats.length;
  }, [materiasConStats]);

  const materiasEnRiesgo = useMemo(() => {
    return materiasConStats.filter(m => m.stats.acumuladoGlobal < m.materia.notaDeseada).length;
  }, [materiasConStats]);

  const colorPromedioGeneral = useMemo(() => {
    if (materiasConStats.length === 0) return 'medium';
    const ratioRiesgo = materiasEnRiesgo / materiasConStats.length;
    if (materiasEnRiesgo === 0) return 'success';
    if (ratioRiesgo < 0.5) return 'warning';
    return 'danger';
  }, [materiasEnRiesgo, materiasConStats.length]);

  const materiaPrioritaria = materiasOrdenadas[0];
  const mensajeAtencion = materiaPrioritaria
    ? generarMensajeAtencionLocal(materiaPrioritaria.materia, materiaPrioritaria.stats)
    : null;

  const mostrarDetalleNecesitas = () => {
    vibrar('ligero');
    setIsNecesitasOpen(true);
  };

  const handleAgregarMateria = () => {
    if (!nuevaMateriaNombre.trim()) return;
    const plantilla = PLANTILLAS_EVALUACION.find(p => p.id === plantillaSeleccionada);
    
    const materiaInicializada = {
      nombre: nuevaMateriaNombre,
      icono: nuevoIcono,
      categoriasP1: plantilla?.categorias || [{ id: Date.now().toString(), nombre: 'Control', peso: 100, notaGlobalRapida: 0, subActividades: [] }],
      categoriasP2: [{ id: Date.now().toString() + '2', nombre: 'Examen', peso: 100, notaGlobalRapida: 0, subActividades: [] }],
      categoriasPractico: [{ id: Date.now().toString() + '3', nombre: 'Proyecto', peso: 100, notaGlobalRapida: 0, subActividades: [] }]
    };

    agregarMateria(materiaInicializada.nombre, materiaInicializada.icono, materiaInicializada.categoriasP1);
    
    setNuevaMateriaNombre('');
    setNuevoIcono(iconosDisponibles[0].clave);
    setPlantillaSeleccionada('dos-examenes');
    setIsAddMateriaOpen(false);
    setMensajeToast('Materia creada correctamente');
    setMostrarToast(true);
    vibrar('ligero');
  };

  const abrirEditarMateria = (materia: Materia) => {
    setMateriaSeleccionada(materia as ExtendedMateria);
    setEditNombre(materia.nombre);
    setEditIcono(materia.icono || 'school');
    setIsEditOpen(true);
  };

  const guardarEdicionMateria = () => {
    if (!materiaSeleccionada || !editNombre.trim()) return;
    const actualizada = { ...materiaSeleccionada, nombre: editNombre.trim(), icono: editIcono };
    setMateriaSeleccionada(actualizada);
    actualizarMateria(actualizada as Materia);
    setIsEditOpen(false);
    setMensajeToast('Materia actualizada');
    setMostrarToast(true);
    vibrar('ligero');
  };

  const eliminarConUndo = (materia: Materia) => {
    eliminarMateria(materia.id);
    setUltimaEliminada(materia);
    setMostrarToastUndo(true);
    vibrar('medio');
  };

  const solicitarEliminarDesdeSwipe = (materia: Materia) => {
    slidingRefs.current[materia.id]?.close();
    eliminarConUndo(materia);
  };

  const eliminarConConfirmacion = (materia: Materia, cerrarModalDespues: boolean) => {
    eliminarConUndo(materia);
    if (cerrarModalDespues) setIsDetailOpen(false);
  };

  const abrirDetalleMateria = (materia: Materia) => {
    cerrarTodosSliding();
    const matSegura = {
      ...materia,
      categoriasP1: materia.categoriasP1 || [],
      categoriasP2: materia.categoriasP2 || [],
      categoriasPractico: materia.categoriasPractico || []
    } as ExtendedMateria;
    setMateriaSeleccionada(matSegura);
    setAccordionValue('p1'); // Se asegura de abrir la primera pestaña de forma elegante al abrir una materia
    setIsDetailOpen(true);
  };

  const iniciarRegistrarNota = () => {
    if (materias.length === 0) { setIsAddMateriaOpen(true); return; }
    if (materias.length === 1) { abrirDetalleMateria(materias[0]); return; }
    setMostrarSelectorNota(true);
  };

  const compartirMateria = async (materia: ExtendedMateria) => {
    const stats = calcularEstadisticas(materia);
    const etiqueta = obtenerEtiquetaEscala(stats.acumuladoGlobal, escalas);

    const lineas = [
      `${materia.nombre}`,
      `Nota acumulada: ${stats.acumuladoGlobal.toFixed(1)}${etiqueta ? ` (${etiqueta})` : ''}`,
      `Meta: ${materia.notaDeseada}`,
    ];
    if (stats.acumuladoGlobal < materia.notaDeseada) {
      lineas.push(`Necesito ${stats.notaNecesaria.toFixed(1)}/100 en lo que falta para alcanzar mi meta.`);
    } else {
      lineas.push('¡Meta alcanzada!');
    }
    lineas.push('', 'Calculado con Mis Calificaciones');

    try {
      await Share.share({ title: materia.nombre, text: lineas.join('\n') });
    } catch (error) {}
  };

  const compartirResumenGeneral = async () => {
    if (materias.length === 0) return;
    const lineas = ['Resumen académico', `Promedio general: ${promedioGeneral.toFixed(1)}`, ''];
    materiasOrdenadas.forEach(({ materia, stats }) => {
      const estado = stats.acumuladoGlobal >= materia.notaDeseada ? '[Cumplido]' : '[Pendiente]';
      lineas.push(`${estado} ${materia.nombre}: ${stats.acumuladoGlobal.toFixed(1)} (meta ${materia.notaDeseada})`);
    });
    lineas.push('', 'Generado con Mis Calificaciones');

    try {
      await Share.share({ title: 'Mi resumen académico', text: lineas.join('\n') });
    } catch (error) {}
  };

  const actualizarMateriaActual = (campo: string, valor: any) => {
    if (!materiaSeleccionada) return;
    const actualizada = { ...materiaSeleccionada, [campo]: valor } as ExtendedMateria;
    setMateriaSeleccionada(actualizada);
    actualizarMateria(actualizada as Materia);
  };

  const agregarCategoria = (seccionKey: 'categoriasP1' | 'categoriasP2' | 'categoriasPractico') => {
    if (!materiaSeleccionada) return;
    const lista = materiaSeleccionada[seccionKey] as Categoria[];
    actualizarMateriaActual(seccionKey, [...lista, { id: Date.now().toString(), nombre: 'Nueva actividad', peso: 0, notaGlobalRapida: 0, subActividades: [] }]);
  };

  const actualizarCategoria = (seccionKey: 'categoriasP1' | 'categoriasP2' | 'categoriasPractico', idCat: string, campo: keyof Categoria, valor: any) => {
    if (!materiaSeleccionada) return;
    const lista = materiaSeleccionada[seccionKey] as Categoria[];
    let valorFinal = valor;
    if (campo === 'peso' || campo === 'notaGlobalRapida') valorFinal = clamp(valor, 0, 100);
    actualizarMateriaActual(seccionKey, lista.map(cat => cat.id === idCat ? { ...cat, [campo]: valorFinal } : cat));
  };

  const eliminarCategoria = (seccionKey: 'categoriasP1' | 'categoriasP2' | 'categoriasPractico', idCat: string) => {
    if (!materiaSeleccionada) return;
    const lista = materiaSeleccionada[seccionKey] as Categoria[];
    actualizarMateriaActual(seccionKey, lista.filter(c => c.id !== idCat));
    vibrar('ligero');
  };

  const agregarSubActividad = (seccionKey: 'categoriasP1' | 'categoriasP2' | 'categoriasPractico', idCat: string) => {
    if (!materiaSeleccionada) return;
    const lista = materiaSeleccionada[seccionKey] as Categoria[];
    const nuevaSub = { id: Date.now().toString(), nombre: 'Tarea', notaObtenida: 0, notaMaxima: 10 };
    actualizarMateriaActual(seccionKey, lista.map(cat => cat.id === idCat ? { ...cat, subActividades: [...cat.subActividades, nuevaSub] } : cat));
  };

  const actualizarSubActividad = (seccionKey: 'categoriasP1' | 'categoriasP2' | 'categoriasPractico', idCat: string, idSub: string, campo: keyof SubActividad, valor: string | number) => {
    if (!materiaSeleccionada) return;
    const lista = materiaSeleccionada[seccionKey] as Categoria[];

    actualizarMateriaActual(seccionKey, lista.map(cat => {
      if (cat.id !== idCat) return cat;
      const nuevasSubs = cat.subActividades.map(sub => {
        if (sub.id !== idSub) return sub;
        if (campo === 'notaMaxima') {
          const nuevoMax = Math.max(0, valor as number);
          return { ...sub, notaMaxima: nuevoMax, notaObtenida: Math.min(sub.notaObtenida, nuevoMax) };
        }
        if (campo === 'notaObtenida') {
          const nuevoObtenido = clamp(valor as number, 0, sub.notaMaxima || 0);
          return { ...sub, notaObtenida: nuevoObtenido };
        }
        return { ...sub, [campo]: valor };
      });
      return { ...cat, subActividades: nuevasSubs };
    }));
  };

  const eliminarSubActividad = (seccionKey: 'categoriasP1' | 'categoriasP2' | 'categoriasPractico', idCat: string, idSub: string) => {
    if (!materiaSeleccionada) return;
    const lista = materiaSeleccionada[seccionKey] as Categoria[];
    actualizarMateriaActual(seccionKey, lista.map(cat => cat.id === idCat ? { ...cat, subActividades: cat.subActividades.filter(s => s.id !== idSub) } : cat));
    vibrar('ligero');
  };

  const renderizarListaCategorias = (seccionKey: 'categoriasP1' | 'categoriasP2' | 'categoriasPractico', tituloSeccion: string) => {
    if (!materiaSeleccionada) return null;
    const lista = materiaSeleccionada[seccionKey] as Categoria[];

    const detenerPropagacionNativa = (el: HTMLDivElement | null) => {
      if (el) {
        el.onclick = (e) => e.stopPropagation();
        el.onpointerdown = (e) => e.stopPropagation();
        el.ontouchstart = (e) => e.stopPropagation();
      }
    };

    return (
      <IonAccordionGroup 
        style={{ marginTop: '5px' }}
        onIonChange={e => e.stopPropagation()} 
      >
        {lista.map((cat) => {
          const notaCalculada = calcularNotaLocal(cat);
          const tieneSubs = cat.subActividades.length > 0;

          return (
            <IonAccordion key={cat.id} value={cat.id} style={{ background: 'var(--ion-card-background)', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <IonItem slot="header" color="transparent" lines="none">
                
                {/* DIV 1: Usamos la ref nativa aquí */}
                <div 
                  ref={detenerPropagacionNativa}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } as React.CSSProperties & { '--padding-start': string }} 
                >
                  <IonInput 
                    value={cat.nombre} 
                    onIonChange={e => actualizarCategoria(seccionKey, cat.id, 'nombre', e.detail.value!)} 
                    style={{ margin: 0, padding: 0, fontWeight: '700', fontSize: '0.95rem' } as React.CSSProperties & { '--padding-start': string; '--padding-end': string; '--inner-padding-end': string }} 
                    placeholder="Nombre de actividad..."
                  />
                  {tieneSubs && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>{cat.subActividades.length} actividades • Promedio: {notaCalculada.toFixed(1)}/100</p>}
                </div>

                {/* DIV 2: Y también usamos la ref nativa aquí */}
                <div 
                  ref={detenerPropagacionNativa}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '10px' }} 
                >
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--ion-color-medium)', display: 'block' }}>Nota/100</span>
                    <CampoNota
                      readonly={tieneSubs}
                      value={tieneSubs ? Number(notaCalculada.toFixed(1)) : cat.notaGlobalRapida}
                      onChange={v => actualizarCategoria(seccionKey, cat.id, 'notaGlobalRapida', v)}
                      style={{ width: '50px', textAlign: 'center', background: tieneSubs ? 'transparent' : 'var(--ion-color-step-100)', borderRadius: '6px', fontWeight: 'bold', color: 'var(--ion-color-primary)' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--ion-color-medium)', display: 'block' }}>% de tu nota</span>
                    <CampoNota
                      value={cat.peso}
                      onChange={v => actualizarCategoria(seccionKey, cat.id, 'peso', v)}
                      ultimoCampo={!tieneSubs}
                      style={{ width: '45px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontWeight: 'bold' }}
                    />
                  </div>
                  
                  <div
                    ref={el => {
                      if (el) {
                        el.onclick = (e) => {
                          e.stopPropagation();
                          eliminarCategoria(seccionKey, cat.id);
                        };
                        el.onpointerdown = (e) => e.stopPropagation();
                        el.ontouchstart = (e) => e.stopPropagation();
                      }
                    }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', marginLeft: '2px', cursor: 'pointer' }}
                  >
                    <IonIcon icon={trashOutline} color="danger" style={{ fontSize: '1.2rem', opacity: 0.8 }} />
                  </div>
                </div>
              </IonItem>

              <div slot="content" style={{ padding: '0 15px 15px 15px' }}>
                <div style={{ background: 'transparent', padding: '0 5px' }}>

                  <IonListHeader style={{ padding: 0, minHeight: 'auto', marginBottom: '10px' }}>
                    <IonLabel style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--ion-color-medium)', margin: 0, letterSpacing: '0.5px' }}>Notas individuales de esta actividad</IonLabel>
                  </IonListHeader>

                  {cat.subActividades.map((sub, index) => (
                    <IonItem key={sub.id} lines="none" style={{ '--min-height': '40px', '--background': 'transparent', '--padding-start': '0' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--ion-color-medium)', marginRight: '12px', fontWeight: 'bold' }}>#{index + 1}</span>
                      <IonInput 
                        value={sub.nombre} 
                        onIonChange={e => actualizarSubActividad(seccionKey, cat.id, sub.id, 'nombre', e.detail.value!)} 
                        style={{ fontSize: '1rem', fontWeight: '700', '--padding-start': '0' }} 
                        placeholder="Nombre" 
                      />

                      <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CampoNota
                          campoId={`obtenida-${seccionKey}-${sub.id}`}
                          siguienteId={`maxima-${seccionKey}-${sub.id}`}
                          refsMap={inputRefs}
                          value={sub.notaObtenida}
                          min={0}
                          max={sub.notaMaxima || 0}
                          onChange={v => actualizarSubActividad(seccionKey, cat.id, sub.id, 'notaObtenida', v)}
                          style={{ width: '42px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '800', color: `var(--ion-color-${materiaSeleccionada.color})`, padding: '6px 0' }}
                        />
                        <span style={{ color: 'var(--ion-color-medium)', fontWeight: 'bold' }}>/</span>
                        <CampoNota
                          campoId={`maxima-${seccionKey}-${sub.id}`}
                          siguienteId={cat.subActividades[index + 1] ? `obtenida-${seccionKey}-${cat.subActividades[index + 1].id}` : undefined}
                          refsMap={inputRefs}
                          ultimoCampo={!cat.subActividades[index + 1]}
                          value={sub.notaMaxima}
                          min={0}
                          max={9999}
                          onChange={v => actualizarSubActividad(seccionKey, cat.id, sub.id, 'notaMaxima', v)}
                          style={{ width: '42px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '700', padding: '6px 0' }}
                        />
                        <IonIcon icon={trashOutline} color="danger" style={{ cursor: 'pointer', fontSize: '1.2rem', marginLeft: '8px', opacity: 0.7 }} onClick={() => eliminarSubActividad(seccionKey, cat.id, sub.id)} />
                      </div>
                    </IonItem>
                  ))}

                  <IonButton expand="block" fill="clear" size="small" onClick={() => agregarSubActividad(seccionKey, cat.id)} style={{ marginTop: '12px', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                    + AGREGAR ACTIVIDAD A {cat.nombre.toUpperCase()}
                  </IonButton>
                </div>
              </div>
            </IonAccordion>
          );
        })}
      </IonAccordionGroup>
    );
  };

  return (
    <IonPage>
      <IonHeader className="ion-no-border">
        <IonToolbar>
          <IonTitle style={{ fontWeight: '800' }}>Mis Calificaciones</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={alternarModoAvanzado} title="Modo avanzado">
              <IonIcon icon={modoAvanzado ? construct : constructOutline} />
            </IonButton>
            <IonButton onClick={compartirResumenGeneral} title="Exportar resumen">
              <IonIcon icon={downloadOutline} />
            </IonButton>
            <IonButton onClick={alternarNotificaciones} title="Recordatorios">
              <IonIcon icon={notificacionesActivas ? notifications : notificationsOutline} />
            </IonButton>
            <IonButton routerLink="/tab3" title="Configuración">
              <IonIcon icon={settingsOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">

        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {cargando && (
          <>
            <TarjetaEsqueleto />
            <TarjetaEsqueleto />
            <TarjetaEsqueleto />
          </>
        )}

        {!cargando && materias.length === 0 && (
          <EstadoVacio onCrear={() => setIsAddMateriaOpen(true)} />
        )}

        {!cargando && materias.length > 0 && (
          <>
            {rachaDias > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <IonIcon icon={flameOutline} style={{ fontSize: '1rem', color: 'var(--ion-color-warning-shade)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--ion-color-warning-shade)' }}>
                  {rachaDias} días seguidos actualizando tus notas
                </span>
              </div>
            )}

            {mensajeAtencion && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                borderRadius: '12px', marginBottom: '14px', transition: 'background 0.3s ease, color 0.3s ease',
                background: mensajeAtencion.tipo === 'exito' ? 'linear-gradient(135deg, rgba(var(--ion-color-success-rgb), 0.16), rgba(var(--ion-color-success-rgb), 0.04))'
                          : mensajeAtencion.tipo === 'peligro' ? 'linear-gradient(135deg, rgba(var(--ion-color-danger-rgb), 0.16), rgba(var(--ion-color-danger-rgb), 0.04))'
                          : 'linear-gradient(135deg, rgba(var(--ion-color-warning-rgb), 0.18), rgba(var(--ion-color-warning-rgb), 0.04))',
                color: mensajeAtencion.tipo === 'exito' ? 'var(--ion-color-success)'
                     : mensajeAtencion.tipo === 'peligro' ? 'var(--ion-color-danger)'
                     : 'var(--ion-color-warning-shade)'
              }}>
                <IonIcon icon={mensajeAtencion.tipo === 'exito' ? trendingUpOutline : alertCircleOutline} style={{ fontSize: '1.2rem', flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{mensajeAtencion.texto}</span>
              </div>
            )}

            <IonCard style={{
              borderRadius: '16px', marginBottom: '18px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              background: FONDO_PROMEDIO_POR_RIESGO[colorPromedioGeneral], transition: 'background 0.5s ease'
            }}>
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Promedio General
                    <IonIcon icon={helpCircleOutline} style={{ fontSize: '0.9rem' }} onClick={() => mostrarAyuda('Promedio General', 'Es el promedio de tus calificaciones actuales acumuladas en todas tus materias.')} />
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: '800', color: 'var(--ion-text-color)' }}>{promedioGeneral.toFixed(1)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {materiasEnRiesgo > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ion-color-danger)' }}>
                      <IonIcon icon={alertCircleOutline} style={{ fontSize: '1.2rem' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{materiasEnRiesgo} sin alcanzar su meta</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ion-color-success)' }}>
                      <IonIcon icon={trendingUpOutline} style={{ fontSize: '1.2rem' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>Todo al día</span>
                    </div>
                  )}
                </div>
              </div>
            </IonCard>

            {mostrarCoachmark && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'var(--ion-color-primary)',
                color: 'var(--ion-color-primary-contrast)', borderRadius: '12px', padding: '12px 14px', marginBottom: '14px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
              }}>
                <IonIcon icon={informationCircleOutline} style={{ fontSize: '1.3rem', marginTop: '2px', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: '600', lineHeight: '1.35', flex: 1 }}>
                  Tip: desliza una materia hacia la izquierda para eliminarla, o mantenla presionada para ver más opciones.
                </p>
                <IonIcon icon={close} style={{ fontSize: '1.2rem', cursor: 'pointer', flexShrink: 0, opacity: 0.85 }} onClick={cerrarCoachmark} />
              </div>
            )}

            <IonList style={{ background: 'transparent' }}>
              {materiasOrdenadas.map(({ materia, stats }, index) => {
                const diferencia = materia.notaDeseada - stats.acumuladoGlobal;
                const colorRiesgo = colorPorRiesgo(diferencia);
                const ratioSwipe = swipeRatios[materia.id] ?? 0;

                return (
                  <IonItemSliding
                    key={materia.id}
                    ref={el => { slidingRefs.current[materia.id] = el; }}
                    className="tarjeta-materia"
                    style={{ animationDelay: `${index * 60}ms`, marginBottom: '14px', borderRadius: '14px', overflow: 'hidden' }}
                    onIonDrag={e => manejarDragSwipe(materia.id, e as CustomEvent)}
                  >
                    <IonItem
                      lines="none"
                      color="transparent"
                      onClick={() => manejarClickMateria(materia)}
                      onPointerDown={() => iniciarPresionLarga(materia)}
                      onPointerUp={cancelarPresionLarga}
                      onPointerLeave={cancelarPresionLarga}
                      style={{
                        '--background': FONDO_POR_RIESGO[colorRiesgo], '--padding-start': '14px', '--padding-end': '14px',
                        '--padding-top': '10px', '--padding-bottom': '10px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                        borderRadius: '14px', borderLeft: `4px solid var(--ion-color-${colorRiesgo})`,
                        transition: 'border-color 0.4s ease, background 0.5s ease'
                      } as any}
                    >
                      <AvatarMateria claveIcono={materia.icono || 'school'} color={materia.color} />
                      <IonLabel>
                        <h2 style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--ion-text-color)', margin: '0 0 2px 0' }}>{materia.nombre}</h2>
                        <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.8rem', margin: 0 }}>
                          {obtenerEtiquetaEscala(stats.acumuladoGlobal, escalas) ?? 'Global Acumulado'}
                        </p>
                      </IonLabel>
                      <CircularProgress value={stats.acumuladoGlobal} color={materia.color} />
                    </IonItem>
                    <IonItemOptions side="end" onIonSwipe={() => solicitarEliminarDesdeSwipe(materia)}>
                      <IonItemOption color="danger" expandable onClick={() => solicitarEliminarDesdeSwipe(materia)}>
                        <IonIcon
                          icon={trashOutline}
                          slot="icon-only"
                          style={{
                            transform: `scale(${0.75 + ratioSwipe * 0.45})`,
                            opacity: 0.55 + ratioSwipe * 0.45,
                            transition: 'transform 0.05s linear, opacity 0.05s linear'
                          }}
                        />
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                );
              })}
            </IonList>
          </>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ marginBottom: '20px', marginRight: '10px' }}>
          <IonFabButton color="primary" onClick={() => { vibrar('ligero'); cerrarTodosSliding(); setMostrarAccionesFab(true); }}><IonIcon icon={add} /></IonFabButton>
        </IonFab>

        <IonActionSheet
          isOpen={mostrarAccionesFab}
          onDidDismiss={() => setMostrarAccionesFab(false)}
          header="Acciones rápidas"
          buttons={[
            { text: 'Nueva materia', icon: schoolOutline, handler: () => setIsAddMateriaOpen(true) },
            { text: 'Registrar nota', icon: createOutline, handler: () => iniciarRegistrarNota() },
            { text: 'Abrir Predictor', icon: trendingUpOutline, handler: () => router.push('/tab2') },
            { text: 'Cancelar', role: 'cancel' }
          ]}
        />

        <IonActionSheet
          isOpen={mostrarSelectorNota}
          onDidDismiss={() => setMostrarSelectorNota(false)}
          header="¿En qué materia?"
          buttons={[
            ...materias.map(m => ({ text: m.nombre, handler: () => abrirDetalleMateria(m) })),
            { text: 'Cancelar', role: 'cancel' as const }
          ]}
        />

        <IonToast
          isOpen={mostrarToast}
          message={mensajeToast}
          duration={2400}
          position="bottom"
          color="success"
          onDidDismiss={() => setMostrarToast(false)}
        />

        <IonToast
          isOpen={mostrarToastUndo}
          message={ultimaEliminada ? `"${ultimaEliminada.nombre}" eliminada` : ''}
          duration={4000}
          position="bottom"
          color="dark"
          buttons={[{
            text: 'DESHACER',
            handler: () => {
              if (ultimaEliminada) restaurarMateria(ultimaEliminada);
              setUltimaEliminada(null);
            }
          }]}
          onDidDismiss={() => setMostrarToastUndo(false)}
        />

        <IonActionSheet
          isOpen={!!accionesPara}
          onDidDismiss={() => setAccionesPara(null)}
          header={accionesPara?.nombre}
          buttons={accionesPara ? [
            { text: 'Ver detalle', icon: eyeOutline, handler: () => abrirDetalleMateria(accionesPara) },
            { text: 'Editar', icon: createOutline, handler: () => abrirEditarMateria(accionesPara) },
            { text: 'Compartir', icon: shareOutline, handler: () => compartirMateria(accionesPara as ExtendedMateria) },
            { text: 'Eliminar', icon: trashOutline, role: 'destructive', handler: () => eliminarConConfirmacion(accionesPara, false) },
            { text: 'Cancelar', role: 'cancel' }
          ] : []}
        />

        <IonModal isOpen={isDetailOpen} onDidDismiss={() => setIsDetailOpen(false)}>
          {materiaSeleccionada && (() => {
            const stats = calcularEstadisticas(materiaSeleccionada);
            const etiquetaEscala = obtenerEtiquetaEscala(stats.acumuladoGlobal, escalas);

            if (stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada && !celebratedRef.current[materiaSeleccionada.id]) {
              celebratedRef.current[materiaSeleccionada.id] = true;
              confetti({ particleCount: 150, spread: 80, origin: { y: 0.3 }, zIndex: 99999, colors: ['#2dd36f', '#ffea00', '#4c8dff'] });
              vibrar('exito');
            } else if (stats.acumuladoGlobal < materiaSeleccionada.notaDeseada) {
              celebratedRef.current[materiaSeleccionada.id] = false;
            }

            return (
              <>
                <div style={{
                  position: 'sticky', top: 0, zIndex: 10,
                  background: `linear-gradient(135deg, var(--ion-color-${materiaSeleccionada.color}), var(--ion-color-${materiaSeleccionada.color}-shade))`, 
                  padding: '20px 20px 15px', color: 'var(--ion-color-primary-contrast)',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IonIcon icon={obtenerIcono(materiaSeleccionada.icono || 'school')} style={{ fontSize: '1.5rem' }} />
                      <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.4rem' }}>{materiaSeleccionada.nombre}</h1>
                      <IonIcon icon={createOutline} style={{ fontSize: '1rem', cursor: 'pointer', opacity: 0.75 }} onClick={() => abrirEditarMateria(materiaSeleccionada)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <IonIcon icon={shareOutline} style={{ fontSize: '1.2rem', cursor: 'pointer', opacity: 0.8 }} onClick={() => compartirMateria(materiaSeleccionada)} />
                      <IonIcon icon={trashOutline} style={{ fontSize: '1.2rem', cursor: 'pointer', opacity: 0.8 }} onClick={() => eliminarConConfirmacion(materiaSeleccionada, true)} />
                      <IonIcon icon={close} style={{ fontSize: '1.8rem', cursor: 'pointer', opacity: 0.8 }} onClick={() => setIsDetailOpen(false)} />
                    </div>
                  </div>

                  <div style={{ background: 'var(--ion-card-background, #ffffff)', borderRadius: '12px', padding: '15px', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 4px 8px rgba(0,0,0,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          Meta
                          <IonIcon icon={helpCircleOutline} style={{ fontSize: '0.85rem', cursor: 'pointer' }} onClick={() => mostrarAyuda('¿Qué es la Meta?', 'Es la nota que quieres alcanzar en esta materia al terminar, sobre 100. Tú la defines: si tu meta es 70, la app te va a decir cuánto necesitas sacar en lo que falta para llegar a esa nota.')} />
                        </p>
                        <CampoNota
                          value={materiaSeleccionada.notaDeseada}
                          onChange={v => actualizarMateriaActual('notaDeseada', v)}
                          style={{ fontWeight: '800', fontSize: '1.4rem', color: `var(--ion-color-${materiaSeleccionada.color})`, textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px' }}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          Tu nota actual
                          <IonIcon icon={helpCircleOutline} style={{ fontSize: '0.85rem', cursor: 'pointer' }} onClick={() => mostrarAyuda('Tu nota actual', 'Es la suma de los puntos que has ganado hasta el momento, considerando el peso de cada actividad. No es un promedio general simple.')} />
                        </p>
                        <p style={{ margin: '8px 0 0', fontWeight: '700', fontSize: '1.3rem', color: 'var(--ion-text-color)' }}>{stats.acumuladoGlobal.toFixed(1)}</p>
                        {etiquetaEscala && (
                          <p style={{ margin: '2px 0 0', fontSize: '0.65rem', fontWeight: '700', color: `var(--ion-color-${materiaSeleccionada.color})` }}>{etiquetaEscala}</p>
                        )}
                      </div>
                      
                      <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px', cursor: 'pointer' }} onClick={mostrarDetalleNecesitas}>
                        <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          Necesitas
                          <IonIcon icon={informationCircleOutline} style={{ fontSize: '0.85rem' }} />
                        </p>
                        <p style={{ margin: '8px 0 0', fontWeight: '800', fontSize: stats.perdidaInclusoConMejoramiento ? '1rem' : '1.3rem', color: stats.perdidaInclusoConMejoramiento ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }}>
                          {stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada
                            ? '0'
                            : stats.perdidaInclusoConMejoramiento
                              ? 'Imposible'
                              : stats.requiereMejoramientoParaPasar
                                ? necesitasEntero(stats.notaMejoramientoNecesaria)
                                : necesitasEntero(stats.notaNecesaria)}
                        </p>
                      </div>

                    </div>
                    {stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada && (
                      <div style={{ background: 'rgba(var(--ion-color-success-rgb), 0.15)', color: 'var(--ion-color-success)', padding: '6px', borderRadius: '6px', fontWeight: '800', textAlign: 'center', letterSpacing: '1px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                        <IonIcon icon={checkmarkCircleOutline} style={{ fontSize: '1rem' }} />
                        ASIGNATURA APROBADA
                      </div>
                    )}
                  </div>
                </div>

                <IonContent className="ion-padding">
                  <IonCard style={{ margin: '0 0 20px 0', borderRadius: '12px', background: 'var(--ion-card-background)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                    <div style={{ padding: '10px 15px', background: 'var(--ion-color-step-50)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--ion-color-medium)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <IonIcon icon={statsChartOutline} style={{ fontSize: '0.9rem' }} /> TENDENCIA
                    </div>
                    <div style={{ padding: '14px 15px' }}>
                      <Sparkline datos={materiaSeleccionada.historial ?? []} color={materiaSeleccionada.color} />
                    </div>
                  </IonCard>

                  {modoAvanzado && (
                    <IonCard style={{ margin: '0 0 20px 0', borderRadius: '12px', background: 'var(--ion-card-background)', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
                      <div style={{ padding: '10px 15px', background: 'var(--ion-color-step-50)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--ion-color-medium)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        PONDERACIÓN GLOBAL
                      </div>
                      <IonItem lines="none" color="transparent">
                        <IonLabel color="medium" style={{ fontSize: '0.85rem' }}>% Teórico (P1 + P2)</IonLabel>
                        <CampoNota
                          value={materiaSeleccionada.pesoTeorico}
                          onChange={v => actualizarMateriaActual('pesoTeorico', v)}
                          style={{ maxWidth: '50px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontWeight: 'bold' }}
                        />
                        <IonLabel color="medium" style={{ fontSize: '0.85rem', marginLeft: '15px' }}>% Práctico</IonLabel>
                        <CampoNota
                          value={materiaSeleccionada.pesoPractico}
                          onChange={v => actualizarMateriaActual('pesoPractico', v)}
                          ultimoCampo
                          style={{ maxWidth: '50px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontWeight: 'bold' }}
                        />
                      </IonItem>
                      {(materiaSeleccionada.pesoTeorico + materiaSeleccionada.pesoPractico) !== 100 && (
                        <div style={{ padding: '8px 15px 12px', fontSize: '0.75rem', color: 'var(--ion-color-danger)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <IonIcon icon={warningOutline} style={{ fontSize: '1rem' }} />
                          <span>Parciales + Práctico suman {materiaSeleccionada.pesoTeorico + materiaSeleccionada.pesoPractico}%, debe ser 100%</span>
                        </div>
                      )}
                    </IonCard>
                  )}

                  <IonAccordionGroup value={accordionValue} onIonChange={(e) => setAccordionValue(e.detail.value)}>
                    
                    <IonAccordion value="p1" style={{ background: 'var(--ion-card-background)', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                      <IonItem slot="header" color="transparent" lines="none" style={{ '--padding-start': '15px', '--padding-end': '15px' }}>
                        <IonLabel>
                          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: `var(--ion-color-${materiaSeleccionada.color})` }}>Primer Parcial</h2>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>Nota Actual: <strong>{stats.notaP1.toFixed(1)} / 100</strong></p>
                        </IonLabel>
                      </IonItem>
                      <div slot="content" className="ion-padding" style={{ paddingTop: 0 }}>
                        {renderizarListaCategorias('categoriasP1', 'Primer Parcial')}
                        <IonButton expand="block" fill="outline" color={materiaSeleccionada.color} onClick={() => agregarCategoria('categoriasP1')} style={{ marginTop: '15px', fontWeight: '700', borderStyle: 'dashed' }}>
                          <IonIcon icon={addCircleOutline} slot="start" /> AGREGAR ACTIVIDAD AL P1
                        </IonButton>
                        {stats.pesoCargadoP1 !== 100 && (
                          <div style={{ background: 'rgba(var(--ion-color-danger-rgb), 0.1)', color: 'var(--ion-color-danger)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', marginTop: '10px' }}>
                            ⚠️ Las actividades del P1 suman {stats.pesoCargadoP1}%. Deben sumar 100%.
                          </div>
                        )}
                      </div>
                    </IonAccordion>

                    <IonAccordion value="p2" style={{ background: 'var(--ion-card-background)', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                      <IonItem slot="header" color="transparent" lines="none" style={{ '--padding-start': '15px', '--padding-end': '15px' }}>
                        <IonLabel>
                          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: `var(--ion-color-${materiaSeleccionada.color})` }}>Segundo Parcial</h2>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>
                            Nota Actual: <strong style={{ textDecoration: materiaSeleccionada.usaMejoramiento && stats.notaP2 < stats.notaP1 && materiaSeleccionada.notaMejoramiento! > stats.notaP2 ? 'line-through' : 'none' }}>{stats.notaP2.toFixed(1)}</strong> / 100
                          </p>
                        </IonLabel>
                      </IonItem>
                      <div slot="content" className="ion-padding" style={{ paddingTop: 0 }}>
                        {renderizarListaCategorias('categoriasP2', 'Segundo Parcial')}
                        <IonButton expand="block" fill="outline" color={materiaSeleccionada.color} onClick={() => agregarCategoria('categoriasP2')} style={{ marginTop: '15px', fontWeight: '700', borderStyle: 'dashed' }}>
                          <IonIcon icon={addCircleOutline} slot="start" /> AGREGAR ACTIVIDAD AL P2
                        </IonButton>
                        {stats.pesoCargadoP2 !== 100 && (
                          <div style={{ background: 'rgba(var(--ion-color-danger-rgb), 0.1)', color: 'var(--ion-color-danger)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', marginTop: '10px' }}>
                            ⚠️ Las actividades del P2 suman {stats.pesoCargadoP2}%. Deben sumar 100%.
                          </div>
                        )}
                      </div>
                    </IonAccordion>

                    <IonAccordion value="mej" style={{ background: 'var(--ion-card-background)', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                      <IonItem slot="header" color="transparent" lines="none" style={{ '--padding-start': '15px', '--padding-end': '15px' }}>
                        <IonLabel>
                          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: `var(--ion-color-${materiaSeleccionada.color})` }}>Examen de Mejoramiento</h2>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>
                            {materiaSeleccionada.usaMejoramiento ? `Nota Actual: ${materiaSeleccionada.notaMejoramiento || 0} / 100` : 'Desactivado'}
                          </p>
                        </IonLabel>
                      </IonItem>
                      <div slot="content" className="ion-padding" style={{ paddingTop: 0 }}>
                        <div
                          onClick={e => e.stopPropagation()}
                          style={{ padding: '10px 15px', background: 'var(--ion-color-step-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px', marginBottom: '10px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <IonIcon icon={syncOutline} style={{ fontSize: '1rem', color: 'var(--ion-color-medium)' }} />
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--ion-color-medium)', letterSpacing: '1px' }}>ACTIVAR MEJORAMIENTO</span>
                          </div>
                          <IonToggle 
                            checked={!!materiaSeleccionada.usaMejoramiento} 
                            onClick={e => e.stopPropagation()}
                            onIonChange={e => {
                              e.stopPropagation();
                              actualizarMateriaActual('usaMejoramiento', e.detail.checked);
                            }}
                            style={{ '--background-checked': `var(--ion-color-${materiaSeleccionada.color})` }}
                          />
                        </div>
                        {materiaSeleccionada.usaMejoramiento && (
                          <IonItem
                            lines="none" color="transparent" style={{ padding: '0', '--padding-start': '0' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <IonLabel>
                              <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.8rem', whiteSpace: 'normal', lineHeight: '1.4' }}>
                                Ingresa la nota del examen. Reemplazará automáticamente la más baja entre el P1 y el P2.
                              </p>
                            </IonLabel>
                            <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <CampoNota
                                value={materiaSeleccionada.notaMejoramiento || 0}
                                onChange={v => actualizarMateriaActual('notaMejoramiento', v)}
                                min={0} max={100}
                                style={{ width: '45px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontWeight: 'bold' }}
                              />
                            </div>
                          </IonItem>
                        )}
                      </div>
                    </IonAccordion>

                    {materiaSeleccionada.pesoPractico > 0 && (
                      <IonAccordion value="pr" style={{ background: 'var(--ion-card-background)', borderRadius: '12px', marginBottom: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                        <IonItem slot="header" color="transparent" lines="none" style={{ '--padding-start': '15px', '--padding-end': '15px' }}>
                          <IonLabel>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: `var(--ion-color-${materiaSeleccionada.color})` }}>Trabajo Práctico</h2>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>Nota Actual: <strong>{stats.notaPr.toFixed(1)} / 100</strong></p>
                          </IonLabel>
                        </IonItem>
                        <div slot="content" className="ion-padding" style={{ paddingTop: 0 }}>
                          {renderizarListaCategorias('categoriasPractico', 'Trabajo Práctico')}
                          <IonButton expand="block" fill="outline" color={materiaSeleccionada.color} onClick={() => agregarCategoria('categoriasPractico')} style={{ marginTop: '15px', fontWeight: '700', borderStyle: 'dashed' }}>
                            <IonIcon icon={addCircleOutline} slot="start" /> AGREGAR ACTIVIDAD AL PRÁCTICO
                          </IonButton>
                          {stats.pesoCargadoPr !== 100 && (
                            <div style={{ background: 'rgba(var(--ion-color-danger-rgb), 0.1)', color: 'var(--ion-color-danger)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', marginTop: '10px' }}>
                              ⚠️ Las actividades prácticas suman {stats.pesoCargadoPr}%. Deben sumar 100%.
                            </div>
                          )}
                        </div>
                      </IonAccordion>
                    )}

                  </IonAccordionGroup>
                </IonContent>
              </>
            );
          })()}
        </IonModal>

        <IonModal isOpen={isNecesitasOpen} initialBreakpoint={0.4} breakpoints={[0, 0.4]} onDidDismiss={() => setIsNecesitasOpen(false)}>
          {materiaSeleccionada && (() => {
            const stats = calcularEstadisticas(materiaSeleccionada);
            const notaAprox = necesitasEntero(stats.notaNecesaria);

            return (
              <IonContent className="ion-padding">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h2 style={{ fontWeight: '800', margin: 0, color: 'var(--ion-text-color)' }}>Desglose de tu Meta</h2>
                  <IonIcon icon={close} style={{ fontSize: '1.8rem', cursor: 'pointer', color: 'var(--ion-color-medium)' }} onClick={() => setIsNecesitasOpen(false)} />
                </div>
                
                {stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada ? (
                  <div style={{ background: 'rgba(var(--ion-color-success-rgb), 0.1)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--ion-color-success)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <IonIcon icon={checkmarkCircleOutline} style={{ color: 'var(--ion-color-success)', fontSize: '1.2rem' }} />
                      <span style={{ color: 'var(--ion-color-success)', fontWeight: '700', fontSize: '1rem' }}>Meta superada</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--ion-text-color)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                      Has alcanzado tu objetivo. Cualquier calificación adicional aumentará tu promedio final.
                    </p>
                  </div>
                ) : stats.perdidaInclusoConMejoramiento ? (
                  <div style={{ background: 'rgba(var(--ion-color-danger-rgb), 0.1)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--ion-color-danger)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <IonIcon icon={alertCircleOutline} style={{ color: 'var(--ion-color-danger)', fontSize: '1.2rem' }} />
                      <span style={{ color: 'var(--ion-color-danger)', fontWeight: '700', fontSize: '1rem' }}>Meta inalcanzable</span>
                    </div>
                    <p style={{ margin: 0, color: 'var(--ion-text-color)', fontSize: '0.9rem', lineHeight: '1.4' }}>
                      Matemáticamente requieres una nota superior a 100 en las evaluaciones restantes. No es posible alcanzar la meta actual con los porcentajes disponibles.
                    </p>
                  </div>
                ) : stats.requiereMejoramientoParaPasar ? (
                  <>
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.5' }}>
                      Ya no cuentas con puntaje regular suficiente. Para alcanzar la meta de <strong>{materiaSeleccionada.notaDeseada}</strong>, tu única opción es el examen de mejoramiento.
                    </p>
                    <div style={{ background: 'var(--ion-color-step-50)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid var(--ion-color-${materiaSeleccionada.color})` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--ion-color-medium)', fontWeight: '600', fontSize: '0.9rem' }}>Examen de Mejoramiento</span>
                        <span style={{ fontWeight: '700', color: 'var(--ion-text-color)', fontSize: '0.95rem' }}>&gt; {necesitasEntero(stats.notaMejoramientoNecesaria)}/100</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.95rem', marginBottom: '20px', lineHeight: '1.5' }}>
                      Aún no has completado el 100% de tus notas. Para alcanzar la meta de <strong>{materiaSeleccionada.notaDeseada}</strong>, debes mantener un promedio mínimo de <strong style={{ color: 'var(--ion-text-color)' }}>{notaAprox}/100</strong> en lo que falta por calificar.
                    </p>
                    
                    <div style={{ background: 'var(--ion-color-step-50)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid var(--ion-color-${materiaSeleccionada.color})` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <IonIcon icon={trendingUpOutline} style={{ color: `var(--ion-color-${materiaSeleccionada.color})`, fontSize: '1.1rem' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ion-text-color)', letterSpacing: '0.5px' }}>
                          Proyección requerida
                        </span>
                      </div>
                      
                      {stats.faltanteGlobalP1 > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--ion-color-step-100)', paddingBottom: '8px' }}>
                          <span style={{ color: 'var(--ion-color-medium)', fontWeight: '600', fontSize: '0.9rem' }}>En lo que falta del Primer Parcial</span>
                          <span style={{ fontWeight: '700', color: 'var(--ion-text-color)', fontSize: '0.95rem' }}>&gt; {notaAprox}/100</span>
                        </div>
                      )}

                      {stats.faltanteGlobalP2 > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: materiaSeleccionada.pesoPractico > 0 && stats.faltanteGlobalPr > 0 ? '10px' : '0', borderBottom: materiaSeleccionada.pesoPractico > 0 && stats.faltanteGlobalPr > 0 ? '1px solid var(--ion-color-step-100)' : 'none', paddingBottom: materiaSeleccionada.pesoPractico > 0 && stats.faltanteGlobalPr > 0 ? '8px' : '0' }}>
                          <span style={{ color: 'var(--ion-color-medium)', fontWeight: '600', fontSize: '0.9rem' }}>En lo que falta del Segundo Parcial</span>
                          <span style={{ fontWeight: '700', color: 'var(--ion-text-color)', fontSize: '0.95rem' }}>&gt; {notaAprox}/100</span>
                        </div>
                      )}
                      
                      {materiaSeleccionada.pesoPractico > 0 && stats.faltanteGlobalPr > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--ion-color-medium)', fontWeight: '600', fontSize: '0.9rem' }}>En lo que falta del Práctico</span>
                          <span style={{ fontWeight: '700', color: 'var(--ion-text-color)', fontSize: '0.95rem' }}>&gt; {notaAprox}/100</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
                
                <IonButton expand="block" fill="clear" style={{ marginTop: '20px', fontWeight: 'bold' }} onClick={() => setIsNecesitasOpen(false)}>
                  Cerrar
                </IonButton>
              </IonContent>
            );
          })()}
        </IonModal>

        <IonModal isOpen={isEditOpen} initialBreakpoint={0.55} breakpoints={[0, 0.55]} onDidDismiss={() => setIsEditOpen(false)}>
          <IonContent className="ion-padding">
            <h2 style={{fontWeight:'800', marginTop:'15px', color: 'var(--ion-text-color)'}}>Editar Asignatura</h2>
            <IonItem className="ion-margin-top" color="transparent" lines="full">
              <IonLabel position="stacked" color="medium">Nombre de la materia</IonLabel>
              <IonInput value={editNombre} onIonChange={e => setEditNombre(e.detail.value ?? '')} style={{ fontWeight: '600', marginTop: '6px' }} />
            </IonItem>

            <p style={{ marginTop: '20px', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>Ícono</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {iconosDisponibles.map(op => (
                <button
                  key={op.clave}
                  onClick={() => { setEditIcono(op.clave); vibrar('ligero'); }}
                  style={{
                    width: '48px', height: '48px', borderRadius: '12px', border: 'none',
                    background: editIcono === op.clave ? 'var(--ion-color-primary)' : 'var(--ion-color-step-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <IonIcon icon={op.icono} style={{ fontSize: '1.4rem', color: editIcono === op.clave ? 'var(--ion-color-primary-contrast)' : 'var(--ion-text-color)' }} />
                </button>
              ))}
            </div>

            <IonButton expand="block" style={{ marginTop: '30px', borderRadius: '8px', fontWeight: 'bold' }} onClick={guardarEdicionMateria}>Guardar Cambios</IonButton>
          </IonContent>
        </IonModal>

        <IonModal isOpen={isAddMateriaOpen} initialBreakpoint={0.75} breakpoints={[0, 0.75]} onDidDismiss={() => setIsAddMateriaOpen(false)}>
          <IonContent className="ion-padding">
            <h2 style={{fontWeight:'800', marginTop:'15px', color: 'var(--ion-text-color)'}}>Nueva Asignatura</h2>
            <IonItem className="ion-margin-top" color="transparent" lines="full">
              <IonLabel position="stacked" color="medium">Nombre de la materia</IonLabel>
              <IonInput value={nuevaMateriaNombre} onIonChange={e => setNuevaMateriaNombre(e.detail.value!)} placeholder="Ej. Cálculo" style={{ fontWeight: '600', marginTop: '6px' }} />
            </IonItem>

            <p style={{ marginTop: '20px', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>¿Cómo se evalúa?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {PLANTILLAS_EVALUACION.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setPlantillaSeleccionada(p.id); vibrar('ligero'); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left',
                    padding: '10px 14px', borderRadius: '10px',
                    border: plantillaSeleccionada === p.id ? '2px solid var(--ion-color-primary)' : '2px solid transparent',
                    background: 'var(--ion-color-step-100)', cursor: 'pointer'
                  }}
                >
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--ion-text-color)' }}>{p.nombre}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>{p.descripcion}</span>
                </button>
              ))}
            </div>

            <p style={{ marginTop: '20px', marginBottom: '8px', fontSize: '0.8rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>Elige un ícono</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {iconosDisponibles.map(op => (
                <button
                  key={op.clave}
                  onClick={() => { setNuevoIcono(op.clave); vibrar('ligero'); }}
                  style={{
                    width: '48px', height: '48px', borderRadius: '12px', border: 'none',
                    background: nuevoIcono === op.clave ? 'var(--ion-color-primary)' : 'var(--ion-color-step-100)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <IonIcon icon={op.icono} style={{ fontSize: '1.4rem', color: nuevoIcono === op.clave ? 'var(--ion-color-primary-contrast)' : 'var(--ion-text-color)' }} />
                </button>
              ))}
            </div>

            <IonButton expand="block" style={{ marginTop: '30px', borderRadius: '8px', fontWeight: 'bold' }} onClick={handleAgregarMateria}>Crear Asignatura</IonButton>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

export default Tab1;