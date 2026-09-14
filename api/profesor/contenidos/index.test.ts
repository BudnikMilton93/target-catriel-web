import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Se mockea `db` completo: estos tests validan las reglas de negocio y de
// autorización del handler, no el acceso real a Postgres.
vi.mock('../../_lib/db', () => ({
  db: {
    usuario: { findUnique: vi.fn() },
    usuarioRol: { findMany: vi.fn() },
    modulo: { findUnique: vi.fn() },
    contenido: { create: vi.fn() },
    registroAuditoria: { create: vi.fn() },
  },
}));

import { db } from '../../_lib/db';
import handler from './index';
import { createMockRes, mockAuthAs } from '../../_lib/test-utils';

const PROFESOR_ID = 'profesor-1';
const OTRO_PROFESOR_ID = 'profesor-2';
const ADMIN_ID = 'admin-1';
const MODULO_ID = 'modulo-1';

function postRequest(userId: string, body: Record<string, unknown>) {
  return {
    method: 'POST',
    headers: { authorization: `Bearer ${userId}` },
    query: { moduloId: MODULO_ID },
    body,
  } as any;
}

describe('POST /api/profesor/contenidos - autorización', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('403 si un profesor con un único rol intenta agregar contenido a un módulo ajeno', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.modulo.findUnique).mockResolvedValue({
      id: MODULO_ID,
      bloque: { profesorId: OTRO_PROFESOR_ID },
    } as any);

    const req = postRequest(PROFESOR_ID, { tipo: 'texto', contenido: 'x' });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(db.contenido.create).not.toHaveBeenCalled();
  });

  it('un administrador con roles adicionales (orden distinto) puede agregar contenido a un módulo ajeno', async () => {
    // `getUserRoles` (api/_lib/roles.ts) no garantiza que 'administrador'
    // quede en la posición 0 del array. El chequeo de permisos debe usar
    // `hasRole`, no depender de la posición.
    mockAuthAs(ADMIN_ID, ['profesor', 'administrador']);
    vi.mocked(db.modulo.findUnique).mockResolvedValue({
      id: MODULO_ID,
      bloque: { profesorId: OTRO_PROFESOR_ID },
    } as any);
    vi.mocked(db.contenido.create).mockResolvedValue({ id: 'contenido-1' } as any);

    const req = postRequest(ADMIN_ID, { tipo: 'texto', contenido: 'x' });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(201);
  });
});
