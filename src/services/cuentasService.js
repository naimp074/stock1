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
  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data, error } = await supabase
    .from('cuentas_corrientes')
    .insert([{ cliente, user_id: user.id }])
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
export async function registrarMovimiento({ cuenta_id, tipo, monto, concepto, factura, descuento }) {
  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const montoReal = descuento 
    ? Number(monto) - (Number(monto) * Number(descuento)) / 100
    : Number(monto);

  const { data, error } = await supabase
    .from('pagos_corrientes')
    .insert([{ 
      cuenta_id, 
      tipo, 
      monto: Number(monto || 0), 
      concepto: concepto || null, 
      factura: factura || null,
      descuento: descuento || 0,
      user_id: user.id 
    }])
    .select()
    .single();
  if (error) throw error;

  // Si es un pago, también registrar como ingreso en ventas para reportes
  if (tipo === 'pago') {
    console.log('Registrando pago de cuenta corriente:', {
      monto: montoReal,
      concepto: concepto || 'Pago cuenta corriente',
      factura: factura,
      cuenta_id: cuenta_id
    });
    
    try {
      await registrarIngresoCuentaCorriente({
        monto: montoReal,
        concepto: concepto || 'Pago cuenta corriente',
        factura: factura,
        cuenta_id: cuenta_id
      });
    } catch (error) {
      console.error('Error al registrar ingreso de cuenta corriente:', error);
      // No lanzamos el error para no interrumpir el flujo principal
      // pero lo mostramos en consola para debuggear
    }
  }

  return data;
}

/** Registrar ingreso de cuenta corriente para reportes */
async function registrarIngresoCuentaCorriente({ monto, concepto, factura, cuenta_id }) {
  try {
    console.log('Iniciando registro de ingreso de cuenta corriente...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    console.log('Usuario autenticado:', user.id);

    // Crear una "venta" especial para el ingreso de cuenta corriente
    const ventaData = {
      cliente: `Cuenta Corriente - ${concepto}`,
      total: monto,
      items: [{
        id: 'cuenta-corriente',
        nombre: concepto || 'Pago cuenta corriente',
        precio_venta: monto,
        cantidad: 1
      }],
      user_id: user.id
    };

    console.log('Datos de venta a insertar:', ventaData);

    const { data, error } = await supabase
      .from('ventas')
      .insert([ventaData])
      .select();
    
    if (error) {
      console.error('Error registrando ingreso de cuenta corriente:', error);
      console.error('Detalles del error:', error.message, error.details, error.hint);
      throw error; // Lanzar error para debuggear
    } else {
      console.log('Ingreso de cuenta corriente registrado exitosamente:', data);
    }
  } catch (error) {
    console.error('Error en registrarIngresoCuentaCorriente:', error);
    // Lanzar error para que se vea en la consola
    throw error;
  }
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

/** Función de prueba para verificar pagos de cuenta corriente en ventas */
export async function verificarPagosEnVentas() {
  try {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .like('cliente', 'Cuenta Corriente%')
      .order('fecha', { ascending: false });
    
    if (error) throw error;
    
    console.log('Pagos de cuenta corriente encontrados en ventas:', data);
    return data || [];
  } catch (error) {
    console.error('Error verificando pagos en ventas:', error);
    return [];
  }
}

/** Función de prueba para insertar un pago de cuenta corriente manualmente */
export async function insertarPagoPrueba() {
  try {
    console.log('Iniciando prueba de inserción de pago...');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const ventaData = {
      cliente: 'Cuenta Corriente - Prueba',
      total: 100,
      items: [{
        id: 'cuenta-corriente-prueba',
        nombre: 'Pago de prueba',
        precio_venta: 100,
        cantidad: 1
      }],
      user_id: user.id
    };

    console.log('Insertando venta de prueba:', ventaData);

    const { data, error } = await supabase
      .from('ventas')
      .insert([ventaData])
      .select();
    
    if (error) {
      console.error('Error en prueba de inserción:', error);
      throw error;
    } else {
      console.log('Prueba de inserción exitosa:', data);
      return data;
    }
  } catch (error) {
    console.error('Error en insertarPagoPrueba:', error);
    throw error;
  }
}

/** Actualizar nombre de cuenta corriente */
export async function actualizarNombreCuenta(cuentaId, nuevoNombre) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('cuentas_corrientes')
      .update({ cliente: nuevoNombre })
      .eq('id', cuentaId)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error actualizando nombre de cuenta:', error);
    throw error;
  }
}

/** Eliminar movimiento de cuenta corriente */
export async function eliminarMovimiento(movimientoId) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { error } = await supabase
      .from('pagos_corrientes')
      .delete()
      .eq('id', movimientoId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error eliminando movimiento:', error);
    throw error;
  }
}

/** Actualizar movimiento de cuenta corriente */
export async function actualizarMovimiento(movimientoId, datos) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data, error } = await supabase
      .from('pagos_corrientes')
      .update(datos)
      .eq('id', movimientoId)
      .eq('user_id', user.id)
      .select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Error actualizando movimiento:', error);
    throw error;
  }
}
