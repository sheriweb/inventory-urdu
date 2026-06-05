export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';
export const BCRYPT_SALT_ROUNDS = 12;

export const MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  TOKEN_REFRESHED: 'Token refreshed successfully',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_DISABLED: 'Account is disabled',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden',
  TOKEN_INVALID: 'Invalid or expired token',
  CREATED: (entity: string) => `${entity} created successfully`,
  UPDATED: (entity: string) => `${entity} updated successfully`,
  FETCHED: (entity: string) => `${entity} fetched successfully`,
  LIST_FETCHED: (entity: string) => `${entity} list fetched successfully`,
  NOT_FOUND: (entity: string) => `${entity} not found`,
  DELETED: (entity: string) => `${entity} deleted successfully`,
};
