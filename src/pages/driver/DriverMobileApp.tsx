import {
  AlertCircle,
  ArrowLeft,
  BellRing,
  Bike,
  Camera,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  History,
  KeyRound,
  LocateFixed,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  Moon,
  Navigation,
  Package,
  Phone,
  RefreshCw,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Sun,
  Truck,
  User,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CashFcfaLogo,
  MtnMomoLogo,
  OrangeMoneyLogo,
  PaymentMethodMark,
} from '../../components/common/PaymentBrandLogos';
import { SignaturePad } from '../../components/common/SignaturePad';
import {
  Btn,
  RestaurantLogo,
  StatusPill,
  formatShortDateTime,
  kitchenStatusMeta,
} from '../../components/restaurant/ui/Primitives';
import { StorageService } from '../../services/storage.service';
import { useErp } from '../../store/erp.context';
import type { ErpOrder, GeoSnapshot, KitchenStatus, PaymentMethod } from '../../types/erp';
import { formatFCFA } from '../../utils/currency';
import { captureCurrentGeo, formatGeoWatermark, getFreshCachedGeo } from '../../utils/geo';
import { compressAndWatermarkProofPhoto } from '../../utils/image';
import { inspectDeliveryProofPhoto } from '../../utils/photoInspector';
import { soundNotifier } from '../../utils/sound';

type DriverTab = 'MISSIONS' | 'HISTORY' | 'EARNINGS' | 'PROFILE';

interface DriverMobileAppProps {
  onBackToDashboard?: () => void;
}

const ACTIVE_DRIVER_KEY = 'dineo_active_driver_v1';

export const DriverMobileApp: React.FC<DriverMobileAppProps> = ({ onBackToDashboard }) => {
  const {
    state,
    assignDriver,
    updateDeliveryStatus,
    completeDeliveryWithProof,
    toggleDriverAvailability,
    toggleDarkMode,
    soundEnabled,
    toggleSound,
  } = useErp();

  const [activeDriverId, setActiveDriverId] = useState<string | null>(() =>
    StorageService.get<string | null>(ACTIVE_DRIVER_KEY, state.drivers[0]?.id || null)
  );
  const [activeTab, setActiveTab] = useState<DriverTab>('MISSIONS');

  // Sticky Kitchen-Ready Alert State (10 secondes)
  const [readyAlertOrderId, setReadyAlertOrderId] = useState<string | null>(null);
  const [alarmRinging, setAlarmRinging] = useState(false);

  // Proof of Delivery (Camera + GPS + 4-digit PIN / Manager Override + Signature + Doorstep Collection)
  const [deliveringOrder, setDeliveringOrder] = useState<ErpOrder | null>(null);
  const [collectedMethod, setCollectedMethod] = useState<PaymentMethod>('ESPECES');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [proofPhoto, setProofPhoto] = useState<string>('');
  const [proofGeo, setProofGeo] = useState<GeoSnapshot | undefined>(undefined);
  const [photoQualityScore, setPhotoQualityScore] = useState<number | undefined>(undefined);
  const [photoRejection, setPhotoRejection] = useState<string>('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinShake, setPinShake] = useState(false);
  const [bypassPinMode, setBypassPinMode] = useState(false);
  const [bypassReason, setBypassReason] = useState('Téléphone client déchargé / batterie vide');
  const [managerOverrideCode, setManagerOverrideCode] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientSignature, setRecipientSignature] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'photo' | 'pinCode' | 'recipientName' | 'recipientSignature' | 'managerOverrideCode', string>>
  >({});
  const [proofError, setProofError] = useState('');
  const [reconcileSent, setReconcileSent] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const pendingCameraOrderRef = useRef<ErpOrder | null>(null);

  // Pré-chauffe discrètement le GPS dès qu'un livreur ouvre son espace pour des coordonnées instantanées à la remise
  useEffect(() => {
    if (activeDriverId) {
      captureCurrentGeo(6000).catch(() => {});
    }
  }, [activeDriverId]);

  const currentDriver = useMemo(
    () => state.drivers.find((d) => d.id === activeDriverId) || null,
    [state.drivers, activeDriverId]
  );

  const selectDriver = (id: string | null) => {
    soundNotifier.unlockAudio();
    soundNotifier.stopDriverReadyAlarm();
    setAlarmRinging(false);
    setReadyAlertOrderId(null);
    setActiveDriverId(id);
    StorageService.set(ACTIVE_DRIVER_KEY, id);
  };

  // All delivery orders
  const allDeliveryOrders = useMemo(
    () => state.orders.filter((o) => o.channel === 'LIVRAISON' && o.kitchenStatus !== 'ANNULEE'),
    [state.orders]
  );

  // My active assigned orders (ASSIGNEE or EN_ROUTE)
  const myActiveMissions = useMemo(
    () =>
      allDeliveryOrders.filter(
        (o) => o.driverId === currentDriver?.id && o.deliveryStatus !== 'LIVREE'
      ),
    [allDeliveryOrders, currentDriver]
  );

  // Available unassigned orders waiting at the restaurant
  const availablePool = useMemo(
    () =>
      allDeliveryOrders.filter(
        (o) => !o.driverId && o.deliveryStatus !== 'LIVREE'
      ),
    [allDeliveryOrders]
  );

  // My completed deliveries
  const myHistory = useMemo(
    () =>
      allDeliveryOrders.filter(
        (o) => o.driverId === currentDriver?.id && o.deliveryStatus === 'LIVREE'
      ),
    [allDeliveryOrders, currentDriver]
  );

  // Live Watcher: detect the exact moment Kitchen (KDS) marks an assigned order PRETE → 5-second persistent alarm!
  const prevKitchenMapRef = useRef<Map<string, KitchenStatus>>(new Map());
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!currentDriver) {
      prevKitchenMapRef.current = new Map();
      hasInitializedRef.current = false;
      return;
    }

    const prevMap = prevKitchenMapRef.current;
    let newlyReadyOrder: ErpOrder | null = null;

    for (const ord of myActiveMissions) {
      const prevStatus = prevMap.get(ord.id);
      const justBecameReady =
        hasInitializedRef.current &&
        ord.deliveryStatus === 'ASSIGNEE' &&
        ord.kitchenStatus === 'PRETE' &&
        prevStatus !== 'PRETE' &&
        prevStatus !== 'SERVIE';

      if (justBecameReady) {
        newlyReadyOrder = ord;
      }
    }

    const nextMap = new Map<string, KitchenStatus>();
    for (const ord of myActiveMissions) {
      nextMap.set(ord.id, ord.kitchenStatus);
    }
    prevKitchenMapRef.current = nextMap;
    hasInitializedRef.current = true;

    if (newlyReadyOrder) {
      const readyId = newlyReadyOrder.id;
      queueMicrotask(() => {
        setReadyAlertOrderId(readyId);
        setAlarmRinging(true);
      });
      soundNotifier.playDriverReadyAlarm(10, () => {
        setAlarmRinging(false);
      });
    }
  }, [myActiveMissions, currentDriver]);

  // Clean up alarm on unmount
  useEffect(() => {
    return () => {
      soundNotifier.stopDriverReadyAlarm();
    };
  }, []);

  const dismissReadyAlert = () => {
    soundNotifier.stopDriverReadyAlarm();
    setAlarmRinging(false);
    setReadyAlertOrderId(null);
  };

  const handleTestAlarm = () => {
    soundNotifier.unlockAudio();
    if (alarmRinging) {
      soundNotifier.stopDriverReadyAlarm();
      setAlarmRinging(false);
    } else {
      setAlarmRinging(true);
      soundNotifier.playDriverReadyAlarm(10, () => {
        setAlarmRinging(false);
      });
    }
  };

  const handleStartDelivery = (orderId: string) => {
    soundNotifier.unlockAudio();
    if (readyAlertOrderId === orderId) {
      dismissReadyAlert();
    }
    updateDeliveryStatus(orderId, 'EN_ROUTE');
  };

  const handleClaimOrder = (orderId: string) => {
    if (!currentDriver) return;
    // Unlocks Web Audio on this tap so when the chef clicks "Prêt" 10 min later, the 5s alarm rings cleanly!
    soundNotifier.unlockAudio();
    assignDriver(orderId, currentDriver.id);
  };

  const readyAlertOrder = useMemo(
    () =>
      readyAlertOrderId
        ? myActiveMissions.find((o) => o.id === readyAlertOrderId && o.deliveryStatus === 'ASSIGNEE') || null
        : null,
    [readyAlertOrderId, myActiveMissions]
  );

  // Financial & Cash-to-return reconciliation for end of shift
  const finance = useMemo(() => {
    const driverOrders = allDeliveryOrders.filter((o) => o.driverId === currentDriver?.id);
    let cashToReturn = 0;
    let digitalCollected = 0;
    let deliveryFeesEarned = 0;

    for (const o of driverOrders) {
      if (o.deliveryStatus === 'LIVREE') {
        deliveryFeesEarned += o.deliveryFee;
      }
      for (const p of o.payments) {
        if (p.method === 'ESPECES') cashToReturn += p.amount;
        else digitalCollected += p.amount;
      }
    }

    return {
      cashToReturn,
      digitalCollected,
      deliveryFeesEarned,
      deliveredCount: myHistory.length,
    };
  }, [allDeliveryOrders, currentDriver, myHistory.length]);

  // Lance directement la caméra arrière dès le clic sur "Confirmer la livraison" (et lance le fix GPS en parallèle)
  const triggerDirectCameraDelivery = (order: ErpOrder) => {
    soundNotifier.unlockAudio();
    captureCurrentGeo(6000).catch(() => {});
    pendingCameraOrderRef.current = order;
    cameraInputRef.current?.click();
  };

  const triggerPinErrorFeedback = (message: string) => {
    setProofError(message);
    soundNotifier.playErrorFeedback();
    setPinShake(false);
    window.requestAnimationFrame(() => {
      setPinShake(true);
      window.setTimeout(() => setPinShake(false), 480);
    });
  };

  const handleCaptureProofPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetOrder = pendingCameraOrderRef.current || deliveringOrder;
    e.target.value = '';
    if (!file || !targetOrder) return;

    // Ouvre immédiatement la fiche minimaliste de clôture si elle vient du déclenchement direct
    if (!deliveringOrder || deliveringOrder.id !== targetOrder.id) {
      setDeliveringOrder(targetOrder);
      setCollectedMethod(targetOrder.paymentMethod || 'ESPECES');
      setDeliveryNote('');
      setPinCode('');
      setManagerOverrideCode('');
      setRecipientName('');
      setRecipientSignature('');
      setBypassPinMode(!targetOrder.deliveryCode);
      setProofPhoto('');
      setProofGeo(undefined);
      setPhotoQualityScore(undefined);
      setPhotoRejection('');
      setFieldErrors({});
    }

    setPhotoLoading(true);
    setProofError('');
    setPhotoRejection('');
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.photo;
      return next;
    });

    try {
      // 1. Inspection forensique anti-fraude (doigt sur caméra, image noire, mur uni, flou, galerie)
      const inspection = await inspectDeliveryProofPhoto(file);
      if (!inspection.valid) {
        setProofPhoto('');
        setPhotoQualityScore(undefined);
        setPhotoRejection(
          inspection.reason ||
            'Photo non conforme. Reprenez une photo nette du colis livré.'
        );
        soundNotifier.playErrorFeedback();
        return;
      }

      // 2. Capture GPS + filigrane indélébile horodaté + score qualité
      const geo = getFreshCachedGeo() || (await captureCurrentGeo(4500));
      setProofGeo(geo);
      setPhotoQualityScore(inspection.score);

      const nowLabel = new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const stamped = await compressAndWatermarkProofPhoto(
        file,
        `${targetOrder.orderNumber} · ${targetOrder.deliveryNeighborhood || 'Maroua'} · ${state.settings.name}`,
        `${nowLabel} · ${currentDriver?.name || 'Livreur'} · Netteté ${inspection.score}%`,
        formatGeoWatermark(geo),
        Boolean(geo)
      );
      setProofPhoto(stamped);
    } catch {
      setPhotoRejection('Impossible d’analyser la photo. Appuyez sur « Reprendre » pour réessayer.');
      soundNotifier.playErrorFeedback();
    } finally {
      pendingCameraOrderRef.current = null;
      setPhotoLoading(false);
    }
  };

  const closeDeliverSheet = () => {
    pendingCameraOrderRef.current = null;
    setDeliveringOrder(null);
    setProofPhoto('');
    setProofGeo(undefined);
    setPhotoQualityScore(undefined);
    setPhotoRejection('');
    setPinCode('');
    setManagerOverrideCode('');
    setRecipientName('');
    setRecipientSignature('');
    setDeliveryNote('');
    setFieldErrors({});
    setProofError('');
  };

  const handleConfirmDelivered = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliveringOrder) return;
    setProofError('');

    const nextFieldErrors: Partial<
      Record<'photo' | 'pinCode' | 'recipientName' | 'recipientSignature' | 'managerOverrideCode', string>
    > = {};

    if (!proofPhoto) {
      nextFieldErrors.photo =
        photoRejection || 'Prenez d’abord une photo nette et valide du colis remis au client.';
    }

    if (deliveringOrder.deliveryCode) {
      if (!bypassPinMode) {
        if (pinCode.trim().length < 4) {
          nextFieldErrors.pinCode = 'Saisissez les 4 chiffres du code de remise affiché chez le client.';
        }
      } else {
        if (recipientName.trim().length < 2) {
          nextFieldErrors.recipientName = 'Indiquez le nom complet de la personne qui réceptionne le colis.';
        }
        if (!recipientSignature) {
          nextFieldErrors.recipientSignature = 'La signature au doigt du réceptionnaire est obligatoire.';
        }
        if (managerOverrideCode.trim().length < 4) {
          nextFieldErrors.managerOverrideCode = 'Saisissez le code dérogation à 4 chiffres dicté par la Caisse.';
        }
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      triggerPinErrorFeedback(Object.values(nextFieldErrors)[0] || 'Vérifiez les champs indiqués en rouge.');
      return;
    }

    setFieldErrors({});

    const remaining = Math.max(0, deliveringOrder.total - deliveringOrder.amountPaid);
    const res = completeDeliveryWithProof({
      orderId: deliveringOrder.id,
      photoDataUrl: proofPhoto,
      photoQualityScore,
      geo: proofGeo,
      pinEntered: bypassPinMode ? undefined : pinCode,
      bypassPinReason: bypassPinMode ? bypassReason : undefined,
      managerOverrideEntered: bypassPinMode ? managerOverrideCode : undefined,
      recipientName: bypassPinMode ? recipientName : undefined,
      recipientSignature: bypassPinMode ? recipientSignature : undefined,
      paymentCollected: remaining > 0 ? { amount: remaining, method: collectedMethod } : undefined,
      note: deliveryNote.trim() || undefined,
      driverName: currentDriver?.name || 'Livreur',
    });

    if (!res.ok) {
      if (bypassPinMode) {
        setFieldErrors({ managerOverrideCode: res.error || 'Code de dérogation Caisse incorrect.' });
      } else {
        setFieldErrors({ pinCode: res.error || 'Code de remise client incorrect.' });
      }
      triggerPinErrorFeedback(res.error || 'Validation impossible.');
      return;
    }

    soundNotifier.playSuccessHaptic();
    closeDeliverSheet();
  };

  const openMapsUrl = (order: ErpOrder) => {
    const query = encodeURIComponent(
      `${order.deliveryAddress || ''} ${order.deliveryNeighborhood || ''}, Maroua, Cameroun`.trim()
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank', 'noopener');
  };

  const openWhatsApp = (order: ErpOrder) => {
    const digits = (order.customerPhone || '').replace(/\D/g, '');
    const intl = digits.startsWith('237') ? digits : `237${digits}`;
    const msg = encodeURIComponent(
      `Bonjour ${order.customerName}, je suis ${currentDriver?.name || 'votre livreur'} de ${state.settings.name}. Je suis en route vers ${order.deliveryNeighborhood || 'votre quartier'} avec votre commande ${order.orderNumber}.`
    );
    window.open(`https://wa.me/${intl}?text=${msg}`, '_blank', 'noopener');
  };

  // LOGIN / DRIVER SELECTION SCREEN
  if (!currentDriver) {
    return (
      <div
        className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6"
        style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-primary)' }}
      >
        <div className="w-full max-w-[430px] space-y-6">
          <div className="flex flex-col items-center text-center space-y-2.5">
            <RestaurantLogo logoUrl={state.settings.logoUrl} name={state.settings.name} size="lg" />
            <div>
              <h1 className="text-[20px] font-semibold tracking-[-0.02em]">Espace Livreur · Maroua</h1>
              <p className="text-[13px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                {state.settings.name} — Sélectionnez votre profil moto-livreur
              </p>
            </div>
          </div>

          <div
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
            className="rounded-2xl border p-5 space-y-3 shadow-sm"
          >
            {state.drivers.map((drv) => (
              <button
                key={drv.id}
                type="button"
                onClick={() => selectDriver(drv.id)}
                style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                className="w-full p-3.5 rounded-xl border text-left hover:border-[var(--border-strong)] transition-all cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[14px] flex items-center gap-2">
                    <Bike className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                    <span className="truncate">{drv.name}</span>
                  </div>
                  <div className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--ink-muted)' }}>
                    {drv.vehicleInfo}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>
                    {drv.zone}
                  </div>
                </div>
                <span className="text-[12px] font-semibold shrink-0" style={{ color: 'var(--accent)' }}>
                  Entrer →
                </span>
              </button>
            ))}
          </div>

          {onBackToDashboard && (
            <div className="text-center">
              <button
                type="button"
                onClick={onBackToDashboard}
                className="text-[12.5px] font-medium hover:underline cursor-pointer inline-flex items-center gap-1"
                style={{ color: 'var(--ink-muted)' }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Retour au Dashboard Restaurant
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const remainingDelivering = deliveringOrder
    ? Math.max(0, deliveringOrder.total - deliveringOrder.amountPaid)
    : 0;

  return (
    <div
      className="min-h-[100dvh] flex flex-col"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--ink-primary)' }}
    >
      {/* Top Bar — Mobile-First AND Full Responsive on Desktop */}
      <header
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        className="sticky top-0 z-30 border-b"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <RestaurantLogo logoUrl={state.settings.logoUrl} name={state.settings.name} size="md" />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold truncate leading-tight flex items-center gap-1.5">
                <span>{currentDriver.name}</span>
                <span className="hidden sm:inline text-[11px] font-normal" style={{ color: 'var(--ink-muted)' }}>
                  · Livreur
                </span>
              </div>
              <div className="text-[11px] truncate" style={{ color: 'var(--ink-muted)' }}>
                {currentDriver.vehicleInfo}
              </div>
            </div>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex items-center gap-1">
            {(
              [
                { id: 'MISSIONS', label: 'Courses', count: myActiveMissions.length + availablePool.length },
                { id: 'HISTORY', label: 'Historique', count: myHistory.length },
                { id: 'EARNINGS', label: 'Caisse & Gains' },
                { id: 'PROFILE', label: 'Profil' },
              ] as const
            ).map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    backgroundColor: active ? 'var(--bg-subtle)' : 'transparent',
                    color: active ? 'var(--ink-primary)' : 'var(--ink-muted)',
                  }}
                  className="px-3 py-1.5 rounded-lg text-[13px] font-medium cursor-pointer flex items-center gap-1.5"
                >
                  <span>{t.label}</span>
                  {'count' in t && t.count > 0 && (
                    <span
                      className="text-[11px] px-1.5 rounded-full tabular-nums"
                      style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Controls: Sound Alarm Test/Toggle + Availability + Theme + Dashboard */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleTestAlarm}
              style={{
                backgroundColor: alarmRinging ? 'var(--accent)' : 'var(--bg-subtle)',
                borderColor: alarmRinging ? 'var(--accent)' : 'var(--border-hairline)',
                color: alarmRinging ? '#FFFFFF' : 'var(--ink-secondary)',
              }}
              className="h-8 px-2.5 rounded-full border text-[11.5px] font-medium inline-flex items-center gap-1 cursor-pointer"
              title="Tester la sonnerie d’alerte cuisine prête (10 secondes)"
            >
              <BellRing className={`w-3.5 h-3.5 ${alarmRinging ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{alarmRinging ? 'Couper' : 'Test 10s'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundNotifier.unlockAudio();
                toggleSound();
              }}
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
              className="w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer"
              title={soundEnabled ? 'Alertes sonores activées' : 'Alertes sonores coupées'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => {
                soundNotifier.unlockAudio();
                toggleDriverAvailability(currentDriver.id);
              }}
              style={{
                backgroundColor: currentDriver.isAvailable ? 'var(--ok-bg)' : 'var(--warn-bg)',
                borderColor: currentDriver.isAvailable ? 'var(--ok-border)' : 'var(--warn-border)',
                color: currentDriver.isAvailable ? 'var(--ok-text)' : 'var(--warn-text)',
              }}
              className="h-8 px-2.5 rounded-full border text-[11.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: currentDriver.isAvailable ? 'var(--ok-dot)' : 'var(--warn-dot)' }}
              />
              <span>{currentDriver.isAvailable ? 'En ligne' : 'Occupé'}</span>
            </button>

            <button
              type="button"
              onClick={toggleDarkMode}
              style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
              className="w-8 h-8 rounded-full border flex items-center justify-center cursor-pointer"
              aria-label="Thème"
            >
              {state.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                style={{ borderColor: 'var(--border-hairline)', color: 'var(--ink-secondary)' }}
                className="hidden sm:inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border text-[12px] font-medium cursor-pointer hover:bg-[var(--bg-subtle)]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Dashboard
              </button>
            )}
          </div>
        </div>
      </header>

      {/* High-Priority Sticky Alert Banner when Kitchen marks an assigned order PRETE */}
      {readyAlertOrder && (
        <div
          style={{ backgroundColor: 'var(--ok-bg)', borderColor: 'var(--ok-border)' }}
          className="border-b px-4 py-3.5 sticky top-14 z-20 shadow-sm"
        >
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white"
                style={{ backgroundColor: 'var(--ok-dot)' }}
              >
                <BellRing className={`w-5 h-5 ${alarmRinging ? 'animate-bounce' : ''}`} />
              </div>
              <div>
                <div className="text-[14px] font-semibold" style={{ color: 'var(--ok-text)' }}>
                  COMMANDE PRÊTE EN CUISINE · {readyAlertOrder.orderNumber}
                </div>
                <div className="text-[12.5px]" style={{ color: 'var(--ink-primary)' }}>
                  Colis prêt au passe pour <strong>{readyAlertOrder.deliveryNeighborhood || 'Maroua'}</strong> ({readyAlertOrder.customerName}). Vous pouvez récupérer et partir !
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Btn variant="secondary" size="sm" onClick={dismissReadyAlert}>
                {alarmRinging ? 'Couper l’alerte' : 'Fermer'}
              </Btn>
              <Btn
                variant="accent"
                size="sm"
                leftIcon={<Bike className="w-4 h-4" />}
                onClick={() => handleStartDelivery(readyAlertOrder.id)}
              >
                Récupérer & Partir
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-10">
        {/* TAB 1: MISSIONS */}
        {activeTab === 'MISSIONS' && (
          <div className="space-y-6">
            {/* Quick Summary Strip */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
              <div
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                className="rounded-xl border p-3.5"
              >
                <div className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>
                  Mes courses
                </div>
                <div className="text-[20px] font-semibold tabular-nums mt-0.5">{myActiveMissions.length}</div>
              </div>
              <div
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                className="rounded-xl border p-3.5"
              >
                <div className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>
                  À prendre
                </div>
                <div className="text-[20px] font-semibold tabular-nums mt-0.5" style={{ color: 'var(--accent)' }}>
                  {availablePool.length}
                </div>
              </div>
              <div
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                className="rounded-xl border p-3.5"
              >
                <div className="text-[11px] font-medium" style={{ color: 'var(--ink-muted)' }}>
                  Cash en main
                </div>
                <div className="text-[16px] sm:text-[18px] font-semibold tabular-nums mt-1 truncate">
                  {formatFCFA(finance.cashToReturn)}
                </div>
              </div>
            </div>

            {/* Section 1: My Assigned Active Missions */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">Mes livraisons en cours ({myActiveMissions.length})</h2>
              </div>

              {myActiveMissions.length === 0 ? (
                <div
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                  className="rounded-2xl border p-8 text-center space-y-1.5"
                >
                  <Bike className="w-7 h-7 mx-auto opacity-35" />
                  <div className="text-[14px] font-medium">Aucune course assignée pour le moment</div>
                  <p className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                    Vous pouvez réserver une course ci-dessous dès maintenant : une sonnerie de 5 s vous avertira dès que la cuisine la marquera Prête.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {myActiveMissions.map((ord) => {
                    const remaining = Math.max(0, ord.total - ord.amountPaid);
                    const isEnRoute = ord.deliveryStatus === 'EN_ROUTE';
                    const isKitchenReady = ord.kitchenStatus === 'PRETE' || ord.kitchenStatus === 'SERVIE';
                    const kMeta = kitchenStatusMeta(ord.kitchenStatus);

                    return (
                      <div
                        key={ord.id}
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor:
                            isEnRoute
                              ? 'var(--accent)'
                              : isKitchenReady
                              ? 'var(--ok-border)'
                              : 'var(--border-hairline)',
                        }}
                        className="rounded-2xl border p-4 sm:p-5 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-semibold text-[14px]">{ord.orderNumber}</span>
                              <StatusPill tone={kMeta.tone}>Cuisine : {kMeta.label}</StatusPill>
                              {isEnRoute && <StatusPill tone="accent">En route</StatusPill>}
                            </div>
                            <div className="text-[11.5px] mt-1 flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                              <Clock className="w-3 h-3" />
                              {formatShortDateTime(ord.createdAt)}
                            </div>
                          </div>
                          <span className="text-[12px] font-semibold tabular-nums px-2 py-0.5 rounded-md shrink-0" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                            Course {formatFCFA(ord.deliveryFee)}
                          </span>
                        </div>

                        {/* Destination Neighborhood & Landmark */}
                        <div
                          className="p-3.5 rounded-xl border space-y-1.5"
                          style={{ borderColor: 'var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}
                        >
                          <div className="flex items-center gap-1.5 text-[15px] font-semibold">
                            <MapPin className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
                            <span>{ord.deliveryNeighborhood || 'Maroua'}</span>
                          </div>
                          {ord.deliveryAddress && (
                            <p className="text-[13px]" style={{ color: 'var(--ink-secondary)' }}>
                              {ord.deliveryAddress}
                            </p>
                          )}
                          <div className="text-[12.5px] pt-1 flex items-center justify-between">
                            <span className="font-medium">{ord.customerName}</span>
                            {ord.customerPhone && (
                              <span className="font-mono text-[12px]" style={{ color: 'var(--ink-muted)' }}>
                                {ord.customerPhone}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Exact Collection Banner */}
                        {remaining > 0 ? (
                          <div
                            className="p-3.5 rounded-xl border flex items-center justify-between gap-3"
                            style={{ backgroundColor: 'var(--warn-bg)', borderColor: 'var(--warn-border)' }}
                          >
                            <div>
                              <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: 'var(--warn-text)' }}>
                                Montant à encaisser à la porte
                              </div>
                              <div className="text-[11.5px] mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--ink-secondary)' }}>
                                <span>Préférence :</span>
                                <PaymentMethodMark method={ord.paymentMethod} size="xs" showLabel />
                              </div>
                            </div>
                            <span className="text-[19px] font-semibold tabular-nums shrink-0" style={{ color: 'var(--warn-text)' }}>
                              {formatFCFA(remaining)}
                            </span>
                          </div>
                        ) : (
                          <div
                            className="p-3 rounded-xl border flex items-center justify-between gap-2"
                            style={{ backgroundColor: 'var(--ok-bg)', borderColor: 'var(--ok-border)', color: 'var(--ok-text)' }}
                          >
                            <span className="text-[12.5px] font-semibold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              Commande déjà payée — 0 FCFA à encaisser
                            </span>
                            <PaymentMethodMark method={ord.paymentMethod} size="xs" />
                          </div>
                        )}

                        {/* Items summary */}
                        <div className="text-[12.5px] space-y-1">
                          <div className="text-[11px] uppercase tracking-wider font-medium flex items-center gap-1" style={{ color: 'var(--ink-muted)' }}>
                            <Package className="w-3.5 h-3.5" />
                            Contenu du colis ({ord.items.reduce((s, i) => s + i.quantity, 0)} articles)
                          </div>
                          {ord.items.map((it) => (
                            <div key={it.id} className="flex justify-between">
                              <span>
                                <strong>{it.quantity}×</strong> {it.name}
                              </span>
                              <span className="tabular-nums" style={{ color: 'var(--ink-muted)' }}>
                                {formatFCFA(it.totalPrice)}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* One-tap Call / WhatsApp / Maps */}
                        <div className="grid grid-cols-3 gap-2">
                          <a
                            href={`tel:${ord.customerPhone || state.settings.phone}`}
                            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
                            className="h-10 rounded-xl border text-[12px] font-medium flex items-center justify-center gap-1.5"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Appeler
                          </a>
                          <button
                            type="button"
                            onClick={() => openWhatsApp(ord)}
                            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
                            className="h-10 rounded-xl border text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            onClick={() => openMapsUrl(ord)}
                            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
                            className="h-10 rounded-xl border text-[12px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            Itinéraire
                          </button>
                        </div>

                        {/* STRICT KITCHEN-READY GUARD ON DEPARTURE CTA */}
                        {!isEnRoute ? (
                          isKitchenReady ? (
                            <button
                              type="button"
                              onClick={() => handleStartDelivery(ord.id)}
                              style={{ backgroundColor: 'var(--ok-dot)', color: '#FFFFFF' }}
                              className="w-full h-12 rounded-xl text-[13.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985] transition-transform shadow-sm"
                            >
                              <Bike className="w-4 h-4" />
                              Colis prêt — Récupérer & Partir
                            </button>
                          ) : (
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                disabled
                                style={{
                                  backgroundColor: 'var(--bg-subtle)',
                                  borderColor: 'var(--border-hairline)',
                                  color: 'var(--ink-muted)',
                                }}
                                className="w-full h-12 rounded-xl border text-[13px] font-medium flex items-center justify-center gap-2 cursor-not-allowed"
                              >
                                <Lock className="w-4 h-4" />
                                <ChefHat className="w-4 h-4" />
                                <span>
                                  {ord.kitchenStatus === 'NOUVELLE'
                                    ? 'En attente prise en charge cuisine...'
                                    : 'En cours de cuisson — Départ verrouillé'}
                                </span>
                              </button>
                              <p className="text-[11.5px] text-center" style={{ color: 'var(--ink-muted)' }}>
                                Une alerte sonore (10 s) retentira dès que la cuisine validera « Prête ».
                              </p>
                            </div>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => triggerDirectCameraDelivery(ord)}
                            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
                            className="w-full h-12 rounded-xl text-[13.5px] font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-[0.985] transition-transform shadow-sm"
                          >
                            <Camera className="w-4 h-4 shrink-0" />
                            {remaining > 0
                              ? `Confirmer & encaisser ${formatFCFA(remaining)}`
                              : 'Confirmer la livraison'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Section 2: Unassigned Orders Waiting at Restaurant (Driver can reserve/claim anytime!) */}
            <section className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-semibold">
                  Courses disponibles au restaurant ({availablePool.length})
                </h2>
                <span className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                  Réservables avant la fin de cuisson
                </span>
              </div>

              {availablePool.length === 0 ? (
                <div
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)' }}
                  className="rounded-xl border p-5 text-[13px] text-center"
                >
                  Toutes les commandes de livraison sont déjà assignées.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {availablePool.map((ord) => {
                    const remaining = Math.max(0, ord.total - ord.amountPaid);
                    const kMeta = kitchenStatusMeta(ord.kitchenStatus);
                    return (
                      <div
                        key={ord.id}
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                        className="rounded-2xl border p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono font-semibold text-[13.5px]">{ord.orderNumber}</span>
                              <StatusPill tone={kMeta.tone}>Cuisine : {kMeta.label}</StatusPill>
                            </div>
                            <div className="text-[14.5px] font-semibold mt-1 flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                              {ord.deliveryNeighborhood || 'Maroua'}
                            </div>
                            {ord.deliveryAddress && (
                              <div className="text-[12px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                                {ord.deliveryAddress}
                              </div>
                            )}
                          </div>
                          <div className="text-right tabular-nums shrink-0">
                            <div className="text-[11px]" style={{ color: 'var(--ink-muted)' }}>
                              Frais livr.
                            </div>
                            <div className="font-semibold text-[14px]" style={{ color: 'var(--accent)' }}>
                              {formatFCFA(ord.deliveryFee)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t text-[12px]" style={{ borderColor: 'var(--border-hairline)' }}>
                          <span style={{ color: 'var(--ink-muted)' }}>
                            {remaining > 0 ? `À encaisser : ${formatFCFA(remaining)}` : 'Déjà payée'}
                          </span>
                          <Btn
                            variant="accent"
                            size="sm"
                            leftIcon={<Truck className="w-3.5 h-3.5" />}
                            onClick={() => handleClaimOrder(ord.id)}
                          >
                            Prendre la course
                          </Btn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: HISTORY */}
        {activeTab === 'HISTORY' && (
          <div className="space-y-4">
            <h2 className="text-[17px] font-semibold">Courses livrées ({myHistory.length})</h2>
            {myHistory.length === 0 ? (
              <div
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)', color: 'var(--ink-muted)' }}
                className="rounded-2xl border p-8 text-center text-[13px]"
              >
                Aucune course livrée enregistrée sur cette session.
              </div>
            ) : (
              <div className="space-y-2.5">
                {myHistory.map((ord) => (
                  <div
                    key={ord.id}
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                    className="rounded-xl border p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[13px]">{ord.orderNumber}</span>
                        <StatusPill tone="ok">Livrée</StatusPill>
                      </div>
                      <div className="text-[13px] font-medium mt-1 truncate">
                        {ord.customerName} · {ord.deliveryNeighborhood}
                      </div>
                      <div className="text-[11.5px]" style={{ color: 'var(--ink-muted)' }}>
                        {formatShortDateTime(ord.updatedAt)}
                      </div>
                    </div>
                    <div className="text-right tabular-nums shrink-0">
                      <div className="font-semibold text-[14px]">{formatFCFA(ord.total)}</div>
                      <div className="text-[11.5px] flex items-center justify-end gap-1 mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                        <PaymentMethodMark method={ord.paymentMethod} size="xs" />
                        <span>+{formatFCFA(ord.deliveryFee)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CASH RECONCILIATION & EARNINGS */}
        {activeTab === 'EARNINGS' && (
          <div className="space-y-5 max-w-2xl">
            <div>
              <h2 className="text-[17px] font-semibold">Caisse Livreur & Versement</h2>
              <p className="text-[12.5px] mt-0.5" style={{ color: 'var(--ink-muted)' }}>
                Pointage exact des espèces à remettre à la caisse du restaurant en fin de service.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div
                style={{ backgroundColor: 'var(--warn-bg)', borderColor: 'var(--warn-border)' }}
                className="rounded-2xl border p-4"
              >
                <div className="text-[11.5px] font-medium" style={{ color: 'var(--warn-text)' }}>
                  Espèces à reverser au resto
                </div>
                <div className="text-[22px] font-semibold tabular-nums mt-1.5" style={{ color: 'var(--warn-text)' }}>
                  {formatFCFA(finance.cashToReturn)}
                </div>
              </div>

              <div
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
                className="rounded-2xl border p-4"
              >
                <div className="text-[11.5px] font-medium" style={{ color: 'var(--ink-muted)' }}>
                  Encaissé via OM / MoMo
                </div>
                <div className="text-[22px] font-semibold tabular-nums mt-1.5">
                  {formatFCFA(finance.digitalCollected)}
                </div>
              </div>

              <div
                style={{ backgroundColor: 'var(--ok-bg)', borderColor: 'var(--ok-border)' }}
                className="rounded-2xl border p-4"
              >
                <div className="text-[11.5px] font-medium" style={{ color: 'var(--ok-text)' }}>
                  Frais de courses ({finance.deliveredCount})
                </div>
                <div className="text-[22px] font-semibold tabular-nums mt-1.5" style={{ color: 'var(--ok-text)' }}>
                  {formatFCFA(finance.deliveryFeesEarned)}
                </div>
              </div>
            </div>

            <div
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
              className="rounded-2xl border p-5 space-y-3"
            >
              <div className="flex items-center gap-2 font-semibold text-[14px]">
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                Pointage de fin de journée
              </div>
              <p className="text-[12.5px]" style={{ color: 'var(--ink-muted)' }}>
                Total historique courses effectuées par {currentDriver.name} : <strong>{currentDriver.deliveriesCompleted} livraisons</strong>.
              </p>
              {reconcileSent ? (
                <div
                  className="p-3 rounded-xl border text-[12.5px] font-medium flex items-center gap-2"
                  style={{ backgroundColor: 'var(--ok-bg)', borderColor: 'var(--ok-border)', color: 'var(--ok-text)' }}
                >
                  <Check className="w-4 h-4" />
                  Récapitulatif prêt à présenter à la caisse ({formatFCFA(finance.cashToReturn)} en espèces).
                </div>
              ) : (
                <Btn variant="primary" onClick={() => setReconcileSent(true)}>
                  Préparer le bordereau de versement
                </Btn>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE */}
        {activeTab === 'PROFILE' && (
          <div className="space-y-4 max-w-xl">
            <div
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
              className="rounded-2xl border p-5 space-y-4"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-[16px]"
                  style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                >
                  {currentDriver.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold">{currentDriver.name}</h2>
                  <div className="text-[12.5px] font-mono" style={{ color: 'var(--ink-muted)' }}>
                    {currentDriver.phone}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-[13px] pt-3 border-t" style={{ borderColor: 'var(--border-hairline)' }}>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--ink-muted)' }}>Engin</span>
                  <span className="font-medium">{currentDriver.vehicleInfo}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--ink-muted)' }}>Secteurs Maroua</span>
                  <span className="font-medium text-right">{currentDriver.zone}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: 'var(--ink-muted)' }}>Restaurant rattaché</span>
                  <span className="font-medium">{state.settings.name}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <a
                  href={`tel:${state.settings.phone}`}
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
                  className="h-10 rounded-xl border text-[12.5px] font-medium flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Appeler la caisse
                </a>
                <button
                  type="button"
                  onClick={() => selectDriver(null)}
                  style={{ backgroundColor: 'var(--err-bg)', borderColor: 'var(--err-border)', color: 'var(--err-text)' }}
                  className="h-10 rounded-xl border text-[12.5px] font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-hairline)' }}
        className="md:hidden fixed bottom-0 inset-x-0 h-[60px] border-t grid grid-cols-4 z-30 px-2"
      >
        {(
          [
            { id: 'MISSIONS', label: 'Courses', icon: Bike, badge: myActiveMissions.length + availablePool.length },
            { id: 'HISTORY', label: 'Livrées', icon: History, badge: 0 },
            { id: 'EARNINGS', label: 'Caisse', icon: Wallet, badge: 0 },
            { id: 'PROFILE', label: 'Profil', icon: User, badge: 0 },
          ] as const
        ).map((it) => {
          const Icon = it.icon;
          const active = activeTab === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setActiveTab(it.id)}
              className="flex flex-col items-center justify-center gap-0.5 cursor-pointer"
              style={{ color: active ? 'var(--accent)' : 'var(--ink-muted)' }}
            >
              <div className="relative">
                <Icon className="w-[19px] h-[19px]" />
                {it.badge > 0 && (
                  <span
                    style={{ backgroundColor: 'var(--accent)' }}
                    className="absolute -top-1 -right-2 min-w-[15px] h-[15px] px-1 rounded-full text-[9.5px] font-bold text-white flex items-center justify-center tabular-nums"
                  >
                    {it.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10.5px] ${active ? 'font-semibold' : 'font-medium'}`}>{it.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Caméra arrière persistante — déclenchée instantanément dès le clic sur "Confirmer la livraison" */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCaptureProofPhoto}
      />

      {/* Fiche minimaliste de Clôture — s'ouvre directement avec la photo déjà prise en haut */}
      {deliveringOrder && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ backgroundColor: 'rgba(16, 16, 14, 0.56)', backdropFilter: 'blur(3px)' }}
          onClick={closeDeliverSheet}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-hairline)',
              color: 'var(--ink-primary)',
            }}
            className="w-full sm:max-w-[440px] max-h-[92dvh] rounded-t-3xl sm:rounded-2xl border flex flex-col overflow-hidden shadow-2xl"
          >
            {/* En-tête épuré fixe */}
            <div
              className="px-4 py-3.5 border-b flex items-center justify-between gap-3 shrink-0"
              style={{ borderColor: 'var(--border-hairline)' }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-[13.5px]">{deliveringOrder.orderNumber}</span>
                  <span className="text-[12px] truncate" style={{ color: 'var(--ink-muted)' }}>
                    · {deliveringOrder.customerName}
                  </span>
                </div>
                <div className="text-[11.5px] truncate" style={{ color: 'var(--ink-muted)' }}>
                  {deliveringOrder.deliveryNeighborhood || 'Maroua'}
                </div>
              </div>
              <button
                type="button"
                onClick={closeDeliverSheet}
                aria-label="Fermer"
                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--ink-muted)' }}
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer hover:opacity-80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenu défilable : Photo vérifiée en haut → Scroll vers Code de remise & Encaissement */}
            <form
              noValidate
              onSubmit={handleConfirmDelivered}
              className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-5"
            >
              {/* Photo de preuve déjà capturée OU Alerte de censure anti-fraude */}
              <div className="space-y-1.5">
                {fieldErrors.photo && !photoRejection && (
                  <div
                    role="alert"
                    className="px-2.5 py-1.5 rounded-lg border text-[11.5px] font-medium flex items-center gap-1.5 animate-dineo-shake"
                    style={{ backgroundColor: 'var(--err-bg)', borderColor: 'var(--err-border)', color: 'var(--err-text)' }}
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{fieldErrors.photo}</span>
                  </div>
                )}

                <div
                  className="rounded-2xl overflow-hidden border relative"
                  style={{
                    borderColor: photoRejection
                      ? 'var(--err-dot)'
                      : proofPhoto
                        ? 'var(--ok-border)'
                        : 'var(--border-hairline)',
                    backgroundColor: photoRejection ? 'var(--err-bg)' : 'var(--bg-subtle)',
                  }}
                >
                  {photoLoading ? (
                    <div className="h-52 flex flex-col items-center justify-center gap-2 text-[13px]" style={{ color: 'var(--ink-muted)' }}>
                      <Camera className="w-6 h-6 animate-pulse" style={{ color: 'var(--accent)' }} />
                      <span>Vérification anti-fraude & GPS en cours…</span>
                    </div>
                  ) : photoRejection ? (
                    <div className="p-5 flex flex-col items-center text-center gap-3 animate-dineo-shake">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                        style={{ backgroundColor: 'var(--err-dot)' }}
                      >
                        <ShieldBan className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--err-text)' }}>
                          Photo censurée — Non recevable
                        </div>
                        <p className="text-[12px] leading-snug max-w-xs" style={{ color: 'var(--err-text)' }}>
                          {photoRejection}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          pendingCameraOrderRef.current = deliveringOrder;
                          cameraInputRef.current?.click();
                        }}
                        style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
                        className="h-10 px-4 rounded-xl text-[12.5px] font-semibold inline-flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
                      >
                        <Camera className="w-4 h-4" />
                        Reprendre une vraie photo du colis
                      </button>
                    </div>
                  ) : proofPhoto ? (
                    <>
                      <img
                        src={proofPhoto}
                        alt="Preuve de livraison horodatée"
                        className="w-full max-h-64 object-cover block"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          pendingCameraOrderRef.current = deliveringOrder;
                          cameraInputRef.current?.click();
                        }}
                        className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium text-white inline-flex items-center gap-1 cursor-pointer backdrop-blur-sm"
                        style={{ backgroundColor: 'rgba(16, 16, 14, 0.68)' }}
                      >
                        <RefreshCw className="w-3 h-3" />
                        Reprendre
                      </button>
                      <span
                        style={{ backgroundColor: proofGeo ? 'var(--ok-dot)' : 'var(--warn-dot)' }}
                        className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white inline-flex items-center gap-1"
                      >
                        <LocateFixed className="w-3 h-3" />
                        {proofGeo
                          ? `OK ${photoQualityScore ?? 85}% · GPS ±${proofGeo.accuracy} m`
                          : `OK ${photoQualityScore ?? 85}% · Horodatée`}
                      </span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        pendingCameraOrderRef.current = deliveringOrder;
                        cameraInputRef.current?.click();
                      }}
                      className="w-full h-44 flex flex-col items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                      <span className="text-[13px] font-medium">Prendre la photo du colis</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Code de remise client (4 chiffres) OU Procédure anti-fraude Dérogation Caisse + Signature */}
              {deliveringOrder.deliveryCode && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[12.5px] font-semibold flex items-center gap-1.5">
                      {bypassPinMode ? (
                        <ShieldAlert className="w-3.5 h-3.5" style={{ color: 'var(--warn-dot)' }} />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                      )}
                      {bypassPinMode ? 'Dérogation sécurisée (Caisse)' : 'Code de remise client'}
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setBypassPinMode((b) => !b);
                        setProofError('');
                        setFieldErrors({});
                      }}
                      className="text-[11.5px] underline cursor-pointer"
                      style={{ color: 'var(--ink-muted)' }}
                    >
                      {bypassPinMode ? 'Revenir au code client' : 'Client sans téléphone ?'}
                    </button>
                  </div>

                  {!bypassPinMode ? (
                    <div className="space-y-1.5">
                      {(fieldErrors.pinCode || proofError) && (
                        <div
                          role="alert"
                          className="px-2.5 py-1.5 rounded-lg border text-[11.5px] font-medium flex items-center gap-1.5 animate-dineo-shake"
                          style={{ backgroundColor: 'var(--err-bg)', borderColor: 'var(--err-border)', color: 'var(--err-text)' }}
                        >
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{fieldErrors.pinCode || proofError}</span>
                        </div>
                      )}
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={4}
                        value={pinCode}
                        onChange={(e) => {
                          setProofError('');
                          setFieldErrors((p) => ({ ...p, pinCode: undefined }));
                          setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                        }}
                        placeholder="• • • •"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: pinShake || fieldErrors.pinCode || proofError ? 'var(--err-dot)' : 'var(--border-hairline)',
                          color: 'var(--ink-primary)',
                        }}
                        className={`w-full h-12 px-4 rounded-xl border text-center font-mono text-[22px] tracking-[0.45em] font-semibold focus:outline-none focus:border-[var(--accent)] ${
                          pinShake ? 'animate-dineo-shake' : ''
                        }`}
                      />
                    </div>
                  ) : (
                    <div
                      className="p-3.5 rounded-xl border space-y-3"
                      style={{ backgroundColor: 'var(--warn-bg)', borderColor: 'var(--warn-border)' }}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <p className="text-[11.5px] leading-snug" style={{ color: 'var(--warn-text)' }}>
                          <strong>Anti-fraude :</strong> appelez la caisse pour obtenir le code de dérogation (fonctionne même sans internet par appel GSM) et faites signer le réceptionnaire.
                        </p>
                        <a
                          href={`tel:${state.settings.phone}`}
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--warn-border)', color: 'var(--ink-primary)' }}
                          className="shrink-0 h-8 px-2.5 rounded-lg border text-[11.5px] font-semibold inline-flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                          Caisse
                        </a>
                      </div>

                      <select
                        value={bypassReason}
                        onChange={(e) => setBypassReason(e.target.value)}
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-hairline)',
                          color: 'var(--ink-primary)',
                        }}
                        className="w-full h-10 px-3 rounded-xl border text-[12.5px]"
                      >
                        <option value="Téléphone client déchargé / batterie vide">Téléphone client déchargé / batterie vide</option>
                        <option value="Remis au gardien / proche après appel caisse">Remis au gardien / proche (accord caisse)</option>
                        <option value="Client sans smartphone (commande vocale)">Client sans smartphone (commande vocale)</option>
                      </select>

                      <div className="space-y-1">
                        {fieldErrors.recipientName && (
                          <div
                            role="alert"
                            className="px-2.5 py-1 rounded-lg border text-[11.5px] font-medium flex items-center gap-1.5 animate-dineo-shake"
                            style={{ backgroundColor: 'var(--err-bg)', borderColor: 'var(--err-border)', color: 'var(--err-text)' }}
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.recipientName}</span>
                          </div>
                        )}
                        <input
                          type="text"
                          value={recipientName}
                          onChange={(e) => {
                            setRecipientName(e.target.value);
                            setFieldErrors((p) => ({ ...p, recipientName: undefined }));
                          }}
                          placeholder="Nom complet du réceptionnaire *"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: fieldErrors.recipientName ? 'var(--err-dot)' : 'var(--border-hairline)',
                            color: 'var(--ink-primary)',
                          }}
                          className="w-full h-10 px-3 rounded-xl border text-[13px] focus:outline-none focus:border-[var(--accent)]"
                        />
                      </div>

                      <div className="space-y-1">
                        {fieldErrors.recipientSignature && (
                          <div
                            role="alert"
                            className="px-2.5 py-1 rounded-lg border text-[11.5px] font-medium flex items-center gap-1.5 animate-dineo-shake"
                            style={{ backgroundColor: 'var(--err-bg)', borderColor: 'var(--err-border)', color: 'var(--err-text)' }}
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.recipientSignature}</span>
                          </div>
                        )}
                        <SignaturePad
                          value={recipientSignature}
                          onChange={(sig) => {
                            setRecipientSignature(sig);
                            if (sig) setFieldErrors((p) => ({ ...p, recipientSignature: undefined }));
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11.5px] font-semibold block" style={{ color: 'var(--warn-text)' }}>
                          Code dérogation dicté par la Caisse (4 chiffres) *
                        </label>
                        {(fieldErrors.managerOverrideCode || proofError) && (
                          <div
                            role="alert"
                            className="px-2.5 py-1 rounded-lg border text-[11.5px] font-medium flex items-center gap-1.5 animate-dineo-shake"
                            style={{ backgroundColor: 'var(--err-bg)', borderColor: 'var(--err-border)', color: 'var(--err-text)' }}
                          >
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{fieldErrors.managerOverrideCode || proofError}</span>
                          </div>
                        )}
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          value={managerOverrideCode}
                          onChange={(e) => {
                            setProofError('');
                            setFieldErrors((p) => ({ ...p, managerOverrideCode: undefined }));
                            setManagerOverrideCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                          }}
                          placeholder="• • • •"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: pinShake || fieldErrors.managerOverrideCode || proofError ? 'var(--err-dot)' : 'var(--warn-border)',
                            color: 'var(--ink-primary)',
                          }}
                          className={`w-full h-11 px-4 rounded-xl border text-center font-mono text-[20px] tracking-[0.45em] font-semibold focus:outline-none focus:border-[var(--accent)] ${
                            pinShake ? 'animate-dineo-shake' : ''
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Encaissement porte-à-porte */}
              {remainingDelivering > 0 ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-semibold">Solde à encaisser</span>
                    <span className="text-[17px] font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                      {formatFCFA(remainingDelivering)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'ESPECES', label: 'Espèces', logo: <CashFcfaLogo size="md" /> },
                        { id: 'ORANGE_MONEY', label: 'Orange Money', logo: <OrangeMoneyLogo size="md" /> },
                        { id: 'MTN_MOMO', label: 'MTN MoMo', logo: <MtnMomoLogo size="md" /> },
                      ] as const
                    ).map((m) => {
                      const active = collectedMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setCollectedMethod(m.id)}
                          style={{
                            backgroundColor: active ? 'var(--accent-soft)' : 'var(--bg-subtle)',
                            borderColor: active ? 'var(--accent)' : 'var(--border-hairline)',
                          }}
                          className="py-2.5 px-2 rounded-xl border flex flex-col items-center gap-1.5 cursor-pointer transition-colors"
                        >
                          {m.logo}
                          <span className="text-[11px] font-semibold">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div
                  className="px-3.5 py-2.5 rounded-xl border text-[12.5px] font-medium flex items-center gap-2"
                  style={{ backgroundColor: 'var(--ok-bg)', borderColor: 'var(--ok-border)', color: 'var(--ok-text)' }}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Commande déjà réglée (0 FCFA à encaisser)
                </div>
              )}

              {/* Note facultative ultra-sobre */}
              <input
                type="text"
                value={deliveryNote}
                onChange={(e) => setDeliveryNote(e.target.value)}
                placeholder="Note ou réf. OM / MoMo (optionnel)"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-hairline)', color: 'var(--ink-primary)' }}
                className="w-full h-10 px-3.5 rounded-xl border text-[13px] focus:outline-none focus:border-[var(--ink-primary)]"
              />

              {/* Validation finale */}
              <button
                type="submit"
                disabled={!proofPhoto || photoLoading}
                style={{
                  backgroundColor: !proofPhoto || photoLoading ? 'var(--bg-subtle)' : 'var(--accent)',
                  color: !proofPhoto || photoLoading ? 'var(--ink-muted)' : '#FFFFFF',
                }}
                className="w-full h-12 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
              >
                <Check className="w-4 h-4" />
                {remainingDelivering > 0
                  ? `Valider & encaisser ${formatFCFA(remainingDelivering)}`
                  : 'Valider la livraison'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
