import type { FormEvent } from 'react';
import type { Controller } from '../../types';
import { formatLocaleDateTime } from '../../utils/format';

interface AdminControllersSectionProps {
  controllers: Controller[];
  availableDevices: string[];
  deviceId: string;
  label: string;
  locale: string;
  error: string;
  title: string;
  help: string;
  deviceIdLabel: string;
  labelOptionalLabel: string;
  codeLabel: string;
  createdLabel: string;
  addControllerLabel: string;
  noControllersLabel: string;
  deleteLabel: string;
  commonLabel: string;
  onDeviceIdChange: (value: string) => void;
  onLabelChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDelete: (controllerId: number) => void;
}

export function AdminControllersSection({
  controllers,
  availableDevices,
  deviceId,
  label,
  locale,
  error,
  title,
  help,
  deviceIdLabel,
  labelOptionalLabel,
  codeLabel,
  createdLabel,
  addControllerLabel,
  noControllersLabel,
  deleteLabel,
  commonLabel,
  onDeviceIdChange,
  onLabelChange,
  onSubmit,
  onDelete,
}: AdminControllersSectionProps) {
  return (
    <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
      <div className="p-4 border-b border-slate-700/40">
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        <p className="text-sm text-gray-400 mt-1">{help}</p>
      </div>
      <div className="p-4 space-y-4">
        <form className="grid gap-4 md:grid-cols-3" onSubmit={onSubmit}>
          <div>
            <label className="text-sm text-gray-300">{deviceIdLabel}</label>
            <input
              className="input mt-2"
              list="available-devices"
              placeholder="device_id"
              value={deviceId}
              onChange={(event) => onDeviceIdChange(event.target.value)}
            />
            <datalist id="available-devices">
              {availableDevices.map((device) => (
                <option key={device} value={device} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-sm text-gray-300">{labelOptionalLabel}</label>
            <input
              className="input mt-2"
              placeholder="Lab Sensor 01"
              value={label}
              onChange={(event) => onLabelChange(event.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button className="btn btn-secondary w-full" type="submit">
              {addControllerLabel}
            </button>
          </div>
        </form>

        {error && (
          <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>{deviceIdLabel}</th>
                <th>{commonLabel}</th>
                <th>{codeLabel}</th>
                <th>{createdLabel}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {controllers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-500">
                    {noControllersLabel}
                  </td>
                </tr>
              ) : (
                controllers.map((controller) => (
                  <tr key={controller.id}>
                    <td>{controller.device_id}</td>
                    <td>{controller.label || '-'}</td>
                    <td>{controller.pairing_code || '-'}</td>
                    <td>{formatLocaleDateTime(controller.created_at, locale)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-ghost text-red-300"
                        onClick={() => onDelete(controller.id)}
                      >
                        {deleteLabel}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
