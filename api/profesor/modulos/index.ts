import type { ServerResponse } from 'http';
import { db } from '../../_lib/db';
import { sendSuccess, sendError, handleError } from '../../_lib/response';
import { withAuth, logAudit, requireRole } from '../../_lib/auth';
import { hasRole } from '../../_lib/roles';
import { AuthenticatedRequest } from '../../_lib/types';

export default withAuth(async (req: AuthenticatedRequest, res: ServerResponse) => {
  try {
    const method = req.method?.toUpperCase();
    const queryBloqueId = typeof req.query?.bloqueId === 'string' ? req.query.bloqueId : undefined;
    const bodyBloqueId = typeof req.body?.bloqueId === 'string' ? req.body.bloqueId : undefined;
    const bloqueId = method === 'POST' ? bodyBloqueId || queryBloqueId : queryBloqueId;

    if (method !== 'GET' && method !== 'POST') {
      return sendError(res, 405, 'Método no permitido');
    }

    if (!bloqueId) {
      return sendError(res, 400, 'ID de bloque requerido');
    }

    // Validar rol
    requireRole('profesor', 'administrador')(req.user);

    // Verificar que el bloque existe
    const bloque = await db.bloque.findUnique({
      where: { id: bloqueId },
    });

    if (!bloque) {
      return sendError(res, 404, 'Bloque no encontrado');
    }

    if (bloque.profesorId !== req.user!.id && !hasRole(req.user!.roles, 'administrador')) {
      return sendError(res, 403, 'No tienes permisos para acceder a este bloque');
    }

    if (method === 'GET') {
      const modulos = await db.modulo.findMany({
        where: { bloqueId },
        include: {
          creador: { select: { id: true, nombre: true, email: true } },
          contenidos: { orderBy: { orden: 'asc' } },
          asistencias: true,
        },
        orderBy: { fecha: 'desc' },
      });

      return sendSuccess(res, modulos, 200, 'Módulos obtenidos exitosamente');
    }

    if (method === 'POST') {
      const bodyBloqueId = typeof req.body?.bloqueId === 'string' ? req.body.bloqueId : undefined;
      const targetBloqueId = bodyBloqueId || bloqueId;
      const { fecha, estado } = req.body || {};

      if (!targetBloqueId) {
        return sendError(res, 400, 'ID de bloque requerido');
      }

      if (!fecha) {
        return sendError(res, 400, 'Fecha del módulo requerida');
      }

      const modulo = await db.modulo.create({
        data: {
          bloqueId: targetBloqueId,
          creadoPor: req.user!.id,
          fecha: new Date(fecha),
          estado: estado || 'borrador',
        },
        include: {
          creador: { select: { id: true, nombre: true, email: true } },
          bloque: { select: { id: true, nivel: true, dias: true } },
        },
      });

      await logAudit(req.user!.id, 'CREAR', 'MODULO', { moduloId: modulo.id, bloqueId });

      return sendSuccess(res, modulo, 201, 'Módulo creado exitosamente');
    }

    return sendError(res, 405, 'Método no permitido');
  } catch (error) {
    return handleError(res, error);
  }
});
