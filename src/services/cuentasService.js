import { supabase } from '../lib/supabaseClient';

/** CUENTAS */
export async function listarCuentas() {
  const { data, error } = await supabase
    .from('cuentas_corrientes')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function crearCuenta({ cliente }) {
  const { data, error } = await supabase
    .from('cuentas_corrientes')
    .insert([{ cliente }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** MOVIMIENTOS */
export async function listarMovimientos(cuenta_id, limit = 100) {
  const { data, error } = await supabase
    .from('pagos_corrientes')
    .select('*')
    .eq('cuenta_id', cuenta_id)
    .order('fecha', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** tipo: 'cargo' (debe) o 'pago' (haber) */
export async function registrarMovimiento({ cuenta_id, tipo, monto, concepto }) {
  const { data, error } = await supabase
    .from('pagos_corrientes')
    .insert([{ cuenta_id, tipo, monto: Number(monto || 0), concepto: concepto || null }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/** Saldos calculados por cliente */
export async function obtenerSaldosPorCuenta() {
  // Traemos movimientos y agregamos en cliente
  const { data: cuentas, error: e1 } = await supabase
    .from('cuentas_corrientes')
    .select('id, cliente')
    .order('created_at', { ascending: false });
  if (e1) throw e1;

  const ids = cuentas.map(c => c.id);
  if (!ids.length) return [];

  const { data: movs, error: e2 } = await supabase
    .from('pagos_corrientes')
    .select('cuenta_id, tipo, monto')
    .in('cuenta_id', ids);
  if (e2) throw e2;

  const saldos = {};
  for (const m of movs || []) {
    const sign = m.tipo === 'pago' ? -1 : 1; // cargo suma, pago resta
    saldos[m.cuenta_id] = (saldos[m.cuenta_id] || 0) + sign * Number(m.monto || 0);
  }

  return cuentas.map(c => ({
    ...c,
    saldo: Number(saldos[c.id] || 0),
  }));
}
