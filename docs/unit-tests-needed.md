# Files That Need Unit Tests

This document lists all files that should have unit tests for comprehensive coverage.

---

## Frontend (`/frontend/src`)

### API Layer
| File | Test File | What to Test |
|------|-----------|--------------|
| `api/index.ts` | `api/index.test.ts` | API client methods, error handling, request interceptors, auth header injection |

### Components
| File | Test File | What to Test |
|------|-----------|--------------|
| `components/SensorCard.tsx` | `components/SensorCard.test.tsx` | Renders sensor data correctly, handles null values, displays correct icons |
| `components/Chart.tsx` | `components/Chart.test.tsx` | Renders chart with data, handles empty data, time range selection |
| `components/DataTable.tsx` | `components/DataTable.test.tsx` | Pagination, sorting, search filtering, column rendering |
| `components/DeviceSelector.tsx` | `components/DeviceSelector.test.tsx` | Device list rendering, selection callback, loading state |
| `components/ProfileMenu.tsx` | `components/ProfileMenu.test.tsx` | Menu opens/closes, logout callback, user info display |
| `components/Auth.tsx` | `components/Auth.test.tsx` | Login form validation, register form validation, error display, form submission |
| `components/Settings.tsx` | `components/Settings.test.tsx` | Profile update form, password change form, account deletion confirmation |
| `components/Dashboard.tsx` | `components/Dashboard.test.tsx` | Data loading, device switching, sensor cards rendering |
| `components/AdminDashboard.tsx` | `components/AdminDashboard.test.tsx` | User list, controller management, admin actions |

### App
| File | Test File | What to Test |
|------|-----------|--------------|
| `App.tsx` | `App.test.tsx` | Route rendering, auth state management, navigation |

---

## Backend (`/backend/src`)

### API Endpoints
| File | Test File | What to Test |
|------|-----------|--------------|
| `api.ts` | `api.test.ts` | All endpoint tests (see details below) |

#### `api.ts` Detailed Test Cases:

**Auth Endpoints:**
- `POST /api/auth/register` - successful registration, duplicate email/username, missing fields
- `POST /api/auth/login` - successful login, invalid credentials, missing fields
- `GET /api/me` - returns user data, unauthorized access
- `PATCH /api/me` - profile update, duplicate email handling
- `PATCH /api/me/password` - password change, wrong current password
- `DELETE /api/me` - account deletion

**Admin Endpoints:**
- `GET /api/users` - admin access, non-admin rejection
- `GET /api/controllers` - list controllers, admin only
- `POST /api/controllers` - create controller, duplicate device handling
- `DELETE /api/controllers/:id` - delete controller

**User Controllers:**
- `GET /api/users/:id/controllers` - user's assigned controllers
- `POST /api/users/:id/controllers` - assign controller (admin)
- `PATCH /api/users/:id/controllers/:id` - update label
- `DELETE /api/users/:id/controllers` - remove assignment

**Device/Reading Endpoints:**
- `GET /api/devices` - list devices (filtered by user permissions)
- `GET /api/latest/:deviceId` - latest reading, access control
- `GET /api/history/:deviceId` - historical data, time range
- `GET /api/readings` - pagination, search, sorting, filtering

**Utility Functions:**
- `hashPassword` / `verifyPassword` - password hashing
- `generatePairingCode` - unique code generation
- `ensureAdmin` - admin check logic
- `getRequester` - user extraction from header

### MQTT Ingest
| File | Test File | What to Test |
|------|-----------|--------------|
| `ingest.ts` | `ingest.test.ts` | Message parsing, database insertion, MQTT connection handling |

---

## Mobile App (`/mobile/app/src/main/java/com/monitoring/iotmon`)

### Data Layer
| File | Test File | What to Test |
|------|-----------|--------------|
| `data/api/ApiClient.kt` | `ApiClientTest.kt` | Retrofit configuration, interceptors |
| `data/models/Models.kt` | `ModelsTest.kt` | Data class serialization/deserialization |
| `data/repository/IoTRepository.kt` | `IoTRepositoryTest.kt` | API calls, error handling, data mapping |
| `data/preferences/UserPreferences.kt` | `UserPreferencesTest.kt` | DataStore operations, default values |

### ViewModels
| File | Test File | What to Test |
|------|-----------|--------------|
| `ui/viewmodel/AuthViewModel.kt` | `AuthViewModelTest.kt` | Login/register state, validation, error handling |
| `ui/viewmodel/DashboardViewModel.kt` | `DashboardViewModelTest.kt` | Device loading, sensor data fetching, refresh logic |
| `ui/viewmodel/AdminViewModel.kt` | `AdminViewModelTest.kt` | User management, controller operations |
| `ui/viewmodel/SettingsViewModel.kt` | `SettingsViewModelTest.kt` | Profile updates, theme changes |
| `ui/viewmodel/NotificationSettingsViewModel.kt` | `NotificationSettingsViewModelTest.kt` | Threshold management, notification toggles |

### Utilities
| File | Test File | What to Test |
|------|-----------|--------------|
| `util/BiometricHelper.kt` | `BiometricHelperTest.kt` | Biometric availability check |
| `util/NotificationHelper.kt` | `NotificationHelperTest.kt` | Notification channel creation |
| `widget/SensorWidgetProvider.kt` | `SensorWidgetProviderTest.kt` | Widget update logic, data formatting |
| `worker/ThresholdWorker.kt` | `ThresholdWorkerTest.kt` | Background check logic, notification triggering |

### UI Components (Compose)
| File | Test File | What to Test |
|------|-----------|--------------|
| `ui/components/SensorCard.kt` | `SensorCardTest.kt` | UI rendering, click handlers |
| `ui/components/SensorChart.kt` | `SensorChartTest.kt` | Chart rendering with data |
| `ui/components/ClaimDeviceDialog.kt` | `ClaimDeviceDialogTest.kt` | Dialog state, input validation |
| `ui/components/QRCodeGenerator.kt` | `QRCodeGeneratorTest.kt` | QR code bitmap generation |

---

## Shared Types (`/packages/shared-types`)

No unit tests needed - this package only contains TypeScript type definitions with no runtime logic.

---

## Priority Order for Implementation

### High Priority (Core Business Logic)
1. `backend/src/api.ts` - API endpoint tests
2. `frontend/src/api/index.ts` - API client tests
3. `mobile/.../IoTRepository.kt` - Repository tests

### Medium Priority (User-Facing Components)
4. `frontend/src/components/Auth.tsx`
5. `frontend/src/components/Dashboard.tsx`
6. `frontend/src/components/DataTable.tsx`
7. `mobile/.../AuthViewModel.kt`
8. `mobile/.../DashboardViewModel.kt`

### Lower Priority (Supporting Components)
9. Remaining frontend components
10. Remaining mobile ViewModels
11. Mobile UI components
12. Utility classes

---

## Running Tests

```bash
# Frontend
cd frontend && npm test

# Backend
cd backend && npm test

# Mobile (from /mobile directory)
./gradlew test

# All tests via root
npm run test:all  # (if configured)
```
