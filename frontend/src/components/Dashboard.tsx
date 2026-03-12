import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { Reading, AuthUser } from '../types';
import DataTable from './DataTable';
import { ClaimDeviceModal } from './dashboard/ClaimDeviceModal';
import { DashboardChartsSection } from './dashboard/DashboardChartsSection';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { DashboardSensorGrid } from './dashboard/DashboardSensorGrid';
import { DashboardStatusBar } from './dashboard/DashboardStatusBar';
import { isUserPrivileged } from '../utils/flags';
import { getApiErrorMessage } from '../utils/apiErrors';
import { useI18n } from '../useI18n';

interface DashboardProps {
  user?: AuthUser | null;
  onLogout: () => void;
}

const HISTORY_REFRESH_INTERVAL_MS = 30000;
const LIVE_REFRESH_INTERVAL_MS = 5000;

export function Dashboard({ user, onLogout }: DashboardProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const isAdmin = isUserPrivileged(user);
  const temperatureHumidityLines = [
    { dataKey: 'temp', color: '#f97316', name: t('dataTable.temp'), yAxisId: 'left' as const },
    { dataKey: 'humidity', color: '#06b6d4', name: t('dataTable.humidity'), yAxisId: 'right' as const },
  ];
  const lightSoundAirLines = [
    { dataKey: 'lux', color: '#fbbf24', name: t('dataTable.light'), yAxisId: 'left' as const },
    { dataKey: 'sound', color: '#a855f7', name: t('dataTable.sound'), yAxisId: 'right' as const },
    { dataKey: 'air', color: '#22c55e', name: t('dataTable.air'), yAxisId: 'right' as const },
  ];
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [latestReading, setLatestReading] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimMethod, setClaimMethod] = useState<'code' | 'qr'>('code');
  const [claimCode, setClaimCode] = useState('');
  const [claimQrData, setClaimQrData] = useState('');
  const [claimLabel, setClaimLabel] = useState('');
  const [claimError, setClaimError] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [deviceOptions, setDeviceOptions] = useState<Array<{ id: string; label?: string | null }>>(
    []
  );

  // Load devices on mount
  const loadDevices = useCallback(async () => {
    try {
      if (user && !isAdmin) {
        const assignments = await api.getUserControllers(user.id);
        const options = assignments.map((assignment) => ({
          id: assignment.device_id,
          label: assignment.assignment_label || assignment.controller_label,
        }));
        setDeviceOptions(options);
        if (options.length > 0 && !selectedDevice) {
          setSelectedDevice(options[0].id);
        }
        return;
      }

      const deviceList = await api.getDevices();
      setDeviceOptions(deviceList.map((device) => ({ id: device })));
      if (deviceList.length > 0 && !selectedDevice) {
        setSelectedDevice(deviceList[0]);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, selectedDevice, user]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  useEffect(() => {
    if (deviceOptions.length === 0) {
      setSelectedDevice('');
      return;
    }
    const hasSelected = deviceOptions.some((option) => option.id === selectedDevice);
    if (!hasSelected) {
      setSelectedDevice(deviceOptions[0].id);
    }
  }, [deviceOptions, selectedDevice]);

  const fetchLatestReading = useCallback(async () => {
    if (!selectedDevice) return;

    try {
      const latest = await api.getLatest(selectedDevice);
      setLatestReading(latest);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch latest reading:', error);
    }
  }, [selectedDevice]);

  const fetchHistory = useCallback(async () => {
    if (!selectedDevice) return;

    setIsHistoryLoading(true);
    try {
      const historyData = await api.getHistory(selectedDevice, 1);
      setHistory(historyData);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  }, [selectedDevice]);

  const fetchDeviceData = useCallback(async () => {
    if (!selectedDevice) return;

    setIsRefreshing(true);
    try {
      await Promise.all([fetchLatestReading(), fetchHistory()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchHistory, fetchLatestReading, selectedDevice]);

  useEffect(() => {
    if (!selectedDevice) return;

    fetchDeviceData();
  }, [selectedDevice, fetchDeviceData]);

  useEffect(() => {
    if (!selectedDevice) return;

    const interval = setInterval(fetchLatestReading, LIVE_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedDevice, fetchLatestReading]);

  useEffect(() => {
    if (!selectedDevice) return;

    const interval = setInterval(fetchHistory, HISTORY_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [selectedDevice, fetchHistory]);

  const handleRefresh = () => {
    fetchDeviceData();
  };

  const resetClaimState = () => {
    setShowClaimModal(false);
    setClaimMethod('code');
    setClaimError('');
    setClaimCode('');
    setClaimQrData('');
    setClaimLabel('');
  };

  const handleClaim = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClaimError('');
    const normalizedCode = claimCode.trim();
    const normalizedQrData = claimQrData.trim();

    if (claimMethod === 'code') {
      if (!/^\d{5}$/.test(normalizedCode)) {
        setClaimError(t('dashboard.enterCode'));
        return;
      }
    } else if (!normalizedQrData) {
      setClaimError(t('dashboard.pasteQr'));
      return;
    }

    setIsClaiming(true);
    try {
      if (claimMethod === 'code') {
        await api.claimController(normalizedCode, claimLabel.trim() || undefined);
      } else {
        await api.claimController({
          qrData: normalizedQrData,
          label: claimLabel.trim() || undefined,
        });
      }
      setClaimCode('');
      setClaimQrData('');
      setClaimLabel('');
      setShowClaimModal(false);
      await loadDevices();
    } catch (error) {
      const message = getApiErrorMessage(error, t('dashboard.claimFailed'));
      setClaimError(message);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <DashboardHeader
          user={user}
          isAdmin={isAdmin}
          appName={t('common.appName')}
          subtitle={t('dashboard.subtitle')}
          dashboardLabel={t('common.dashboard')}
          adminLabel={t('common.adminDashboard')}
          auditLabel={t('common.auditLogs')}
          healthLabel={t('common.systemHealth')}
          addDeviceLabel={t('dashboard.addDevice')}
          refreshLabel={t('common.refresh')}
          deviceOptions={deviceOptions}
          selectedDevice={selectedDevice}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onSelectDevice={setSelectedDevice}
          onRefresh={handleRefresh}
          onOpenClaim={() => setShowClaimModal(true)}
          onLogout={onLogout}
          onSettings={() => navigate('/settings')}
        />

        <DashboardStatusBar
          lastUpdate={lastUpdate}
          locale={locale}
          liveLabel={t('dashboard.live')}
          lastUpdatedLabel={(time) => t('dashboard.lastUpdated', { time })}
          autoRefreshLabel={t('dashboard.autoRefresh')}
        />

        <DashboardSensorGrid
          selectedDevice={selectedDevice}
          latestReading={latestReading}
          isRefreshing={isRefreshing}
          sectionTitle={t('dashboard.currentReadings')}
          temperatureLabel={t('dashboard.temperature')}
          humidityLabel={t('dashboard.humidity')}
          lightLabel={t('dashboard.lightLevel')}
          soundLabel={t('dashboard.soundLevel')}
          airLabel={t('dashboard.airVsBaseline')}
        />

        <DashboardChartsSection
          selectedDevice={selectedDevice}
          history={history}
          isRefreshing={isRefreshing}
          isHistoryLoading={isHistoryLoading}
          temperatureHumidityTitle={t('dashboard.tempHumidityChart')}
          lightSoundAirTitle={t('dashboard.lightSoundAirChart')}
          temperatureHumidityLines={temperatureHumidityLines}
          lightSoundAirLines={lightSoundAirLines}
        />

        <section>
          <DataTable selectedDevice={selectedDevice} />
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-600 text-sm py-4">
          <p>{t('dashboard.footer')}</p>
        </footer>
      </div>

      <ClaimDeviceModal
        isOpen={showClaimModal}
        claimMethod={claimMethod}
        claimCode={claimCode}
        claimQrData={claimQrData}
        claimLabel={claimLabel}
        claimError={claimError}
        isClaiming={isClaiming}
        title={t('dashboard.claimController')}
        closeLabel={t('common.close')}
        cancelLabel={t('common.cancel')}
        pairingCodeLabel={t('dashboard.pairingCode')}
        qrCodeLabel={t('dashboard.qrCode')}
        pairingCodeFieldLabel={t('dashboard.pairingCodeLabel')}
        pairingCodePlaceholder={t('dashboard.pairingCodePlaceholder')}
        qrContentLabel={t('dashboard.qrContent')}
        qrContentPlaceholder={t('dashboard.qrContentPlaceholder')}
        deviceLabelOptional={t('dashboard.deviceLabelOptional')}
        deviceLabelPlaceholder={t('dashboard.deviceLabelPlaceholder')}
        claimDeviceLabel={t('dashboard.claimDevice')}
        claimingLabel={t('dashboard.claiming')}
        onClose={resetClaimState}
        onSubmit={handleClaim}
        onMethodChange={setClaimMethod}
        onClaimCodeChange={setClaimCode}
        onClaimQrDataChange={setClaimQrData}
        onClaimLabelChange={setClaimLabel}
      />
    </div>
  );
}

export default Dashboard;
