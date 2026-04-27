export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum LoginProvider {
  EMAIL = 'EMAIL',
  GOOGLE = 'GOOGLE',
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export enum ProjectVisibility {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
}

export enum UserAccessLevel {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
  COMMENTATOR = 'COMMENTATOR',
  LEAD = 'LEAD',
}

export enum UserAccessType {
  PROJECT = 'PROJECT',
  NODE = 'NODE',
}

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export enum LogEntityType {
  PROJECT = 'PROJECT',
  NODE = 'NODE',
  PROJECT_INVITATION = 'PROJECT_INVITATION',
  USER_ACCESS = 'USER_ACCESS',
  USER = 'USER',
}
