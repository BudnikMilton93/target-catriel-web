import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './types';
import {
  apiHandler,
  handleError,
  sendError,
  sendMethodNotAllowed,
  sendSuccess,
  validateMethod,
} from './response';
import { createMockRes } from './test-utils';

describe('sendSuccess', () => {
  it('serializa data con success:true y el status code dado', () => {
    const res = createMockRes();

    sendSuccess(res as any, { id: '1' }, 201, 'creado');

    expect(res.statusCode).toBe(201);
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(res.body!)).toEqual({
      success: true,
      data: { id: '1' },
      message: 'creado',
    });
  });

  it('usa 200 como status code por default', () => {
    const res = createMockRes();
    sendSuccess(res as any, null);
    expect(res.statusCode).toBe(200);
  });
});

describe('sendError', () => {
  it('serializa el mensaje de error con success:false', () => {
    const res = createMockRes();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    sendError(res as any, 403, 'Acceso denegado');

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body!)).toEqual({ success: false, error: 'Acceso denegado' });
  });
});

// Test de contrato del paso 0.3 del plan de migración .NET
// (documents/arquitectura/03-plan-migracion-dotnet.md, sección 9): fija el
// shape genérico/500 que hoy produce `handleError` para cualquier error no
// controlado, antes de que exista código .NET equivalente. Solo valida
// status code + shape (`{ success: false, error }`), no el texto exacto del
// mensaje salvo donde ya estaba fijado (no exponer detalle interno).
describe('handleError', () => {
  it('respeta el statusCode explícito de un ApiError y no cae en el shape genérico 500', () => {
    const res = createMockRes();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    handleError(res as any, new ApiError(409, 'conflicto de negocio'));

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body!)).toEqual({ success: false, error: 'conflicto de negocio' });
  });

  it('convierte un Error genérico en 500 con shape estándar, sin exponer el mensaje interno en `error`', () => {
    const res = createMockRes();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    handleError(res as any, new Error('detalle interno sensible'));

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body!)).toEqual({ success: false, error: expect.any(String) });
  });

  it('convierte un valor lanzado que no es instancia de Error en el mismo shape 500 estándar', () => {
    const res = createMockRes();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    handleError(res as any, 'string lanzado a mano');

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body!)).toEqual({ success: false, error: expect.any(String) });
  });
});

describe('apiHandler — contrato de error no controlado', () => {
  it('un handler que lanza un valor no-Error (ej. string u objeto plano) responde 500 con el shape estándar', async () => {
    const res = createMockRes();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const wrapped = apiHandler(async () => {
      throw { foo: 'bar' };
    });

    await wrapped({} as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body!)).toEqual({ success: false, error: expect.any(String) });
  });

  it('un handler que lanza un Error inesperado responde 500 con el shape estándar', async () => {
    const res = createMockRes();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const wrapped = apiHandler(async () => {
      throw new Error('fallo inesperado de Prisma');
    });

    await wrapped({} as any, res as any);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body!)).toEqual({ success: false, error: expect.any(String) });
  });
});

describe('validateMethod', () => {
  it('es true si el método está en la lista permitida', () => {
    expect(validateMethod({ method: 'POST' }, ['GET', 'POST'])).toBe(true);
  });

  it('es false si el método no está permitido', () => {
    expect(validateMethod({ method: 'DELETE' }, ['GET', 'POST'])).toBe(false);
  });
});

describe('sendMethodNotAllowed', () => {
  it('responde 405', () => {
    const res = createMockRes();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    sendMethodNotAllowed(res as any);

    expect(res.statusCode).toBe(405);
  });
});
