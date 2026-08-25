import { vi } from 'vitest';
import { db } from './db';

// Mock mínimo de `http.ServerResponse` compartido por los tests de
// endpoints y de `_lib`: solo lo que `response.ts`/los handlers usan.
export function createMockRes() {
  return {
    statusCode: 0,
    headers: {} as Record<string, string>,
    body: undefined as string | undefined,
    setHeader(key: string, value: string) {
      this.headers[key] = value;
    },
    end(chunk?: string) {
      this.body = chunk;
    },
  };
}

// Simula un usuario autenticado con los roles dados. Requiere que el test
// llamante haya mockeado `./db` (o `../../_lib/db`, etc. — mismo módulo)
// con `usuario.findUnique` y `usuarioRol.findMany` como `vi.fn()`.
export function mockAuthAs(userId: string, roles: string[]) {
  vi.mocked(db.usuario.findUnique).mockResolvedValue({
    id: userId,
    nombre: 'Test',
    email: 'test@target.com',
  } as any);
  vi.mocked(db.usuarioRol.findMany).mockResolvedValue(
    roles.map((nombre) => ({ rol: { nombre } })) as any,
  );
}
