import { describe, expect, it } from 'vitest';
import { ApiError } from './types';
import {
  canPerformAction,
  hasAllRoles,
  hasRole,
  requireRole,
  requireRoles,
  ROLE_PERMISSIONS,
} from './roles';

describe('hasRole', () => {
  it('es true si el usuario tiene el único rol requerido', () => {
    expect(hasRole(['profesor'], 'profesor')).toBe(true);
  });

  it('es true si el usuario tiene alguno de varios roles requeridos', () => {
    expect(hasRole(['alumno'], ['profesor', 'alumno'])).toBe(true);
  });

  it('es false si el usuario no tiene ninguno de los roles requeridos', () => {
    expect(hasRole(['alumno'], ['profesor', 'administrador'])).toBe(false);
  });

  it('es false para un usuario sin roles', () => {
    expect(hasRole([], 'administrador')).toBe(false);
  });
});

describe('hasAllRoles', () => {
  it('es true solo si el usuario tiene todos los roles requeridos', () => {
    expect(hasAllRoles(['administrador', 'profesor'], ['administrador', 'profesor'])).toBe(true);
  });

  it('es false si falta al menos uno de los roles requeridos', () => {
    expect(hasAllRoles(['profesor'], ['administrador', 'profesor'])).toBe(false);
  });
});

describe('requireRole', () => {
  it('lanza 401 si no hay usuario autenticado', () => {
    const guard = requireRole('administrador');
    expect(() => guard(undefined)).toThrow(ApiError);
    try {
      guard(undefined);
    } catch (error) {
      expect((error as ApiError).statusCode).toBe(401);
    }
  });

  it('lanza 403 si el usuario no tiene ninguno de los roles permitidos', () => {
    const guard = requireRole('administrador');
    try {
      guard({ id: '1', nombre: 'X', email: 'x@x.com', roles: ['alumno'] });
      expect.unreachable('debía lanzar ApiError 403');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).statusCode).toBe(403);
    }
  });

  it('no lanza si el usuario tiene alguno de los roles permitidos', () => {
    const guard = requireRole('profesor', 'administrador');
    expect(() =>
      guard({ id: '1', nombre: 'X', email: 'x@x.com', roles: ['profesor'] }),
    ).not.toThrow();
  });
});

describe('requireRoles', () => {
  it('devuelve un predicado que evalúa contra la lista de roles permitidos', () => {
    const check = requireRoles('marketing', 'administrador');
    expect(check(['marketing'])).toBe(true);
    expect(check(['alumno'])).toBe(false);
  });
});

describe('canPerformAction', () => {
  it('permite la acción cuando el rol del usuario está en ROLE_PERMISSIONS', () => {
    expect(canPerformAction(['marketing'], 'crear_noticia')).toBe(true);
    expect(canPerformAction(['administrador'], 'crear_noticia')).toBe(true);
  });

  it('deniega la acción cuando el rol del usuario no está permitido', () => {
    expect(canPerformAction(['alumno'], 'crear_noticia')).toBe(false);
    expect(canPerformAction(['profesor'], 'eliminar_usuario')).toBe(false);
  });

  it('deniega una acción que no existe en la tabla de permisos', () => {
    // @ts-expect-error probamos una acción inexistente a propósito
    expect(canPerformAction(['administrador'], 'accion_inventada')).toBe(false);
  });

  it('un alumno nunca puede editar el bloque de un profesor (regla de negocio central)', () => {
    expect(canPerformAction(['alumno'], 'editar_bloque_cualquiera')).toBe(false);
    expect(ROLE_PERMISSIONS.editar_bloque_cualquiera).toEqual(['administrador']);
  });
});
