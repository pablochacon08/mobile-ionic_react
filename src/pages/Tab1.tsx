import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard,
  IonItem, IonLabel, IonList, IonFab, IonFabButton, IonIcon, IonButtons,
  IonModal, IonButton, IonInput, IonAccordionGroup, IonAccordion, IonListHeader,
  IonSkeletonText, IonToast, useIonAlert, useIonRouter, IonItemSliding, IonItemOptions, IonItemOption,
  IonActionSheet, IonRefresher, IonRefresherContent
} from '@ionic/react';
import { add, close, addCircleOutline, arrowForwardOutline, arrowUndoOutline, trashOutline, schoolOutline, trendingUpOutline, alertCircleOutline, shareOutline, createOutline, eyeOutline, informationCircleOutline, statsChartOutline, flameOutline, notifications, notificationsOutline, downloadOutline, helpCircleOutline, construct, constructOutline, checkmarkCircleOutline } from 'ionicons/icons';
import confetti from 'canvas-confetti';
import { Share } from '@capacitor/share';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { useMaterias, Materia, Categoria, SubActividad, EtapaEvaluacion, CategoriaPlantilla, HistorialPunto } from '../context/MateriasContext';
import { useEscalas } from '../context/EscalasContext';
import { getActiveKey, calcularNotaDeCategoria, calcularEstadisticas, obtenerEtiquetaEscala, generarMensajeAtencion, obtenerProgresoEtapas } from '../utils/calculos';
import { iconosDisponibles, obtenerIcono } from '../utils/iconos';
import CampoNota from '../components/CampoNota';
import './Tab1.css';

const clamp = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

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
  if (datos.length < 2) {
    return (
      <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)', margin: '4px 0 0' }}>
        Aún no hay suficiente historial para mostrar una tendencia. Vuelve luego de actualizar tus notas otro día.
      </p>
    );
  }

  const width = 280;
  const height = 50;
  const valores = datos.map(d => d.valor);
  const min = Math.min(...valores, 0);
  const max = Math.max(...valores, 100);
  const rango = max - min || 1;

  const puntos = datos.map((d, i) => {
    const x = (i / (datos.length - 1)) * width;
    const y = height - ((d.valor - min) / rango) * height;
    return `${x},${y}`;
  });

  const ultimo = datos[datos.length - 1];
  const [ultimoX, ultimoY] = puntos[puntos.length - 1].split(',').map(Number);

  return (
    <div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
        <polyline points={puntos.join(' ')} fill="none" stroke={`var(--ion-color-${color})`} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={ultimoX} cy={ultimoY} r="4" fill={`var(--ion-color-${color})`} />
      </svg>
      <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--ion-color-medium)' }}>
        Último registro: {new Date(ultimo.fecha).toLocaleDateString()} • {ultimo.valor.toFixed(1)}
      </p>
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
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<Materia | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNecesitasOpen, setIsNecesitasOpen] = useState(false); // NUEVO ESTADO PARA EL MODAL DE DESGLOSE
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
      } catch (error) {
        console.log('No se pudo cancelar la notificación:', error);
      }
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
      console.log('No se pudo programar la notificación:', error);
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

  const calcularEstadisticas = (mat: Materia) => {
    const notaP1 = mat.categoriasP1.reduce((acc, cat) => acc + (calcularNotaDeCategoria(cat) * (cat.peso / 100)), 0);
    const notaP2 = mat.categoriasP2.reduce((acc, cat) => acc + (calcularNotaDeCategoria(cat) * (cat.peso / 100)), 0);
    const notaPr = mat.categoriasPractico.reduce((acc, cat) => acc + (calcularNotaDeCategoria(cat) * (cat.peso / 100)), 0);

    const pesoGlobalP1 = mat.pesoTeorico / 2;
    const pesoGlobalP2 = mat.pesoTeorico / 2;
    const pesoGlobalPr = mat.pesoPractico;

    const acumuladoGlobal = (notaP1 * (pesoGlobalP1 / 100)) + 
                            (notaP2 * (pesoGlobalP2 / 100)) + 
                            (notaPr * (pesoGlobalPr / 100));

    const listaActiva = mat[getActiveKey(mat.etapa)] as Categoria[];
    const pesoActivoCargado = listaActiva.reduce((acc, cat) => acc + cat.peso, 0);
    const notaActivaParcial = mat.etapa === 1 ? notaP1 : mat.etapa === 2 ? notaP2 : notaPr;
    
    const faltanteActivo = 100 - pesoActivoCargado;
    let pesoGlobalRestante = 0;
    
    if (mat.etapa === 1) pesoGlobalRestante = (faltanteActivo / 100 * pesoGlobalP1) + pesoGlobalP2 + pesoGlobalPr;
    else if (mat.etapa === 2) pesoGlobalRestante = (faltanteActivo / 100 * pesoGlobalP2) + pesoGlobalPr;
    else pesoGlobalRestante = (faltanteActivo / 100 * pesoGlobalPr);

    let notaNecesaria = 0;
    if (pesoGlobalRestante > 0) {
      notaNecesaria = (mat.notaDeseada - acumuladoGlobal) / (pesoGlobalRestante / 100);
    }

    return { notaP1, notaP2, notaPr, acumuladoGlobal, notaNecesaria, pesoActivoCargado, notaActivaParcial, listaActiva, pesoGlobalRestante };
  };

  const materiasConStats = useMemo(() => {
    return materias.map(m => ({ materia: m, stats: calcularEstadisticas(m) }));
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
    ? generarMensajeAtencion(materiaPrioritaria.materia, materiaPrioritaria.stats)
    : null;

  // --- FUNCIÓN ACTUALIZADA: AHORA ABRE UN MODAL ELEGANTE ---
  const mostrarDetalleNecesitas = () => {
    vibrar('ligero');
    setIsNecesitasOpen(true);
  };

  const handleAgregarMateria = () => {
    if (!nuevaMateriaNombre.trim()) return;
    const plantilla = PLANTILLAS_EVALUACION.find(p => p.id === plantillaSeleccionada);
    agregarMateria(nuevaMateriaNombre, nuevoIcono, plantilla?.categorias);
    setNuevaMateriaNombre('');
    setNuevoIcono(iconosDisponibles[0].clave);
    setPlantillaSeleccionada('dos-examenes');
    setIsAddMateriaOpen(false);
    setMensajeToast('Materia creada correctamente');
    setMostrarToast(true);
    vibrar('ligero');
  };

  const abrirEditarMateria = (materia: Materia) => {
    setMateriaSeleccionada(materia);
    setEditNombre(materia.nombre);
    setEditIcono(materia.icono || 'school');
    setIsEditOpen(true);
  };

  const guardarEdicionMateria = () => {
    if (!materiaSeleccionada || !editNombre.trim()) return;
    const actualizada = { ...materiaSeleccionada, nombre: editNombre.trim(), icono: editIcono };
    setMateriaSeleccionada(actualizada);
    actualizarMateria(actualizada);
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
    presentAlert({
      header: 'Eliminar materia',
      message: `¿Seguro que quieres eliminar "${materia.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
            if (cerrarModalDespues) setIsDetailOpen(false);
            eliminarConUndo(materia);
          }
        }
      ]
    });
  };

  const abrirDetalleMateria = (materia: Materia) => {
    cerrarTodosSliding();
    setMateriaSeleccionada(materia);
    setIsDetailOpen(true);
  };

  const iniciarRegistrarNota = () => {
    if (materias.length === 0) { setIsAddMateriaOpen(true); return; }
    if (materias.length === 1) { abrirDetalleMateria(materias[0]); return; }
    setMostrarSelectorNota(true);
  };

  const compartirMateria = async (materia: Materia) => {
    const stats = calcularEstadisticas(materia);
    const etiqueta = obtenerEtiquetaEscala(stats.acumuladoGlobal, escalas);

    const lineas = [
      `📊 ${materia.nombre}`,
      `Nota acumulada: ${stats.acumuladoGlobal.toFixed(1)}${etiqueta ? ` (${etiqueta})` : ''}`,
      `Meta: ${materia.notaDeseada}`,
    ];
    if (stats.acumuladoGlobal < materia.notaDeseada) {
      lineas.push(`Necesito ${stats.notaNecesaria.toFixed(1)}/100 en lo que falta para alcanzar mi meta`);
    } else {
      lineas.push('¡Meta alcanzada! 🎉');
    }
    lineas.push('', 'Calculado con Mis Calificaciones');

    try {
      await Share.share({ title: materia.nombre, text: lineas.join('\n') });
    } catch (error) {}
  };

  const compartirResumenGeneral = async () => {
    if (materias.length === 0) return;
    const lineas = ['📊 Resumen académico', `Promedio general: ${promedioGeneral.toFixed(1)}`, ''];
    materiasOrdenadas.forEach(({ materia, stats }) => {
      const estado = stats.acumuladoGlobal >= materia.notaDeseada ? '✅' : '⚠️';
      lineas.push(`${estado} ${materia.nombre}: ${stats.acumuladoGlobal.toFixed(1)} (meta ${materia.notaDeseada})`);
    });
    lineas.push('', 'Generado con Mis Calificaciones');

    try {
      await Share.share({ title: 'Mi resumen académico', text: lineas.join('\n') });
    } catch (error) {}
  };

  const actualizarMateriaActual = (campo: keyof Materia, valor: any) => {
    if (!materiaSeleccionada) return;
    const actualizada = { ...materiaSeleccionada, [campo]: valor };
    setMateriaSeleccionada(actualizada);
    actualizarMateria(actualizada);
  };

  const agregarCategoria = () => {
    if (!materiaSeleccionada) return;
    const key = getActiveKey(materiaSeleccionada.etapa);
    const lista = materiaSeleccionada[key] as Categoria[];
    actualizarMateriaActual(key, [...lista, { id: Date.now().toString(), nombre: 'Nueva actividad', peso: 0, notaGlobalRapida: 0, subActividades: [] }]);
  };

  const actualizarCategoria = (idCat: string, campo: keyof Categoria, valor: any) => {
    if (!materiaSeleccionada) return;
    const key = getActiveKey(materiaSeleccionada.etapa);
    const lista = materiaSeleccionada[key] as Categoria[];
    let valorFinal = valor;
    if (campo === 'peso' || campo === 'notaGlobalRapida') valorFinal = clamp(valor, 0, 100);
    actualizarMateriaActual(key, lista.map(cat => cat.id === idCat ? { ...cat, [campo]: valorFinal } : cat));
  };

  const eliminarCategoria = (idCat: string) => {
    if (!materiaSeleccionada) return;
    const key = getActiveKey(materiaSeleccionada.etapa);
    const lista = materiaSeleccionada[key] as Categoria[];
    actualizarMateriaActual(key, lista.filter(c => c.id !== idCat));
    vibrar('ligero');
  };

  const agregarSubActividad = (idCat: string) => {
    if (!materiaSeleccionada) return;
    const key = getActiveKey(materiaSeleccionada.etapa);
    const lista = materiaSeleccionada[key] as Categoria[];
    const nuevaSub = { id: Date.now().toString(), nombre: 'Tarea', notaObtenida: 0, notaMaxima: 10 };
    actualizarMateriaActual(key, lista.map(cat => cat.id === idCat ? { ...cat, subActividades: [...cat.subActividades, nuevaSub] } : cat));
  };

  const actualizarSubActividad = (idCat: string, idSub: string, campo: keyof SubActividad, valor: string | number) => {
    if (!materiaSeleccionada) return;
    const key = getActiveKey(materiaSeleccionada.etapa);
    const lista = materiaSeleccionada[key] as Categoria[];

    actualizarMateriaActual(key, lista.map(cat => {
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

  const eliminarSubActividad = (idCat: string, idSub: string) => {
    if (!materiaSeleccionada) return;
    const key = getActiveKey(materiaSeleccionada.etapa);
    const lista = materiaSeleccionada[key] as Categoria[];
    actualizarMateriaActual(key, lista.map(cat => cat.id === idCat ? { ...cat, subActividades: cat.subActividades.filter(s => s.id !== idSub) } : cat));
    vibrar('ligero');
  };

  const cambiarEtapa = (nuevaEtapa: EtapaEvaluacion) => {
    if (!materiaSeleccionada) return;
    let nuevasCatsP2 = materiaSeleccionada.categoriasP2;
    let nuevasCatsPr = materiaSeleccionada.categoriasPractico;

    if (nuevaEtapa === 2 && nuevasCatsP2.length === 0) {
      nuevasCatsP2 = [{ id: Date.now().toString(), nombre: 'Examen Parcial 2', peso: 100, notaGlobalRapida: 0, subActividades: [] }];
    }
    if (nuevaEtapa === 3 && nuevasCatsPr.length === 0) {
      nuevasCatsPr = [{ id: Date.now().toString(), nombre: 'Proyecto Práctico', peso: 100, notaGlobalRapida: 0, subActividades: [] }];
    }

    const actualizada = { ...materiaSeleccionada, etapa: nuevaEtapa, categoriasP2: nuevasCatsP2, categoriasPractico: nuevasCatsPr };
    setMateriaSeleccionada(actualizada);
    actualizarMateria(actualizada);
    vibrar('ligero');
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
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>Promedio General</p>
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
                        <ProgresoEtapas etapa={materia.etapa} visible={modoAvanzado} />
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
            { text: 'Compartir', icon: shareOutline, handler: () => compartirMateria(accionesPara) },
            { text: 'Eliminar', icon: trashOutline, role: 'destructive', handler: () => eliminarConConfirmacion(accionesPara, false) },
            { text: 'Cancelar', role: 'cancel' }
          ] : []}
        />

        <IonModal isOpen={isDetailOpen} onDidDismiss={() => setIsDetailOpen(false)}>
          {materiaSeleccionada && (() => {
            const stats = calcularEstadisticas(materiaSeleccionada);
            const tituloEtapa = materiaSeleccionada.etapa === 1 ? 'Primer Parcial' : materiaSeleccionada.etapa === 2 ? 'Segundo Parcial' : 'Trabajo Práctico';
            const etiquetaEscala = obtenerEtiquetaEscala(stats.acumuladoGlobal, escalas);
            const pesoIncompleto = stats.pesoActivoCargado !== 100;
            const sumaPesosGlobales = materiaSeleccionada.pesoTeorico + materiaSeleccionada.pesoPractico;

            if (stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada && !celebratedRef.current[materiaSeleccionada.id]) {
              celebratedRef.current[materiaSeleccionada.id] = true;
              confetti({ particleCount: 150, spread: 80, origin: { y: 0.3 }, zIndex: 99999, colors: ['#2dd36f', '#ffea00', '#4c8dff'] });
              vibrar('exito');
            } else if (stats.acumuladoGlobal < materiaSeleccionada.notaDeseada) {
              celebratedRef.current[materiaSeleccionada.id] = false;
            }

            return (
              <IonContent>
                <div style={{ background: `linear-gradient(135deg, var(--ion-color-${materiaSeleccionada.color}), var(--ion-color-${materiaSeleccionada.color}-shade))`, padding: '30px 20px 20px', color: 'var(--ion-color-primary-contrast)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IonIcon icon={obtenerIcono(materiaSeleccionada.icono || 'school')} style={{ fontSize: '1.8rem' }} />
                      <h1 style={{ margin: 0, fontWeight: '800', fontSize: '1.6rem' }}>{materiaSeleccionada.nombre}</h1>
                      <IonIcon icon={createOutline} style={{ fontSize: '1.15rem', cursor: 'pointer', opacity: 0.75 }} onClick={() => abrirEditarMateria(materiaSeleccionada)} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <IonIcon icon={shareOutline} style={{ fontSize: '1.4rem', cursor: 'pointer', opacity: 0.8 }} onClick={() => compartirMateria(materiaSeleccionada)} />
                      <IonIcon icon={trashOutline} style={{ fontSize: '1.4rem', cursor: 'pointer', opacity: 0.8 }} onClick={() => eliminarConConfirmacion(materiaSeleccionada, true)} />
                      <IonIcon icon={close} style={{ fontSize: '2rem', cursor: 'pointer', opacity: 0.8 }} onClick={() => setIsDetailOpen(false)} />
                    </div>
                  </div>

                  {/* AQUÍ FORZAMOS EL BLANCO EN MODO CLARO Y EL SOMBREADO */}
                  <div style={{ background: 'var(--ion-card-background, #ffffff)', borderRadius: '12px', padding: '20px', marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 8px 16px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          Meta
                        </p>
                        <CampoNota
                          value={materiaSeleccionada.notaDeseada}
                          onChange={v => actualizarMateriaActual('notaDeseada', v)}
                          style={{ fontWeight: '800', fontSize: '1.6rem', color: `var(--ion-color-${materiaSeleccionada.color})`, textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Tu nota actual</p>
                        <p style={{ margin: '12px 0 0', fontWeight: '700', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{stats.acumuladoGlobal.toFixed(1)}</p>
                        {etiquetaEscala && (
                          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', fontWeight: '700', color: `var(--ion-color-${materiaSeleccionada.color})` }}>{etiquetaEscala}</p>
                        )}
                      </div>
                      
                      {/* LA MAGIA DEL NECESITAS ES CLICKABLE AQUÍ */}
                      <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px', cursor: 'pointer' }} onClick={mostrarDetalleNecesitas}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                          Necesitas
                          <IonIcon icon={helpCircleOutline} style={{ fontSize: '0.85rem' }} />
                        </p>
                        <p style={{ margin: '12px 0 0', fontWeight: '800', fontSize: '1.4rem', color: stats.notaNecesaria > 100 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }}>
                          {stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada ? '0' : (stats.notaNecesaria > 0 ? stats.notaNecesaria.toFixed(1) : '0')}
                        </p>
                      </div>

                    </div>
                    {stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada && (
                      <div style={{ background: 'rgba(var(--ion-color-success-rgb), 0.15)', color: 'var(--ion-color-success)', padding: '10px', borderRadius: '8px', fontWeight: '800', textAlign: 'center', letterSpacing: '1px', fontSize: '0.85rem' }}>🎉 ASIGNATURA APROBADA</div>
                    )}
                  </div>
                </div>

                <div className="ion-padding">
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
                        CÓMO SE REPARTE TU NOTA FINAL
                      </div>
                      <IonItem lines="none" color="transparent">
                        <IonLabel color="medium" style={{ fontSize: '0.85rem' }}>% Parciales (exámenes)</IonLabel>
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
                      {sumaPesosGlobales !== 100 && (
                        <div style={{ padding: '8px 15px 12px', fontSize: '0.75rem', color: 'var(--ion-color-danger)', fontWeight: '600' }}>
                          ⚠️ Parciales + Práctico suman {sumaPesosGlobales}%, debe ser 100%
                        </div>
                      )}
                    </IonCard>
                  )}

                  {materiaSeleccionada.etapa > 1 && (
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1, padding: '10px', background: 'var(--ion-card-background)', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>Parcial 1</p>
                        <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>{stats.notaP1.toFixed(1)}</p>
                      </div>
                      {materiaSeleccionada.etapa === 3 && (
                        <div style={{ flex: 1, padding: '10px', background: 'var(--ion-card-background)', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.04)' }}>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>Parcial 2</p>
                          <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>{stats.notaP2.toFixed(1)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px', padding: '0 5px' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: `var(--ion-color-${materiaSeleccionada.color})` }}>{tituloEtapa}</h2>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ion-color-medium)' }}>Nota Actual: <strong>{stats.notaActivaParcial.toFixed(1)} / 100</strong></p>
                    </div>
                  </div>

                  <IonAccordionGroup style={{ marginTop: '15px' }}>
                    {stats.listaActiva.map((cat) => {
                      const notaCalculada = calcularNotaDeCategoria(cat);
                      const tieneSubs = cat.subActividades.length > 0;

                      return (
                        <IonAccordion key={cat.id} value={cat.id} style={{ background: 'var(--ion-card-background)', borderRadius: '10px', marginBottom: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                          <IonItem slot="header" color="transparent" lines="none">
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' } as React.CSSProperties & { '--padding-start': string }} onClick={e => e.stopPropagation()}>
                              <IonInput 
                                value={cat.nombre} 
                                onIonChange={e => actualizarCategoria(cat.id, 'nombre', e.detail.value!)} 
                                style={{ margin: 0, padding: 0, fontWeight: '700', fontSize: '0.95rem' } as React.CSSProperties & { '--padding-start': string; '--padding-end': string; '--inner-padding-end': string }} 
                                placeholder="Nombre de actividad..."
                              />
                              {tieneSubs && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>{cat.subActividades.length} actividades • Promedio: {notaCalculada.toFixed(1)}/100</p>}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '10px' }} onClick={e => e.stopPropagation()}>
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--ion-color-medium)', display: 'block' }}>Nota/100</span>
                                <CampoNota
                                  readonly={tieneSubs}
                                  value={tieneSubs ? Number(notaCalculada.toFixed(1)) : cat.notaGlobalRapida}
                                  onChange={v => actualizarCategoria(cat.id, 'notaGlobalRapida', v)}
                                  style={{ width: '50px', textAlign: 'center', background: tieneSubs ? 'transparent' : 'var(--ion-color-step-100)', borderRadius: '6px', fontWeight: 'bold', color: 'var(--ion-color-primary)' }}
                                />
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--ion-color-medium)', display: 'block' }}>% de tu nota</span>
                                <CampoNota
                                  value={cat.peso}
                                  onChange={v => actualizarCategoria(cat.id, 'peso', v)}
                                  ultimoCampo={!tieneSubs}
                                  style={{ width: '45px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontWeight: 'bold' }}
                                />
                              </div>
                              <IonIcon icon={trashOutline} color="danger" style={{ fontSize: '1.2rem', marginLeft: '5px', opacity: 0.8 }} onClick={() => eliminarCategoria(cat.id)} />
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
                                    onIonChange={e => actualizarSubActividad(cat.id, sub.id, 'nombre', e.detail.value!)} 
                                    style={{ fontSize: '1rem', fontWeight: '700', '--padding-start': '0' }} 
                                    placeholder="Nombre" 
                                  />

                                  <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CampoNota
                                      campoId={`obtenida-${sub.id}`}
                                      siguienteId={`maxima-${sub.id}`}
                                      refsMap={inputRefs}
                                      value={sub.notaObtenida}
                                      min={0}
                                      max={sub.notaMaxima || 0}
                                      onChange={v => actualizarSubActividad(cat.id, sub.id, 'notaObtenida', v)}
                                      style={{ width: '42px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '800', color: `var(--ion-color-${materiaSeleccionada.color})`, padding: '6px 0' }}
                                    />
                                    <span style={{ color: 'var(--ion-color-medium)', fontWeight: 'bold' }}>/</span>
                                    <CampoNota
                                      campoId={`maxima-${sub.id}`}
                                      siguienteId={cat.subActividades[index + 1] ? `obtenida-${cat.subActividades[index + 1].id}` : undefined}
                                      refsMap={inputRefs}
                                      ultimoCampo={!cat.subActividades[index + 1]}
                                      value={sub.notaMaxima}
                                      min={0}
                                      max={9999}
                                      onChange={v => actualizarSubActividad(cat.id, sub.id, 'notaMaxima', v)}
                                      style={{ width: '42px', textAlign: 'center', background: 'var(--ion-color-step-100)', borderRadius: '6px', fontSize: '0.95rem', fontWeight: '700', padding: '6px 0' }}
                                    />
                                    <IonIcon icon={trashOutline} color="danger" style={{ cursor: 'pointer', fontSize: '1.2rem', marginLeft: '8px', opacity: 0.7 }} onClick={() => eliminarSubActividad(cat.id, sub.id)} />
                                  </div>
                                </IonItem>
                              ))}

                              <IonButton expand="block" fill="clear" size="small" onClick={() => agregarSubActividad(cat.id)} style={{ marginTop: '12px', fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.5px' }}>
                                + AGREGAR ACTIVIDAD A {cat.nombre.toUpperCase()}
                              </IonButton>
                            </div>
                          </div>
                        </IonAccordion>
                      );
                    })}
                  </IonAccordionGroup>

                  <IonButton expand="block" fill="outline" color={materiaSeleccionada.color} onClick={agregarCategoria} style={{ marginTop: '15px', fontWeight: '700', borderStyle: 'dashed' }}>
                    <IonIcon icon={addCircleOutline} slot="start" /> AGREGAR OTRA ACTIVIDAD
                  </IonButton>

                  {pesoIncompleto && (
                    <div style={{ background: 'rgba(var(--ion-color-danger-rgb), 0.1)', color: 'var(--ion-color-danger)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', marginTop: '10px' }}>
                      ⚠️ Las actividades de {tituloEtapa.toLowerCase()} suman {stats.pesoActivoCargado}% de tu nota.
                      {stats.pesoActivoCargado < 100
                        ? ` Te falta repartir ${(100 - stats.pesoActivoCargado).toFixed(0)}% más.`
                        : ` Ajusta los porcentajes: te sobran ${(stats.pesoActivoCargado - 100).toFixed(0)}%.`}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '30px', padding: '15px 0', borderTop: '1px dashed var(--ion-color-step-100)' }}>
                    {materiaSeleccionada.etapa === 1 && (
                      <IonButton expand="block" fill="outline" color="medium" disabled={pesoIncompleto} style={{ flex: 1 }} onClick={() => cambiarEtapa(2)}>
                        Cerrar P1 y Avanzar al P2 <IonIcon icon={arrowForwardOutline} slot="end" />
                      </IonButton>
                    )}
                    {materiaSeleccionada.etapa === 2 && (
                      <IonButton expand="block" fill="outline" color="medium" disabled={pesoIncompleto} style={{ flex: 1 }} onClick={() => cambiarEtapa(3)}>
                        Cerrar P2 y Avanzar al Práctico <IonIcon icon={arrowForwardOutline} slot="end" />
                      </IonButton>
                    )}
                    {materiaSeleccionada.etapa > 1 && (
                      <IonButton expand="block" fill="clear" color="medium" style={{ flex: 0.2 }} onClick={() => cambiarEtapa((materiaSeleccionada.etapa - 1) as EtapaEvaluacion)}>
                        <IonIcon icon={arrowUndoOutline} />
                      </IonButton>
                    )}
                  </div>
                  {pesoIncompleto && (materiaSeleccionada.etapa === 1 || materiaSeleccionada.etapa === 2) && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)', textAlign: 'center', marginTop: '-8px' }}>
                      Ajusta los pesos a 100% para poder avanzar de etapa
                    </p>
                  )}
                </div>
              </IonContent>
            );
          })()}
        </IonModal>

        {/* MODAL DE DESGLOSE DE "NECESITAS" */}
        <IonModal isOpen={isNecesitasOpen} initialBreakpoint={0.35} breakpoints={[0, 0.35]} onDidDismiss={() => setIsNecesitasOpen(false)}>
          {materiaSeleccionada && (() => {
            const stats = calcularEstadisticas(materiaSeleccionada);
            const notaAprox = stats.notaNecesaria.toFixed(1);

            return (
              <IonContent className="ion-padding">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h2 style={{ fontWeight: '800', margin: 0, color: 'var(--ion-text-color)' }}>Desglose de tu Meta</h2>
                  <IonIcon icon={close} style={{ fontSize: '1.8rem', cursor: 'pointer', color: 'var(--ion-color-medium)' }} onClick={() => setIsNecesitasOpen(false)} />
                </div>
                
                {stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada ? (
                  <div style={{ background: 'rgba(var(--ion-color-success-rgb), 0.1)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--ion-color-success)' }}>
                    <p style={{ margin: 0, color: 'var(--ion-text-color)', fontSize: '0.95rem', fontWeight: '600' }}>
                      Ya lograste o superaste tu meta propuesta. Todo lo que saques de ahora en adelante es ganancia pura.
                    </p>
                  </div>
                ) : stats.notaNecesaria > 100 ? (
                  <div style={{ background: 'rgba(var(--ion-color-danger-rgb), 0.1)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid var(--ion-color-danger)' }}>
                    <p style={{ margin: 0, color: 'var(--ion-text-color)', fontSize: '0.95rem', fontWeight: '600' }}>
                      Matemáticamente necesitas promediar un {notaAprox}/100 en lo que te falta evaluar, lo cual supera el máximo posible.
                    </p>
                  </div>
                ) : (
                  <>
                    <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.95rem', marginBottom: '15px', lineHeight: '1.4' }}>
                      Necesitas promediar <strong style={{ color: 'var(--ion-text-color)' }}>{notaAprox}/100</strong> en el resto del semestre para alcanzar tu meta de {materiaSeleccionada.notaDeseada}.
                    </p>
                    
                    <div style={{ background: 'var(--ion-color-step-50)', padding: '16px', borderRadius: '12px', borderLeft: `4px solid var(--ion-color-${materiaSeleccionada.color})` }}>
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--ion-text-color)' }}>
                        Deberías apuntar a:
                      </p>
                      
                      {materiaSeleccionada.etapa === 1 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--ion-color-medium)', fontWeight: '600' }}>Segundo Parcial:</span>
                            <span style={{ fontWeight: '700', color: 'var(--ion-text-color)' }}>&gt; {notaAprox}/100</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--ion-color-medium)', fontWeight: '600' }}>Práctico:</span>
                            <span style={{ fontWeight: '700', color: 'var(--ion-text-color)' }}>&gt; {notaAprox}/100</span>
                          </div>
                        </>
                      )}
                      
                      {materiaSeleccionada.etapa === 2 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--ion-color-medium)', fontWeight: '600' }}>Práctico:</span>
                          <span style={{ fontWeight: '700', color: 'var(--ion-text-color)' }}>&gt; {notaAprox}/100</span>
                        </div>
                      )}
                      
                      {materiaSeleccionada.etapa === 3 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--ion-color-medium)', fontWeight: '600' }}>Resto de esta etapa:</span>
                          <span style={{ fontWeight: '700', color: 'var(--ion-text-color)' }}>&gt; {notaAprox}/100</span>
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