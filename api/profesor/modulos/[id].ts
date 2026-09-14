import type { ServerResponse } from 'http';
import { db } from '../../_lib/db';
import { sendSuccess, sendError, handleError } from '../../_lib/response';
import { withAuth, logAudit, requireRole } from '../../_lib/auth';
import { hasRole } from '../../_lib/roles';
import { AuthenticatedRequest } from '../../_lib/types';

export default withAuth(async (req: AuthenticatedRequest, res: ServerResponse) => {
  try {
    const { id } = req.query?.id ? { id: req.query.id } : {};
    const method = req.method?.toUpperCase();

    if (!id || typeof id !== 'string') {
      return sendError(res, 400, 'ID de módulo requerido');
    }

    // Validar rol
    requireRole('profesor', 'administrador')(req.user);

    // Obtener módulo con su bloque
    const modulo = await db.modulo.findUnique({
      where: { id },
      include: {
        bloque: true,
        creador: { select: { id: true, nombre: true, email: true } },
        contenidos: { orderBy: { orden: 'asc' } },
      },
    });

    if (!modulo) {
      return sendError(res, 404, 'Módulo no encontrado');
    }

    // Verificar permisos
    const bloque = modulo.bloque;
    if (bloque.profesorId !== req.user!.id && !hasRole(req.user!.roles, 'administrador')) {
      return sendError(res, 403, 'No tienes permisos para acceder a este módulo');
    }

    if (method === 'GET') {
      return sendSuccess(res, modulo, 200, 'Módulo obtenido exitosamente');
    }

    if (method === 'PUT') {
      const { fecha, estado } = req.body;

      const respuestasCount = await db.respuesta.count({
        where: {
          contenido: {
            moduloId: id,
          },
        },
      });

      if (respuestasCount > 0) {
        return sendError(
          res,
          409,
          'No puedes editar este módulo porque ya tiene actividades con respuestas de alumnos.'
        );
      }

      if (estado === 'habilitado' && modulo.contenidos.length === 0) {
        return sendError(res, 400, 'No puedes habilitar un módulo sin actividades cargadas');
      }

      const moduloActualizado = await db.modulo.update({
        where: { id },
        data: {
          ...(fecha && { fecha: new Date(fecha) }),
          ...(estado && { estado }),
        },
        include: {
          creador: { select: { id: true, nombre: true, email: true } },
          bloque: { select: { id: true, nivel: true } },
          contenidos: true,
        },
      });

      await logAudit(req.user!.id, 'ACTUALIZAR', 'MODULO', { moduloId: id });

      return sendSuccess(res, moduloActualizado, 200, 'Módulo actualizado exitosamente');
    }

    if (method === 'DELETE') {
      const respuestasCount = await db.respuesta.count({
        where: {
          contenido: {
            moduloId: id,
          },
        },
      });

      if (respuestasCount > 0) {
        return sendError(
          res,
          409,
          'No puedes eliminar este módulo porque contiene actividades con respuestas de alumnos.'
        );
      }

      await db.modulo.delete({
        where: { id },
      });

      await logAudit(req.user!.id, 'ELIMINAR', 'MODULO', { moduloId: id });

      return sendSuccess(res, { id }, 200, 'Módulo eliminado exitosamente');
    }

    return sendError(res, 405, 'Método no permitido');
  } catch (error) {
    return handleError(res, error);
  }
});
