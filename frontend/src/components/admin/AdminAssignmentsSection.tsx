import type { FormEvent } from 'react';
import type { Controller, UserControllerAssignment, UserListItem } from '../../types';
import { formatLocaleDateTime } from '../../utils/format';

interface AdminAssignmentsSectionProps {
  users: UserListItem[];
  controllers: Controller[];
  assignments: UserControllerAssignment[];
  selectedUserId: number | '';
  controllerId: number | '';
  locale: string;
  error: string;
  title: string;
  help: string;
  userLabel: string;
  controllerLabel: string;
  assignLabel: string;
  selectUserLabel: string;
  selectControllerLabel: string;
  controllerIdLabel: string;
  assignedLabel: string;
  codeLabel: string;
  selectUserForAssignmentsLabel: string;
  noAssignmentsLabel: string;
  removeLabel: string;
  onSelectUser: (value: number | '') => void;
  onSelectController: (value: number | '') => void;
  onAssign: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (controllerId: number) => void;
}

export function AdminAssignmentsSection({
  users,
  controllers,
  assignments,
  selectedUserId,
  controllerId,
  locale,
  error,
  title,
  help,
  userLabel,
  controllerLabel,
  assignLabel,
  selectUserLabel,
  selectControllerLabel,
  controllerIdLabel,
  assignedLabel,
  codeLabel,
  selectUserForAssignmentsLabel,
  noAssignmentsLabel,
  removeLabel,
  onSelectUser,
  onSelectController,
  onAssign,
  onRemove,
}: AdminAssignmentsSectionProps) {
  return (
    <section className="bg-slate-800/40 rounded-xl border border-slate-700/40 overflow-hidden">
      <div className="p-4 border-b border-slate-700/40">
        <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
        <p className="text-sm text-gray-400 mt-1">{help}</p>
      </div>
      <div className="p-4 space-y-4">
        <form className="grid gap-4 md:grid-cols-3" onSubmit={onAssign}>
          <div>
            <label className="text-sm text-gray-300">{userLabel}</label>
            <select
              className="select w-full mt-2"
              value={selectedUserId}
              onChange={(event) => onSelectUser(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">{selectUserLabel}</option>
              {users.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.username} ({row.email})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-300">{controllerLabel}</label>
            <select
              className="select w-full mt-2"
              value={controllerId}
              onChange={(event) => onSelectController(event.target.value ? Number(event.target.value) : '')}
            >
              <option value="">{selectControllerLabel}</option>
              {controllers.map((controller) => (
                <option key={controller.id} value={controller.id}>
                  {controller.label ? `${controller.label} • ` : ''}
                  {controller.device_id}
                  {controller.pairing_code ? ` • ${controller.pairing_code}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-primary w-full" type="submit">
              {assignLabel}
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
                <th>{controllerIdLabel}</th>
                <th>{assignedLabel}</th>
                <th>{codeLabel}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {selectedUserId === '' ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    {selectUserForAssignmentsLabel}
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-gray-500">
                    {noAssignmentsLabel}
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => (
                  <tr key={`${assignment.user_id}-${assignment.controller_id}`}>
                    <td>
                      {assignment.assignment_label
                        ? `${assignment.assignment_label} • `
                        : assignment.controller_label
                          ? `${assignment.controller_label} • `
                          : ''}
                      {assignment.device_id}
                    </td>
                    <td>{formatLocaleDateTime(assignment.created_at, locale)}</td>
                    <td>{assignment.pairing_code || '-'}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="btn btn-ghost text-red-300"
                        onClick={() => onRemove(assignment.controller_id)}
                      >
                        {removeLabel}
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
