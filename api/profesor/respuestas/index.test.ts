import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../_lib/db', () => ({
  db: {
    usuario: { findUnique: vi.fn() },
    usuarioRol: { findMany: vi.fn() },
    bloque: { findMany: vi.fn(), findUnique: vi.fn() },
    respuesta: { findMany: vi.fn() },
    registroAuditoria: { create: vi.fn() },
  },
}));

import { db } from '../../_lib/db';
import handler from './index';
import { createMockRes, mockAuthAs } from '../../_lib/test-utils';

const PROFESOR_ID = 'profesor-1';
const OTRO_PROFESOR_ID = 'profesor-2';
const BLOQUE_AJENO_ID = 'bloque-ajeno';

function baseRequest(userId: string, query: Record<string, any> = {}) {
  return {
    method: 'GET',
    headers: { authorization: `Bearer ${userId}` },
    query,
    body: {},
  } as any;
}

describe('GET /api/profesor/respuestas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('403/404 si el profesor pasa un bloqueId que no le pertenece (IDOR)', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    // El bloque pertenece a otro profesor
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_AJENO_ID,
      profesorId: OTRO_PROFESOR_ID,
    } as any);

    const req = baseRequest(PROFESOR_ID, { bloqueId: BLOQUE_AJENO_ID });
    const res = createMockRes();
    await handler(req, res as any);

    expect([403, 404]).toContain(res.statusCode);
    expect(db.respuesta.findMany).not.toHaveBeenCalled();
  });

  it('200 y filtra correctamente cuando el bloqueId sí pertenece al profesor', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: 'bloque-propio',
      profesorId: PROFESOR_ID,
    } as any);
    vi.mocked(db.respuesta.findMany).mockResolvedValue([]);

    const req = baseRequest(PROFESOR_ID, { bloqueId: 'bloque-propio' });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.respuesta.findMany).toHaveBeenCalled();
  });

  it('403 si el bloqueId pasado no existe (no filtra a ciegas ni deja pasar)', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue(null);

    const req = baseRequest(PROFESOR_ID, { bloqueId: 'bloque-inexistente' });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(db.respuesta.findMany).not.toHaveBeenCalled();
  });

  it('un administrador puede consultar cualquier bloqueId sin validar pertenencia', async () => {
    mockAuthAs('admin-1', ['administrador']);
    vi.mocked(db.respuesta.findMany).mockResolvedValue([]);

    const req = baseRequest('admin-1', { bloqueId: BLOQUE_AJENO_ID });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    // Al ser admin, no debería ni necesitar consultar el dueño del bloque.
    expect(db.bloque.findUnique).not.toHaveBeenCalled();
    expect(db.respuesta.findMany).toHaveBeenCalled();
  });

  it('sin bloqueId, agrega las respuestas de todos los bloques propios del profesor', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findMany).mockResolvedValue([
      { id: 'bloque-a' },
      { id: 'bloque-b' },
    ] as any);
    vi.mocked(db.respuesta.findMany).mockResolvedValue([]);

    const req = baseRequest(PROFESOR_ID, {});
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.bloque.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { profesorId: PROFESOR_ID } }),
    );
    expect(db.respuesta.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { contenido: { modulo: { bloqueId: { in: ['bloque-a', 'bloque-b'] } } } },
      }),
    );
  });

  it('sin bloqueId y sin bloques propios, responde 200 con lista vacía sin consultar respuestas', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findMany).mockResolvedValue([]);

    const req = baseRequest(PROFESOR_ID, {});
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.respuesta.findMany).not.toHaveBeenCalled();
  });
});
