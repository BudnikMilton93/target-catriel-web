import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../_lib/db', () => ({
  db: {
    usuario: { findUnique: vi.fn() },
    usuarioRol: { findMany: vi.fn() },
    bloque: { findUnique: vi.fn() },
    bloqueAlumno: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    alumnoPerfil: { findUnique: vi.fn() },
    registroAuditoria: { create: vi.fn() },
  },
}));

import { db } from '../../_lib/db';
import handler from './alumnos';
import { createMockRes, mockAuthAs } from '../../_lib/test-utils';

const ADMIN_ID = 'admin-1';
const PROFESOR_ID = 'profesor-1';
const OTRO_PROFESOR_ID = 'profesor-2';
const BLOQUE_ID = 'bloque-1';
const ALUMNO_ID = 'alumno-1';

function baseRequest(userId: string, bloqueId: string | null = BLOQUE_ID) {
  return {
    method: 'GET',
    headers: { authorization: `Bearer ${userId}` },
    query: bloqueId ? { bloqueId } : {},
    body: {},
  } as any;
}

function postRequest(userId: string, body: Record<string, unknown>, bloqueId: string | null = BLOQUE_ID) {
  return {
    method: 'POST',
    headers: { authorization: `Bearer ${userId}` },
    query: bloqueId ? { bloqueId } : {},
    body,
  } as any;
}

function deleteRequest(
  userId: string,
  alumnoId: string | null,
  bloqueId: string | null = BLOQUE_ID,
) {
  return {
    method: 'DELETE',
    headers: { authorization: `Bearer ${userId}` },
    query: {
      ...(bloqueId ? { bloqueId } : {}),
      ...(alumnoId ? { alumnoId } : {}),
    },
    body: {},
  } as any;
}

describe('GET /api/profesor/bloques/alumnos - autorización', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('permite el acceso a un administrador aunque "administrador" no sea el primer rol devuelto', async () => {
    // getUserRoles no garantiza orden: simulamos que 'administrador' queda en segunda posición
    mockAuthAs(ADMIN_ID, ['profesor', 'administrador']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: OTRO_PROFESOR_ID,
    } as any);
    vi.mocked(db.bloqueAlumno.findMany).mockResolvedValue([]);

    const req = baseRequest(ADMIN_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
  });

  it('permite el acceso a un administrador cuyo único rol es "administrador"', async () => {
    mockAuthAs(ADMIN_ID, ['administrador']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: OTRO_PROFESOR_ID,
    } as any);
    vi.mocked(db.bloqueAlumno.findMany).mockResolvedValue([]);

    const req = baseRequest(ADMIN_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
  });

  it('permite el acceso al profesor dueño del bloque', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: PROFESOR_ID,
    } as any);
    vi.mocked(db.bloqueAlumno.findMany).mockResolvedValue([]);

    const req = baseRequest(PROFESOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
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
    expect(db.bloqueAlumno.findMany).not.toHaveBeenCalled();
  });

  it('404 si el bloque no existe', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue(null);

    const req = baseRequest(PROFESOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(404);
    expect(db.bloqueAlumno.findMany).not.toHaveBeenCalled();
  });

  it('400 si no se pasa bloqueId', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);

    const req = baseRequest(PROFESOR_ID, null);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(400);
    expect(db.bloque.findUnique).not.toHaveBeenCalled();
  });
});

describe('POST /api/profesor/bloques/alumnos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('400 si no se pasa alumnoId en el body', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: PROFESOR_ID,
    } as any);

    const req = postRequest(PROFESOR_ID, {});
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(400);
    expect(db.alumnoPerfil.findUnique).not.toHaveBeenCalled();
  });

  it('404 si el alumnoId no corresponde a ningún alumno existente', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: PROFESOR_ID,
    } as any);
    vi.mocked(db.alumnoPerfil.findUnique).mockResolvedValue(null);

    const req = postRequest(PROFESOR_ID, { alumnoId: ALUMNO_ID });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(404);
    expect(db.bloqueAlumno.create).not.toHaveBeenCalled();
  });

  it('409 si el alumno ya está inscripto en el bloque', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: PROFESOR_ID,
    } as any);
    vi.mocked(db.alumnoPerfil.findUnique).mockResolvedValue({ usuarioId: ALUMNO_ID } as any);
    vi.mocked(db.bloqueAlumno.findUnique).mockResolvedValue({
      bloqueId: BLOQUE_ID,
      alumnoId: ALUMNO_ID,
    } as any);

    const req = postRequest(PROFESOR_ID, { alumnoId: ALUMNO_ID });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(409);
    expect(db.bloqueAlumno.create).not.toHaveBeenCalled();
  });

  it('201 e inscribe al alumno cuando es válido y no está inscripto (profesor dueño del bloque)', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: PROFESOR_ID,
    } as any);
    vi.mocked(db.alumnoPerfil.findUnique).mockResolvedValue({ usuarioId: ALUMNO_ID } as any);
    vi.mocked(db.bloqueAlumno.findUnique).mockResolvedValue(null);
    vi.mocked(db.bloqueAlumno.create).mockResolvedValue({
      bloqueId: BLOQUE_ID,
      alumnoId: ALUMNO_ID,
    } as any);

    const req = postRequest(PROFESOR_ID, { alumnoId: ALUMNO_ID });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(201);
    expect(db.bloqueAlumno.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { bloqueId: BLOQUE_ID, alumnoId: ALUMNO_ID },
      }),
    );
    expect(db.registroAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usuarioId: PROFESOR_ID,
          accion: 'CREAR',
          entidad: 'BLOQUE_ALUMNO',
        }),
      }),
    );
  });

  it('201 e inscribe al alumno cuando lo hace un administrador en un bloque ajeno', async () => {
    mockAuthAs(ADMIN_ID, ['administrador']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: OTRO_PROFESOR_ID,
    } as any);
    vi.mocked(db.alumnoPerfil.findUnique).mockResolvedValue({ usuarioId: ALUMNO_ID } as any);
    vi.mocked(db.bloqueAlumno.findUnique).mockResolvedValue(null);
    vi.mocked(db.bloqueAlumno.create).mockResolvedValue({
      bloqueId: BLOQUE_ID,
      alumnoId: ALUMNO_ID,
    } as any);

    const req = postRequest(ADMIN_ID, { alumnoId: ALUMNO_ID });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(201);
    expect(db.registroAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ usuarioId: ADMIN_ID, accion: 'CREAR' }),
      }),
    );
  });
});

describe('DELETE /api/profesor/bloques/alumnos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('400 si no se pasa alumnoId en la query', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: PROFESOR_ID,
    } as any);

    const req = deleteRequest(PROFESOR_ID, null);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(400);
    expect(db.bloqueAlumno.delete).not.toHaveBeenCalled();
  });

  it('200 y remueve al alumno del bloque (profesor dueño del bloque)', async () => {
    mockAuthAs(PROFESOR_ID, ['profesor']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: PROFESOR_ID,
    } as any);
    vi.mocked(db.bloqueAlumno.delete).mockResolvedValue({
      bloqueId: BLOQUE_ID,
      alumnoId: ALUMNO_ID,
    } as any);

    const req = deleteRequest(PROFESOR_ID, ALUMNO_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.bloqueAlumno.delete).toHaveBeenCalledWith({
      where: { bloqueId_alumnoId: { bloqueId: BLOQUE_ID, alumnoId: ALUMNO_ID } },
    });
    expect(db.registroAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          usuarioId: PROFESOR_ID,
          accion: 'ELIMINAR',
          entidad: 'BLOQUE_ALUMNO',
        }),
      }),
    );
  });

  it('200 y remueve al alumno del bloque cuando lo hace un administrador en un bloque ajeno', async () => {
    mockAuthAs(ADMIN_ID, ['administrador']);
    vi.mocked(db.bloque.findUnique).mockResolvedValue({
      id: BLOQUE_ID,
      profesorId: OTRO_PROFESOR_ID,
    } as any);
    vi.mocked(db.bloqueAlumno.delete).mockResolvedValue({
      bloqueId: BLOQUE_ID,
      alumnoId: ALUMNO_ID,
    } as any);

    const req = deleteRequest(ADMIN_ID, ALUMNO_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(db.bloqueAlumno.delete).toHaveBeenCalledWith({
      where: { bloqueId_alumnoId: { bloqueId: BLOQUE_ID, alumnoId: ALUMNO_ID } },
    });
    expect(db.registroAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ usuarioId: ADMIN_ID, accion: 'ELIMINAR' }),
      }),
    );
  });
});
