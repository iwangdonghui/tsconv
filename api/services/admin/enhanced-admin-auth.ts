/**
 * Enhanced Admin Authentication & Authorization
 * Advanced permission system with role-based access control and audit logging
 */

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  roles: AdminRole[];
  permissions: AdminPermission[];
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: number;
  loginCount: number;
  createdAt: number;
  updatedAt: number;
  metadata: {
    department?: string;
    title?: string;
    location?: string;
    phone?: string;
    emergencyContact?: string;
  };
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  level: number; // 1-10, higher = more privileged
  inherits?: string[]; // Role inheritance
}

export interface AdminPermission {
  id: string;
  resource: string;
  action: string;
  scope: 'global' | 'department' | 'self';
  conditions?: Record<string, any>;
}

export interface AdminSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: number;
  refreshExpiresAt: number;
  ipAddress: string;
  userAgent: string;
  createdAt: number;
  lastActivity: number;
  permissions: AdminPermission[];
  metadata: {
    loginMethod: 'password' | 'sso' | 'api-key' | 'mfa';
    mfaVerified: boolean;
    deviceFingerprint?: string;
    location?: {
      country: string;
      city: string;
      timezone: string;
    };
  };
}

export interface AdminAuditLog {
  id: string;
  userId: string;
  sessionId: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  endpoint: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  duration: number;
  status: 'success' | 'failure' | 'error';
  details: {
    requestBody?: any;
    responseStatus: number;
    errorMessage?: string;
    changes?: {
      before: any;
      after: any;
    };
  };
  metadata: {
    correlationId: string;
    riskScore: number;
    flags: string[];
  };
}

/**
 * Enhanced Admin Authentication Manager
 */
export class EnhancedAdminAuth {
  private static instance: EnhancedAdminAuth;
  private users = new Map<string, AdminUser>();
  private roles = new Map<string, AdminRole>();
  private sessions = new Map<string, AdminSession>();
  private auditLogs: AdminAuditLog[] = [];
  private permissionCache = new Map<string, { permissions: AdminPermission[]; timestamp: number }>();

  constructor() {
    this.initializeDefaultRoles();
    this.initializeDefaultUsers();
    this.startSessionCleanup();
  }

  static getInstance(): EnhancedAdminAuth {
    if (!EnhancedAdminAuth.instance) {
      EnhancedAdminAuth.instance = new EnhancedAdminAuth();
    }
    return EnhancedAdminAuth.instance;
  }

  /**
   * Initialize default roles
   */
  private initializeDefaultRoles(): void {
    const defaultRoles: AdminRole[] = [
      {
        id: 'super-admin',
        name: 'Super Administrator',
        description: 'Full system access with all permissions',
        level: 10,
        permissions: [
          { id: 'system:*', resource: 'system', action: '*', scope: 'global' },
          { id: 'users:*', resource: 'users', action: '*', scope: 'global' },
          { id: 'audit:*', resource: 'audit', action: '*', scope: 'global' }
        ]
      },
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Administrative access with most permissions',
        level: 8,
        permissions: [
          { id: 'system:read', resource: 'system', action: 'read', scope: 'global' },
          { id: 'system:write', resource: 'system', action: 'write', scope: 'global' },
          { id: 'users:read', resource: 'users', action: 'read', scope: 'global' },
          { id: 'users:write', resource: 'users', action: 'write', scope: 'department' },
          { id: 'audit:read', resource: 'audit', action: 'read', scope: 'global' }
        ]
      },
      {
        id: 'operator',
        name: 'System Operator',
        description: 'Operational access for monitoring and maintenance',
        level: 6,
        permissions: [
          { id: 'system:read', resource: 'system', action: 'read', scope: 'global' },
          { id: 'health:read', resource: 'health', action: 'read', scope: 'global' },
          { id: 'metrics:read', resource: 'metrics', action: 'read', scope: 'global' },
          { id: 'cache:manage', resource: 'cache', action: 'manage', scope: 'global' }
        ]
      },
      {
        id: 'viewer',
        name: 'Read-Only Viewer',
        description: 'Read-only access to system information',
        level: 3,
        permissions: [
          { id: 'system:read', resource: 'system', action: 'read', scope: 'global' },
          { id: 'health:read', resource: 'health', action: 'read', scope: 'global' },
          { id: 'metrics:read', resource: 'metrics', action: 'read', scope: 'global' }
        ]
      },
      {
        id: 'auditor',
        name: 'Security Auditor',
        description: 'Access to audit logs and security information',
        level: 5,
        permissions: [
          { id: 'audit:read', resource: 'audit', action: 'read', scope: 'global' },
          { id: 'security:read', resource: 'security', action: 'read', scope: 'global' },
          { id: 'logs:read', resource: 'logs', action: 'read', scope: 'global' }
        ]
      }
    ];

    defaultRoles.forEach(role => this.roles.set(role.id, role));
  }

  /**
   * Initialize default users
   */
  private initializeDefaultUsers(): void {
    const defaultUsers: AdminUser[] = [
      {
        id: 'admin-001',
        username: 'admin',
        email: 'admin@tsconv.com',
        roles: [this.roles.get('super-admin')!],
        permissions: [],
        status: 'active',
        lastLogin: 0,
        loginCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {
          department: 'IT',
          title: 'System Administrator'
        }
      }
    ];

    defaultUsers.forEach(user => {
      // Resolve permissions from roles
      user.permissions = this.resolveUserPermissions(user);
      this.users.set(user.id, user);
    });
  }

  /**
   * Authenticate admin user
   */
  async authenticateUser(
    credentials: { username?: string; email?: string; password?: string; apiKey?: string; token?: string },
    context: { ipAddress: string; userAgent: string }
  ): Promise<{ success: boolean; session?: AdminSession; error?: string }> {
    try {
      let user: AdminUser | undefined;

      // API Key authentication
      if (credentials.apiKey) {
        user = this.authenticateWithAPIKey(credentials.apiKey);
      }
      // JWT token authentication
      else if (credentials.token) {
        const session = this.validateSession(credentials.token);
        if (session) {
          user = this.users.get(session.userId);
        }
      }
      // Username/password authentication
      else if ((credentials.username || credentials.email) && credentials.password) {
        user = this.authenticateWithPassword(credentials.username || credentials.email!, credentials.password);
      }

      if (!user) {
        this.logAuditEvent({
          userId: 'unknown',
          sessionId: 'none',
          action: 'login_failed',
          resource: 'auth',
          method: 'POST',
          endpoint: '/admin/auth',
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          timestamp: Date.now(),
          duration: 0,
          status: 'failure',
          details: {
            responseStatus: 401,
            errorMessage: 'Invalid credentials'
          },
          metadata: {
            correlationId: this.generateCorrelationId(),
            riskScore: 7,
            flags: ['failed_login']
          }
        });

        return { success: false, error: 'Invalid credentials' };
      }

      if (user.status !== 'active') {
        return { success: false, error: 'Account is not active' };
      }

      // Create session
      const session = this.createSession(user, context);

      // Update user login info
      user.lastLogin = Date.now();
      user.loginCount++;
      user.updatedAt = Date.now();

      this.logAuditEvent({
        userId: user.id,
        sessionId: session.id,
        action: 'login_success',
        resource: 'auth',
        method: 'POST',
        endpoint: '/admin/auth',
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: Date.now(),
        duration: 0,
        status: 'success',
        details: {
          responseStatus: 200
        },
        metadata: {
          correlationId: this.generateCorrelationId(),
          riskScore: 2,
          flags: ['successful_login']
        }
      });

      return { success: true, session };

    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Validate session and check permissions
   */
  validateSessionAndPermissions(
    token: string,
    requiredPermission: { resource: string; action: string; scope?: string }
  ): { valid: boolean; session?: AdminSession; user?: AdminUser; error?: string } {
    const session = this.validateSession(token);
    if (!session) {
      return { valid: false, error: 'Invalid or expired session' };
    }

    const user = this.users.get(session.userId);
    if (!user || user.status !== 'active') {
      return { valid: false, error: 'User not found or inactive' };
    }

    // Check permission
    const hasPermission = this.checkPermission(user, requiredPermission);
    if (!hasPermission) {
      return { valid: false, error: 'Insufficient permissions' };
    }

    // Update session activity
    session.lastActivity = Date.now();

    return { valid: true, session, user };
  }

  /**
   * Check if user has specific permission
   */
  checkPermission(
    user: AdminUser,
    required: { resource: string; action: string; scope?: string }
  ): boolean {
    // Check cached permissions first
    const cacheKey = `${user.id}:${required.resource}:${required.action}:${required.scope || 'global'}`;
    const cached = this.permissionCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      return cached.permissions.length > 0;
    }

    // Resolve all user permissions
    const userPermissions = this.resolveUserPermissions(user);

    // Check for exact match or wildcard
    const hasPermission = userPermissions.some(permission => {
      // Wildcard resource or action
      if (permission.resource === '*' || permission.action === '*') {
        return true;
      }

      // Exact resource match
      if (permission.resource === required.resource) {
        // Wildcard action or exact action match
        if (permission.action === '*' || permission.action === required.action) {
          // Check scope if specified
          if (required.scope) {
            return permission.scope === 'global' || permission.scope === required.scope;
          }
          return true;
        }
      }

      return false;
    });

    // Cache result
    this.permissionCache.set(cacheKey, {
      permissions: hasPermission ? [required as AdminPermission] : [],
      timestamp: Date.now()
    });

    return hasPermission;
  }

  /**
   * Log audit event
   */
  logAuditEvent(event: Omit<AdminAuditLog, 'id'>): void {
    const auditLog: AdminAuditLog = {
      ...event,
      id: this.generateAuditId()
    };

    this.auditLogs.push(auditLog);

    // Keep only last 10000 audit logs
    if (this.auditLogs.length > 10000) {
      this.auditLogs = this.auditLogs.slice(-5000);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${auditLog.action} by ${auditLog.userId} on ${auditLog.resource}`);
    }
  }

  /**
   * Get audit logs with filtering
   */
  getAuditLogs(filter: {
    userId?: string;
    action?: string;
    resource?: string;
    startTime?: number;
    endTime?: number;
    status?: string;
    limit?: number;
    offset?: number;
  } = {}): { logs: AdminAuditLog[]; total: number } {
    let filteredLogs = [...this.auditLogs];

    // Apply filters
    if (filter.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filter.userId);
    }

    if (filter.action) {
      filteredLogs = filteredLogs.filter(log => log.action.includes(filter.action!));
    }

    if (filter.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === filter.resource);
    }

    if (filter.startTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filter.startTime!);
    }

    if (filter.endTime) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filter.endTime!);
    }

    if (filter.status) {
      filteredLogs = filteredLogs.filter(log => log.status === filter.status);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    const total = filteredLogs.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 100;

    return {
      logs: filteredLogs.slice(offset, offset + limit),
      total
    };
  }

  /**
   * Get admin statistics
   */
  getAdminStats(): {
    users: { total: number; active: number; inactive: number; suspended: number };
    sessions: { total: number; active: number; expired: number };
    audit: { total: number; recent: number; failures: number };
    permissions: { roles: number; permissions: number };
  } {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const userStats = {
      total: this.users.size,
      active: Array.from(this.users.values()).filter(u => u.status === 'active').length,
      inactive: Array.from(this.users.values()).filter(u => u.status === 'inactive').length,
      suspended: Array.from(this.users.values()).filter(u => u.status === 'suspended').length
    };

    const sessionStats = {
      total: this.sessions.size,
      active: Array.from(this.sessions.values()).filter(s => s.expiresAt > now).length,
      expired: Array.from(this.sessions.values()).filter(s => s.expiresAt <= now).length
    };

    const auditStats = {
      total: this.auditLogs.length,
      recent: this.auditLogs.filter(log => log.timestamp > oneDayAgo).length,
      failures: this.auditLogs.filter(log => log.status === 'failure' && log.timestamp > oneDayAgo).length
    };

    const permissionStats = {
      roles: this.roles.size,
      permissions: Array.from(this.roles.values()).reduce((sum, role) => sum + role.permissions.length, 0)
    };

    return {
      users: userStats,
      sessions: sessionStats,
      audit: auditStats,
      permissions: permissionStats
    };
  }

  /**
   * Helper methods
   */
  private authenticateWithAPIKey(apiKey: string): AdminUser | undefined {
    // Simple API key validation - in production, use proper API key management
    const validApiKeys = {
      'admin-key-001': 'admin-001'
    };

    const userId = validApiKeys[apiKey as keyof typeof validApiKeys];
    return userId ? this.users.get(userId) : undefined;
  }

  private authenticateWithPassword(identifier: string, password: string): AdminUser | undefined {
    // Simple password validation - in production, use proper password hashing
    const validCredentials = {
      'admin': 'admin123',
      'admin@tsconv.com': 'admin123'
    };

    const validPassword = validCredentials[identifier as keyof typeof validCredentials];
    if (validPassword === password) {
      return Array.from(this.users.values()).find(u => 
        u.username === identifier || u.email === identifier
      );
    }

    return undefined;
  }

  private createSession(user: AdminUser, context: { ipAddress: string; userAgent: string }): AdminSession {
    const sessionId = this.generateSessionId();
    const now = Date.now();

    const session: AdminSession = {
      id: sessionId,
      userId: user.id,
      token: this.generateToken(),
      refreshToken: this.generateRefreshToken(),
      expiresAt: now + 8 * 60 * 60 * 1000, // 8 hours
      refreshExpiresAt: now + 30 * 24 * 60 * 60 * 1000, // 30 days
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      createdAt: now,
      lastActivity: now,
      permissions: user.permissions,
      metadata: {
        loginMethod: 'password',
        mfaVerified: false
      }
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  private validateSession(token: string): AdminSession | undefined {
    const session = Array.from(this.sessions.values()).find(s => s.token === token);
    
    if (!session) {
      return undefined;
    }

    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(session.id);
      return undefined;
    }

    return session;
  }

  private resolveUserPermissions(user: AdminUser): AdminPermission[] {
    const permissions: AdminPermission[] = [...user.permissions];

    // Add permissions from roles
    user.roles.forEach(role => {
      permissions.push(...role.permissions);
    });

    // Remove duplicates
    const uniquePermissions = permissions.filter((permission, index, self) => 
      index === self.findIndex(p => p.id === permission.id)
    );

    return uniquePermissions;
  }

  private startSessionCleanup(): void {
    // Clean up expired sessions every hour
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.expiresAt <= now) {
          this.sessions.delete(sessionId);
        }
      }
    }, 60 * 60 * 1000);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateRefreshToken(): string {
    return `refresh_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  private generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Public methods for user management
   */
  getUsers(): AdminUser[] {
    return Array.from(this.users.values());
  }

  getUser(userId: string): AdminUser | undefined {
    return this.users.get(userId);
  }

  getRoles(): AdminRole[] {
    return Array.from(this.roles.values());
  }

  getRole(roleId: string): AdminRole | undefined {
    return this.roles.get(roleId);
  }

  getSessions(): AdminSession[] {
    return Array.from(this.sessions.values());
  }

  revokeSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  clearPermissionCache(): void {
    this.permissionCache.clear();
  }
}

export default EnhancedAdminAuth;
