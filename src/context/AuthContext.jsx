import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Sesión inicial
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data?.session?.user || null;
      setUsuario(u ? { id: u.id, email: u.email } : null);
      setCargando(false);
    });

    // Listener de cambios de sesión (login/logout)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUsuario(u ? { id: u.id, email: u.email } : null);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  async function login(email, password) {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const u = data?.user;
    setUsuario(u ? { id: u.id, email: u.email } : null);
    return u;
  }

  async function logout() {
    await supabase.auth.signOut();
    setUsuario(null);
  }

  const value = { usuario, login, logout, cargando };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

// Export default opcional (por si en algún lugar importan default)
export default AuthProvider;
