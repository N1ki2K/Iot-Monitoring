import { fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AdminAssignmentsSection } from './AdminAssignmentsSection';
import { AdminControllersSection } from './AdminControllersSection';
import { AdminUsersSection } from './AdminUsersSection';

vi.mock('../../utils/format', () => ({
  formatLocaleDateTime: (value: string | null | undefined, locale: string) =>
    `${locale}:${value ?? 'missing'}`,
}));

describe('admin section components', () => {
  it('renders users and protects the current user from deletion', () => {
    const onInvite = vi.fn();
    const onDelete = vi.fn();

    render(
        <AdminUsersSection
        currentUser={{
          id: 1,
          username: 'me',
          email: 'me@example.com',
          role: 'admin',
          created_at: '2026-03-01T10:00:00Z',
        }}
        users={[
          {
            id: 1,
            username: 'me',
            email: 'me@example.com',
            role: 'admin',
            is_admin: true,
            invited_at: '2026-03-10T10:00:00Z',
            must_change_password: false,
            created_at: '2026-03-01T10:00:00Z',
          },
          {
            id: 2,
            username: 'other',
            email: 'other@example.com',
            role: 'user',
            is_admin: false,
            invited_at: '2026-03-11T10:00:00Z',
            must_change_password: true,
            created_at: '2026-03-02T10:00:00Z',
          },
        ]}
        isLoading={false}
        error=""
        locale="en-US"
        usersTitle="Users"
        usersHelp="Manage users"
        inviteLabel="Invite"
        usernameLabel="Username"
        emailLabel="Email"
        roleLabel="Role"
        invitedLabel="Invited"
        mustChangeLabel="Must change"
        createdLabel="Created"
        loadingLabel="Loading"
        noUsersLabel="No users"
        yesLabel="Yes"
        noLabel="No"
        userLabel="User"
        adminLabel="Admin"
        youLabel="You"
        deleteLabel="Delete"
        deletingLabel="Deleting"
        onInvite={onInvite}
        onDelete={onDelete}
        deletingUserId={null}
      />
    );

    fireEvent.click(screen.getByText('Invite'));
    fireEvent.click(screen.getByText('Delete'));

    expect(onInvite).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(2);
    expect(screen.getByText('You')).toBeInTheDocument();
    expect(screen.getByText('en-US:2026-03-10T10:00:00Z')).toBeInTheDocument();
  });

  it('renders and wires assignment section interactions', () => {
    const onSelectUser = vi.fn();
    const onSelectController = vi.fn();
    const onAssign = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onRemove = vi.fn();

    render(
      <AdminAssignmentsSection
        users={[{ id: 2, username: 'other', email: 'other@example.com' } as never]}
        controllers={[
          { id: 7, device_id: 'dev-7', label: 'Lab', pairing_code: '12345' } as never,
        ]}
        assignments={[
          {
            user_id: 2,
            controller_id: 7,
            assignment_label: 'Office',
            controller_label: 'Lab',
            device_id: 'dev-7',
            pairing_code: '12345',
            created_at: '2026-03-11T10:00:00Z',
          } as never,
        ]}
        selectedUserId={2}
        controllerId={7}
        locale="en-US"
        error=""
        title="Assignments"
        help="Manage assignments"
        userLabel="User"
        controllerLabel="Controller"
        assignLabel="Assign"
        selectUserLabel="Select user"
        selectControllerLabel="Select controller"
        controllerIdLabel="Controller ID"
        assignedLabel="Assigned"
        codeLabel="Code"
        selectUserForAssignmentsLabel="Pick user"
        noAssignmentsLabel="No assignments"
        removeLabel="Remove"
        onSelectUser={onSelectUser}
        onSelectController={onSelectController}
        onAssign={onAssign}
        onRemove={onRemove}
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '2' } });
    fireEvent.change(selects[1], { target: { value: '7' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Assign' }).closest('form')!);
    fireEvent.click(screen.getByText('Remove'));

    expect(onSelectUser).toHaveBeenCalledWith(2);
    expect(onSelectController).toHaveBeenCalledWith(7);
    expect(onAssign).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(7);
    expect(screen.getByText('Office • dev-7')).toBeInTheDocument();
  });

  it('renders and wires controller section interactions', () => {
    const onDeviceIdChange = vi.fn();
    const onLabelChange = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onDelete = vi.fn();

    render(
      <AdminControllersSection
        controllers={[
          {
            id: 9,
            device_id: 'dev-9',
            label: 'Warehouse',
            pairing_code: '55555',
            created_at: '2026-03-12T09:00:00Z',
          } as never,
        ]}
        availableDevices={['dev-9']}
        deviceId="dev-9"
        label="Warehouse"
        locale="en-US"
        error=""
        title="Controllers"
        help="Manage controllers"
        deviceIdLabel="Device ID"
        labelOptionalLabel="Optional label"
        codeLabel="Code"
        createdLabel="Created"
        addControllerLabel="Add controller"
        noControllersLabel="No controllers"
        deleteLabel="Delete"
        commonLabel="Label"
        onDeviceIdChange={onDeviceIdChange}
        onLabelChange={onLabelChange}
        onSubmit={onSubmit}
        onDelete={onDelete}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('device_id'), { target: { value: 'dev-10' } });
    fireEvent.change(screen.getByPlaceholderText('Lab Sensor 01'), { target: { value: 'Kitchen' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Add controller' }).closest('form')!);
    fireEvent.click(screen.getByText('Delete'));

    expect(onDeviceIdChange).toHaveBeenCalledWith('dev-10');
    expect(onLabelChange).toHaveBeenCalledWith('Kitchen');
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(9);
    expect(screen.getByText('en-US:2026-03-12T09:00:00Z')).toBeInTheDocument();
  });
});
