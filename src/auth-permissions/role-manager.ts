/**
 * Role Manager Implementation
 * Manages role definitions and hierarchies
 * Enterprise Standards v4.0.0 compliant
 */

import type { Role, RoleManager } from './types.js';

export class DefaultRoleManager implements RoleManager {
  private readonly roles = new Map<string, Role>();
  private readonly permissionIndex = new Map<string, Set<string>>();
  private readonly inheritanceCache = new Map<string, Set<string>>();

  async createRole(role: Role): Promise<void> {
    if (this.roles.has(role.id)) {
      throw new Error(`Role ${role.id} already exists`);
    }

    // Validate inheritance doesn't create cycles
    if (role.inheritsFrom && role.inheritsFrom.length > 0) {
      this.validateInheritance(role.id, role.inheritsFrom);
    }

    this.roles.set(role.id, role);

    // Update permission index
    for (const permission of role.permissions) {
      this.addToIndex(this.permissionIndex, permission, role.id);
    }

    // Clear inheritance cache
    this.inheritanceCache.clear();
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<void> {
    const existing = this.roles.get(id);
    if (!existing) {
      throw new Error(`Role ${id} not found`);
    }

    // Validate inheritance if changed
    if (updates.inheritsFrom) {
      this.validateInheritance(id, updates.inheritsFrom);
    }

    // Remove old permissions from index
    if (updates.permissions) {
      for (const permission of existing.permissions) {
        this.removeFromIndex(this.permissionIndex, permission, id);
      }
    }

    // Update role
    const updated: Role = { ...existing, ...updates };
    this.roles.set(id, updated);

    // Update permission index with new permissions
    if (updates.permissions) {
      for (const permission of updated.permissions) {
        this.addToIndex(this.permissionIndex, permission, id);
      }
    }

    // Clear inheritance cache
    this.inheritanceCache.clear();
  }

  async deleteRole(id: string): Promise<void> {
    const role = this.roles.get(id);
    if (!role) {
      return;
    }

    // Remove from permission index
    for (const permission of role.permissions) {
      this.removeFromIndex(this.permissionIndex, permission, id);
    }

    // Check if any roles inherit from this one
    for (const [otherId, otherRole] of this.roles) {
      if (otherRole.inheritsFrom?.includes(id)) {
        throw new Error(
          `Cannot delete role ${id}: role ${otherId} inherits from it`,
        );
      }
    }

    this.roles.delete(id);
    this.inheritanceCache.clear();
  }

  async getRole(id: string): Promise<Role | null> {
    return this.roles.get(id) ?? null;
  }

  async getRolesByPermission(permissionId: string): Promise<readonly Role[]> {
    const roleIds = this.permissionIndex.get(permissionId);
    if (!roleIds) {
      return [];
    }

    const roles: Role[] = [];
    for (const id of roleIds) {
      const role = this.roles.get(id);
      if (role) {
        roles.push(role);
      }
    }

    return roles;
  }

  async getAllRoles(): Promise<readonly Role[]> {
    return Array.from(this.roles.values());
  }

  async getEffectivePermissions(
    roleIds: readonly string[],
  ): Promise<readonly string[]> {
    const allPermissions = new Set<string>();

    for (const roleId of roleIds) {
      const effectiveRoles = this.getEffectiveRoles(roleId);

      for (const effectiveRoleId of effectiveRoles) {
        const role = this.roles.get(effectiveRoleId);
        if (role) {
          for (const permission of role.permissions) {
            allPermissions.add(permission);
          }
        }
      }
    }

    return Array.from(allPermissions);
  }

  private getEffectiveRoles(roleId: string): Set<string> {
    // Check cache
    const cached = this.inheritanceCache.get(roleId);
    if (cached) {
      return cached;
    }

    const effective = new Set<string>();
    const visited = new Set<string>();

    this.collectEffectiveRoles(roleId, effective, visited);

    // Cache result
    this.inheritanceCache.set(roleId, effective);

    return effective;
  }

  private collectEffectiveRoles(
    roleId: string,
    effective: Set<string>,
    visited: Set<string>,
  ): void {
    if (visited.has(roleId)) {
      return;
    }

    visited.add(roleId);
    effective.add(roleId);

    const role = this.roles.get(roleId);
    if (role?.inheritsFrom) {
      for (const parentId of role.inheritsFrom) {
        this.collectEffectiveRoles(parentId, effective, visited);
      }
    }
  }

  private validateInheritance(
    roleId: string,
    inheritsFrom: readonly string[],
  ): void {
    for (const parentId of inheritsFrom) {
      if (!this.roles.has(parentId)) {
        throw new Error(`Cannot inherit from non-existent role ${parentId}`);
      }

      if (this.wouldCreateCycle(roleId, parentId)) {
        throw new Error(
          `Inheritance would create a cycle: ${roleId} -> ${parentId}`,
        );
      }
    }
  }

  private wouldCreateCycle(childId: string, parentId: string): boolean {
    const visited = new Set<string>();
    return this.hasCycle(parentId, childId, visited);
  }

  private hasCycle(
    current: string,
    target: string,
    visited: Set<string>,
  ): boolean {
    if (current === target) {
      return true;
    }

    if (visited.has(current)) {
      return false;
    }

    visited.add(current);

    const role = this.roles.get(current);
    if (role?.inheritsFrom) {
      for (const parentId of role.inheritsFrom) {
        if (this.hasCycle(parentId, target, visited)) {
          return true;
        }
      }
    }

    return false;
  }

  private addToIndex(
    index: Map<string, Set<string>>,
    key: string,
    value: string,
  ): void {
    let set = index.get(key);
    if (!set) {
      set = new Set<string>();
      index.set(key, set);
    }
    set.add(value);
  }

  private removeFromIndex(
    index: Map<string, Set<string>>,
    key: string,
    value: string,
  ): void {
    const set = index.get(key);
    if (set) {
      set.delete(value);
      if (set.size === 0) {
        index.delete(key);
      }
    }
  }

  static create(): DefaultRoleManager {
    return new DefaultRoleManager();
  }
}
