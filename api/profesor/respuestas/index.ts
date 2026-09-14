import type { ServerResponse } from 'http';
import { db } from '../../_lib/db';
import { sendSuccess, sendError, handleError } from '../../_lib/response';
import { withAuth, logAudit, requireRole } from '../../_lib/auth';
import { AuthenticatedRequest, ApiError, ErrorMessages } from '../../_lib/types';

export default withAuth(async (req: AuthenticatedRequest, res: ServerResponse) => {
  try {
    const method = req.method?.toUpperCase();
    requireRole('profesor', 'administrador')(req.user);

    const { bloqueId } = req.query?.bloqueId ? { bloqueId: req.query.bloqueId } : {};

    if (method === 'GET') {
      const where: any = {};

      if (bloqueId && typeof bloqueId === 'string') {
        // Un profesor solo puede consultar respuestas de bloques propios.
        // Un administrador puede consultar cualquier bloque.
        if (!req.user!.roles.includes('administrador')) {
          const bloque = await db.bloque.findUnique({
            where: { id: bloqueId },
            select: { id: true, profesorId: true },
          });

          if (!bloque || bloque.profesorId !== req.user!.id) {
            throw new ApiError(403, ErrorMessages.FORBIDDEN);
          }
        }

        where.contenido = {
          modulo: {
            bloqueId,
          },
        };
      } else {
        const bloquesProfesor = await db.bloque.findMany({
          where: { profesorId: req.user!.id },
          select: { id: true },
        });

        const bloqueIds = bloquesProfesor.map((bloque: { id: any; }) => bloque.id);
        if (bloqueIds.length === 0) {
          return sendSuccess(res, [], 200, 'No hay respuestas para mostrar');
        }

        where.contenido = {
          modulo: {
            bloqueId: { in: bloqueIds },
          },
        };
      }

      const respuestas = await db.respuesta.findMany({
        where,
        include: {
          alumno: {
            select: {
              usuario: {
                select: { id: true, nombre: true, email: true },
              },
            },
          },
          contenido: {
            select: {
              id: true,
              tipo: true,
              contenido: true,
              modulo: {
                select: { id: true, fecha: true, estado: true, bloque: { select: { id: true, nivel: true, anio: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      await logAudit(req.user!.id, 'LEER', 'RESPUESTA', { bloqueId });
      return sendSuccess(res, respuestas, 200, 'Respuestas obtenidas exitosamente');
    }

    return sendError(res, 405, 'Método no permitido');
  } catch (error) {
    return handleError(res, error);
  }
});
