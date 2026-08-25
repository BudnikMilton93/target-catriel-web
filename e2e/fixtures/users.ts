// Usuarios de prueba sembrados en la base de datos (ver prisma/seed.ts).
// Deben coincidir con los mocks de src/context/AuthContext.jsx.
//
// admin y marketing tienen dos roles cada uno (['administrador','profesor']
// y ['marketing','alumno']) por lo que el login no redirige directo a un
// dashboard sino a /seleccionar-panel.
export const users = {
  profesor: { email: 'maria@target.com', dashboardPath: '/dashboard/profesor' },
  alumno: { email: 'juan@student.com', dashboardPath: '/dashboard/alumno' },
  admin: { email: 'admin@target.com', dashboardPath: '/seleccionar-panel' },
  marketing: { email: 'marketing@target.com', dashboardPath: '/seleccionar-panel' },
} as const;
