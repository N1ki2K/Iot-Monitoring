import type { FormEvent } from 'react';

interface ClaimDeviceModalProps {
  isOpen: boolean;
  claimMethod: 'code' | 'qr';
  claimCode: string;
  claimQrData: string;
  claimLabel: string;
  claimError: string;
  isClaiming: boolean;
  title: string;
  closeLabel: string;
  cancelLabel: string;
  pairingCodeLabel: string;
  qrCodeLabel: string;
  pairingCodeFieldLabel: string;
  pairingCodePlaceholder: string;
  qrContentLabel: string;
  qrContentPlaceholder: string;
  deviceLabelOptional: string;
  deviceLabelPlaceholder: string;
  claimDeviceLabel: string;
  claimingLabel: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onMethodChange: (method: 'code' | 'qr') => void;
  onClaimCodeChange: (value: string) => void;
  onClaimQrDataChange: (value: string) => void;
  onClaimLabelChange: (value: string) => void;
}

export function ClaimDeviceModal({
  isOpen,
  claimMethod,
  claimCode,
  claimQrData,
  claimLabel,
  claimError,
  isClaiming,
  title,
  closeLabel,
  cancelLabel,
  pairingCodeLabel,
  qrCodeLabel,
  pairingCodeFieldLabel,
  pairingCodePlaceholder,
  qrContentLabel,
  qrContentPlaceholder,
  deviceLabelOptional,
  deviceLabelPlaceholder,
  claimDeviceLabel,
  claimingLabel,
  onClose,
  onSubmit,
  onMethodChange,
  onClaimCodeChange,
  onClaimQrDataChange,
  onClaimLabelChange,
}: ClaimDeviceModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button className="btn btn-ghost" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-800/60 p-1">
            <button
              type="button"
              className={`btn ${claimMethod === 'code' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onMethodChange('code')}
            >
              {pairingCodeLabel}
            </button>
            <button
              type="button"
              className={`btn ${claimMethod === 'qr' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => onMethodChange('qr')}
            >
              {qrCodeLabel}
            </button>
          </div>
          {claimMethod === 'code' ? (
            <div>
              <label className="text-sm text-gray-300">{pairingCodeFieldLabel}</label>
              <input
                className="input mt-2"
                placeholder={pairingCodePlaceholder}
                value={claimCode}
                onChange={(event) => onClaimCodeChange(event.target.value)}
              />
            </div>
          ) : (
            <div>
              <label className="text-sm text-gray-300">{qrContentLabel}</label>
              <textarea
                className="input mt-2 min-h-24"
                placeholder={qrContentPlaceholder}
                value={claimQrData}
                onChange={(event) => onClaimQrDataChange(event.target.value)}
              />
            </div>
          )}
          <div>
            <label className="text-sm text-gray-300">{deviceLabelOptional}</label>
            <input
              className="input mt-2"
              placeholder={deviceLabelPlaceholder}
              value={claimLabel}
              onChange={(event) => onClaimLabelChange(event.target.value)}
            />
          </div>
          {claimError && (
            <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {claimError}
            </div>
          )}
          <div className="flex items-center gap-3 justify-end">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              {cancelLabel}
            </button>
            <button className="btn btn-primary" type="submit" disabled={isClaiming}>
              {isClaiming ? claimingLabel : claimDeviceLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
