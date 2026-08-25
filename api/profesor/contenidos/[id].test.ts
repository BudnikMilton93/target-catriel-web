import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Se mockea `db` completo: estos tests validan las reglas de negocio y de
// autorización del handler, no el acceso real a Postgres.
vi.mock('../../_lib/db', () => ({
  db: {
    usuario: { findUnique: vi.fn() },
    usuarioRol: { findMany: vi.fn() },
    contenido: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    respuesta: { count: vi.fn() },
    registroAuditoria: { create: vi.fn() },
  },
}));

import { db } from '../../_lib/db';
import handler from './[id]';
import { createMockRes, mockAuthAs } from '../../_lib/test-utils';

function jsonBody(res: ReturnType<typeof createMockRes>) {
  return JSON.parse(res.body!);
}

const PROFESOR_ID = 'profesor-1';
const OTRO_PROFESOR_ID = 'profesor-2';
const CONTENIDO_ID = 'contenido-1';

function baseRequest(method: string, userId: string, extra: Record<string, any> = {}) {
  return {
    method,
    headers: { authorization: `Bearer ${userId}` },
    query: { id: CONTENIDO_ID },
    body: {},
    ...extra,
  } as any;
}

function mockContenido(overrides: Record<string, any> = {}) {
  return {
    id: CONTENIDO_ID,
    tipo: 'texto',
    contenido: 'original',
    orden: 1,
    modulo: {
      bloque: { profesorId: PROFESOR_ID },
    },
    ...overrides,
  };
}

describe('PUT/DELETE /api/profesor/contenidos/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('403 si el profesor autenticado no es dueño del bloque del contenido', async () => {
    mockAuthAs(OTRO_PROFESOR_ID, ['profesor']);
    vi.mocked(db.contenido.findUnique).mockResolvedValue(mockContenido() as any);

    const req = baseRequest('PUT', OTRO_PROFESOR_ID, { body: { contenidoActualizado: 'x' } });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(db.contenido.update).not.toHaveBeenCalled();
  });

  it('404 si el contenido no existe', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.contenido.findUnique).mockResolvedValue(null);

    const req = baseRequest('DELETE', PROFESOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(404);
  });

  it('409 al intentar editar un contenido que ya tiene respuestas de alumnos', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.contenido.findUnique).mockResolvedValue(mockContenido() as any);
    vi.mocked(db.respuesta.count).mockResolvedValue(3);

    const req = baseRequest('PUT', PROFESOR_ID, { body: { contenidoActualizado: 'nuevo texto' } });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(409);
    expect(jsonBody(res).error).toContain('ya tiene respuestas');
    expect(db.contenido.update).not.toHaveBeenCalled();
  });

  it('409 al intentar eliminar un contenido que ya tiene respuestas de alumnos', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.contenido.findUnique).mockResolvedValue(mockContenido() as any);
    vi.mocked(db.respuesta.count).mockResolvedValue(1);

    const req = baseRequest('DELETE', PROFESOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(409);
    expect(db.contenido.delete).not.toHaveBeenCalled();
  });

  it('permite editar un contenido sin respuestas siendo el profesor dueño', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.contenido.findUnique).mockResolvedValue(mockContenido() as any);
    vi.mocked(db.respuesta.count).mockResolvedValue(0);
    vi.mocked(db.contenido.update).mockResolvedValue({ id: CONTENIDO_ID, contenido: 'nuevo' } as any);

    const req = baseRequest('PUT', PROFESOR_ID, { body: { contenidoActualizado: 'nuevo' } });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.contenido.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: CONTENIDO_ID } }),
    );
  });

  it('un administrador puede editar el contenido de cualquier profesor sin respuestas', async () => {
    mockAuthAs('admin-1', ['administrador']);
    vi.mocked(db.contenido.findUnique).mockResolvedValue(mockContenido() as any);
    vi.mocked(db.respuesta.count).mockResolvedValue(0);
    vi.mocked(db.contenido.update).mockResolvedValue({ id: CONTENIDO_ID } as any);

    const req = baseRequest('PUT', 'admin-1', { body: { contenidoActualizado: 'x' } });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
  });

  it('un administrador con roles adicionales (orden distinto) puede editar el contenido de otro profesor', async () => {
    // `roles` no siempre trae 'administrador' primero (ver AuthContext.jsx,
    // que mockea admin@target.com como ['administrador', 'profesor'] pero
    // Prisma puede devolverlos en cualquier orden). El chequeo de permisos
    // debe usar `hasRole`, no depender de la posición en el array.
    mockAuthAs('admin-1', ['profesor', 'administrador']);
    vi.mocked(db.contenido.findUnique).mockResolvedValue(mockContenido() as any);
    vi.mocked(db.respuesta.count).mockResolvedValue(0);
    vi.mocked(db.contenido.update).mockResolvedValue({ id: CONTENIDO_ID } as any);

    const req = baseRequest('PUT', 'admin-1', { body: { contenidoActualizado: 'x' } });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
  });

  it('403 si un alumno intenta acceder al endpoint (requireRole)', async () => {
    mockAuthAs('alumno-1', ['alumno']);

    const req = baseRequest('PUT', 'alumno-1', { body: {} });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(db.contenido.findUnique).not.toHaveBeenCalled();
  });
});
