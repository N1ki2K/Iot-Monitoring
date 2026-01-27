/**
 * Controller/device type definitions
 */

/**
 * A controller (registered device)
 */
export interface Controller {
  id: number;
  device_id: string;
  label?: string | null;
  pairing_code: string | null;
  created_at: string;
}

/**
 * User's controller assignment
 */
export interface UserControllerAssignment {
  user_id: number;
  controller_id: number;
  device_id: string;
  controller_label?: string | null;
  assignment_label?: string | null;
  pairing_code?: string | null;
  created_at: string;
}

/**
 * Claim controller request payload
 */
export interface ClaimControllerRequest {
  code: string;
  label?: string;
}

/**
 * Create controller request payload (admin)
 */
export interface CreateControllerRequest {
  deviceId: string;
  label?: string;
}

/**
 * Assign controller request payload (admin)
 */
export interface AssignControllerRequest {
  controllerId: number;
  label?: string;
}

/**
 * Update controller label request
 */
export interface UpdateControllerLabelRequest {
  label: string | null;
}
