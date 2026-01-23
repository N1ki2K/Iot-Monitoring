# Admin Features Work Plan

## Overview

This document outlines the implementation plan for the Admin Features section of the IoT Monitoring web frontend.

**Target Features:**
1. User management improvements - Invite users, assign roles
2. Audit log - Track user actions and changes
3. System health dashboard - API stats, database size, etc.
4. Device provisioning - Bulk create/import devices
5. Backup & restore - Export/import system configuration

---

## Current State Analysis

**Existing Admin Capabilities:**
- User listing (read-only)
- Controller assignment management
- Controller CRUD operations
- Basic admin route protection

**Tech Stack:**
- React 19 + TypeScript
- Vite build tool
- Tailwind CSS
- Axios for API calls
- Recharts for visualization
- No external state management (local useState)

---

## Feature 1: User Management Improvements

### Scope
- Invite new users via email
- Assign/modify user roles (admin/regular)
- Deactivate/delete users
- Reset user passwords (admin action)

### Frontend Tasks

#### 1.1 User Management UI Enhancements
- [ ] Add "Invite User" button and modal form
  - Email input field
  - Role selection (admin/regular)
  - Optional: Set temporary password
- [ ] Add role toggle/dropdown to user table
- [ ] Add "Deactivate" and "Delete" actions per user
- [ ] Add user status column (active/inactive)
- [ ] Add password reset action button
- [ ] Confirmation modals for destructive actions

#### 1.2 New Components
- [ ] `InviteUserModal.tsx` - Form for inviting users
- [ ] `UserRoleSelector.tsx` - Dropdown for role assignment
- [ ] `UserActionsMenu.tsx` - Kebab menu for user actions

#### 1.3 API Integration
```typescript
// New API endpoints needed
POST   /api/admin/users/invite      // Send invitation
PATCH  /api/admin/users/:id/role    // Update role
PATCH  /api/admin/users/:id/status  // Activate/deactivate
DELETE /api/admin/users/:id         // Delete user
POST   /api/admin/users/:id/reset-password // Admin password reset
```

### Backend Tasks
- [ ] Create invitation system (token-based or direct)
- [ ] Add role update endpoint with validation
- [ ] Add user status field to database
- [ ] Add soft-delete or hard-delete for users
- [ ] Email service integration for invitations

### Estimated Effort: Medium-High

---

## Feature 2: Audit Log

### Scope
- Track all significant user actions
- Filterable/searchable log viewer
- Export audit logs
- Retention policy configuration

### Frontend Tasks

#### 2.1 Audit Log Viewer Component
- [ ] Create `AuditLogViewer.tsx` component
- [ ] Data table with columns:
  - Timestamp
  - User (who performed action)
  - Action type (LOGIN, CREATE, UPDATE, DELETE, etc.)
  - Resource type (user, controller, reading, etc.)
  - Resource ID
  - Details/Changes (JSON diff)
  - IP address (optional)
- [ ] Pagination support
- [ ] Filters:
  - Date range picker
  - User filter
  - Action type filter
  - Resource type filter
- [ ] Search functionality
- [ ] Export to CSV button

#### 2.2 New Components
- [ ] `AuditLogViewer.tsx` - Main audit log table
- [ ] `AuditLogFilters.tsx` - Filter controls
- [ ] `AuditLogDetail.tsx` - Modal for viewing full details

#### 2.3 API Integration
```typescript
// New API endpoints needed
GET /api/admin/audit-logs
    ?page=1
    &limit=50
    &startDate=2024-01-01
    &endDate=2024-01-31
    &userId=123
    &action=UPDATE
    &resourceType=controller

GET /api/admin/audit-logs/export  // CSV export
```

### Backend Tasks
- [ ] Create `audit_logs` table:
  ```sql
  CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT,
    action VARCHAR(50),        -- LOGIN, CREATE, UPDATE, DELETE
    resource_type VARCHAR(50), -- user, controller, reading
    resource_id VARCHAR(100),
    changes JSONB,             -- Before/after values
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```
- [ ] Create audit logging middleware/service
- [ ] Integrate logging into all admin actions
- [ ] Create paginated query endpoint
- [ ] Create CSV export endpoint

### Estimated Effort: Medium

---

## Feature 3: System Health Dashboard

### Scope
- Real-time API performance metrics
- Database statistics
- MQTT broker status
- System resource usage
- Error rate monitoring

### Frontend Tasks

#### 3.1 System Health Dashboard UI
- [ ] Create `SystemHealthDashboard.tsx` component
- [ ] Stat cards for key metrics:
  - Total API requests (24h)
  - Average response time
  - Error rate percentage
  - Active connections
- [ ] Database stats section:
  - Total readings count
  - Database size
  - Table sizes breakdown
  - Oldest/newest data timestamps
- [ ] MQTT broker status:
  - Connected devices count
  - Messages/second
  - Connection status indicator
- [ ] Charts:
  - API requests over time (line chart)
  - Error rate over time
  - Response time distribution
- [ ] Auto-refresh toggle (every 30s)

#### 3.2 New Components
- [ ] `SystemHealthDashboard.tsx` - Main dashboard
- [ ] `StatCard.tsx` - Reusable metric card
- [ ] `HealthStatusIndicator.tsx` - Green/yellow/red status
- [ ] `SystemMetricsChart.tsx` - Time-series charts

#### 3.3 API Integration
```typescript
// New API endpoints needed
GET /api/admin/health/overview     // Summary stats
GET /api/admin/health/database     // DB stats
GET /api/admin/health/mqtt         // MQTT broker stats
GET /api/admin/health/api-metrics  // API performance metrics
    ?period=24h|7d|30d
```

### Backend Tasks
- [ ] Implement API metrics collection (request count, timing)
- [ ] Create database stats queries
- [ ] MQTT broker status integration
- [ ] Create aggregation endpoints
- [ ] Optional: Redis for metrics caching

### Estimated Effort: Medium-High

---

## Feature 4: Device Provisioning

### Scope
- Bulk create devices/controllers
- Import from CSV/JSON file
- Generate pairing codes in batch
- Device templates

### Frontend Tasks

#### 4.1 Device Provisioning UI
- [ ] Create `DeviceProvisioning.tsx` component
- [ ] Single device creation form (enhanced)
- [ ] Bulk import section:
  - File upload (CSV/JSON)
  - Preview imported data
  - Validation display
  - Import progress indicator
- [ ] Bulk create form:
  - Device ID prefix
  - Count to create
  - Label template (e.g., "Sensor-{n}")
- [ ] Generated devices table with:
  - Device ID
  - Pairing code
  - QR code generation
  - Copy buttons
- [ ] Export provisioned devices list

#### 4.2 New Components
- [ ] `DeviceProvisioning.tsx` - Main provisioning page
- [ ] `BulkImportUploader.tsx` - File upload with preview
- [ ] `BulkCreateForm.tsx` - Form for batch creation
- [ ] `ProvisionedDevicesList.tsx` - Results table
- [ ] `QRCodeGenerator.tsx` - QR code display/download

#### 4.3 API Integration
```typescript
// New API endpoints needed
POST /api/admin/controllers/bulk-create
     body: { prefix: string, count: number, labelTemplate: string }

POST /api/admin/controllers/import
     body: { devices: Array<{deviceId, label?}> }

GET  /api/admin/controllers/:id/qr-code  // Generate QR code
```

### Backend Tasks
- [ ] Bulk controller creation endpoint
- [ ] CSV/JSON import parser and validator
- [ ] QR code generation library integration
- [ ] Pairing code batch generation
- [ ] Transaction handling for bulk operations

### Estimated Effort: Medium

---

## Feature 5: Backup & Restore

### Scope
- Export system configuration
- Export user data and assignments
- Import/restore from backup
- Scheduled backup option

### Frontend Tasks

#### 5.1 Backup & Restore UI
- [ ] Create `BackupRestore.tsx` component
- [ ] Backup section:
  - Checkbox selection for what to backup:
    - [ ] Users
    - [ ] Controllers
    - [ ] Assignments
    - [ ] Settings
    - [ ] Audit logs (optional)
  - Export format selection (JSON)
  - "Create Backup" button
  - Download generated file
- [ ] Restore section:
  - File upload for backup file
  - Validation preview
  - Conflict resolution options:
    - Skip existing
    - Overwrite
    - Create duplicates
  - Restore progress indicator
- [ ] Backup history table (optional)

#### 5.2 New Components
- [ ] `BackupRestore.tsx` - Main backup/restore page
- [ ] `BackupOptionsForm.tsx` - Selection checkboxes
- [ ] `RestoreUploader.tsx` - File upload with validation
- [ ] `RestorePreview.tsx` - Show what will be restored
- [ ] `RestoreProgress.tsx` - Progress indicator

#### 5.3 API Integration
```typescript
// New API endpoints needed
POST /api/admin/backup
     body: { include: ['users', 'controllers', 'assignments'] }
     response: { downloadUrl: string } or direct file download

POST /api/admin/restore
     body: { backup: object, conflictResolution: 'skip'|'overwrite' }

GET  /api/admin/backup/validate
     body: { backup: object }
     response: { valid: boolean, conflicts: [], warnings: [] }
```

### Backend Tasks
- [ ] Create backup generation service
- [ ] Create restore service with validation
- [ ] Handle foreign key relationships during restore
- [ ] Conflict detection logic
- [ ] Transaction handling for atomic restore
- [ ] File size limits and validation

### Estimated Effort: High

---

## Implementation Order (Recommended)

### Phase 1: Foundation (Week 1-2)
1. **User Management Improvements** - Core admin functionality
   - Most requested feature
   - Builds on existing user table
   - Required for other features (role-based access)

### Phase 2: Monitoring (Week 3-4)
2. **System Health Dashboard** - Visibility into system
   - Important for operations
   - Helps identify issues early
   - Can be built independently

3. **Audit Log** - Security and compliance
   - Depends on having actions to log
   - Start logging early, build UI after

### Phase 3: Operations (Week 5-6)
4. **Device Provisioning** - Scaling device management
   - Useful for larger deployments
   - QR codes improve user experience

5. **Backup & Restore** - Data protection
   - Most complex feature
   - Less urgent but important for production

---

## Shared Components to Create

These components will be reused across features:

- [ ] `AdminPageLayout.tsx` - Consistent admin page wrapper
- [ ] `ConfirmationModal.tsx` - Reusable confirmation dialog
- [ ] `DateRangePicker.tsx` - Date range selection
- [ ] `FileUploader.tsx` - Drag-drop file upload
- [ ] `DataExportButton.tsx` - CSV/JSON export button
- [ ] `ProgressBar.tsx` - Progress indicator
- [ ] `StatusBadge.tsx` - Status indicators

---

## Database Schema Changes

```sql
-- User status field
ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN invited_by INT REFERENCES users(id);
ALTER TABLE users ADD COLUMN invited_at TIMESTAMP;

-- Audit logs table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(100),
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- API metrics table (optional, can use Redis)
CREATE TABLE api_metrics (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INT,
  response_time_ms INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Backup history (optional)
CREATE TABLE backup_history (
  id SERIAL PRIMARY KEY,
  created_by INT REFERENCES users(id),
  backup_type VARCHAR(50),
  file_size BIGINT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Routes Summary

| Feature | Method | Endpoint | Description |
|---------|--------|----------|-------------|
| User Mgmt | POST | `/admin/users/invite` | Invite user |
| User Mgmt | PATCH | `/admin/users/:id/role` | Update role |
| User Mgmt | PATCH | `/admin/users/:id/status` | Activate/deactivate |
| User Mgmt | DELETE | `/admin/users/:id` | Delete user |
| User Mgmt | POST | `/admin/users/:id/reset-password` | Reset password |
| Audit | GET | `/admin/audit-logs` | List logs (paginated) |
| Audit | GET | `/admin/audit-logs/export` | Export CSV |
| Health | GET | `/admin/health/overview` | Summary stats |
| Health | GET | `/admin/health/database` | DB stats |
| Health | GET | `/admin/health/mqtt` | MQTT stats |
| Health | GET | `/admin/health/api-metrics` | API metrics |
| Provision | POST | `/admin/controllers/bulk-create` | Bulk create |
| Provision | POST | `/admin/controllers/import` | Import devices |
| Provision | GET | `/admin/controllers/:id/qr-code` | Generate QR |
| Backup | POST | `/admin/backup` | Create backup |
| Backup | POST | `/admin/restore` | Restore backup |
| Backup | POST | `/admin/backup/validate` | Validate backup |

---

## Success Criteria

- [ ] All admin features accessible from Admin Dashboard
- [ ] Role-based access control enforced
- [ ] All destructive actions have confirmation dialogs
- [ ] Error handling with user-friendly messages
- [ ] Loading states for async operations
- [ ] Mobile-responsive design
- [ ] Consistent styling with existing UI
- [ ] API error responses handled gracefully
- [ ] Unit tests for critical functions
- [ ] Documentation updated

---

## Notes

- Start with backend endpoints before frontend UI
- Use existing component patterns for consistency
- Add TypeScript interfaces for all new data types
- Consider pagination for all list endpoints
- Implement proper error handling throughout
- Add loading states for better UX
