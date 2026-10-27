import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

const AuthContext = createContext(null);
const ERROR_MEMBERSHIP = 'La cuenta no tiene una empresa y un rol activos. Solicita acceso al administrador.';

async function getMembership(authUser) {
  const { data: profile, error: profileError } = await supabase
    .from('perfiles')
    .select('id, empresa_id, nombre, rol, activo')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profileError) return { error: profileError };
  if (!profile || !profile.activo) return { error: new Error(ERROR_MEMBERSHIP) };

  const { data: empresa, error: empresaError } = await supabase
    .from('empresas')
    .select('id, nombre, sector')
    .eq('id', profile.empresa_id)
    .single();

  if (empresaError) return { error: empresaError };
  if (!['consultor', 'analista', 'gerente'].includes(profile.rol)) {
    return { error: new Error('El rol de la cuenta no es válido.') };
  }

  return {
    user: {
      id: authUser.id,
      email: authUser.email,
      nombre: profile.nombre || authUser.email?.split('@')[0] || 'Usuario',
      empresaId: empresa.id,
      empresa: empresa.nombre,
      sector: empresa.sector,
      rol: profile.rol
    }
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        if (mounted) setAuthError(error.message);
      } else if (data.session?.user) {
        const result = await getMembership(data.session.user);
        if (mounted) {
          if (result.error) {
            setUser(null);
            setAuthError(result.error.message);
          } else {
            setUser(result.user);
            setAuthError('');
          }
        }
      }
      if (mounted) setLoading(false);
    }

    loadSession().catch((error) => {
      console.error('[Auth] No se pudo cargar la membresía:', error);
      if (mounted) {
        setAuthError(error.message);
        setLoading(false);
      }
    });

    const { data } = isSupabaseConfigured && supabase
      ? supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          if (!session?.user) {
            setUser(null);
            setAuthError('');
            setLoading(false);
            return;
          }

          setLoading(true);
          getMembership(session.user)
            .then((result) => {
              if (!mounted) return;
              if (result.error) {
                setUser(null);
                setAuthError(result.error.message);
              } else {
                setUser(result.user);
                setAuthError('');
              }
            })
            .catch((error) => {
              console.error('[Auth] No se pudo cargar la membresía:', error);
              if (mounted) {
                setUser(null);
                setAuthError(error.message);
              }
            })
            .finally(() => {
              if (mounted) setLoading(false);
            });
        })
      : { data: null };

    return () => {
      mounted = false;
      data?.subscription?.unsubscribe();
    };
  }, []);

  async function login(email, password) {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase no está configurado. Configura la conexión para iniciar sesión.') };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    const membership = await getMembership(data.user);
    if (membership.error) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) console.error('[Auth] No se pudo cerrar la sesión sin membresía:', signOutError);
      setUser(null);
      setAuthError(membership.error.message);
      return { error: membership.error };
    }

    setUser(membership.user);
    setAuthError('');
    return { data, error: null };
  }

  async function register(email, password, { nombre } = {}) {
    if (!isSupabaseConfigured || !supabase) {
      return { error: new Error('Supabase no está configurado.') };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre: nombre || email.split('@')[0] } }
    });

    if (!error && data.session) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('[Auth] No se pudo cerrar la sesión sin membresía:', signOutError);
        return { error: signOutError };
      }
    }

    return { data, error };
  }

  async function logout() {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) return { error };
    }
    setUser(null);
    setAuthError('');
    return { error: null };
  }

  const permisos = useMemo(() => {
    const rol = user?.rol || 'consultor';
    return {
      rol,
      esConsultor: rol === 'consultor',
      esAnalista: rol === 'analista',
      esGerente: rol === 'gerente',
      puedeEditarRiesgos: ['analista', 'gerente'].includes(rol),
      puedeAprobarDecisiones: rol === 'gerente',
      puedeGestionarReglas: rol === 'gerente'
    };
  }, [user?.rol]);

  const value = {
    user,
    estaAutenticado: Boolean(user),
    loading,
    authError,
    empresa: user?.empresa || '',
    empresaId: user?.empresaId || '',
    rol: user?.rol || 'consultor',
    sector: user?.sector || '',
    permisos,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
