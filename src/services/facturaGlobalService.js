import { supabase } from '../lib/supabaseClient';

/**
 * Obtiene y actualiza el número global de factura de forma atómica.
 * Devuelve el nuevo número de factura listo para usar.
 */
export async function obtenerYActualizarNumeroFactura() {
  // Leer el último número de factura
  const { data, error } = await supabase
    .from('configuracion')
    .select('valor')
    .eq('clave', 'ultima_factura')
    .single();
  if (error) throw error;
  const ultimo = Number(data?.valor || 0);
  const nuevo = ultimo + 1;

  // Actualizar el valor en la tabla
  const { error: updateError } = await supabase
    .from('configuracion')
    .update({ valor: String(nuevo) })
    .eq('clave', 'ultima_factura');
  if (updateError) throw updateError;

  return nuevo;
}
