/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { UserRole, UserProfile, Motorcycle, ConsumableStatus, SOSAlert, SOSVolunteer, VoiceRoom, Coupon, MaintenanceRecord, EmergencyType } from '@motorede/shared';
import { storageService } from './services/storage';
import { GeoPoint, geolocationService, calculateDistanceKm, DEFAULT_USER_COORDS } from './services/geolocation';
import { audioEngine } from './services/audioEngine';
import { Header } from './components/Header';
import { Navigation, ActiveTab } from './components/Navigation';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { LockscreenWidget } from './components/LockscreenWidget';
import { AuthModal } from './components/AuthModal';
import { MotorcycleEditModal } from './components/MotorcycleEditModal';
import { LoginScreen } from './components/LoginScreen';
import { useGoogleAuth } from './hooks/useGoogleAuth';

// Eagerly load primary Dashboard for instant first paint
import { DashboardView } from './views/DashboardView';

// Code-split secondary views to reduce initial bundle size and speed up boot
const ConvoyVoiceView = lazy(() => import('./views/ConvoyVoiceView').then((m) => ({ default: m.ConvoyVoiceView })));
const SOSRescueView = lazy(() => import('./views/SOSRescueView').then((m) => ({ default: m.SOSRescueView })));
const MaintenanceView = lazy(() => import('./views/MaintenanceView').then((m) => ({ default: m.MaintenanceView })));
const PassportView = lazy(() => import('./views/PassportView').then((m) => ({ default: m.PassportView })));
const DiagnosticView = lazy(() => import('./views/DiagnosticView').then((m) => ({ default: m.DiagnosticView })));
const PartnerShopView = lazy(() => import('./views/PartnerShopView').then((m) => ({ default: m.PartnerShopView })));
const AdminView = lazy(() => import('./views/AdminView').then((m) => ({ default: m.AdminView })));

export default function App() {
  // Identidade real, vinda do Google. Enquanto o login não estiver configurado
  // (ambiente sem credencial), o app segue funcionando com a sessão local —
  // caso contrário um deploy mal configurado deixaria o app inacessível.
  const auth = useGoogleAuth();

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => storageService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMotorcycleEditOpen, setIsMotorcycleEditOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>(() => currentUser?.role || 'rider');
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (currentUser?.role === 'partner_shop') return 'partner_shop';
    if (currentUser?.role === 'admin') return 'admin';
    return 'dashboard';
  });

  // Application Data States (lazy initializers so localStorage is parsed only once)
  const [motorcycle, setMotorcycle] = useState<Motorcycle>(() => {
    if (currentUser?.motorcycle) return currentUser.motorcycle;
    return storageService.getMotorcycle();
  });
  const [consumables, setConsumables] = useState<ConsumableStatus[]>(() =>
    storageService.getConsumables(motorcycle.currentKm)
  );
  const [sosAlerts, setSosAlerts] = useState<SOSAlert[]>(() => storageService.getSOSAlerts());
  const [voiceRoom, setVoiceRoom] = useState<VoiceRoom>(() => storageService.getVoiceRoom());
  const [coupons, setCoupons] = useState<Coupon[]>(() => storageService.getCoupons());
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>(() =>
    storageService.getMaintenanceRecords()
  );

  // Background Audio & Lockscreen State (inactive on cold boot to prevent browser autoplay blocks)
  const [isBackgroundAudioActive, setIsBackgroundAudioActive] = useState(false);
  const [isLockscreenOpen, setIsLockscreenOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Geolocation State - initialized immediately with default without waiting for GPS
  const [userCoords, setUserCoords] = useState<GeoPoint>(DEFAULT_USER_COORDS);

  // A identidade do Google vira o perfil do app. Sem isso o cabeçalho
  // continuaria mostrando o piloto fictício do protótipo.
  useEffect(() => {
    if (!auth.user) return;
    setCurrentUser((anterior) => {
      if (anterior?.email === auth.user!.email) return anterior;
      const perfil: UserProfile = {
        id: `g-${auth.user!.email}`,
        name: auth.user!.name,
        email: auth.user!.email,
        role: 'rider',
        phone: anterior?.phone || '',
        createdAt: anterior?.createdAt || new Date().toISOString(),
        motorcycle: anterior?.motorcycle,
      };
      storageService.setCurrentUser(perfil);
      return perfil;
    });
  }, [auth.user]);

  // Non-blocking Geolocation setup on mount
  useEffect(() => {
    const cleanupGeo = geolocationService.watchPosition(
      (point) => {
        setUserCoords(point);
      },
      (err) => {
        // Fallback coordinates kept silently
      }
    );

    return () => {
      cleanupGeo();
    };
  }, []);

  // Recalculate wear when motorcycle KM changes
  const handleUpdateKm = (newKm: number) => {
    const updatedBike = { ...motorcycle, currentKm: newKm };
    setMotorcycle(updatedBike);
    storageService.saveMotorcycle(updatedBike);

    const updatedConsumables = storageService.calculateConsumablesWear(newKm);
    setConsumables(updatedConsumables);
  };

  // Full motorcycle data & technical sheet update
  const handleSaveMotorcycle = (updatedBike: Motorcycle) => {
    setMotorcycle(updatedBike);
    storageService.saveMotorcycle(updatedBike);

    // If user is logged in as rider, persist bike in their profile
    if (currentUser && currentUser.role === 'rider') {
      const updatedUser: UserProfile = { ...currentUser, motorcycle: updatedBike };
      setCurrentUser(updatedUser);
      storageService.setCurrentUser(updatedUser);
    }

    const updatedConsumables = storageService.calculateConsumablesWear(updatedBike.currentKm);
    setConsumables(updatedConsumables);
  };

  // Trigger SOS alert
  const handleTriggerSOS = (
    type: EmergencyType,
    details: string,
    reference: string,
    radiusKm: number
  ) => {
    const newAlert: SOSAlert = {
      id: `sos-${Date.now()}`,
      petitionerId: 'user-current',
      petitionerName: 'Você (Piloto)',
      petitionerPhone: '(11) 98765-4321',
      motorcycleInfo: `${motorcycle.brand} ${motorcycle.model} (${motorcycle.licensePlate})`,
      type,
      lat: userCoords.lat,
      lng: userCoords.lng,
      locationReference: reference,
      radiusKm,
      status: 'active',
      details,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      volunteers: [],

      chatMessages: [
        {
          id: `msg-${Date.now()}-0`,
          senderId: 'system',
          senderName: 'Central SOS',
          text: `Alerta emitido para motociclistas num raio de ${radiusKm} km. Localização GPS transmitida com sucesso.`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    const updated = [newAlert, ...sosAlerts];
    setSosAlerts(updated);
    storageService.saveSOSAlerts(updated);
    audioEngine.playRadioChirp(true);
    setActiveTab('sos');
  };

  // Volunteer responding to an SOS alert
  const handleRespondToSOS = (alertId: string) => {
    const updated: SOSAlert[] = sosAlerts.map((alert) => {
      if (alert.id === alertId) {
        const hasJoined = alert.volunteers.some((v) => v.id === 'user-current');
        if (hasJoined) return alert;

        const volunteer: SOSVolunteer = {
          id: 'user-current',
          name: 'Você (Voluntário)',
          motorcycle: `${motorcycle.brand} ${motorcycle.model}`,
          lat: userCoords.lat,
          lng: userCoords.lng,
          distanceKm: calculateDistanceKm(userCoords.lat, userCoords.lng, alert.lat, alert.lng),
          status: 'en_route',
          joinedAt: new Date().toISOString(),
        };

        return {
          ...alert,
          status: 'in_progress' as const,
          volunteers: [...alert.volunteers, volunteer],
          chatMessages: [
            ...alert.chatMessages,
            {
              id: `msg-${Date.now()}`,
              senderId: 'user-current',
              senderName: 'Você (Voluntário)',
              text: 'Acabei de responder ao chamado e já estou a caminho para prestar apoio!',
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        };
      }
      return alert;
    });

    setSosAlerts(updated);
    storageService.saveSOSAlerts(updated);
  };

  // Send message in temporary SOS help channel
  const handleSendMessage = (alertId: string, text: string) => {
    const updated = sosAlerts.map((alert) => {
      if (alert.id === alertId) {
        return {
          ...alert,
          chatMessages: [
            ...alert.chatMessages,
            {
              id: `msg-${Date.now()}`,
              senderId: 'user-current',
              senderName: 'Você',
              text,
              timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            },
          ],
        };
      }
      return alert;
    });

    setSosAlerts(updated);
    storageService.saveSOSAlerts(updated);
  };

  // Resolve SOS Alert
  const handleResolveSOS = (alertId: string) => {
    const updated = sosAlerts.map((alert) =>
      alert.id === alertId ? { ...alert, status: 'resolved' as const } : alert
    );
    setSosAlerts(updated);
    storageService.saveSOSAlerts(updated);
  };

  // Export diagnostic conclusion into SOS
  const handleExportDiagnosticToSOS = (
    diagnosisSummary: string,
    severity: 'safe_to_ride' | 'caution' | 'danger_stop'
  ) => {
    const type: EmergencyType =
      severity === 'danger_stop' ? 'mechanical_breakdown' : 'electrical_battery';
    handleTriggerSOS(
      type,
      `[Triagem Mecânica]: ${diagnosisSummary}`,
      'Acostamento da Rodovia - Posição GPS precisa',
      15
    );
  };

  // Add new maintenance record to vehicle passport
  const handleAddMaintenanceRecord = (recordData: Omit<MaintenanceRecord, 'id'>) => {
    const newRecord: MaintenanceRecord = {
      ...recordData,
      id: `rec-${Date.now()}`,
    };
    const updated = [newRecord, ...maintenanceRecords];
    setMaintenanceRecords(updated);
    storageService.saveMaintenanceRecords(updated);
  };

  // Validate coupon at workshop
  const handleValidateCoupon = (code: string) => {
    const clean = code.trim().toUpperCase();
    return coupons.some((c) => c.promoCode.toUpperCase() === clean);
  };

  // Add coupon by workshop
  const handleAddCoupon = (
    couponData: Omit<Coupon, 'id' | 'shopId' | 'shopName' | 'shopCity' | 'shopDistanceKm'>
  ) => {
    const newCoupon: Coupon = {
      ...couponData,
      id: `c-${Date.now()}`,
      shopId: 'shop-1',
      shopName: 'MotoTech Garage',
      shopCity: 'Santos - SP',
      shopDistanceKm: 1.2,
    };
    const updated = [newCoupon, ...coupons];
    setCoupons(updated);
    storageService.saveCoupons(updated);
  };

  // Authentication handlers
  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    if (user.role === 'partner_shop') {
      setActiveTab('partner_shop');
    } else if (user.role === 'admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('dashboard');
    }

    if (user.motorcycle) {
      setMotorcycle(user.motorcycle);
      const updatedConsumables = storageService.calculateConsumablesWear(user.motorcycle.currentKm);
      setConsumables(updatedConsumables);
    }
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    storageService.logout();
    setCurrentUser(null);
    if (auth.isConfigured) {
      auth.signOut();
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const activeSOSCount = sosAlerts.filter(
    (a) => a.status === 'active' || a.status === 'in_progress'
  ).length;

  if (auth.isConfigured && !auth.user) {
    return <LoginScreen auth={auth} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* PWA Install Banner (Chromium & iOS Safari instructions) */}
      <PWAInstallBanner />

      {/* Primary App Header */}
      <Header
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        activeSOSCount={activeSOSCount}
        isBackgroundAudioActive={isBackgroundAudioActive}
        onOpenLockscreenModal={() => setIsLockscreenOpen(true)}
        onSOSClick={() => setActiveTab('sos')}
        onOpenEditMotorcycle={() => setIsMotorcycleEditOpen(true)}
      />

      {/* Main View Container */}
      <main className="flex-1 w-full max-w-5xl mx-auto">
        {activeTab === 'dashboard' && (
          <DashboardView
            motorcycle={motorcycle}
            consumables={consumables}
            voiceRoom={voiceRoom}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onUpdateKm={handleUpdateKm}
            onOpenEditMotorcycle={() => setIsMotorcycleEditOpen(true)}
          />
        )}

        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12 text-slate-400 font-medium text-sm animate-pulse">
              Carregando módulo...
            </div>
          }
        >
          {activeTab === 'convoy' && (
            <ConvoyVoiceView
              voiceRoom={voiceRoom}
              onUpdateVoiceRoom={(patch) => {
                const updated = { ...voiceRoom, ...patch };
                setVoiceRoom(updated);
                storageService.saveVoiceRoom(updated);
              }}
              isBackgroundAudioActive={isBackgroundAudioActive}
              onToggleBackgroundSession={(active) => {
                setIsBackgroundAudioActive(active);
                if (active) {
                  audioEngine.startBackgroundSession(voiceRoom.name, voiceRoom.code, () => {
                    setIsMuted((prev) => !prev);
                  });
                } else {
                  audioEngine.stopBackgroundSession();
                }
              }}
            />
          )}

          {activeTab === 'sos' && (
            <SOSRescueView
              userCoords={userCoords}
              motorcycleInfo={`${motorcycle.brand} ${motorcycle.model} (${motorcycle.licensePlate})`}
              sosAlerts={sosAlerts}
              onTriggerSOS={handleTriggerSOS}
              onRespondToSOS={handleRespondToSOS}
              onSendMessage={handleSendMessage}
              onResolveSOS={handleResolveSOS}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceView
              motorcycle={motorcycle}
              consumables={consumables}
              coupons={coupons}
              onUpdateKm={handleUpdateKm}
              onOpenEditMotorcycle={() => setIsMotorcycleEditOpen(true)}
            />
          )}

          {activeTab === 'passport' && (
            <PassportView
              motorcycle={motorcycle}
              records={maintenanceRecords}
              onAddRecord={handleAddMaintenanceRecord}
              onOpenEditMotorcycle={() => setIsMotorcycleEditOpen(true)}
            />
          )}

          {activeTab === 'diagnostic' && (
            <DiagnosticView onExportToSOS={handleExportDiagnosticToSOS} />
          )}

          {activeTab === 'partner_shop' && (
            <PartnerShopView
              currentUser={currentUser}
              coupons={coupons}
              onAddCoupon={handleAddCoupon}
              onValidateCoupon={handleValidateCoupon}
            />
          )}

          {activeTab === 'admin' && (
            <AdminView sosAlerts={sosAlerts} onResolveSOS={handleResolveSOS} />
          )}
        </Suspense>
      </main>

      {/* Lockscreen Simulator Overlay (Tests lock screen player & background audio) */}
      <LockscreenWidget
        isOpen={isLockscreenOpen}
        onClose={() => setIsLockscreenOpen(false)}
        voiceRoom={voiceRoom}
        userCoords={userCoords}
        isMuted={isMuted}
        onToggleMute={() => {
          const next = !isMuted;
          setIsMuted(next);
          audioEngine.setMute(next);
        }}
        onTriggerSOS={() => {
          setIsLockscreenOpen(false);
          setActiveTab('sos');
        }}
      />

      {/* Authentication & User Registration Modal */}
      <AuthModal
        isOpen={!auth.isConfigured && (isAuthModalOpen || !currentUser)}
        onClose={currentUser ? () => setIsAuthModalOpen(false) : undefined}
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Motorcycle & Technical Sheet Editor Modal */}
      <MotorcycleEditModal
        isOpen={isMotorcycleEditOpen}
        onClose={() => setIsMotorcycleEditOpen(false)}
        motorcycle={motorcycle}
        onSaveMotorcycle={handleSaveMotorcycle}
      />

      {/* Ergonomic Bottom Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab)}
        userRole={currentRole}
        activeSOSCount={activeSOSCount}
        isVoiceActive={isBackgroundAudioActive}
        onOpenEditMotorcycle={() => setIsMotorcycleEditOpen(true)}
        onOpenLockscreenModal={() => setIsLockscreenOpen(true)}
      />
    </div>
  );
}
