import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ClaimDeviceModal } from './ClaimDeviceModal';
import { DashboardChartsSection } from './DashboardChartsSection';
import { DashboardHeader } from './DashboardHeader';
import { DashboardSensorGrid } from './DashboardSensorGrid';
import { DashboardStatusBar } from './DashboardStatusBar';

vi.mock('../DeviceSelector', () => ({
  default: ({
    devices,
    selectedDevice,
    onSelect,
  }: {
    devices: Array<{ id: string; label?: string | null }>;
    selectedDevice: string;
    onSelect: (value: string) => void;
  }) => (
    <button type="button" onClick={() => onSelect(devices[0]?.id ?? '')}>
      selector:{selectedDevice}
    </button>
  ),
}));

vi.mock('../ProfileMenu', () => ({
  ProfileMenu: ({
    onLogout,
    onSettings,
  }: {
    onLogout: () => void;
    onSettings: () => void;
  }) => (
    <div>
      <button type="button" onClick={onSettings}>
        settings
      </button>
      <button type="button" onClick={onLogout}>
        logout
      </button>
    </div>
  ),
}));

vi.mock('../SensorCard', () => ({
  default: ({
    label,
    value,
    unit,
  }: {
    label: string;
    value: number;
    unit: string;
  }) => (
    <div>
      {label}:{value}
      {unit}
    </div>
  ),
}));

vi.mock('../Chart', () => ({
  default: ({
    title,
    data,
    isLoading,
  }: {
    title: string;
    data: unknown[];
    isLoading: boolean;
  }) => (
    <div>
      {title}:{data.length}:{String(isLoading)}
    </div>
  ),
}));

describe('dashboard section components', () => {
  it('renders admin header actions and forwards interactions', () => {
    const onRefresh = vi.fn();
    const onLogout = vi.fn();
    const onSettings = vi.fn();
    const onSelectDevice = vi.fn();
    const onOpenClaim = vi.fn();

    render(
      <MemoryRouter>
        <DashboardHeader
          user={{
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            role: 'admin',
            created_at: '2026-03-01T00:00:00Z',
          }}
          isAdmin
          appName="IoT Monitoring"
          subtitle="Overview"
          dashboardLabel="Dashboard"
          adminLabel="Admin"
          auditLabel="Audit"
          healthLabel="Health"
          addDeviceLabel="Add device"
          refreshLabel="Refresh"
          deviceOptions={[{ id: 'dev-1', label: 'Lab Sensor' }]}
          selectedDevice="dev-1"
          isLoading={false}
          isRefreshing={false}
          onSelectDevice={onSelectDevice}
          onRefresh={onRefresh}
          onOpenClaim={onOpenClaim}
          onLogout={onLogout}
          onSettings={onSettings}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.queryByText('Add device')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('selector:dev-1'));
    fireEvent.click(screen.getByText('Refresh'));
    fireEvent.click(screen.getByText('settings'));
    fireEvent.click(screen.getByText('logout'));

    expect(onSelectDevice).toHaveBeenCalledWith('dev-1');
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onSettings).toHaveBeenCalledTimes(1);
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(onOpenClaim).not.toHaveBeenCalled();
  });

  it('renders claim action for non-admin users', () => {
    const onOpenClaim = vi.fn();

    render(
      <MemoryRouter>
        <DashboardHeader
          user={{
            id: 2,
            username: 'user',
            email: 'user@example.com',
            role: 'user',
            created_at: '2026-03-01T00:00:00Z',
          }}
          isAdmin={false}
          appName="IoT Monitoring"
          subtitle="Overview"
          dashboardLabel="Dashboard"
          adminLabel="Admin"
          auditLabel="Audit"
          healthLabel="Health"
          addDeviceLabel="Add device"
          refreshLabel="Refresh"
          deviceOptions={[{ id: 'dev-1' }]}
          selectedDevice="dev-1"
          isLoading={false}
          isRefreshing={false}
          onSelectDevice={vi.fn()}
          onRefresh={vi.fn()}
          onOpenClaim={onOpenClaim}
          onLogout={vi.fn()}
          onSettings={vi.fn()}
        />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('Add device'));
    expect(onOpenClaim).toHaveBeenCalledTimes(1);
  });

  it('renders status bar only when last update exists', () => {
    const { rerender } = render(
      <DashboardStatusBar
        lastUpdate={null}
        locale="en-US"
        liveLabel="Live"
        lastUpdatedLabel={(time) => `Updated ${time}`}
        autoRefreshLabel="Auto refresh"
      />
    );

    expect(screen.queryByText('Live')).not.toBeInTheDocument();

    rerender(
      <DashboardStatusBar
        lastUpdate={new Date('2026-03-12T10:00:00Z')}
        locale="en-US"
        liveLabel="Live"
        lastUpdatedLabel={(time) => `Updated ${time}`}
        autoRefreshLabel="Auto refresh"
      />
    );

    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    expect(screen.getByText('Auto refresh')).toBeInTheDocument();
  });

  it('renders sensor cards only when a device is selected', () => {
    const latestReading = {
      temperature_c: '23.4',
      humidity_pct: '48.1',
      lux: '100',
      sound: '11',
      air: '8',
    };
    const { rerender } = render(
      <DashboardSensorGrid
        selectedDevice=""
        latestReading={null}
        isRefreshing={false}
        sectionTitle="Current readings"
        temperatureLabel="Temperature"
        humidityLabel="Humidity"
        lightLabel="Light"
        soundLabel="Sound"
        airLabel="Air"
      />
    );

    expect(screen.queryByText('Current readings')).not.toBeInTheDocument();

    rerender(
      <DashboardSensorGrid
        selectedDevice="dev-1"
        latestReading={latestReading as never}
        isRefreshing={false}
        sectionTitle="Current readings"
        temperatureLabel="Temperature"
        humidityLabel="Humidity"
        lightLabel="Light"
        soundLabel="Sound"
        airLabel="Air"
      />
    );

    expect(screen.getByText('Current readings')).toBeInTheDocument();
    expect(screen.getByText(/Temperature:23.4/)).toBeInTheDocument();
    expect(screen.getByText(/Humidity:48.1/)).toBeInTheDocument();
    expect(screen.getByText(/Light:100/)).toBeInTheDocument();
    expect(screen.getByText(/Sound:/)).toBeInTheDocument();
    expect(screen.getByText(/Air:/)).toBeInTheDocument();
  });

  it('renders chart section only for selected device', () => {
    const history = [{ id: 1 }, { id: 2 }];
    const { rerender } = render(
      <DashboardChartsSection
        selectedDevice=""
        history={[] as never[]}
        isRefreshing={false}
        isHistoryLoading={false}
        temperatureHumidityTitle="Temp/Humidity"
        lightSoundAirTitle="Light/Sound/Air"
        temperatureHumidityLines={[]}
        lightSoundAirLines={[]}
      />
    );

    expect(screen.queryByText(/Temp\/Humidity/)).not.toBeInTheDocument();

    rerender(
      <DashboardChartsSection
        selectedDevice="dev-1"
        history={history as never[]}
        isRefreshing={false}
        isHistoryLoading={false}
        temperatureHumidityTitle="Temp/Humidity"
        lightSoundAirTitle="Light/Sound/Air"
        temperatureHumidityLines={[]}
        lightSoundAirLines={[]}
      />
    );

    expect(screen.getByText('Temp/Humidity:2:false')).toBeInTheDocument();
    expect(screen.getByText('Light/Sound/Air:2:false')).toBeInTheDocument();
  });

  it('wires the claim modal callbacks', () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onMethodChange = vi.fn();
    const onClaimCodeChange = vi.fn();
    const onClaimQrDataChange = vi.fn();
    const onClaimLabelChange = vi.fn();

    render(
      <ClaimDeviceModal
        isOpen
        claimMethod="code"
        claimCode="12345"
        claimQrData=""
        claimLabel="Office"
        claimError="Bad code"
        isClaiming={false}
        title="Claim device"
        closeLabel="Close"
        cancelLabel="Cancel"
        pairingCodeLabel="Code"
        qrCodeLabel="QR"
        pairingCodeFieldLabel="Pairing code"
        pairingCodePlaceholder="12345"
        qrContentLabel="QR content"
        qrContentPlaceholder="Paste QR"
        deviceLabelOptional="Label"
        deviceLabelPlaceholder="Office sensor"
        claimDeviceLabel="Claim"
        claimingLabel="Claiming"
        onClose={onClose}
        onSubmit={onSubmit}
        onMethodChange={onMethodChange}
        onClaimCodeChange={onClaimCodeChange}
        onClaimQrDataChange={onClaimQrDataChange}
        onClaimLabelChange={onClaimLabelChange}
      />
    );

    fireEvent.click(screen.getByText('QR'));
    fireEvent.change(screen.getByDisplayValue('12345'), { target: { value: '54321' } });
    fireEvent.change(screen.getByDisplayValue('Office'), { target: { value: 'Lab' } });
    fireEvent.click(screen.getByText('Close'));
    fireEvent.submit(screen.getByRole('button', { name: 'Claim' }).closest('form')!);

    expect(onMethodChange).toHaveBeenCalledWith('qr');
    expect(onClaimCodeChange).toHaveBeenCalledWith('54321');
    expect(onClaimLabelChange).toHaveBeenCalledWith('Lab');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Bad code')).toBeInTheDocument();
  });
});
