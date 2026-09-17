import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Se mockea `db` completo: este es el test de contrato de referencia del
// paso 0.2 del plan de migración .NET (documents/arquitectura/03-plan-migracion-dotnet.md).
// Fija el comportamiento observable de hoy (status code + shape de
// `ApiResponseBody`) para que sirva de criterio de aceptación cuando este
// mismo endpoint se reescriba en .NET (Fase 3, paso 3.1) — no valida
// implementación interna ni acceso real a Postgres.
vi.mock('../../_lib/db', () => ({
  db: {
    usuario: { findUnique: vi.fn() },
    usuarioRol: { findMany: vi.fn() },
    sobreNosotros: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    registroAuditoria: { create: vi.fn() },
  },
}));

import { db } from '../../_lib/db';
import handler from './[id]';
import { createMockRes, mockAuthAs } from '../../_lib/test-utils';

function jsonBody(res: ReturnType<typeof createMockRes>) {
  return JSON.parse(res.body!);
}

const AUTOR_ID = 'marketing-1';
const OTRO_USUARIO_ID = 'marketing-2';
const ADMIN_ID = 'admin-1';
const ITEM_ID = 'sobre-nosotros-1';

function baseRequest(method: string, userId: string, extra: Record<string, any> = {}) {
  return {
    method,
    headers: { authorization: `Bearer ${userId}` },
    query: { id: ITEM_ID },
    body: {},
    ...extra,
  } as any;
}

function mockItem(overrides: Record<string, any> = {}) {
  return {
    id: ITEM_ID,
    autorId: AUTOR_ID,
    contenido: 'contenido original',
    imagen: null,
    autor: { id: AUTOR_ID, nombre: 'Autor', email: 'autor@target.com' },
    ...overrides,
  };
}

// Nota de alcance: el caso 401 (sin token / token inválido) no se repite acá
// porque lo cubre `withAuth` de forma centralizada en `_lib/auth.test.ts`
// (`responde 401 y no llama al handler si falta el token`) — cada endpoint
// nuevo hereda esa garantía sin necesidad de un test propio para ese caso.
describe('GET/PUT/DELETE /api/marketing/sobre-nosotros/:id — contrato', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('200 y shape de éxito al obtener un item existente', async () => {
    mockAuthAs(AUTOR_ID, ['marketing']);
    vi.mocked(db.sobreNosotros.findUnique).mockResolvedValue(mockItem() as any);

    const req = baseRequest('GET', AUTOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/json');
    expect(jsonBody(res)).toMatchObject({
      success: true,
      data: { id: ITEM_ID, contenido: 'contenido original' },
    });
  });

  it('400 y shape de error si el id no es un string válido', async () => {
    mockAuthAs(AUTOR_ID, ['marketing']);

    const req = baseRequest('GET', AUTOR_ID, { query: { id: ['a', 'b'] } });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(400);
    expect(jsonBody(res)).toMatchObject({ success: false, error: expect.any(String) });
    expect(db.sobreNosotros.findUnique).not.toHaveBeenCalled();
  });

  it('404 y shape de error si el item no existe', async () => {
    mockAuthAs(AUTOR_ID, ['marketing']);
    vi.mocked(db.sobreNosotros.findUnique).mockResolvedValue(null);

    const req = baseRequest('GET', AUTOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(404);
    expect(jsonBody(res)).toMatchObject({ success: false, error: expect.any(String) });
  });

  it('403 y shape de error si un usuario de marketing distinto del autor intenta editar', async () => {
    mockAuthAs(OTRO_USUARIO_ID, ['marketing']);
    vi.mocked(db.sobreNosotros.findUnique).mockResolvedValue(mockItem() as any);

    const req = baseRequest('PUT', OTRO_USUARIO_ID, { body: { contenido: 'nuevo' } });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(jsonBody(res)).toMatchObject({ success: false, error: expect.any(String) });
    expect(db.sobreNosotros.update).not.toHaveBeenCalled();
  });

  it('403 si un rol sin permiso (ej. alumno) intenta editar, sin llegar a consultar el item', async () => {
    mockAuthAs('alumno-1', ['alumno']);

    const req = baseRequest('PUT', 'alumno-1', { body: { contenido: 'nuevo' } });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(403);
    expect(db.sobreNosotros.findUnique).not.toHaveBeenCalled();
  });

  it('200 al eliminar siendo el autor dueño del item', async () => {
    mockAuthAs(AUTOR_ID, ['marketing']);
    vi.mocked(db.sobreNosotros.findUnique).mockResolvedValue(mockItem() as any);
    vi.mocked(db.sobreNosotros.delete).mockResolvedValue(mockItem() as any);

    const req = baseRequest('DELETE', AUTOR_ID);
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
    expect(jsonBody(res)).toMatchObject({ success: true, data: { id: ITEM_ID } });
    expect(db.sobreNosotros.delete).toHaveBeenCalledWith({ where: { id: ITEM_ID } });
  });

  it('un administrador puede editar el item de otro usuario de marketing', async () => {
    mockAuthAs(ADMIN_ID, ['administrador']);
    vi.mocked(db.sobreNosotros.findUnique).mockResolvedValue(mockItem() as any);
    vi.mocked(db.sobreNosotros.update).mockResolvedValue(mockItem({ contenido: 'editado' }) as any);

    const req = baseRequest('PUT', ADMIN_ID, { body: { contenido: 'editado' } });
    const res = createMockRes();
    await handler(req, res as any);

    expect(res.statusCode).toBe(200);
  });
});
