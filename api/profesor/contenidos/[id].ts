import type { ServerResponse } from 'http';
import { db } from '../../_lib/db';
import { sendSuccess, sendError, handleError } from '../../_lib/response';
import { withAuth, logAudit } from '../../_lib/auth';
import { requireRole, hasRole } from '../../_lib/roles';
import { AuthenticatedRequest } from '../../_lib/types';

export default withAuth(async (req: AuthenticatedRequest, res: ServerResponse) => {
  try {
    const rawId = req.query?.id;
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
    const method = req.method?.toUpperCase();

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'ID de contenido requerido');
    }

    requireRole('profesor', 'administrador')(req.user);

    const contenido = await db.contenido.findUnique({
      where: { id },
      include: {
        modulo: { include: { bloque: true } },
      },
    });

    if (!contenido) {
      return sendError(res, 404, 'Contenido no encontrado');
    }

    const bloque = contenido.modulo.bloque;
    if (bloque.profesorId !== req.user!.id && !hasRole(req.user!.roles, 'administrador')) {
      return sendError(res, 403, 'No tienes permisos para acceder a este contenido');
    }

    const respuestasCount = await db.respuesta.count({
      where: { contenidoId: id },
    });

    if (method === 'PUT') {
      if (respuestasCount > 0) {
        return sendError(
          res,
          409,
          'No puedes editar esta actividad porque ya tiene respuestas de alumnos. Crea una nueva actividad y publicala.'
        );
      }

      const { tipo, contenidoActualizado, orden } = req.body;

      const updated = await db.contenido.update({
        where: { id },
        data: {
          ...(tipo && { tipo }),
          ...(contenidoActualizado && { contenido: contenidoActualizado }),
          ...(orden !== undefined && { orden }),
        },
        include: {
          modulo: { select: { id: true, fecha: true, estado: true } },
        },
      });

      await logAudit(req.user!.id, 'ACTUALIZAR', 'CONTENIDO', { contenidoId: id });

      return sendSuccess(res, updated, 200, 'Contenido actualizado exitosamente');
    }

    if (method === 'DELETE') {
      if (respuestasCount > 0) {
        return sendError(
          res,
          409,
          'No puedes eliminar esta actividad porque ya tiene respuestas de alumnos. Puedes crear una nueva actividad.'
        );
      }

      await db.contenido.delete({
        where: { id },
      });

      await logAudit(req.user!.id, 'ELIMINAR', 'CONTENIDO', { contenidoId: id });

      return sendSuccess(res, { id }, 200, 'Contenido eliminado exitosamente');
    }

    return sendError(res, 405, 'Método no permitido');
  } catch (error) {
    return handleError(res, error);
  }
});
