import { supabase } from '../lib/supabaseClient';
import { actualizarProducto } from './productosService';

/** NOTAS DE CRÉDITO */

/** Listar notas de crédito (últimas primero) */
export async function listarNotasCredito(limit = 50) {
  try {
    const { data, error } = await supabase
      .from('notas_credito')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error listando notas de crédito:', error);
      // Si la tabla no existe, devolver array vacío
      if (error.code === 'PGRST116' || error.message?.includes('relation "notas_credito" does not exist')) {
        console.log('Tabla notas_credito no existe, devolviendo array vacío');
        return [];
      }
      throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error en listarNotasCredito:', error);
    return [];
  }
}

/** Crear nota de crédito */
export async function crearNotaCredito({ 
  cliente, 
  motivo, 
  items, 
  total, 
  numero_factura_original,
  observaciones,
  venta_original_id = null
}) {
  try {
    console.log('Iniciando creación de nota de crédito...');
    
    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');
    
    console.log('Usuario autenticado:', user.id);

    // Generar número de nota de crédito
    const numeroNota = await generarNumeroNotaCredito();
    console.log('Número de nota generado:', numeroNota);

    // Preparar datos para insertar
    const notaData = {
      cliente: cliente || 'Consumidor Final',
      motivo,
      items: items || [],
      total: Number(total || 0),
      numero_factura_original: numero_factura_original || null,
      numero_nota: numeroNota,
      observaciones: observaciones || null,
      venta_original_id: venta_original_id || null,
      user_id: user.id
    };
    
    console.log('Datos de la nota a insertar:', notaData);

    // Crear la nota de crédito
    const { data, error } = await supabase
      .from('notas_credito')
      .insert([notaData])
      .select()
      .single();
    
    if (error) {
      console.error('Error insertando nota de crédito:', error);
      throw error;
    }
    
    console.log('Nota de crédito creada exitosamente:', data);

    // Si hay items, devolver el stock
    if (items && items.length > 0) {
      console.log('Devolviendo stock para items:', items);
      await devolverStock(items);
    }

    return data;
  } catch (error) {
    console.error('Error en crearNotaCredito:', error);
    throw error;
  }
}

/** Devolver stock de productos */
async function devolverStock(items) {
  try {
    console.log('Devolviendo stock para items:', items);
    
    for (const item of items) {
      if (!item.id || !item.cantidad) continue;
      
      // Obtener el producto actual
      const { data: producto, error: errorProducto } = await supabase
        .from('productos')
        .select('*')
        .eq('id', item.id)
        .single();
      
      if (errorProducto) {
        console.error('Error obteniendo producto:', errorProducto);
        continue;
      }
      
      // Calcular nuevo stock
      const stockActual = Number(producto.cantidad || 0);
      const cantidadDevolver = Number(item.cantidad || 0);
      const nuevoStock = stockActual + cantidadDevolver;
      
      console.log(`Devolviendo ${cantidadDevolver} unidades de ${producto.nombre}. Stock: ${stockActual} -> ${nuevoStock}`);
      
      // Actualizar el stock
      const { error: errorUpdate } = await supabase
        .from('productos')
        .update({ cantidad: nuevoStock })
        .eq('id', item.id);
      
      if (errorUpdate) {
        console.error('Error actualizando stock:', errorUpdate);
      } else {
        console.log(`Stock actualizado correctamente para ${producto.nombre}`);
      }
    }
  } catch (error) {
    console.error('Error en devolverStock:', error);
    throw error;
  }
}

/** Generar número de nota de crédito */
async function generarNumeroNotaCredito() {
  try {
    console.log('Generando número de nota de crédito...');
    
    // Obtener el último número de nota de crédito
    const { data, error } = await supabase
      .from('notas_credito')
      .select('numero_nota')
      .order('numero_nota', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error obteniendo último número:', error);
      // Si hay error, usar timestamp como fallback
      return Date.now();
    }
    
    const ultimoNumero = data && data.length > 0 ? data[0].numero_nota : 0;
    const nuevoNumero = ultimoNumero + 1;
    console.log('Número generado:', nuevoNumero);
    return nuevoNumero;
  } catch (error) {
    console.error('Error generando número de nota de crédito:', error);
    // Fallback con timestamp
    return Date.now();
  }
}

/** Obtener nota de crédito por ID */
export async function obtenerNotaCredito(id) {
  const { data, error } = await supabase
    .from('notas_credito')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

/** Actualizar nota de crédito */
export async function actualizarNotaCredito(id, datos) {
  const { data, error } = await supabase
    .from('notas_credito')
    .update(datos)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/** Eliminar nota de crédito */
export async function eliminarNotaCredito(id) {
  const { error } = await supabase
    .from('notas_credito')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
}

/** Obtener ventas disponibles para nota de crédito */
export async function obtenerVentasParaNotaCredito(limit = 100) {
  try {
    console.log('Obteniendo ventas para nota de crédito...');
    
    // Obtener todas las ventas
    const { data: todasLasVentas, error: errorTodas } = await supabase
      .from('ventas')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(limit);
    
    if (errorTodas) {
      console.error('Error obteniendo todas las ventas:', errorTodas);
      throw errorTodas;
    }
    
    console.log('Todas las ventas obtenidas:', todasLasVentas?.length || 0);
    
    // Obtener notas de crédito existentes para filtrar ventas ya procesadas
    let ventasConNotaCredito = new Set();
    try {
      const { data: notasCredito, error: errorNotas } = await supabase
        .from('notas_credito')
        .select('venta_original_id')
        .not('venta_original_id', 'is', null);
      
      if (!errorNotas && notasCredito) {
        ventasConNotaCredito = new Set(notasCredito.map(nota => nota.venta_original_id));
        console.log('Ventas que ya tienen nota de crédito:', ventasConNotaCredito.size);
      }
    } catch (error) {
      console.log('No se pudieron obtener notas de crédito (tabla puede no existir):', error.message);
    }
    
    // Filtrar solo ventas que no tengan nota de crédito (incluir pagos de cuenta corriente)
    const ventasFiltradas = (todasLasVentas || []).filter(venta => {
      const tieneNotaCredito = ventasConNotaCredito.has(venta.id);
      
      console.log(`Venta ${venta.id}: cliente="${venta.cliente}", tieneNota=${tieneNotaCredito}`);
      
      return !tieneNotaCredito; // Solo filtrar por notas de crédito existentes
    });
    
    console.log('Ventas disponibles para nota de crédito:', ventasFiltradas.length);
    return ventasFiltradas;
  } catch (error) {
    console.error('Error obteniendo ventas para nota de crédito:', error);
    return [];
  }
}

/** Obtener estadísticas de notas de crédito */
export async function obtenerEstadisticasNotasCredito() {
  try {
    const { data, error } = await supabase
      .from('notas_credito')
      .select('total, fecha');
    
    if (error) {
      console.error('Error obteniendo estadísticas de notas de crédito:', error);
      // Si la tabla no existe, devolver estadísticas vacías
      if (error.code === 'PGRST116' || error.message?.includes('relation "notas_credito" does not exist')) {
        console.log('Tabla notas_credito no existe, devolviendo estadísticas vacías');
        return {
          totalHoy: 0,
          totalSemana: 0,
          totalMes: 0,
          totalGeneral: 0,
          cantidad: 0
        };
      }
      throw error;
    }
    
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const hace7 = new Date(hoy);
    hace7.setDate(hace7.getDate() - 7);
    
    let totalHoy = 0;
    let totalSemana = 0;
    let totalMes = 0;
    let totalGeneral = 0;
    
    for (const nota of data || []) {
      const fecha = new Date(nota.fecha);
      const monto = Number(nota.total || 0);
      
      totalGeneral += monto;
      
      if (fecha.toDateString() === hoy.toDateString()) {
        totalHoy += monto;
      }
      
      if (fecha >= hace7) {
        totalSemana += monto;
      }
      
      if (fecha >= inicioMes) {
        totalMes += monto;
      }
    }
    
    return {
      totalHoy,
      totalSemana,
      totalMes,
      totalGeneral,
      cantidad: data?.length || 0
    };
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    return {
      totalHoy: 0,
      totalSemana: 0,
      totalMes: 0,
      totalGeneral: 0,
      cantidad: 0
    };
  }
}
