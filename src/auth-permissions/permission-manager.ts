/**
 * Permission Manager Implementation
 * Manages permission definitions
 * Enterprise Standards v4.0.0 compliant
 */

import type { Permission, PermissionManager } from './types.js';

export class DefaultPermissionManager implements PermissionManager {
  private readonly permissions = new Map<string, Permission>();
  private readonly resourceIndex = new Map<string, Set<string>>();
  private readonly actionIndex = new Map<string, Set<string>>();

  async createPermission(permission: Permission): Promise<void> {
    if (this.permissions.has(permission.id)) {
      throw new Error(`Permission ${permission.id} already exists`);
    }

    this.permissions.set(permission.id, permission);
    
    // Update indices
    this.addToIndex(this.resourceIndex, permission.resource, permission.id);
    this.addToIndex(this.actionIndex, permission.action, permission.id);
  }

  async updatePermission(id: string, updates: Partial<Permission>): Promise<void> {
    const existing = this.permissions.get(id);
    if (!existing) {
      throw new Error(`Permission ${id} not found`);
    }

    // Remove from old indices if resource or action changed
    if (updates.resource && updates.resource !== existing.resource) {
      this.removeFromIndex(this.resourceIndex, existing.resource, id);
    }
    if (updates.action && updates.action !== existing.action) {
      this.removeFromIndex(this.actionIndex, existing.action, id);
    }

    // Update permission
    const updated: Permission = { ...existing, ...updates };
    this.permissions.set(id, updated);

    // Update indices with new values
    if (updates.resource) {
      this.addToIndex(this.resourceIndex, updated.resource, id);
    }
    if (updates.action) {
      this.addToIndex(this.actionIndex, updated.action, id);
    }
  }

  async deletePermission(id: string): Promise<void> {
    const permission = this.permissions.get(id);
    if (!permission) {
      return;
    }

    // Remove from indices
    this.removeFromIndex(this.resourceIndex, permission.resource, id);
    this.removeFromIndex(this.actionIndex, permission.action, id);
    
    this.permissions.delete(id);
  }

  async getPermission(id: string): Promise<Permission | null> {
    return this.permissions.get(id) ?? null;
  }

  async getPermissionsByResource(resource: string): Promise<readonly Permission[]> {
    const permissionIds = this.resourceIndex.get(resource);
    if (!permissionIds) {
      return [];
    }

    const permissions: Permission[] = [];
    for (const id of permissionIds) {
      const permission = this.permissions.get(id);
      if (permission) {
        permissions.push(permission);
      }
    }

    return permissions;
  }

  async getPermissionsByAction(action: string): Promise<readonly Permission[]> {
    const permissionIds = this.actionIndex.get(action);
    if (!permissionIds) {
      return [];
    }

    const permissions: Permission[] = [];
    for (const id of permissionIds) {
      const permission = this.permissions.get(id);
      if (permission) {
        permissions.push(permission);
      }
    }

    return permissions;
  }

  async getAllPermissions(): Promise<readonly Permission[]> {
    return Array.from(this.permissions.values());
  }

  private addToIndex(index: Map<string, Set<string>>, key: string, value: string): void {
    let set = index.get(key);
    if (!set) {
      set = new Set<string>();
      index.set(key, set);
    }
    set.add(value);
  }

  private removeFromIndex(index: Map<string, Set<string>>, key: string, value: string): void {
    const set = index.get(key);
    if (set) {
      set.delete(value);
      if (set.size === 0) {
        index.delete(key);
      }
    }
  }

  static create(): DefaultPermissionManager {
    return new DefaultPermissionManager();
  }
}