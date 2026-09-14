import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Se mockea `db` completo: estos tests validan las reglas de negocio y de
// autorización del handler, no el acceso real a Postgres.
vi.mock('../../_lib/db', () => ({
  db: {
    usuario: { findUnique: vi.fn() },
    usuarioRol: { findMany: vi.fn() },
    modulo: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    respuesta: { count: vi.fn() },
    registroAuditoria: { create: vi.fn() },
  },
}));

import { db } from '../../_lib/db';
import handler from './[id]';
import { createMockRes, mockAuthAs } from '../../_lib/test-utils';

const PROFESOR_ID = 'profesor-1';
const OTRO_PROFESOR_ID = 'profesor-2';
const ADMIN_ID = 'admin-1';
const MODULO_ID = 'modulo-1';

function baseRequest(method: string, userId: string, extra: Record<string, any> = {}) {
  return {
    method,
    headers: { authorization: `Bearer ${userId}` },
    query: { id: MODULO_ID },
    body: {},
    ...extra,
  } as any;
}

function mockModulo(overrides: Record<string, any> = {}) {
  return {
    id: MODULO_ID,
    estado: 'borrador',
    contenidos: [],
    bloque: { profesorId: PROFESOR_ID },
    ...overrides,
  };
}

describe('GET /api/profesor/modulos/:id - autorización', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('403 si un profesor con un único rol intenta acceder a un módulo ajeno', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.modulo.findUnique).mockResolvedValue(
      mockModulo({ bloque: { profesorId: OTRO_PROFESOR_ID } }) as any,
    );

    const req = baseRequest('GET', PROFESOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
  });

  it('un administrador con roles adicionales (orden distinto) puede acceder al módulo de otro profesor', async () => {
    // `getUserRoles` (api/_lib/roles.ts) no garantiza que 'administrador'
    // quede en la posición 0 del array. El chequeo de permisos debe usar
    // `hasRole`, no depender de la posición.
    mockAuthAs(ADMIN_ID, ['profesor', 'administrador']);
    vi.mocked(db.modulo.findUnique).mockResolvedValue(
      mockModulo({ bloque: { profesorId: OTRO_PROFESOR_ID } }) as any,
    );

    const req = baseRequest('GET', ADMIN_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
  });
});
