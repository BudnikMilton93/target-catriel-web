import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../_lib/db', () => ({
  db: {
    usuario: { findUnique: vi.fn() },
    usuarioRol: { findMany: vi.fn() },
    bloque: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    respuesta: { count: vi.fn() },
    registroAuditoria: { create: vi.fn() },
  },
}));

import { db } from '../../_lib/db';
import handler from './[id]';
import { createMockRes, mockAuthAs } from '../../_lib/test-utils';

const PROFESOR_ID = 'profesor-1';
const OTRO_PROFESOR_ID = 'profesor-2';
const BLOQUE_ID = 'bloque-1';

function baseRequest(method: string, userId: string, body: Record<string, any> = {}) {
  return {
    method,
    headers: { authorization: `Bearer ${userId}` },
    query: { id: BLOQUE_ID },
    body,
  } as any;
}

function mockBloque(overrides: Record<string, any> = {}) {
  return {
    id: BLOQUE_ID,
    nivel: 'A1',
    profesorId: PROFESOR_ID,
    profesor: {},
    alumnos: [],
    modulos: [],
    ...overrides,
  };
}

describe('PUT/DELETE /api/profesor/bloques/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('403 si el profesor autenticado no es dueño del bloque', async () => {
    mockAuthAs(OTRO_PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue(mockBloque() as any);

    const req = baseRequest('GET', OTRO_PROFESOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
  });

  it('409 al cambiar de nivel un bloque que ya tiene actividades con respuestas', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue(mockBloque() as any);
    vi.mocked(db.respuesta.count).mockResolvedValue(2);

    const req = baseRequest('PUT', PROFESOR_ID, { nivel: 'A2' });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(409);
    expect(db.bloque.update).not.toHaveBeenCalled();
  });

  it('permite cambiar otros campos (no nivel) aunque el bloque tenga respuestas', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue(mockBloque() as any);
    vi.mocked(db.bloque.update).mockResolvedValue(mockBloque({ dias: 'Martes' }) as any);

    const req = baseRequest('PUT', PROFESOR_ID, { dias: 'Martes' });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.respuesta.count).not.toHaveBeenCalled();
    expect(db.bloque.update).toHaveBeenCalled();
  });

  it('409 al eliminar un bloque con actividades que ya tienen respuestas', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue(mockBloque() as any);
    vi.mocked(db.respuesta.count).mockResolvedValue(5);

    const req = baseRequest('DELETE', PROFESOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(409);
    expect(db.bloque.delete).not.toHaveBeenCalled();
  });

  it('elimina el bloque sin respuestas asociadas', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue(mockBloque() as any);
    vi.mocked(db.respuesta.count).mockResolvedValue(0);
    vi.mocked(db.bloque.delete).mockResolvedValue(mockBloque() as any);

    const req = baseRequest('DELETE', PROFESOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.bloque.delete).toHaveBeenCalledWith({ where: { id: BLOQUE_ID } });
  });
});
