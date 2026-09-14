import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Se mockea `db` completo: estos tests validan las reglas de negocio y de
// autorización del handler, no el acceso real a Postgres.
vi.mock('../../_lib/db', () => ({
  db: {
    usuario: { findUnique: vi.fn() },
    usuarioRol: { findMany: vi.fn() },
    bloque: { findUnique: vi.fn() },
    modulo: { findMany: vi.fn(), create: vi.fn() },
    registroAuditoria: { create: vi.fn() },
  },
}));

import { db } from '../../_lib/db';
import handler from './index';
import { createMockRes, mockAuthAs } from '../../_lib/test-utils';

const PROFESOR_ID = 'profesor-1';
const OTRO_PROFESOR_ID = 'profesor-2';
const ADMIN_ID = 'admin-1';
const BLOQUE_ID = 'bloque-1';

function baseRequest(userId: string, extra: Record<string, any> = {}) {
  return {
    method: 'GET',
    headers: { authorization: `Bearer ${userId}` },
    query: { bloqueId: BLOQUE_ID },
    body: {},
    ...extra,
  } as any;
}

describe('GET /api/profesor/modulos - autorización', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('403 si un profesor con un único rol intenta acceder a un bloque ajeno', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: OTRO_PROFESOR_ID,
    } as any);

    const req = baseRequest(PROFESOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(db.modulo.findMany).not.toHaveBeenCalled();
  });

  it('un administrador con roles adicionales (orden distinto) puede acceder a un bloque ajeno', async () => {
    // `getUserRoles` (api/_lib/roles.ts) arma la lista vía Prisma `findMany`
    // sin `orderBy`: no está garantizado que 'administrador' quede en la
    // posición 0. El chequeo de permisos debe usar `hasRole`, no la posición.
    mockAuthAs(ADMIN_ID, ['profesor', 'administrador']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: OTRO_PROFESOR_ID,
    } as any);
    vi.mocked(db.modulo.findMany).mockResolvedValue([]);

    const req = baseRequest(ADMIN_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
  });
});
