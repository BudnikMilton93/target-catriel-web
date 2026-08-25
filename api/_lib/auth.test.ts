import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// `db` es un singleton de PrismaClient (ver api/_lib/db.ts). Se mockea el
// módulo completo antes de importar auth.ts para no tocar una base real.
vi.mock('./db', () => ({
  db: {
    registroAuditoria: {
      create: vi.fn(),
    },
    usuario: {
      findUnique: vi.fn(),
    },
    usuarioRol: {
      findMany: vi.fn(),
    },
  },
}));

import { db } from './db';
import { ApiError } from './types';
import {
  authenticateRequest,
  extractToken,
  logAudit,
  validateToken,
  withAuth,
} from './auth';
import { createMockRes } from './test-utils';

describe('logAudit', () => {
  const createMock = vi.mocked(db.registroAuditoria.create);

  beforeEach(() => {
    createMock.mockReset();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persiste el registro con los datos recibidos', async () => {
    createMock.mockResolvedValueOnce({} as any);

    await logAudit('usuario-1', 'crear', 'Noticia', { titulo: 'Nueva noticia' });

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith({
      data: {
        usuarioId: 'usuario-1',
        accion: 'crear',
        entidad: 'Noticia',
        detalles: { titulo: 'Nueva noticia' },
      },
    });
  });

  it('usa un objeto vacío como default cuando no se pasan detalles', async () => {
    createMock.mockResolvedValueOnce({} as any);

    await logAudit('usuario-1', 'eliminar', 'Galeria');

    expect(createMock).toHaveBeenCalledWith({
      data: {
        usuarioId: 'usuario-1',
        accion: 'eliminar',
        entidad: 'Galeria',
        detalles: {},
      },
    });
  });

  it('no propaga la excepción si falla la escritura en la base de datos', async () => {
    const dbError = new Error('conexión rechazada');
    createMock.mockRejectedValueOnce(dbError);

    await expect(
      logAudit('usuario-1', 'editar', 'Modulo', { campo: 'nombre' }),
    ).resolves.toBeUndefined();
  });

  it('loguea el error con contexto cuando falla la persistencia', async () => {
    const dbError = new Error('conexión rechazada');
    createMock.mockRejectedValueOnce(dbError);
    const consoleErrorSpy = vi.spyOn(console, 'error');

    await logAudit('usuario-42', 'editar', 'Modulo', { campo: 'nombre' });

    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const [message, loggedError] = consoleErrorSpy.mock.calls[0];
    expect(message).toContain('usuario-42');
    expect(message).toContain('editar');
    expect(message).toContain('Modulo');
    expect(loggedError).toBe(dbError);
  });
});

describe('extractToken', () => {
  it('extrae el token de un header "Bearer <token>" válido', () => {
    expect(extractToken('Bearer abc123')).toBe('abc123');
  });

  it('devuelve null si no hay header', () => {
    expect(extractToken(undefined)).toBeNull();
  });

  it('devuelve null si el esquema no es "Bearer"', () => {
    expect(extractToken('Basic abc123')).toBeNull();
  });

  it('devuelve null si el header tiene un formato inválido', () => {
    expect(extractToken('Bearer')).toBeNull();
    expect(extractToken('Bearer a b')).toBeNull();
  });
});

describe('validateToken', () => {
  const findUniqueMock = vi.mocked(db.usuario.findUnique);
  const findManyMock = vi.mocked(db.usuarioRol.findMany);

  beforeEach(() => {
    findUniqueMock.mockReset();
    findManyMock.mockReset();
  });

  it('devuelve el usuario autenticado con sus roles si el token (usuarioId) existe', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 'user-1',
      nombre: 'Prof. María',
      email: 'maria@target.com',
    } as any);
    findManyMock.mockResolvedValueOnce([
      { rol: { nombre: 'profesor' } },
    ] as any);

    const user = await validateToken('user-1');

    expect(user).toEqual({
      id: 'user-1',
      nombre: 'Prof. María',
      email: 'maria@target.com',
      roles: ['profesor'],
    });
  });

  it('devuelve null si el usuario no existe en la base', async () => {
    findUniqueMock.mockResolvedValueOnce(null);

    const user = await validateToken('usuario-inexistente');

    expect(user).toBeNull();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('devuelve null si la consulta a la base falla', async () => {
    findUniqueMock.mockRejectedValueOnce(new Error('conexión rechazada'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const user = await validateToken('user-1');

    expect(user).toBeNull();
  });
});

describe('authenticateRequest', () => {
  const findUniqueMock = vi.mocked(db.usuario.findUnique);
  const findManyMock = vi.mocked(db.usuarioRol.findMany);

  beforeEach(() => {
    findUniqueMock.mockReset();
    findManyMock.mockReset();
  });

  it('lanza 401 si no hay header Authorization', async () => {
    const req: any = { headers: {} };
    await expect(authenticateRequest(req)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('lanza 401 si el token no corresponde a ningún usuario', async () => {
    findUniqueMock.mockResolvedValueOnce(null);
    const req: any = { headers: { authorization: 'Bearer usuario-inexistente' } };

    await expect(authenticateRequest(req)).rejects.toBeInstanceOf(ApiError);
  });

  it('adjunta el usuario autenticado a req.user cuando el token es válido', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 'user-1',
      nombre: 'Prof. María',
      email: 'maria@target.com',
    } as any);
    findManyMock.mockResolvedValueOnce([{ rol: { nombre: 'profesor' } }] as any);
    const req: any = { headers: { authorization: 'Bearer user-1' } };

    await authenticateRequest(req);

    expect(req.user).toEqual({
      id: 'user-1',
      nombre: 'Prof. María',
      email: 'maria@target.com',
      roles: ['profesor'],
    });
  });
});

describe('withAuth', () => {
  const findUniqueMock = vi.mocked(db.usuario.findUnique);
  const findManyMock = vi.mocked(db.usuarioRol.findMany);

  beforeEach(() => {
    findUniqueMock.mockReset();
    findManyMock.mockReset();
  });

  it('responde 401 y no llama al handler si falta el token', async () => {
    const handler = vi.fn();
    const wrapped = withAuth(handler);
    const req: any = { headers: {} };
    const res = createMockRes();

    await wrapped(req, res as any);

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body!)).toMatchObject({ success: false, error: 'No autorizado' });
  });

  it('llama al handler con req.user poblado si el token es válido', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 'user-1',
      nombre: 'Prof. María',
      email: 'maria@target.com',
    } as any);
    findManyMock.mockResolvedValueOnce([{ rol: { nombre: 'profesor' } }] as any);

    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = withAuth(handler);
    const req: any = { headers: { authorization: 'Bearer user-1' } };
    const res = createMockRes();

    await wrapped(req, res as any);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 'user-1', roles: ['profesor'] });
  });

  it('convierte una excepción inesperada del handler en un 500, sin filtrar el detalle', async () => {
    findUniqueMock.mockResolvedValueOnce({
      id: 'user-1',
      nombre: 'Prof. María',
      email: 'maria@target.com',
    } as any);
    findManyMock.mockResolvedValueOnce([{ rol: { nombre: 'profesor' } }] as any);

    const handler = vi.fn().mockRejectedValue(new Error('boom inesperado'));
    const wrapped = withAuth(handler);
    const req: any = { headers: { authorization: 'Bearer user-1' } };
    const res = createMockRes();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await wrapped(req, res as any);

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body!);
    expect(body.error).toBe('Error interno del servidor');
    expect(body.error).not.toContain('boom inesperado');
  });
});
