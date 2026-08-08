import React, { useState, useRef, useMemo } from 'react';
import {
  IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonCard,
  IonItem, IonLabel, IonList, IonFab, IonFabButton, IonIcon,
  IonModal, IonButton, IonInput, IonAccordionGroup, IonAccordion, IonListHeader,
  IonSpinner, IonToast, useIonAlert, useIonRouter, IonItemSliding, IonItemOptions, IonItemOption,
  IonActionSheet
} from '@ionic/react';
import { add, close, addCircleOutline, arrowForwardOutline, arrowUndoOutline, trashOutline, schoolOutline, trendingUpOutline, alertCircleOutline, shareOutline, createOutline, eyeOutline } from 'ionicons/icons';
import confetti from 'canvas-confetti';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { useMaterias, Materia, Categoria, SubActividad, EtapaEvaluacion } from '../context/MateriasContext';
import { useEscalas } from '../context/EscalasContext';
import { getActiveKey, calcularNotaDeCategoria, calcularEstadisticas, obtenerEtiquetaEscala, generarMensajeAtencion, obtenerProgresoEtapas } from '../utils/calculos';
import { iconosDisponibles, obtenerIcono } from '../utils/iconos';
import './Tab1.css';

const clamp = (valor: number, min: number, max: number) => Math.min(max, Math.max(min, valor));

const vibrar = async (tipo: 'ligero' | 'medio' | 'exito') => {
  try {
    if (tipo === 'ligero') await Haptics.impact({ style: ImpactStyle.Light });
    else if (tipo === 'medio') await Haptics.impact({ style: ImpactStyle.Medium });
    else if (tipo === 'exito') await Haptics.notification({ type: NotificationType.Success });
  } catch (error) {
    // Silencioso: en navegador de escritorio simplemente no vibra
  }
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
    justifyContent: 'center', marginRight: '14px'
  }}>
    <IonIcon icon={obtenerIcono(claveIcono)} style={{ fontSize: '1.3rem', color: `var(--ion-color-${color}-contrast)` }} />
  </div>
);

const ProgresoEtapas = ({ etapa }: { etapa: EtapaEvaluacion }) => {
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
          opacity: p.estado === 'pendiente' ? 0.45 : 1
        }}>
          {p.label}
        </span>
      ))}
    </div>
  );
};

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

interface CampoNotaProps {
  value: number;
  onChange: (valor: number) => void;
  max?: number;
  min?: number;
  ultimoCampo?: boolean;
  readonly?: boolean;
  style?: React.CSSProperties;
  campoId?: string;
  siguienteId?: string;
  refsMap?: React.MutableRefObject<Record<string, any>>;
}

const CampoNota: React.FC<CampoNotaProps> = ({ value, onChange, max = 100, min = 0, ultimoCampo, readonly, style, campoId, siguienteId, refsMap }) => {
  const seleccionarAlEnfocar = async (e: any) => {
    try {
      const nativeInput = await e.target.getInputElement();
      nativeInput.select();
    } catch { /* en desktop sin soporte, simplemente no selecciona */ }
  };

  const manejarTecla = async (e: React.KeyboardEvent, elemento: any) => {
    if (e.key !== 'Enter') return;
    if (siguienteId && refsMap?.current[siguienteId]) {
      refsMap.current[siguienteId].setFocus();
    } else {
      const nativeInput = await elemento?.getInputElement();
      nativeInput?.blur();
    }
  };

  return (
    <IonInput
      ref={el => { if (campoId && refsMap) refsMap.current[campoId] = el; }}
      type="number"
      inputmode="decimal"
      enterkeyhint={ultimoCampo ? 'done' : 'next'}
      readonly={readonly}
      value={value}
      onIonFocus={seleccionarAlEnfocar}
      onKeyDown={e => manejarTecla(e, refsMap?.current[campoId ?? ''])}
      onIonChange={e => {
        const parsed = parseFloat(e.detail.value!);
        onChange(isNaN(parsed) ? 0 : clamp(parsed, min, max));
      }}
      style={style}
    />
  );
};

const Tab1: React.FC = () => {
  const { materias, cargando, agregarMateria, actualizarMateria, eliminarMateria, restaurarMateria } = useMaterias();
  const { escalas } = useEscalas();
  const [presentAlert] = useIonAlert();
  const router = useIonRouter();

  const [isAddMateriaOpen, setIsAddMateriaOpen] = useState(false);
  const [nuevaMateriaNombre, setNuevaMateriaNombre] = useState('');
  const [nuevoIcono, setNuevoIcono] = useState(iconosDisponibles[0].clave);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState<Materia | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
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
  const celebratedRef = useRef<Record<string, boolean>>({});
  const slidingRefs = useRef<Record<string, any>>({});
  const inputRefs = useRef<Record<string, any>>({});
  const longPressTimer = useRef<any>(null);
  const longPressActivado = useRef(false);

  const cerrarTodosSliding = () => {
    Object.values(slidingRefs.current).forEach((ref: any) => {
      try { ref?.close(); } catch (e) { /* ignorar */ }
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

  const materiaPrioritaria = materiasOrdenadas[0];
  const mensajeAtencion = materiaPrioritaria
    ? generarMensajeAtencion(materiaPrioritaria.materia, materiaPrioritaria.stats)
    : null;

  const handleAgregarMateria = () => {
    if (!nuevaMateriaNombre.trim()) return;
    agregarMateria(nuevaMateriaNombre, nuevoIcono);
    setNuevaMateriaNombre('');
    setNuevoIcono(iconosDisponibles[0].clave);
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
      await Share.share({
        title: materia.nombre,
        text: lineas.join('\n')
      });
    } catch (error) {
      console.log('Compartir cancelado o no disponible:', error);
    }
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
    actualizarMateriaActual(key, [...lista, { id: Date.now().toString(), nombre: 'Nuevo Componente', peso: 0, notaGlobalRapida: 0, subActividades: [] }]);
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
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">

        {cargando && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
            <IonSpinner name="crescent" style={{ width: '36px', height: '36px', color: 'var(--ion-color-primary)' }} />
            <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.85rem', marginTop: '12px' }}>Cargando tus materias...</p>
          </div>
        )}

        {!cargando && materias.length === 0 && (
          <EstadoVacio onCrear={() => setIsAddMateriaOpen(true)} />
        )}

        {!cargando && materias.length > 0 && (
          <>
            {mensajeAtencion && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px',
                borderRadius: '12px', marginBottom: '14px',
                background: mensajeAtencion.tipo === 'exito' ? 'rgba(45,211,111,0.12)'
                          : mensajeAtencion.tipo === 'peligro' ? 'rgba(235,68,90,0.12)'
                          : 'rgba(255,196,9,0.12)',
                color: mensajeAtencion.tipo === 'exito' ? 'var(--ion-color-success)'
                     : mensajeAtencion.tipo === 'peligro' ? 'var(--ion-color-danger)'
                     : 'var(--ion-color-warning-shade)'
              }}>
                <IonIcon icon={mensajeAtencion.tipo === 'exito' ? trendingUpOutline : alertCircleOutline} style={{ fontSize: '1.2rem', flexShrink: 0 }} />
                <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{mensajeAtencion.texto}</span>
              </div>
            )}

            <IonCard style={{ borderRadius: '16px', marginBottom: '18px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
              <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase', fontWeight: '700' }}>Promedio General</p>
                  <p style={{ margin: '4px 0 0', fontSize: '1.8rem', fontWeight: '800', color: 'var(--ion-text-color)' }}>{promedioGeneral.toFixed(1)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {materiasEnRiesgo > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ion-color-danger)' }}>
                      <IonIcon icon={alertCircleOutline} style={{ fontSize: '1.2rem' }} />
                      <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{materiasEnRiesgo} sin meta aún</span>
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

            <p style={{ margin: '0 0 8px 5px', fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>Desliza para eliminar, o mantén presionada para más opciones</p>

            <IonList style={{ background: 'transparent' }}>
              {materiasOrdenadas.map(({ materia, stats }, index) => (
                <IonItemSliding
                  key={materia.id}
                  ref={el => { slidingRefs.current[materia.id] = el; }}
                  className="tarjeta-materia"
                  style={{ animationDelay: `${index * 60}ms`, marginBottom: '14px', borderRadius: '14px', overflow: 'hidden' }}
                >
                  <IonItem
                    lines="none"
                    color="transparent"
                    onClick={() => manejarClickMateria(materia)}
                    onPointerDown={() => iniciarPresionLarga(materia)}
                    onPointerUp={cancelarPresionLarga}
                    onPointerLeave={cancelarPresionLarga}
                    style={{ '--background': 'var(--ion-card-background)', '--padding-start': '14px', '--padding-end': '14px', '--padding-top': '10px', '--padding-bottom': '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderRadius: '14px' } as any}
                  >
                    <AvatarMateria claveIcono={materia.icono || 'school'} color={materia.color} />
                    <IonLabel>
                      <h2 style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--ion-text-color)', margin: '0 0 2px 0' }}>{materia.nombre}</h2>
                      <p style={{ color: 'var(--ion-color-medium)', fontSize: '0.8rem', margin: 0 }}>
                        {obtenerEtiquetaEscala(stats.acumuladoGlobal, escalas) ?? 'Global Acumulado'}
                      </p>
                      <ProgresoEtapas etapa={materia.etapa} />
                    </IonLabel>
                    <CircularProgress value={stats.acumuladoGlobal} color={materia.color} />
                  </IonItem>
                  <IonItemOptions side="end">
                    <IonItemOption color="danger" onClick={() => solicitarEliminarDesdeSwipe(materia)}>
                      <IonIcon icon={trashOutline} slot="icon-only" />
                    </IonItemOption>
                  </IonItemOptions>
                </IonItemSliding>
              ))}
            </IonList>
          </>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ marginBottom: '20px', marginRight: '10px' }}>
          <IonFabButton color="primary" onClick={() => { cerrarTodosSliding(); setMostrarAccionesFab(true); }}><IonIcon icon={add} /></IonFabButton>
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
          duration={1800}
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
            const tituloEtapa = materiaSeleccionada.etapa === 1 ? 'Primer Parcial' : materiaSeleccionada.etapa === 2 ? 'Segundo Parcial' : 'Componente Práctico';
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

                  <div style={{ background: 'var(--ion-card-background)', borderRadius: '12px', padding: '20px', marginTop: '25px', display: 'flex', flexDirection: 'column', gap: '15px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Meta Final</p>
                        <CampoNota
                          value={materiaSeleccionada.notaDeseada}
                          onChange={v => actualizarMateriaActual('notaDeseada', v)}
                          style={{ fontWeight: '800', fontSize: '1.6rem', color: `var(--ion-color-${materiaSeleccionada.color})`, textAlign: 'center' }}
                        />
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Nota Global</p>
                        <p style={{ margin: '12px 0 0', fontWeight: '700', fontSize: '1.4rem', color: 'var(--ion-text-color)' }}>{stats.acumuladoGlobal.toFixed(1)}</p>
                        {etiquetaEscala && (
                          <p style={{ margin: '2px 0 0', fontSize: '0.7rem', fontWeight: '700', color: `var(--ion-color-${materiaSeleccionada.color})` }}>{etiquetaEscala}</p>
                        )}
                      </div>
                      <div style={{ flex: 1, borderLeft: '1px solid var(--ion-color-step-150)', paddingLeft: '10px' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)', textTransform: 'uppercase' }}>Necesitas</p>
                        <p style={{ margin: '12px 0 0', fontWeight: '800', fontSize: '1.4rem', color: stats.notaNecesaria > 100 ? 'var(--ion-color-danger)' : 'var(--ion-color-success)' }}>
                          {stats.notaNecesaria > 0 && stats.acumuladoGlobal < materiaSeleccionada.notaDeseada ? stats.notaNecesaria.toFixed(1) : '0'}
                        </p>
                      </div>
                    </div>
                    {stats.acumuladoGlobal >= materiaSeleccionada.notaDeseada && (
                      <div style={{ background: 'rgba(45, 211, 111, 0.15)', color: 'var(--ion-color-success)', padding: '10px', borderRadius: '8px', fontWeight: '800', textAlign: 'center', letterSpacing: '1px', fontSize: '0.85rem' }}>🎉 ASIGNATURA APROBADA</div>
                    )}
                  </div>
                </div>

                <div className="ion-padding">
                  <IonCard style={{ margin: '0 0 20px 0', borderRadius: '12px', background: 'var(--ion-color-step-50)', boxShadow: 'none' }}>
                    <div style={{ padding: '10px 15px', background: 'var(--ion-color-step-100)', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--ion-color-medium)', letterSpacing: '1px' }}>
                      PONDERACIÓN GLOBAL
                    </div>
                    <IonItem lines="none" color="transparent">
                      <IonLabel color="medium" style={{ fontSize: '0.85rem' }}>% Teórico (P1 + P2)</IonLabel>
                      <CampoNota
                        value={materiaSeleccionada.pesoTeorico}
                        onChange={v => actualizarMateriaActual('pesoTeorico', v)}
                        style={{ maxWidth: '50px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px', fontWeight: 'bold' }}
                      />
                      <IonLabel color="medium" style={{ fontSize: '0.85rem', marginLeft: '15px' }}>% Práctico</IonLabel>
                      <CampoNota
                        value={materiaSeleccionada.pesoPractico}
                        onChange={v => actualizarMateriaActual('pesoPractico', v)}
                        ultimoCampo
                        style={{ maxWidth: '50px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px', fontWeight: 'bold' }}
                      />
                    </IonItem>
                    {sumaPesosGlobales !== 100 && (
                      <div style={{ padding: '8px 15px 12px', fontSize: '0.75rem', color: 'var(--ion-color-danger)', fontWeight: '600' }}>
                        ⚠️ Teórico + Práctico suman {sumaPesosGlobales}%, debe ser 100%
                      </div>
                    )}
                  </IonCard>

                  {materiaSeleccionada.etapa > 1 && (
                    <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
                      <div style={{ flex: 1, padding: '10px', background: 'var(--ion-color-step-100)', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>Parcial 1</p>
                        <p style={{ margin: '5px 0 0', fontWeight: 'bold' }}>{stats.notaP1.toFixed(1)}</p>
                      </div>
                      {materiaSeleccionada.etapa === 3 && (
                        <div style={{ flex: 1, padding: '10px', background: 'var(--ion-color-step-100)', borderRadius: '8px', textAlign: 'center' }}>
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
                        <IonAccordion key={cat.id} value={cat.id} style={{ background: 'var(--ion-color-step-50)', borderRadius: '10px', marginBottom: '10px' }}>
                          <IonItem slot="header" color="transparent" lines="none">
                            <IonLabel>
                              <h3 style={{ fontWeight: '700', fontSize: '0.95rem' }}>{cat.nombre}</h3>
                              {tieneSubs && <p style={{ fontSize: '0.75rem', color: 'var(--ion-color-medium)' }}>{cat.subActividades.length} actividades • Promedio: {notaCalculada.toFixed(1)}/100</p>}
                            </IonLabel>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingRight: '10px' }} onClick={e => e.stopPropagation()}>
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--ion-color-medium)', display: 'block' }}>Nota/100</span>
                                <CampoNota
                                  readonly={tieneSubs}
                                  value={tieneSubs ? Number(notaCalculada.toFixed(1)) : cat.notaGlobalRapida}
                                  onChange={v => actualizarCategoria(cat.id, 'notaGlobalRapida', v)}
                                  style={{ width: '50px', textAlign: 'center', background: tieneSubs ? 'transparent' : 'var(--ion-color-step-150)', borderRadius: '6px', fontWeight: 'bold', color: 'var(--ion-color-primary)' }}
                                />
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--ion-color-medium)', display: 'block' }}>Peso%</span>
                                <CampoNota
                                  value={cat.peso}
                                  onChange={v => actualizarCategoria(cat.id, 'peso', v)}
                                  ultimoCampo={!tieneSubs}
                                  style={{ width: '45px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '6px', fontWeight: 'bold' }}
                                />
                              </div>
                              <IonIcon icon={trashOutline} color="danger" style={{ fontSize: '1.2rem', marginLeft: '5px', opacity: 0.8 }} onClick={() => eliminarCategoria(cat.id)} />
                            </div>
                          </IonItem>

                          <div slot="content" style={{ padding: '0 15px 15px 15px' }}>
                            <div style={{ background: 'var(--ion-card-background)', borderRadius: '8px', padding: '10px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}>

                              <IonListHeader style={{ padding: 0, minHeight: 'auto', marginBottom: '10px' }}>
                                <IonLabel style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--ion-color-medium)', margin: 0 }}>Desglose (Puntajes Específicos)</IonLabel>
                              </IonListHeader>

                              {cat.subActividades.map((sub, index) => (
                                <IonItem key={sub.id} lines="none" style={{ '--min-height': '35px', '--background': 'transparent' }}>
                                  <span style={{ fontSize: '0.8rem', color: 'var(--ion-color-medium)', marginRight: '10px' }}>#{index + 1}</span>
                                  <IonInput value={sub.nombre} onIonChange={e => actualizarSubActividad(cat.id, sub.id, 'nombre', e.detail.value!)} style={{ fontSize: '0.9rem' }} placeholder="Nombre" />

                                  <div slot="end" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <CampoNota
                                      campoId={`obtenida-${sub.id}`}
                                      siguienteId={`maxima-${sub.id}`}
                                      refsMap={inputRefs}
                                      value={sub.notaObtenida}
                                      min={0}
                                      max={sub.notaMaxima || 0}
                                      onChange={v => actualizarSubActividad(cat.id, sub.id, 'notaObtenida', v)}
                                      style={{ width: '40px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold', color: `var(--ion-color-${materiaSeleccionada.color})` }}
                                    />
                                    <span style={{ color: 'var(--ion-color-medium)' }}>/</span>
                                    <CampoNota
                                      campoId={`maxima-${sub.id}`}
                                      siguienteId={cat.subActividades[index + 1] ? `obtenida-${cat.subActividades[index + 1].id}` : undefined}
                                      refsMap={inputRefs}
                                      ultimoCampo={!cat.subActividades[index + 1]}
                                      value={sub.notaMaxima}
                                      min={0}
                                      max={9999}
                                      onChange={v => actualizarSubActividad(cat.id, sub.id, 'notaMaxima', v)}
                                      style={{ width: '40px', textAlign: 'center', background: 'var(--ion-color-step-150)', borderRadius: '4px', fontSize: '0.9rem' }}
                                    />
                                    <IonIcon icon={trashOutline} color="danger" style={{ cursor: 'pointer', fontSize: '1.1rem', marginLeft: '5px', opacity: 0.6 }} onClick={() => eliminarSubActividad(cat.id, sub.id)} />
                                  </div>
                                </IonItem>
                              ))}

                              <IonButton expand="block" fill="clear" size="small" onClick={() => agregarSubActividad(cat.id)} style={{ marginTop: '10px', fontSize: '0.8rem' }}>
                                + Agregar Actividad a {cat.nombre}
                              </IonButton>
                            </div>
                          </div>
                        </IonAccordion>
                      );
                    })}
                  </IonAccordionGroup>

                  <IonButton expand="block" fill="outline" color={materiaSeleccionada.color} onClick={agregarCategoria} style={{ marginTop: '15px', fontWeight: '700', borderStyle: 'dashed' }}>
                    <IonIcon icon={addCircleOutline} slot="start" /> NUEVO COMPONENTE
                  </IonButton>

                  {pesoIncompleto && (
                    <div style={{ background: 'rgba(255, 73, 97, 0.1)', color: 'var(--ion-color-danger)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center', marginTop: '10px' }}>
                      ⚠️ Los pesos de {tituloEtapa.toLowerCase()} suman {stats.pesoActivoCargado}%.
                      {stats.pesoActivoCargado < 100
                        ? ` Faltan ${(100 - stats.pesoActivoCargado).toFixed(0)}% por asignar.`
                        : ` Sobran ${(stats.pesoActivoCargado - 100).toFixed(0)}%.`}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', marginTop: '30px', padding: '15px 0', borderTop: '1px dashed var(--ion-color-step-150)' }}>
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

        <IonModal isOpen={isAddMateriaOpen} initialBreakpoint={0.55} breakpoints={[0, 0.55]} onDidDismiss={() => setIsAddMateriaOpen(false)}>
          <IonContent className="ion-padding">
            <h2 style={{fontWeight:'800', marginTop:'15px', color: 'var(--ion-text-color)'}}>Nueva Asignatura</h2>
            <IonItem className="ion-margin-top" color="transparent" lines="full">
              <IonLabel position="stacked" color="medium">Nombre de la materia</IonLabel>
              <IonInput value={nuevaMateriaNombre} onIonChange={e => setNuevaMateriaNombre(e.detail.value!)} placeholder="Ej. Cálculo" style={{ fontWeight: '600', marginTop: '6px' }} />
            </IonItem>

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