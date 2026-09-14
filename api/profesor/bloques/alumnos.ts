import type { ServerResponse } from 'http';
import { db } from '../../_lib/db';
import { sendSuccess, sendError, handleError } from '../../_lib/response';
import { withAuth, logAudit } from '../../_lib/auth';
import { requireRole } from '../../_lib/auth';
import { hasRole } from '../../_lib/roles';
import { AuthenticatedRequest } from '../../_lib/types';

export default withAuth(async (req: AuthenticatedRequest, res: ServerResponse) => {
  try {
    const bloqueId = typeof req.query?.bloqueId === 'string' ? req.query.bloqueId : undefined;
    const alumnoId = typeof req.query?.alumnoId === 'string' ? req.query.alumnoId : undefined;
    const method = req.method?.toUpperCase();

    if (!bloqueId || typeof bloqueId !== 'string') {
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
      const alumnos = await db.bloqueAlumno.findMany({
        where: { bloqueId },
        include: {
          alumno: {
            select: {
              usuarioId: true,
              usuario: { select: { id: true, nombre: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return sendSuccess(res, alumnos, 200, 'Alumnos obtenidos exitosamente');
    }

    if (method === 'POST') {
      const { alumnoId: alumnoIdBody } = req.body;

      if (!alumnoIdBody) {
        return sendError(res, 400, 'ID de alumno requerido');
      }

      const alumno = await db.alumnoPerfil.findUnique({
        where: { usuarioId: alumnoIdBody },
      });

      if (!alumno) {
        return sendError(res, 404, 'Alumno no encontrado');
      }

      const yaInscrito = await db.bloqueAlumno.findUnique({
        where: {
          bloqueId_alumnoId: {
            bloqueId,
            alumnoId: alumnoIdBody,
          },
        },
      });

      if (yaInscrito) {
        return sendError(res, 409, 'El alumno ya está inscrito en este bloque');
      }

      const inscripcion = await db.bloqueAlumno.create({
        data: {
          bloqueId,
          alumnoId: alumnoIdBody,
        },
        include: {
          alumno: { select: { usuarioId: true, usuario: { select: { nombre: true, email: true } } } },
        },
      });

      await logAudit(req.user!.id, 'CREAR', 'BLOQUE_ALUMNO', { bloqueId, alumnoId: alumnoIdBody });

      return sendSuccess(res, inscripcion, 201, 'Alumno invitado exitosamente');
    }

    if (method === 'DELETE') {
      if (!alumnoId || typeof alumnoId !== 'string') {
        return sendError(res, 400, 'ID de alumno requerido');
      }

      await db.bloqueAlumno.delete({
        where: {
          bloqueId_alumnoId: {
            bloqueId,
            alumnoId,
          },
        },
      });

      await logAudit(req.user!.id, 'ELIMINAR', 'BLOQUE_ALUMNO', { bloqueId, alumnoId });

      return sendSuccess(res, { bloqueId, alumnoId }, 200, 'Alumno removido exitosamente');
    }

    return sendError(res, 405, 'Método no permitido');
  } catch (error) {
    return handleError(res, error);
  }
});
