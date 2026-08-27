/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';

const ACTIVE_DASHBOARD_ROLE_KEY = 'targetActiveDashboardRole';
const dashboardRoleConfig = {
  profesor: { key: 'profesor', label: 'Profesor', route: '/dashboard/profesor' },
  alumno: { key: 'alumno', label: 'Alumno', route: '/dashboard/alumno' },
  marketing: { key: 'marketing', label: 'Marketing', route: '/dashboard/marketing' },
  admin: { key: 'admin', label: 'Administrador', route: '/dashboard/admin' },
  administrador: { key: 'admin', label: 'Administrador', route: '/dashboard/admin' },
};

const getDashboardOptions = (roles = []) => {
  const options = roles
    .map((role) => dashboardRoleConfig[role])
    .filter(Boolean);

  return options.filter(
    (option, index, allOptions) =>
      allOptions.findIndex((entry) => entry.key === option.key) === index
  );
};

// Mock Supabase Auth - Simulación local para desarrollo
// Los IDs deben coincidir con los usuarios sembrados en la base de datos
// (ver prisma/seed.ts y api/README.md) para que el token Bearer sea válido
// contra la API real.
const mockUsers = {
  'maria@target.com': {
    id: 'cmtatitsc0007oqd1hc4wx3xy',
    email: 'maria@target.com',
    nombre: 'Prof. María García',
    name: 'Prof. María García',
    roles: ['profesor']
  },
  'juan@student.com': {
    id: 'cmtatitsf000aoqd1uq0we7l6',
    email: 'juan@student.com',
    nombre: 'Juan Pérez',
    name: 'Juan Pérez',
    roles: ['alumno']
  },
  'admin@target.com': {
    id: 'cmtatits80004oqd1u6qhu4bb',
    email: 'admin@target.com',
    nombre: 'Admin Target',
    name: 'Admin Target',
    roles: ['administrador', 'profesor']
  },
  'marketing@target.com': {
    id: 'cmtatitsl000goqd1i4j8f6vc',
    email: 'marketing@target.com',
    nombre: 'Marketing Team',
    name: 'Marketing Team',
    roles: ['marketing', 'alumno']
  },
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDashboardRole, setActiveDashboardRoleState] = useState(
    () => localStorage.getItem(ACTIVE_DASHBOARD_ROLE_KEY) || null
  );

  // Simular verificación de sesión al cargar
  useEffect(() => {
    const timer = setTimeout(() => {
      const savedSession = localStorage.getItem('targetSession');
      if (savedSession) {
        const userData = JSON.parse(savedSession);
        setUser(userData);

        const availableOptions = getDashboardOptions(userData.roles);
        const savedRole = localStorage.getItem(ACTIVE_DASHBOARD_ROLE_KEY);

        if (savedRole && availableOptions.some((option) => option.key === savedRole)) {
          setActiveDashboardRoleState(savedRole);
        } else if (availableOptions.length === 1) {
          localStorage.setItem(ACTIVE_DASHBOARD_ROLE_KEY, availableOptions[0].key);
          setActiveDashboardRoleState(availableOptions[0].key);
        } else {
          localStorage.removeItem(ACTIVE_DASHBOARD_ROLE_KEY);
          setActiveDashboardRoleState(null);
        }
      }
      setLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Mock login - En producción será real con Supabase Auth
  const login = async (email) => {
    setLoading(true);
    setError(null);
    
    try {
      // Simulación: cualquier contraseña vale
      if (mockUsers[email]) {
        const userData = mockUsers[email];
        const availableOptions = getDashboardOptions(userData.roles);

        setUser(userData);
        localStorage.setItem('targetSession', JSON.stringify(userData));

        if (availableOptions.length === 1) {
          localStorage.setItem(ACTIVE_DASHBOARD_ROLE_KEY, availableOptions[0].key);
          setActiveDashboardRoleState(availableOptions[0].key);
        } else {
          localStorage.removeItem(ACTIVE_DASHBOARD_ROLE_KEY);
          setActiveDashboardRoleState(null);
        }

        return userData;
      } else {
        throw new Error('Usuario no encontrado');
      }
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Mock logout
  const logout = () => {
    setUser(null);
    setActiveDashboardRoleState(null);
    localStorage.removeItem('targetSession');
    localStorage.removeItem(ACTIVE_DASHBOARD_ROLE_KEY);
  };

  // Verificar si tiene un rol específico
  const hasRole = (role) => {
    return user?.roles?.includes(role);
  };

  // Verificar si tiene alguno de varios roles
  const hasAnyRole = (roles) => {
    return user?.roles?.some(role => roles.includes(role));
  };

  const dashboardOptions = getDashboardOptions(user?.roles);

  const setActiveDashboardRole = (role) => {
    if (!dashboardOptions.some((option) => option.key === role)) {
      return false;
    }

    localStorage.setItem(ACTIVE_DASHBOARD_ROLE_KEY, role);
    setActiveDashboardRoleState(role);
    return true;
  };

  const resolveDashboardPath = () => {
    if (activeDashboardRole) {
      const selectedOption = dashboardOptions.find((option) => option.key === activeDashboardRole);
      if (selectedOption) {
        return selectedOption.route;
      }
    }

    if (dashboardOptions.length === 1) {
      return dashboardOptions[0].route;
    }

    return null;
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    hasRole,
    hasAnyRole,
    dashboardOptions,
    activeDashboardRole,
    setActiveDashboardRole,
    resolveDashboardPath,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};
