export interface Permission {
  id: string;
  code: string;
  name: string;
  module: string;
  action: string;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  scopeLevel: 'system' | 'campus';
  status: string;
  permissionIds: string[];
}

export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
  mobile?: string;
  email?: string;
  roles: string[];
  campusIds: string[];
  status: string;
}

export interface CurrentUserProfile {
  id: string;
  username: string;
  displayName: string;
  roles: string[];
  campusIds: string[];
  permissions: string[];
}
