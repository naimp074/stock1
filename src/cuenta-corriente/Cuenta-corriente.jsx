// src/cuenta-corriente/CuentaCorriente.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Table, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // 👈 así se importa ahora

import {
  listarCuentas,
  crearCuenta,
  listarMovimientos,
  registrarMovimiento,
  obtenerSaldosPorCuenta,
  verificarPagosEnVentas,
  insertarPagoPrueba,
  actualizarNombreCuenta,
  eliminarMovimiento,
  actualizarMovimiento,
  obtenerClientesPagados,
  obtenerSiguienteNumeroFactura,
  generarFacturaClientePagado,
} from '../services/cuentasService';
import { listarProductos } from '../services/productosService';
import { supabase } from '../lib/supabaseClient';
import Importador from './Importador';

const CuentaCorriente = () => {
  const [cuentas, setCuentas] = useState([]);
  const [selected, setSelected] = useState(null);
  const [movs, setMovs] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [nuevoCliente, setNuevoCliente] = useState('');
  const [movTipo, setMovTipo] = useState('cargo');
  const [movMonto, setMovMonto] = useState('');
  const [movConcepto, setMovConcepto] = useState('');
  const [movFactura, setMovFactura] = useState('');
  const [movDescuento, setMovDescuento] = useState('');

  // Estados para edición
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editandoMovimiento, setEditandoMovimiento] = useState(null);

  // Estados para compra con productos
  const [productos, setProductos] = useState([]);
  const [mostrarFormularioCompra, setMostrarFormularioCompra] = useState(false);
  const [itemsCompra, setItemsCompra] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidadCompra, setCantidadCompra] = useState('');
  const [descuentoCompra, setDescuentoCompra] = useState('');

  // Estados para clientes pagados
  const [clientesPagados, setClientesPagados] = useState([]);
  const [cargandoClientesPagados, setCargandoClientesPagados] = useState(false);

  async function refrescarCuentas() {
    const conSaldos = await obtenerSaldosPorCuenta();
    setCuentas(conSaldos);
    if (conSaldos.length && !selected) setSelected(conSaldos[0]);
    else if (selected) {
      setSelected(conSaldos.find(c => c.id === selected.id) || null);
    }
  }

  async function cargarProductos() {
    try {
      const prods = await listarProductos();
      setProductos(prods);
    } catch (e) {
      console.error('Error cargando productos:', e);
    }
  }

  async function cargarClientesPagados() {
    try {
      setCargandoClientesPagados(true);
      const pagados = await obtenerClientesPagados();
      setClientesPagados(pagados);
    } catch (e) {
      console.error('Error cargando clientes pagados:', e);
      Swal.fire('❌ Error', 'No se pudieron cargar los clientes pagados', 'error');
    } finally {
      setCargandoClientesPagados(false);
    }
  }

  async function cargarMovimientos() {
    if (!selected?.id) return;
    try {
      const m = await listarMovimientos(selected.id, 200);
      setMovs(m);
    } catch (e) {
      console.error(e);
      Swal.fire('❌ Error', e.message || 'No se pudieron cargar los movimientos', 'error');
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        await Promise.all([refrescarCuentas(), cargarProductos()]);
      } catch (e) {
        console.error(e);
        Swal.fire('❌ Error', e.message || 'No se pudieron cargar los datos', 'error');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!selected?.id) {
        setMovs([]);
        return;
      }
      try {
        const m = await listarMovimientos(selected.id, 200);
        setMovs(m);
      } catch (e) {
        console.error(e);
        Swal.fire('❌ Error', e.message || 'No se pudieron cargar movimientos', 'error');
      }
    })();
  }, [selected?.id]);

  const saldo = useMemo(() => {
    return (movs || []).reduce((acc, m) => {
      const sign = m.tipo === 'pago' ? -1 : 1;
      const montoReal = m.descuento
        ? Number(m.monto) - (Number(m.monto) * Number(m.descuento)) / 100
        : Number(m.monto);
      return acc + sign * montoReal;
    }, 0);
  }, [movs]);

  // Funciones para manejo de compras con productos
  const agregarItemCompra = () => {
    if (!productoSeleccionado || !cantidadCompra) {
      Swal.fire('Aviso', 'Selecciona un producto y cantidad', 'info');
      return;
    }

    const producto = productos.find(p => p.id === productoSeleccionado);
    if (!producto) return;

    const cantidad = Number(cantidadCompra);
    if (cantidad <= 0) {
      Swal.fire('Aviso', 'La cantidad debe ser mayor a 0', 'info');
      return;
    }

    if (cantidad > Number(producto.cantidad)) {
      Swal.fire('Aviso', `No hay suficiente stock. Disponible: ${producto.cantidad} ${producto.unidad || 'unidad'}`, 'warning');
      return;
    }

    const descuento = Number(descuentoCompra) || 0;
    const precioConDescuento = descuento > 0 
      ? Number(producto.precio_venta) - (Number(producto.precio_venta) * descuento / 100)
      : Number(producto.precio_venta);

    const nuevoItem = {
      id: producto.id,
      nombre: producto.nombre,
      precio_venta: Number(producto.precio_venta),
      precio_final: precioConDescuento,
      cantidad,
      descuento,
      unidad: producto.unidad || 'unidad',
      subtotal: precioConDescuento * cantidad
    };

    setItemsCompra([...itemsCompra, nuevoItem]);
    setProductoSeleccionado('');
    setCantidadCompra('');
    setDescuentoCompra('');
  };

  const eliminarItemCompra = (index) => {
    const nuevosItems = itemsCompra.filter((_, i) => i !== index);
    setItemsCompra(nuevosItems);
  };

  const calcularTotalCompra = () => {
    return itemsCompra.reduce((total, item) => total + item.subtotal, 0);
  };

  const procesarCompra = async () => {
    if (!selected?.id || itemsCompra.length === 0) {
      Swal.fire('Aviso', 'Selecciona un cliente y agrega productos', 'info');
      return;
    }

    try {
      const total = calcularTotalCompra();
      
      // Crear el movimiento de cargo con items
      await registrarMovimiento({
        cuenta_id: selected.id,
        tipo: 'cargo',
        monto: total,
        concepto: `Compra de productos (${itemsCompra.length} items)`,
        factura: movFactura || null,
        descuento: 0,
        items: itemsCompra // Agregar los items para referencia
      });

      // Descontar stock de cada producto
      for (const item of itemsCompra) {
        const { data: prod, error: e1 } = await supabase
          .from('productos')
          .select('cantidad')
          .eq('id', item.id)
          .single();
        
        if (e1) throw e1;

        const nuevaCantidad = Math.max(0, Number(prod?.cantidad || 0) - item.cantidad);

        const { error: e2 } = await supabase
          .from('productos')
          .update({ cantidad: nuevaCantidad })
          .eq('id', item.id);
        
        if (e2) throw e2;
      }

      // Limpiar formulario
      setItemsCompra([]);
      setMostrarFormularioCompra(false);
      setMovFactura('');
      
      // Recargar datos
      await cargarMovimientos();
      await refrescarCuentas();
      await cargarProductos();

      Swal.fire({
        title: '✅ Compra registrada',
        html: `
          <div class="text-center">
            <p><strong>Cliente:</strong> ${selected.cliente}</p>
            <p><strong>Total:</strong> $${total.toFixed(2)}</p>
            <p><strong>Productos:</strong> ${itemsCompra.length}</p>
            <small class="text-muted">El stock se actualizó automáticamente</small>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Continuar'
      });

    } catch (e) {
      console.error(e);
      Swal.fire('❌ Error', e.message || 'No se pudo procesar la compra', 'error');
    }
  };

  async function onCrearCuenta(e) {
    e.preventDefault();
    try {
      const nombre = nuevoCliente.trim();
      if (!nombre) {
        Swal.fire('Aviso', 'Ingresá el nombre del cliente', 'info');
        return;
      }
      const c = await crearCuenta({ cliente: nombre });
      setNuevoCliente('');
      await refrescarCuentas();
      setSelected(c);
      Swal.fire('✅ OK', 'Cuenta creada', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('❌ Error', e.message || 'No se pudo crear la cuenta', 'error');
    }
  }

  async function onRegistrarMov(e) {
    e.preventDefault();
    try {
      if (!selected?.id) return;
      const monto = Number(movMonto || 0);
      if (monto <= 0) {
        Swal.fire('Aviso', 'El monto debe ser mayor a 0', 'info');
        return;
      }
      await registrarMovimiento({
        cuenta_id: selected.id,
        tipo: movTipo,
        monto,
        concepto: movConcepto,
        factura: movFactura || null,
        descuento: movTipo === 'pago' ? (movDescuento ? Number(movDescuento) : 0) : 0,
      });
      setMovMonto('');
      setMovConcepto('');
      setMovFactura('');
      setMovDescuento('');
      const m = await listarMovimientos(selected.id, 200);
      setMovs(m);
      await refrescarCuentas();
      
      // Mostrar confirmación especial para pagos
      if (movTipo === 'pago') {
        const descuento = Number(movDescuento) || 0;
        const montoReal = descuento > 0 
          ? monto - (monto * descuento) / 100
          : monto;
        
        Swal.fire({
          title: '✅ Pago registrado',
          html: `
            <div class="text-center">
              <p><strong>Cliente:</strong> ${selected.cliente}</p>
              <p><strong>Concepto:</strong> ${movConcepto || 'Pago cuenta corriente'}</p>
              ${descuento > 0 ? `
                <p><strong>Monto original:</strong> $${monto.toFixed(2)}</p>
                <p><strong>Descuento:</strong> ${descuento}% (-$${(monto * descuento / 100).toFixed(2)})</p>
              ` : ''}
              <p class="h4 text-success">Dinero ingresado: $${montoReal.toFixed(2)}</p>
              <small class="text-muted">El ingreso se reflejará automáticamente en Reportes</small>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Continuar'
        });
      } else {
        Swal.fire('✅ OK', 'Movimiento registrado', 'success');
      }
    } catch (e) {
      console.error(e);
      Swal.fire('❌ Error', e.message || 'No se pudo registrar el movimiento', 'error');
    }
  }

  // Funciones para edición
  const iniciarEdicionNombre = () => {
    setNuevoNombre(selected?.cliente || '');
    setEditandoNombre(true);
  };

  const guardarNombre = async () => {
    if (!selected || !nuevoNombre.trim()) return;

    try {
      await actualizarNombreCuenta(selected.id, nuevoNombre.trim());
      await refrescarCuentas();
      setEditandoNombre(false);
      Swal.fire('✅ Éxito', 'Nombre actualizado correctamente', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('❌ Error', error.message || 'No se pudo actualizar el nombre', 'error');
    }
  };

  const cancelarEdicionNombre = () => {
    setEditandoNombre(false);
    setNuevoNombre('');
  };

  const eliminarMov = async (movimientoId) => {
    const result = await Swal.fire({
      title: '¿Eliminar movimiento?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        await eliminarMovimiento(movimientoId);
        await cargarMovimientos();
        await refrescarCuentas();
        Swal.fire('✅ Eliminado', 'El movimiento se eliminó correctamente', 'success');
      } catch (error) {
        console.error(error);
        Swal.fire('❌ Error', error.message || 'No se pudo eliminar el movimiento', 'error');
      }
    }
  };

  const editarMovimiento = (movimiento) => {
    setEditandoMovimiento({...movimiento});
  };

  const guardarMovimientoEditado = async () => {
    if (!editandoMovimiento) return;

    try {
      await actualizarMovimiento(editandoMovimiento.id, {
        concepto: editandoMovimiento.concepto,
        factura: editandoMovimiento.factura,
        descuento: editandoMovimiento.descuento ? Number(editandoMovimiento.descuento) : 0,
        monto: Number(editandoMovimiento.monto)
      });

      setEditandoMovimiento(null);
      await cargarMovimientos();
      await refrescarCuentas();
      Swal.fire('✅ Actualizado', 'El movimiento se actualizó correctamente', 'success');
    } catch (error) {
      console.error(error);
      Swal.fire('❌ Error', error.message || 'No se pudo actualizar el movimiento', 'error');
    }
  };

  const cancelarEdicionMovimiento = () => {
    setEditandoMovimiento(null);
  };

  // 👉 Generar factura PDF
  function generarFactura() {
    if (!selected) {
      Swal.fire('Aviso', 'Elegí un cliente primero', 'info');
      return;
    }

    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text(`Factura - ${selected.cliente}`, 14, 20);

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Cliente: ${selected.cliente}`, 14, 36);

    // Nueva lógica: mostrar Subtotal, Descuento y Total en la misma línea
    const rows = movs.map(m => {
      const subtotal = Number(m.subtotal ?? m.monto ?? 0);
      const descuentoPorcentaje = Number(m.descuento) || 0;
      const descuentoMonto = descuentoPorcentaje ? (subtotal * descuentoPorcentaje / 100) : 0;
      const total = subtotal - descuentoMonto;
      return [
        new Date(m.fecha).toLocaleDateString(),
        m.factura || '—',
        m.concepto || '—',
        m.tipo,
        `$${subtotal.toFixed(2)}`,
        descuentoPorcentaje ? `${descuentoPorcentaje}% (-$${descuentoMonto.toFixed(2)})` : '—',
        `$${total.toFixed(2)}`
      ];
    });

    autoTable(doc, {
      startY: 45,
      head: [["Fecha", "Factura", "Concepto", "Tipo", "Subtotal", "Descuento", "Total"]],
      body: rows,
    });

    const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY : 60;

    doc.setFontSize(12);
    doc.text(`Saldo actual: $${saldo.toFixed(2)}`, 14, finalY + 10);

    doc.save(`Factura-${selected.cliente}-${Date.now()}.pdf`);
  }

  // Función para verificar pagos en reportes
  async function verificarPagos() {
    try {
      const pagos = await verificarPagosEnVentas();
      Swal.fire({
        title: '🔍 Verificación de Pagos',
        html: `
          <div class="text-start">
            <p><strong>Pagos encontrados en reportes:</strong> ${pagos.length}</p>
            ${pagos.length > 0 ? `
              <div class="mt-3">
                <h6>Últimos pagos:</h6>
                ${pagos.slice(0, 3).map(p => `
                  <div class="border p-2 mb-2">
                    <strong>Cliente:</strong> ${p.cliente}<br>
                    <strong>Total:</strong> $${Number(p.total).toFixed(2)}<br>
                    <strong>Fecha:</strong> ${new Date(p.fecha).toLocaleString()}
                  </div>
                `).join('')}
              </div>
            ` : '<p class="text-muted">No se encontraron pagos registrados en reportes</p>'}
          </div>
        `,
        icon: pagos.length > 0 ? 'success' : 'warning',
        confirmButtonText: 'Cerrar'
      });
    } catch (error) {
      console.error('Error verificando pagos:', error);
      Swal.fire('❌ Error', 'No se pudieron verificar los pagos', 'error');
    }
  }

  // Función para probar inserción de pago
  async function probarInsercion() {
    try {
      Swal.fire({
        title: '🧪 Prueba de Inserción',
        text: '¿Quieres insertar un pago de prueba en reportes?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, probar',
        cancelButtonText: 'Cancelar'
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            await insertarPagoPrueba();
            Swal.fire('✅ Éxito', 'Pago de prueba insertado correctamente', 'success');
            // Verificar inmediatamente
            setTimeout(() => {
              verificarPagos();
            }, 1000);
          } catch (error) {
            console.error('Error en prueba:', error);
            Swal.fire('❌ Error', `Error en la prueba: ${error.message}`, 'error');
          }
        }
      });
    } catch (error) {
      console.error('Error en probarInsercion:', error);
      Swal.fire('❌ Error', 'No se pudo realizar la prueba', 'error');
    }
  }

  // Función para generar factura de cliente pagado
  async function generarFacturaClientePagadoHandler(cuentaId) {
    try {
      // Obtener el siguiente número de factura
      const numeroFactura = await obtenerSiguienteNumeroFactura();
      
      // Generar la factura
      const facturaData = await generarFacturaClientePagado(cuentaId, numeroFactura);
      
      // Generar PDF
      generarFacturaPDFClientePagado(facturaData);
      
      // Actualizar localStorage con el nuevo número
      localStorage.setItem('numeroFactura', numeroFactura);
      
      // Recargar datos
      await cargarClientesPagados();
      await refrescarCuentas();
      
      Swal.fire({
        title: '✅ Factura generada',
        html: `
          <div class="text-center">
            <p><strong>Cliente:</strong> ${facturaData.cliente}</p>
            <p><strong>Factura Nº:</strong> ${numeroFactura}</p>
            <p><strong>Total:</strong> $${facturaData.total.toFixed(2)}</p>
            <small class="text-muted">La factura se descargó automáticamente</small>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Continuar'
      });
      
    } catch (error) {
      console.error('Error generando factura:', error);
      Swal.fire('❌ Error', error.message || 'No se pudo generar la factura', 'error');
    }
  }

  // Función para generar PDF de factura de cliente pagado
  function generarFacturaPDFClientePagado({ cliente, movimientos, numeroFactura, total }) {
    const doc = new jsPDF();

    const fecha = new Date();
    const vencimiento = new Date(fecha);
    vencimiento.setDate(vencimiento.getDate() + 7);

    doc.setFontSize(16);
    doc.text('FACTURA', 14, 20);

    doc.setFontSize(11);
    doc.text('Cliente:', 14, 35);
    doc.text(cliente, 40, 35);

    doc.text('Factura Nº:', 140, 30);
    doc.text(`${numeroFactura}`, 180, 30);

    doc.text('Fecha:', 140, 36);
    doc.text(fecha.toLocaleDateString('es-AR'), 180, 36);

    doc.text('Vencimiento:', 140, 42);
    doc.text(vencimiento.toLocaleDateString('es-AR'), 180, 42);

    doc.text('Estado del pago:', 140, 48);
    doc.text('Pagado', 180, 48);

    // Preparar datos de la tabla con productos
    const rows = [];
    let subtotalTotal = 0;
    let descuentoTotal = 0;

    movimientos.forEach((m, idx) => {
      const subtotal = Number(m.monto);
      const descuento = Number(m.descuento) || 0;
      const montoDescuento = (subtotal * descuento) / 100;
      const totalConDescuento = subtotal - montoDescuento;

      // Si el movimiento tiene items (productos), mostrarlos individualmente
      if (m.items && Array.isArray(m.items) && m.items.length > 0) {
        m.items.forEach((item, itemIdx) => {
          const itemSubtotal = Number(item.precio_venta || item.precio_final || 0) * Number(item.cantidad || 1);
          const itemDescuento = Number(item.descuento) || 0;
          const itemMontoDescuento = (itemSubtotal * itemDescuento) / 100;
          const itemTotal = itemSubtotal - itemMontoDescuento;

          rows.push([
            rows.length + 1,
            item.nombre || 'Producto',
            item.cantidad || 1,
            `${item.unidad || 'unidad'}`,
            Number(item.precio_venta || item.precio_final || 0).toLocaleString('es-AR'),
            itemDescuento > 0 ? `${itemDescuento}%` : '—',
            itemDescuento > 0 ? `(-$${itemMontoDescuento.toLocaleString('es-AR')})` : '—',
            itemTotal.toLocaleString('es-AR')
          ]);
        });
      } else {
        // Si no tiene items, mostrar el concepto general
        rows.push([
          idx + 1,
          m.concepto || 'Movimiento cuenta corriente',
          '1',
          'unidad',
          subtotal.toLocaleString('es-AR'),
          descuento > 0 ? `${descuento}%` : '—',
          descuento > 0 ? `(-$${montoDescuento.toLocaleString('es-AR')})` : '—',
          totalConDescuento.toLocaleString('es-AR')
        ]);
      }

      subtotalTotal += subtotal;
      descuentoTotal += montoDescuento;
    });

    autoTable(doc, {
      startY: 60,
      head: [['#', 'Descripción', 'Cant.', 'Unidad', 'Precio', 'Descuento', 'Monto Descuento', 'Total']],
      body: rows,
      styles: { halign: 'center' },
      headStyles: { fillColor: [230, 230, 230] },
      columnStyles: {
        0: { halign: 'center' }, // #
        1: { halign: 'left' },   // Descripción
        2: { halign: 'center' }, // Cantidad
        3: { halign: 'center' }, // Unidad
        4: { halign: 'right' },  // Precio
        5: { halign: 'center' }, // Descuento %
        6: { halign: 'right' },  // Monto descuento
        7: { halign: 'right' }   // Total
      }
    });

    const y = doc.lastAutoTable.finalY;

    // Resumen de totales
    doc.setFontSize(12);
    doc.text(`Subtotal: $ ${subtotalTotal.toLocaleString('es-AR')}`, 120, y + 10);
    if (descuentoTotal > 0) {
      doc.text(`Descuento: -$ ${descuentoTotal.toLocaleString('es-AR')}`, 120, y + 18);
    }
    doc.text(`Total: $ ${Number(total).toLocaleString('es-AR')}`, 120, y + (descuentoTotal > 0 ? 26 : 18));

    doc.setFontSize(11);
    doc.text('Método de pago:', 14, y + 35);
    doc.text('Cuenta Corriente:', 14, y + 45);
    doc.text(`$ ${Number(total).toLocaleString('es-AR')}`, 50, y + 45);

    doc.text('Cantidad pagada:', 14, y + 55);
    doc.text(`$ ${Number(total).toLocaleString('es-AR')}`, 50, y + 55);

    doc.text('Cantidad adeudada:', 14, y + 65);
    doc.text('$ 0,00', 50, y + 65);

    doc.save(`factura_cc_${numeroFactura}_${cliente.replace(/\s+/g, '_')}.pdf`);
  }

  return (
    <Container fluid>
  <Card className="p-3 shadow" style={{ background: '#23272b', color: '#fff', border: '1px solid #23272b' }}>
        <h1>Cuenta Corriente</h1>

        <div className="mb-3 text-end">
          <Button variant="success" onClick={generarFactura} disabled={!selected} className="me-2">
            Generar Factura PDF
          </Button>
        </div>

        <Importador onImportado={refrescarCuentas} />

        <div className="row g-3">
          <div className="col-lg-4">
            <Card className="p-3 mb-3" style={{ background: '#23272b', color: '#fff', border: '1px solid #23272b' }}>
              <h5>Clientes</h5>

              {cargando ? (
                <p>Cargando…</p>
              ) : (
                <div className="table-responsive" style={{ maxHeight: 360, overflow: 'auto' }}>
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th className="text-end">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuentas.length ? (
                        cuentas.map(c => (
                          <tr
                            key={c.id}
                            onClick={() => setSelected(c)}
                            style={{
                              cursor: 'pointer',
                              background: selected?.id === c.id ? '#ffffffff' : '',
                            }}
                          >
                            <td>{c.cliente}</td>
                            <td className="text-end">${Number(c.saldo || 0).toFixed(2)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="2" className="text-center">
                            Sin cuentas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}

              <Form onSubmit={onCrearCuenta} className="mt-2">
                <Form.Label>Nueva cuenta</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control
                    placeholder="Nombre del cliente"
                    value={nuevoCliente}
                    onChange={e => setNuevoCliente(e.target.value)}
                  />
                  <Button type="submit">Crear</Button>
                </div>
              </Form>
            </Card>
          </div>

          <div className="col-lg-8">
            <Card className="p-3 mb-3" style={{ background: '#8a8a8aff', color: '#000000ff', border: '1px solid #23272b' }}>
              <div className="d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <h5 className="mb-0">Movimientos {selected ? `— ` : ''}</h5>
                  {selected && (
                    editandoNombre ? (
                      <div className="d-flex align-items-center gap-2">
                        <Form.Control
                          size="sm"
                          value={nuevoNombre}
                          onChange={(e) => setNuevoNombre(e.target.value)}
                          style={{ width: '200px' }}
                        />
                        <Button size="sm" variant="success" onClick={guardarNombre}>
                          ✓
                        </Button>
                        <Button size="sm" variant="outline-secondary" onClick={cancelarEdicionNombre}>
                          ✕
                        </Button>
                      </div>
                    ) : (
                      <div className="d-flex align-items-center gap-2">
                        <span className="h5 mb-0">{selected.cliente}</span>
                        <Button size="sm" variant="outline-primary" onClick={iniciarEdicionNombre}>
                          ✏️ Editar
                        </Button>
                      </div>
                    )
                  )}
                </div>
                <div>
                  <strong>Saldo:</strong> ${saldo.toFixed(2)}
                </div>
              </div>

              <div className="table-responsive">
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Factura</th>
                      <th>Concepto</th>
                      <th>Tipo</th>
                      <th>Descuento</th>
                      <th className="text-end">Monto</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected ? (
                      movs.length ? (
                        movs.map(m => (
                          <tr key={m.id}>
                            <td>{new Date(m.fecha).toLocaleString()}</td>
                            <td>
                              {editandoMovimiento?.id === m.id ? (
                                <Form.Control
                                  size="sm"
                                  value={editandoMovimiento.factura || ''}
                                  onChange={(e) => setEditandoMovimiento({
                                    ...editandoMovimiento,
                                    factura: e.target.value
                                  })}
                                />
                              ) : (
                                m.factura || '—'
                              )}
                            </td>
                            <td>
                              {editandoMovimiento?.id === m.id ? (
                                <Form.Control
                                  size="sm"
                                  value={editandoMovimiento.concepto || ''}
                                  onChange={(e) => setEditandoMovimiento({
                                    ...editandoMovimiento,
                                    concepto: e.target.value
                                  })}
                                />
                              ) : (
                                m.concepto || '—'
                              )}
                            </td>
                            <td>{m.tipo}</td>
                            <td>
                              {editandoMovimiento?.id === m.id ? (
                                <Form.Control
                                  size="sm"
                                  type="number"
                                  value={editandoMovimiento.descuento || ''}
                                  onChange={(e) => setEditandoMovimiento({
                                    ...editandoMovimiento,
                                    descuento: e.target.value
                                  })}
                                  placeholder="%"
                                />
                              ) : (
                                m.descuento ? `${m.descuento}%` : '—'
                              )}
                            </td>
                            <td className="text-end">
                              {editandoMovimiento?.id === m.id ? (
                                <Form.Control
                                  size="sm"
                                  type="number"
                                  step="0.01"
                                  value={editandoMovimiento.monto || ''}
                                  onChange={(e) => setEditandoMovimiento({
                                    ...editandoMovimiento,
                                    monto: e.target.value
                                  })}
                                />
                              ) : (
                                `${m.tipo === 'pago' ? '-' : ''}$${Number(m.monto || 0).toFixed(2)}`
                              )}
                            </td>
                            <td className="text-center">
                              {editandoMovimiento?.id === m.id ? (
                                <div className="d-flex gap-1 justify-content-center">
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={guardarMovimientoEditado}
                                  >
                                    ✓
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-secondary"
                                    onClick={cancelarEdicionMovimiento}
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <div className="d-flex gap-1 justify-content-center">
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    onClick={() => editarMovimiento(m)}
                                  >
                                    ✏️
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    onClick={() => eliminarMov(m.id)}
                                  >
                                    🗑️
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="text-center">
                            Sin movimientos
                          </td>
                        </tr>
                      )
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center">
                          Elegí un cliente
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>

              {/* Botones para alternar entre formularios */}
              <div className="mb-3">
                <Button 
                  variant={!mostrarFormularioCompra ? "primary" : "outline-primary"}
                  onClick={() => setMostrarFormularioCompra(false)}
                  className="me-2"
                >
                  💰 Movimiento Manual
                </Button>
                <Button 
                  variant={mostrarFormularioCompra ? "success" : "outline-success"}
                  onClick={() => setMostrarFormularioCompra(true)}
                  disabled={!selected}
                >
                  🛒 Compra con Productos
                </Button>
              </div>

              {/* Formulario de movimiento manual */}
              {!mostrarFormularioCompra && (
                <Form onSubmit={onRegistrarMov} className="row g-2">
                  <div className="col-md-2">
                    <Form.Label>Tipo</Form.Label>
                    <Form.Select value={movTipo} onChange={e => setMovTipo(e.target.value)}>
                      <option value="cargo">Cargo</option>
                      <option value="pago">Pago</option>
                    </Form.Select>
                  </div>
                  <div className="col-md-2">
                    <Form.Label>Monto</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.01"
                      value={movMonto}
                      onChange={e => setMovMonto(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <Form.Label>Concepto</Form.Label>
                    <Form.Control
                      value={movConcepto}
                      onChange={e => setMovConcepto(e.target.value)}
                    />
                  </div>
                  <div className="col-md-2">
                    <Form.Label>N° Factura</Form.Label>
                    <Form.Control
                      value={movFactura}
                      onChange={e => setMovFactura(e.target.value)}
                    />
                  </div>

                  {movTipo === 'pago' && (
                    <div className="col-md-2">
                      <Form.Label>Descuento (%)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        value={movDescuento}
                        onChange={e => setMovDescuento(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="col-md-1 d-flex align-items-end">
                    <Button type="submit" disabled={!selected}>
                      Agregar
                    </Button>
                  </div>
                </Form>
              )}

              {/* Formulario de compra con productos */}
              {mostrarFormularioCompra && selected && (
                <Card className="p-3" style={{ background: '#23272b', color: '#fff', border: '1px solid #23272b' }}>
                  <h6 className="mb-3">🛒 Registrar Compra de Productos</h6>
                  
                  {/* Formulario para agregar productos */}
                  <div className="row g-2 mb-3">
                    <div className="col-md-4">
                      <Form.Label>Producto</Form.Label>
                      <Form.Select 
                        value={productoSeleccionado} 
                        onChange={e => setProductoSeleccionado(e.target.value)}
                      >
                        <option value="">Seleccionar producto...</option>
                        {productos.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nombre} - Stock: {p.cantidad} {p.unidad || 'unidad'} - ${Number(p.precio_venta).toFixed(2)}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                    <div className="col-md-2">
                      <Form.Label>Cantidad</Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        value={cantidadCompra}
                        onChange={e => setCantidadCompra(e.target.value)}
                        placeholder="Cantidad"
                      />
                    </div>
                    <div className="col-md-2">
                      <Form.Label>Descuento (%)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={descuentoCompra}
                        onChange={e => setDescuentoCompra(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="col-md-2 d-flex align-items-end">
                      <Button 
                        variant="outline-primary" 
                        onClick={agregarItemCompra}
                        disabled={!productoSeleccionado || !cantidadCompra}
                      >
                        ➕ Agregar
                      </Button>
                    </div>
                  </div>

                  {/* Lista de productos agregados */}
                  {itemsCompra.length > 0 && (
                    <div className="mb-3">
                      <h6>Productos en la compra:</h6>
                      <div className="table-responsive">
                        <Table striped bordered hover size="sm">
                          <thead>
                            <tr>
                              <th>Producto</th>
                              <th>Cantidad</th>
                              <th>Precio Unit.</th>
                              <th>Descuento</th>
                              <th>Precio Final</th>
                              <th>Subtotal</th>
                              <th>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {itemsCompra.map((item, index) => (
                              <tr key={index}>
                                <td>{item.nombre}</td>
                                <td>{item.cantidad} {item.unidad}</td>
                                <td>${item.precio_venta.toFixed(2)}</td>
                                <td>{item.descuento > 0 ? `${item.descuento}%` : '—'}</td>
                                <td>${item.precio_final.toFixed(2)}</td>
                                <td>${item.subtotal.toFixed(2)}</td>
                                <td>
                                  <Button 
                                    size="sm" 
                                    variant="outline-danger"
                                    onClick={() => eliminarItemCompra(index)}
                                  >
                                    🗑️
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                      
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>Total de la compra: ${calcularTotalCompra().toFixed(2)}</strong>
                        </div>
                        <div className="d-flex gap-2">
                          <Form.Control
                            placeholder="N° Factura (opcional)"
                            value={movFactura}
                            onChange={e => setMovFactura(e.target.value)}
                            style={{ width: '150px' }}
                          />
                          <Button 
                            variant="success" 
                            onClick={procesarCompra}
                          >
                            ✅ Procesar Compra
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {itemsCompra.length === 0 && (
                    <div className="text-center text-muted py-3">
                      <p>Selecciona productos para agregar a la compra</p>
                      <small>Los productos se descontarán automáticamente del stock</small>
                    </div>
                  )}
                </Card>
              )}
            </Card>
          </div>
        </div>

        {/* Sección de Clientes Pagados */}
        <div className="row mt-4">
          <div className="col-12">
            <Card className="p-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">✅ Clientes que Terminaron de Pagar</h5>
                <div className="d-flex gap-2">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={cargarClientesPagados}
                    disabled={cargandoClientesPagados}
                  >
                    {cargandoClientesPagados ? '⏳' : '🔄'} Actualizar
                  </Button>
                </div>
              </div>

              {cargandoClientesPagados ? (
                <div className="text-center py-3">
                  <p>Cargando clientes pagados...</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover size="sm">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Saldo</th>
                        <th>Estado</th>
                        <th className="text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientesPagados.length > 0 ? (
                        clientesPagados.map(cliente => (
                          <tr key={cliente.id}>
                            <td>{cliente.cliente}</td>
                            <td className="text-end">${Number(cliente.saldo || 0).toFixed(2)}</td>
                            <td>
                              <span className="badge bg-success">✅ Pagado</span>
                            </td>
                            <td className="text-center">
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => generarFacturaClientePagadoHandler(cliente.id)}
                                title="Generar factura PDF"
                              >
                                📄 Generar Factura
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center">
                            <div className="py-3">
                              <div className="text-muted mb-2">No hay clientes que hayan terminado de pagar</div>
                              <small className="text-muted">
                                Los clientes aparecerán aquí cuando su saldo sea $0.00
                              </small>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              )}

              {clientesPagados.length > 0 && (
                <div className="mt-3">
                  <div className="alert alert-info">
                    <small>
                      💡 <strong>Información:</strong> Los números de factura se generan secuencialmente 
                      continuando desde las ventas normales. Si tu última venta fue la factura #20, 
                      la primera factura de cuenta corriente será la #21.
                    </small>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </Card>
    </Container>
  );
};

export default CuentaCorriente;
