import type { ServerResponse } from 'http';
import { db } from '../../_lib/db';
import { sendSuccess, sendError, handleError } from '../../_lib/response';
import { withAuth, logAudit } from '../../_lib/auth';
import { requireRole, hasRole } from '../../_lib/roles';
import { AuthenticatedRequest } from '../../_lib/types';

export default withAuth(async (req: AuthenticatedRequest, res: ServerResponse) => {
  try {
    const method = req.method?.toUpperCase();
    const queryModuloId = typeof req.query?.moduloId === 'string' ? req.query.moduloId : undefined;
    const bodyModuloId = typeof req.body?.moduloId === 'string' ? req.body.moduloId : undefined;
    const moduloId = method === 'POST' ? bodyModuloId || queryModuloId : queryModuloId;

    if (!moduloId || typeof moduloId !== 'string') {
      return sendError(res, 400, 'ID de módulo requerido');
    }

    requireRole('profesor', 'administrador')(req.user);

    const modulo = await db.modulo.findUnique({
      where: { id: moduloId },
      include: { bloque: true },
    });

    if (!modulo) {
      return sendError(res, 404, 'Módulo no encontrado');
    }

    const bloque = modulo.bloque;
    if (bloque.profesorId !== req.user!.id && !hasRole(req.user!.roles, 'administrador')) {
      return sendError(res, 403, 'No tienes permisos para acceder a este módulo');
    }

    if (method === 'POST') {
      const { tipo, contenido, orden } = req.body;

      if (!tipo || !contenido) {
        return sendError(res, 400, 'Tipo y contenido son requeridos');
      }

      const nuevoContenido = await db.contenido.create({
        data: {
          moduloId,
          tipo,
          contenido,
          orden: orden || 0,
        },
        include: {
          modulo: { select: { id: true, fecha: true, estado: true } },
        },
      });

      await logAudit(req.user!.id, 'CREAR', 'CONTENIDO', {
        contenidoId: nuevoContenido.id,
        moduloId,
      });

      return sendSuccess(res, nuevoContenido, 201, 'Contenido creado exitosamente');
    }

    return sendError(res, 405, 'Método no permitido');
  } catch (error) {
    return handleError(res, error);
  }
});
