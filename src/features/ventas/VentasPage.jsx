import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Table, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { listarProductos } from '../../services/productosService';
import { crearVenta, listarVentas } from '../../services/ventasService';

const VentasPage = () => {
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cliente, setCliente] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [cantidades, setCantidades] = useState({});
  const [cargando, setCargando] = useState(true);

  // Número de factura persistente en localStorage
  const [numeroFactura, setNumeroFactura] = useState(() => {
    return Number(localStorage.getItem('numeroFactura') || 1);
  });

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        const [prods, vts] = await Promise.all([listarProductos(), listarVentas(20)]);
        setProductos(prods);
        setVentas(vts);
      } catch (e) {
        console.error(e);
        Swal.fire('❌ Error', e.message || 'No se pudieron cargar productos/ventas', 'error');
      } finally {
        setCargando(false);
      }
    })();
  }, []);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return productos;
    return productos.filter(p =>
      (p?.nombre || '').toLowerCase().includes(q) ||
      (p?.proveedor || '').toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  const total = carrito.reduce(
    (acc, it) => acc + Number(it.precio_venta || 0) * Number(it.cantidad || 0),
    0
  );

  function setCantidadFila(id, val) {
    const n = Math.max(0, Number(val || 0));
    setCantidades(prev => ({ ...prev, [id]: n }));
  }

  function agregar(prod) {
    const cant = Number(cantidades[prod.id] || 0);
    if (!cant || cant <= 0) {
      Swal.fire('⚠️ Error', 'La cantidad debe ser mayor a 0', 'warning');
      return;
    }
    if (cant > Number(prod.cantidad || 0)) {
      Swal.fire('❌ Stock insuficiente', `Disponible: ${prod.cantidad}`, 'error');
      return;
    }

    setCarrito(prev => {
      const i = prev.findIndex(x => x.id === prod.id);
      if (i >= 0) {
        const copy = [...prev];
        copy[i] = { ...copy[i], cantidad: Number(copy[i].cantidad) + cant };
        return copy;
      }
      return [
        ...prev,
        {
          id: prod.id,
          nombre: prod.nombre,
          precio_venta: Number(prod.precio_venta || 0),
          cantidad: cant,
        },
      ];
    });

    setCantidades(prev => ({ ...prev, [prod.id]: 0 }));
  }

  function cambiarCantidadCarrito(id, cant) {
    setCarrito(prev =>
      prev.map(it => (it.id === id ? { ...it, cantidad: Math.max(0, Number(cant || 0)) } : it))
    );
  }

  function quitarDelCarrito(id) {
    setCarrito(prev => prev.filter(it => it.id !== id));
  }

  async function confirmarVenta() {
    try {
      if (!carrito.length) {
        Swal.fire('⚠️ Carrito vacío', 'Agrega productos antes de vender', 'warning');
        return;
      }

      for (const it of carrito) {
        const prod = productos.find(p => p.id === it.id);
        if (!prod) throw new Error('Producto no encontrado');
        if (Number(it.cantidad) > Number(prod.cantidad || 0)) {
          throw new Error(`Stock insuficiente para "${prod.nombre}". Disponible: ${prod.cantidad}`);
        }
      }

      const venta = await crearVenta({ cliente, items: carrito, numeroFactura });

      // Actualizar stock
      setProductos(prev =>
        prev.map(p => {
          const it = carrito.find(x => x.id === p.id);
          if (!it) return p;
          return { ...p, cantidad: Math.max(0, Number(p.cantidad || 0) - Number(it.cantidad || 0)) };
        })
      );

      // Guardar factura PDF
      generarFacturaPDF({ cliente, items: carrito, total, numeroFactura });

      // Actualizar ventas con número de factura
      const nuevaVenta = {
        ...venta,
        numeroFactura,
      };
      setVentas(v => [nuevaVenta, ...v]);

      // Incrementar número de factura
      const siguiente = numeroFactura + 1;
      setNumeroFactura(siguiente);
      localStorage.setItem('numeroFactura', siguiente);

      // Resetear carrito y cliente
      setCarrito([]);
      setCliente('');

      // Mostrar resumen de dinero ingresado
      Swal.fire({
        title: '✅ Venta realizada',
        html: `
          <div class="text-center">
            <p><strong>Factura Nº ${numeroFactura}</strong></p>
            <p>Cliente: ${cliente || 'Consumidor Final'}</p>
            <p class="h4 text-success">Dinero ingresado: $${total.toFixed(2)}</p>
            <small class="text-muted">Los datos se actualizarán automáticamente en Reportes</small>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'Continuar'
      });
    } catch (e) {
      console.error(e);
      Swal.fire('❌ Error', e.message || 'No se pudo registrar la venta', 'error');
    }
  }

  function generarFacturaPDF({ cliente, items, total, numeroFactura }) {
    const doc = new jsPDF();

    const fecha = new Date();
    const vencimiento = new Date(fecha);
    vencimiento.setDate(vencimiento.getDate() + 7);

    doc.setFontSize(16);
    doc.text('FACTURA', 14, 20);

    doc.setFontSize(11);
    doc.text('Cliente:', 14, 35);
    doc.text(cliente || 'Consumidor Final', 40, 35);

    doc.text('Factura Nº:', 140, 30);
    doc.text(`${numeroFactura}`, 180, 30);

    doc.text('Fecha:', 140, 36);
    doc.text(fecha.toLocaleDateString('es-AR'), 180, 36);

    doc.text('Vencimiento:', 140, 42);
    doc.text(vencimiento.toLocaleDateString('es-AR'), 180, 42);

    doc.text('Estado del pago:', 140, 48);
    doc.text('Pagado', 180, 48);

    const cuerpo = (items || []).map((it, idx) => [
      idx + 1,
      it.nombre,
      it.cantidad,
      Number(it.precio_venta || 0).toLocaleString('es-AR'),
      '—',
      '0,00%',
      (Number(it.cantidad) * Number(it.precio_venta || 0)).toLocaleString('es-AR'),
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['#', 'Descripción de artículo', 'Cantidad', 'Precio', 'Impuesto', 'Descuento', 'Total']],
      body: cuerpo,
      styles: { halign: 'center' },
      headStyles: { fillColor: [230, 230, 230] },
    });

    const y = doc.lastAutoTable.finalY;

    doc.setFontSize(12);
    doc.text(`Total: $ ${Number(total).toLocaleString('es-AR')}`, 150, y + 10);

    doc.setFontSize(11);
    doc.text('Método de pago:', 14, y + 20);
    doc.text('Cash:', 14, y + 30);
    doc.text(`$ ${Number(total).toLocaleString('es-AR')}`, 50, y + 30);

    doc.text('Cantidad pagada:', 14, y + 40);
    doc.text(`$ ${Number(total).toLocaleString('es-AR')}`, 50, y + 40);

    doc.text('Cantidad adeudada:', 14, y + 50);
    doc.text('$ 0,00', 50, y + 50);

    doc.save(`factura_${numeroFactura}.pdf`);
  }

  // Función para generar factura de una venta existente
  function generarFacturaVentaExistente(venta) {
    try {
      const numeroFactura = venta.numeroFactura || venta.id;
      const fechaVenta = new Date(venta.fecha);
      
      generarFacturaPDF({
        cliente: venta.cliente,
        items: venta.items || [],
        total: venta.total,
        numeroFactura: numeroFactura
      });
      
      Swal.fire('✅ Factura generada', `Factura Nº ${numeroFactura} descargada`, 'success');
    } catch (error) {
      console.error('Error generando factura:', error);
      Swal.fire('❌ Error', 'No se pudo generar la factura', 'error');
    }
  }

  return (
    <Container>
      <Card className="p-3 shadow" style={{ background: '#23272b', color: '#fff', border: '1px solid #23272b' }}>
        <h1>Ventas</h1>

        {/* Búsqueda y cliente */}
        <Form className="row g-3 mb-3" onSubmit={e => e.preventDefault()}>
          <div className="col-md-6">
            <Form.Label>Buscar producto</Form.Label>
            <Form.Control
              placeholder="Nombre o proveedor"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <Form.Label>Cliente (opcional)</Form.Label>
            <Form.Control
              placeholder="Nombre del cliente"
              value={cliente}
              onChange={e => setCliente(e.target.value)}
            />
          </div>
        </Form>

        {/* Productos */}
        <div className="table-responsive">
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-end">Stock</th>
                <th className="text-end">Precio Venta</th>
                <th style={{ width: 140 }} className="text-end">Cantidad</th>
                <th className="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan="5">Cargando…</td></tr>
              ) : filtrados.length ? (
                filtrados.map((prod) => (
                  <tr key={prod.id}>
                    <td>{prod.nombre}</td>
                    <td className="text-end">{Number(prod.cantidad || 0)}</td>
                    <td className="text-end">${Number(prod.precio_venta || 0).toFixed(2)}</td>
                    <td className="text-end">
                      <Form.Control
                        type="number"
                        min={1}
                        max={Number(prod.cantidad || 0)}
                        value={cantidades[prod.id] || ''}
                        onChange={(e) => setCantidadFila(prod.id, e.target.value)}
                      />
                    </td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => agregar(prod)}
                        disabled={Number(prod.cantidad || 0) <= 0}
                      >
                        Agregar
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center">No hay productos</td></tr>
              )}
            </tbody>
          </Table>
        </div>

        {/* Carrito */}
        <h3 className="mt-4">🛒 Carrito</h3>
        <div className="table-responsive mb-3">
          <Table bordered>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="text-end">Precio</th>
                <th className="text-end">Cantidad</th>
                <th className="text-end">Total</th>
                <th className="text-end">Acción</th>
              </tr>
            </thead>
            <tbody>
              {carrito.length ? (
                carrito.map((it) => (
                  <tr key={it.id}>
                    <td>{it.nombre}</td>
                    <td className="text-end">${Number(it.precio_venta || 0).toFixed(2)}</td>
                    <td className="text-end" style={{ width: 120 }}>
                      <Form.Control
                        type="number"
                        min={0}
                        value={it.cantidad}
                        onChange={(e) => cambiarCantidadCarrito(it.id, e.target.value)}
                      />
                    </td>
                    <td className="text-end">
                      ${(Number(it.precio_venta || 0) * Number(it.cantidad || 0)).toFixed(2)}
                    </td>
                    <td className="text-end">
                      <Button size="sm" variant="outline-danger" onClick={() => quitarDelCarrito(it.id)}>
                        Quitar
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="text-center">Carrito vacío</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan="3" className="text-end">Total</th>
                <th className="text-end">${total.toFixed(2)}</th>
                <th className="text-end">
                  <Button variant="primary" onClick={confirmarVenta} disabled={!carrito.length}>
                    Confirmar Venta y Generar Factura
                  </Button>
                </th>
              </tr>
            </tfoot>
          </Table>
        </div>

        {/* Resumen de dinero ingresado */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <Card className="p-3 bg-success text-white">
              <div className="text-center">
                <h6>Dinero Ingresado Hoy</h6>
                <h4>${ventas
                  .filter(v => {
                    const hoy = new Date();
                    const fechaVenta = new Date(v.fecha);
                    return fechaVenta.toDateString() === hoy.toDateString();
                  })
                  .reduce((acc, v) => acc + Number(v.total || 0), 0)
                  .toFixed(2)}
                </h4>
              </div>
            </Card>
          </div>
          <div className="col-md-4">
            <Card className="p-3 bg-primary text-white">
              <div className="text-center">
                <h6>Total de Ventas</h6>
                <h4>${ventas.reduce((acc, v) => acc + Number(v.total || 0), 0).toFixed(2)}</h4>
              </div>
            </Card>
          </div>
          <div className="col-md-4">
            <Card className="p-3 bg-info text-white">
              <div className="text-center">
                <h6>Número de Ventas</h6>
                <h4>{ventas.length}</h4>
              </div>
            </Card>
          </div>
        </div>

        {/* Historial simple */}
          <h5>Últimas ventas</h5>
          <div className="table-responsive">
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Factura Nº</th>
                  <th>Concepto</th>
                  <th>Tipo</th>
                  <th className="text-end">Subtotal</th>
                  <th className="text-end">Descuento</th>
                  <th className="text-end">Total</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {ventas.length ? (
                  ventas.map(v => {
                    // Calcular subtotal, descuento y total
                    const subtotal = (v.items || []).reduce((acc, it) => acc + Number(it.precio_venta || 0) * Number(it.cantidad || 0), 0);
                    // Si no existe descuento, mostrar 0%
                    const descuentoPorcentaje = v.descuento_porcentaje || 0;
                    const descuentoMonto = v.descuento_monto || 0;
                    // Si el modelo guarda solo porcentaje, calcular monto
                    const descuentoCalculado = descuentoMonto || (subtotal * (descuentoPorcentaje / 100));
                    const total = subtotal - descuentoCalculado;
                    return (
                      <tr key={v.id}>
                        <td>{new Date(v.fecha).toLocaleString()}</td>
                        <td>{v.numeroFactura || '—'}</td>
                        <td>Compra de productos ({(v.items || []).length} ítem{(v.items || []).length === 1 ? '' : 's'})</td>
                        <td>cargo</td>
                        <td className="text-end">${subtotal.toFixed(2)}</td>
                        <td className="text-end">
                          {descuentoPorcentaje ? `${descuentoPorcentaje}% (-$${descuentoCalculado.toFixed(2)})` : '0%'}
                        </td>
                        <td className="text-end">${total.toFixed(2)}</td>
                        <td className="text-center">
                          <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={() => generarFacturaVentaExistente(v)}
                            title="Generar factura PDF"
                          >
                            📄 Factura
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="8" className="text-center">Sin ventas</td></tr>
                )}
              </tbody>
            </Table>
          </div>
      </Card>
    </Container>
  );
};

export default VentasPage;
