import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../_lib/db', () => ({
  db: {
    usuario: { findUnique: vi.fn() },
    usuarioRol: { findMany: vi.fn() },
    respuesta: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    registroAuditoria: { create: vi.fn() },
  },
}));

import { db } from '../../_lib/db';
import handler from './[id]';
import { createMockRes, mockAuthAs } from '../../_lib/test-utils';

const ALUMNO_ID = 'alumno-1';
const OTRO_ALUMNO_ID = 'alumno-2';
const RESPUESTA_ID = 'respuesta-1';

function baseRequest(method: string, userId: string, body: Record<string, any> = {}) {
  return {
    method,
    headers: { authorization: `Bearer ${userId}` },
    query: { id: RESPUESTA_ID },
    body,
  } as any;
}

function mockRespuesta(overrides: Record<string, any> = {}) {
  return {
    id: RESPUESTA_ID,
    alumnoId: ALUMNO_ID,
    respuesta: 'original',
    contenido: { modulo: {} },
    ...overrides,
  };
}

describe('PUT/DELETE /api/alumno/respuestas/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('403 si un profesor intenta usar el endpoint (requireRole solo alumno)', async () => {
    mockAuthAs('profesor-1', ['profesor']);

    const req = baseRequest('PUT', 'profesor-1', { respuestaActualizada: 'x' });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(db.respuesta.findUnique).not.toHaveBeenCalled();
  });

  it('403 si un alumno intenta editar la respuesta de otro alumno', async () => {
    mockAuthAs(OTRO_ALUMNO_ID, ['alumno']);
    vi.mocked(db.respuesta.findUnique).mockResolvedValue(mockRespuesta() as any);

    const req = baseRequest('PUT', OTRO_ALUMNO_ID, { respuestaActualizada: 'hackeada' });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(db.respuesta.update).not.toHaveBeenCalled();
  });

  it('404 si la respuesta no existe', async () => {
    mockAuthAs(ALUMNO_ID, ['alumno']);
    vi.mocked(db.respuesta.findUnique).mockResolvedValue(null);

    const req = baseRequest('DELETE', ALUMNO_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(404);
  });

  it('permite al alumno editar su propia respuesta', async () => {
    mockAuthAs(ALUMNO_ID, ['alumno']);
    vi.mocked(db.respuesta.findUnique).mockResolvedValue(mockRespuesta() as any);
    vi.mocked(db.respuesta.update).mockResolvedValue(
      mockRespuesta({ respuesta: 'actualizada' }) as any,
    );

    const req = baseRequest('PUT', ALUMNO_ID, { respuestaActualizada: 'actualizada' });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.respuesta.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: RESPUESTA_ID } }),
    );
  });

  it('permite al alumno eliminar su propia respuesta', async () => {
    mockAuthAs(ALUMNO_ID, ['alumno']);
    vi.mocked(db.respuesta.findUnique).mockResolvedValue(mockRespuesta() as any);
    vi.mocked(db.respuesta.delete).mockResolvedValue(mockRespuesta() as any);

    const req = baseRequest('DELETE', ALUMNO_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.respuesta.delete).toHaveBeenCalledWith({ where: { id: RESPUESTA_ID } });
  });
});
