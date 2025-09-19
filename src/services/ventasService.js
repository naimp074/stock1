import { supabase } from '../lib/supabaseClient';

/** Listar ventas (últimas primero) */
export async function listarVentas(limit = 50) {
  const { data, error } = await supabase
    .from('ventas')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/** Crear venta y descontar stock en productos */
export async function crearVenta({ cliente, items, numeroFactura }) {
  // items: [{ id, nombre, precio_venta, cantidad }]
  const total = (items || []).reduce(
    (acc, it) => acc + Number(it.precio_venta || 0) * Number(it.cantidad || 0),
    0
  );

  // Obtener el usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // 1) Insertar venta con número de factura
  const { data: venta, error } = await supabase
    .from('ventas')
    .insert([{ 
      cliente: cliente || null, 
      total, 
      items, 
      numero_factura: numeroFactura,
      user_id: user.id 
    }])
    .select()
    .single();
  if (error) throw error;

  // 2) Descontar stock para cada producto
  for (const it of items) {
    const id = it.id;
    const cantVendida = Number(it.cantidad || 0);

    // Stock actual
    const { data: prod, error: e1 } = await supabase
      .from('productos')
      .select('cantidad')
      .eq('id', id)
      .single();
    if (e1) throw e1;

    const nuevaCantidad = Math.max(0, Number(prod?.cantidad || 0) - cantVendida);

    const { error: e2 } = await supabase
      .from('productos')
      .update({ cantidad: nuevaCantidad })
      .eq('id', id);
    if (e2) throw e2;
  }

  return venta;
}
