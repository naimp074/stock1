import React, { useEffect, useState } from 'react';
import { Container, Card, Table, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import Swal from 'sweetalert2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { 
  listarNotasCredito, 
  crearNotaCredito, 
  obtenerEstadisticasNotasCredito,
  obtenerVentasParaNotaCredito
} from '../../services/notasCreditoService';
import { listarProductos } from '../../services/productosService';

const NotasCreditoPage = () => {
  const [notas, setNotas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [estadisticas, setEstadisticas] = useState({
    totalHoy: 0,
    totalSemana: 0,
    totalMes: 0,
    totalGeneral: 0,
    cantidad: 0
  });
  const [cargando, setCargando] = useState(true);

  // Estados del formulario
  const [cliente, setCliente] = useState('');
  const [motivo, setMotivo] = useState('');
  const [numeroFacturaOriginal, setNumeroFacturaOriginal] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState([]);
  const [busquedaProducto, setBusquedaProducto] = useState('');
  const [cantidadProducto, setCantidadProducto] = useState(1);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  
  // Estados para selección de venta
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [modoCreacion, setModoCreacion] = useState('manual'); // 'manual' o 'venta'

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      console.log('Cargando datos de notas de crédito...');
      
      // Cargar datos uno por uno para identificar cuál falla
      let notasData = [];
      let productosData = [];
      let ventasData = [];
      let statsData = { totalHoy: 0, totalSemana: 0, totalMes: 0, totalGeneral: 0, cantidad: 0 };
      
      try {
        console.log('Cargando notas de crédito...');
        notasData = await listarNotasCredito(100);
        console.log('Notas cargadas:', notasData?.length || 0);
      } catch (error) {
        console.error('Error cargando notas de crédito:', error);
        // Si falla, usar array vacío
        notasData = [];
      }
      
      try {
        console.log('Cargando productos...');
        productosData = await listarProductos();
        console.log('Productos cargados:', productosData?.length || 0);
      } catch (error) {
        console.error('Error cargando productos:', error);
        productosData = [];
      }
      
      try {
        console.log('Cargando ventas...');
        ventasData = await obtenerVentasParaNotaCredito(100);
        console.log('Ventas cargadas:', ventasData?.length || 0);
      } catch (error) {
        console.error('Error cargando ventas:', error);
        ventasData = [];
      }
      
      try {
        console.log('Cargando estadísticas...');
        statsData = await obtenerEstadisticasNotasCredito();
        console.log('Estadísticas cargadas:', statsData);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
        statsData = { totalHoy: 0, totalSemana: 0, totalMes: 0, totalGeneral: 0, cantidad: 0 };
      }
      
      console.log('Datos finales cargados:', {
        notas: notasData?.length || 0,
        productos: productosData?.length || 0,
        ventas: ventasData?.length || 0,
        stats: statsData
      });
      
      setNotas(notasData);
      setProductos(productosData);
      setVentas(ventasData);
      setEstadisticas(statsData);
    } catch (error) {
      console.error('Error general cargando datos:', error);
      Swal.fire('❌ Error', `Error cargando datos: ${error.message}`, 'error');
    } finally {
      setCargando(false);
    }
  };

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busquedaProducto.toLowerCase()) ||
    p.sku?.toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  const total = items.reduce((acc, item) => 
    acc + (Number(item.precio_venta || 0) * Number(item.cantidad || 0)), 0
  );

  const agregarProducto = () => {
    if (!productoSeleccionado || cantidadProducto <= 0) {
      Swal.fire('⚠️ Error', 'Selecciona un producto y cantidad válida', 'warning');
      return;
    }

    const nuevoItem = {
      id: productoSeleccionado.id,
      nombre: productoSeleccionado.nombre,
      precio_venta: Number(productoSeleccionado.precio_venta || 0),
      cantidad: Number(cantidadProducto),
      sku: productoSeleccionado.sku
    };

    setItems(prev => [...prev, nuevoItem]);
    setProductoSeleccionado(null);
    setCantidadProducto(1);
    setBusquedaProducto('');
  };

  const seleccionarVenta = (venta) => {
    setVentaSeleccionada(venta);
    setCliente(venta.cliente || 'Consumidor Final');
    setNumeroFacturaOriginal(venta.numero_factura || venta.id);
    setItems(venta.items || []);
    setModoCreacion('venta');
  };

  const cambiarModoCreacion = (modo) => {
    setModoCreacion(modo);
    if (modo === 'manual') {
      setVentaSeleccionada(null);
      setCliente('');
      setNumeroFacturaOriginal('');
      setItems([]);
    }
  };

  const quitarItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const confirmarNotaCredito = async () => {
    try {
      if (!cliente.trim()) {
        Swal.fire('⚠️ Error', 'Ingresa el nombre del cliente', 'warning');
        return;
      }

      if (!motivo.trim()) {
        Swal.fire('⚠️ Error', 'Ingresa el motivo de la nota de crédito', 'warning');
        return;
      }

      if (items.length === 0) {
        Swal.fire('⚠️ Error', 'Agrega al menos un producto', 'warning');
        return;
      }

      const notaCredito = await crearNotaCredito({
        cliente,
        motivo,
        items,
        total,
        numero_factura_original: numeroFacturaOriginal || null,
        observaciones,
        venta_original_id: ventaSeleccionada?.id || null
      });

      // Generar PDF
      generarNotaCreditoPDF(notaCredito);

      // Limpiar formulario
      setCliente('');
      setMotivo('');
      setNumeroFacturaOriginal('');
      setObservaciones('');
      setItems([]);
      setVentaSeleccionada(null);
      setModoCreacion('manual');

      // Actualizar lista
      await cargarDatos();

      Swal.fire(
        '✅ Éxito', 
        `Nota de crédito Nº ${notaCredito.numero_nota} creada\n\n✅ Stock devuelto automáticamente\n✅ Ingresos descontados`, 
        'success'
      );
    } catch (error) {
      console.error('Error creando nota de crédito:', error);
      Swal.fire('❌ Error', error.message || 'No se pudo crear la nota de crédito', 'error');
    }
  };

  const generarNotaCreditoPDF = (nota) => {
    const doc = new jsPDF();

    // Encabezado
    doc.setFontSize(16);
    doc.text('NOTA DE CRÉDITO', 14, 20);

    doc.setFontSize(11);
    doc.text('Cliente:', 14, 35);
    doc.text(nota.cliente, 40, 35);

    doc.text('Nº Nota:', 140, 30);
    doc.text(`${nota.numero_nota}`, 180, 30);

    doc.text('Fecha:', 140, 36);
    doc.text(new Date(nota.fecha).toLocaleDateString('es-AR'), 180, 36);

    doc.text('Motivo:', 14, 45);
    doc.text(nota.motivo, 40, 45);

    if (nota.numero_factura_original) {
      doc.text('Factura Original:', 14, 51);
      doc.text(nota.numero_factura_original, 60, 51);
    }

    // Tabla de productos
    const cuerpo = (nota.items || []).map((item, idx) => [
      idx + 1,
      item.nombre,
      item.cantidad,
      Number(item.precio_venta || 0).toLocaleString('es-AR'),
      (Number(item.cantidad) * Number(item.precio_venta || 0)).toLocaleString('es-AR')
    ]);

    autoTable(doc, {
      startY: 60,
      head: [['#', 'Descripción', 'Cantidad', 'Precio Unit.', 'Total']],
      body: cuerpo,
      styles: { halign: 'center' },
      headStyles: { fillColor: [230, 230, 230] }
    });

    const y = doc.lastAutoTable.finalY;

    // Total
    doc.setFontSize(12);
    doc.text(`Total: $ ${Number(nota.total).toLocaleString('es-AR')}`, 150, y + 10);

    // Observaciones
    if (nota.observaciones) {
      doc.setFontSize(10);
      doc.text('Observaciones:', 14, y + 20);
      doc.text(nota.observaciones, 14, y + 30);
    }

    doc.save(`nota_credito_${nota.numero_nota}.pdf`);
  };

  return (
    <Container fluid>
      <Card className="p-3 shadow">
        <h1>📦 Notas de Crédito</h1>

        {/* Estadísticas */}
        <Row className="g-3 mb-4">
          <Col md={3}>
            <Card className="p-3 bg-danger text-white">
              <div className="text-center">
                <h6>Hoy</h6>
                <h4>${estadisticas.totalHoy.toFixed(2)}</h4>
              </div>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="p-3 bg-warning text-white">
              <div className="text-center">
                <h6>7 días</h6>
                <h4>${estadisticas.totalSemana.toFixed(2)}</h4>
              </div>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="p-3 bg-info text-white">
              <div className="text-center">
                <h6>Mes actual</h6>
                <h4>${estadisticas.totalMes.toFixed(2)}</h4>
              </div>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="p-3 bg-secondary text-white">
              <div className="text-center">
                <h6>Total General</h6>
                <h4>${estadisticas.totalGeneral.toFixed(2)}</h4>
                <small>{estadisticas.cantidad} notas</small>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Formulario de creación */}
        <Card className="p-3 mb-4">
          <h5>Crear Nueva Nota de Crédito</h5>
          
          {/* Selector de modo */}
          <Row className="mb-3">
            <Col>
              <Form.Label>Modo de creación</Form.Label>
              <div className="d-flex gap-2">
                <Button
                  variant={modoCreacion === 'manual' ? 'primary' : 'outline-primary'}
                  onClick={() => cambiarModoCreacion('manual')}
                >
                  ✏️ Manual
                </Button>
                <Button
                  variant={modoCreacion === 'venta' ? 'success' : 'outline-success'}
                  onClick={() => cambiarModoCreacion('venta')}
                >
                  🛒 Desde Venta
                </Button>
              </div>
            </Col>
          </Row>

          {/* Selector de venta */}
          {modoCreacion === 'venta' && (
            <Card className="p-3 mb-3 bg-light">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">Seleccionar Venta</h6>
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={cargarDatos}
                  disabled={cargando}
                >
                  {cargando ? '⏳' : '🔄'} Actualizar
                </Button>
              </div>
              {cargando ? (
                <Alert variant="info">Cargando ventas...</Alert>
              ) : (
                <>
                  <div className="mb-2">
                    <small className="text-muted">
                      {ventas.length > 0 
                        ? `✅ Se encontraron ${ventas.length} ventas disponibles para nota de crédito` 
                        : '⚠️ No se encontraron ventas disponibles'
                      }
                    </small>
                    {ventas.length === 0 && (
                      <div className="mt-1">
                        <small className="text-info">
                          💡 Las ventas que ya tienen nota de crédito no aparecen en esta lista
                        </small>
                      </div>
                    )}
                  </div>
                  <div className="table-responsive" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Cliente</th>
                          <th>Total</th>
                          <th>Items</th>
                          <th className="text-center">Estado</th>
                          <th className="text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventas.length > 0 ? (
                          ventas.map(venta => (
                            <tr key={venta.id}>
                              <td>{new Date(venta.fecha).toLocaleDateString()}</td>
                              <td>{venta.cliente || 'Consumidor Final'}</td>
                              <td className="text-end">${Number(venta.total).toFixed(2)}</td>
                              <td>
                                {(venta.items || []).map((item, idx) => (
                                  <span key={idx} className="badge bg-secondary me-1">
                                    {item.nombre} x{item.cantidad} {item.unidad || 'unidad'}
                                  </span>
                                ))}
                              </td>
                              <td className="text-center">
                                <span className="badge bg-success">Disponible</span>
                              </td>
                              <td className="text-center">
                                <Button
                                  size="sm"
                                  variant="outline-success"
                                  onClick={() => seleccionarVenta(venta)}
                                  disabled={ventaSeleccionada?.id === venta.id}
                                >
                                  {ventaSeleccionada?.id === venta.id ? '✓ Seleccionada' : 'Seleccionar'}
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center">
                              <div className="py-3">
                                <div className="text-muted mb-2">No hay ventas disponibles</div>
                                <small className="text-muted">
                                  Verifica que tengas ventas registradas en el sistema
                                </small>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Información de la venta seleccionada */}
          {ventaSeleccionada && (
            <Alert variant="info" className="mb-3">
              <strong>Venta seleccionada:</strong> {ventaSeleccionada.cliente || 'Consumidor Final'} - 
              ${Number(ventaSeleccionada.total).toFixed(2)} - 
              {new Date(ventaSeleccionada.fecha).toLocaleDateString()}
            </Alert>
          )}
          
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Cliente *</Form.Label>
              <Form.Control
                placeholder="Nombre del cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                disabled={modoCreacion === 'venta'}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Motivo *</Form.Label>
              <Form.Control
                placeholder="Motivo de la nota de crédito"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Nº Factura Original (opcional)</Form.Label>
              <Form.Control
                placeholder="Número de factura original"
                value={numeroFacturaOriginal}
                onChange={(e) => setNumeroFacturaOriginal(e.target.value)}
                disabled={modoCreacion === 'venta'}
              />
            </Col>
            <Col md={6}>
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                placeholder="Observaciones adicionales"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </Col>
          </Row>

          {/* Agregar productos - Solo en modo manual */}
          {modoCreacion === 'manual' && (
            <>
              <hr className="my-3" />
              <h6>Agregar Productos</h6>
              
              <Row className="g-3 mb-3">
                <Col md={4}>
                  <Form.Label>Buscar Producto</Form.Label>
                  <Form.Control
                    placeholder="Nombre o SKU"
                    value={busquedaProducto}
                    onChange={(e) => setBusquedaProducto(e.target.value)}
                  />
                  {busquedaProducto && (
                    <div className="mt-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {productosFiltrados.slice(0, 5).map(prod => (
                        <div
                          key={prod.id}
                          className="p-2 border-bottom cursor-pointer"
                          onClick={() => setProductoSeleccionado(prod)}
                          style={{ cursor: 'pointer' }}
                        >
                          <strong>{prod.nombre}</strong><br />
                          <small>SKU: {prod.sku || 'N/A'} - ${Number(prod.precio_venta || 0).toFixed(2)}</small>
                        </div>
                      ))}
                    </div>
                  )}
                </Col>
                <Col md={2}>
                  <Form.Label>Cantidad</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={cantidadProducto}
                    onChange={(e) => setCantidadProducto(Number(e.target.value))}
                  />
                </Col>
                <Col md={2} className="d-flex align-items-end">
                  <Button 
                    variant="success" 
                    onClick={agregarProducto}
                    disabled={!productoSeleccionado}
                  >
                    Agregar
                  </Button>
                </Col>
              </Row>
            </>
          )}

          {/* Lista de productos agregados */}
          {items.length > 0 && (
            <div className="mb-3">
              <h6>Productos en la Nota de Crédito</h6>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th className="text-end">Cantidad/Unidad</th>
                    <th className="text-end">Precio</th>
                    <th className="text-end">Total</th>
                    <th className="text-center">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.nombre}</td>
                      <td className="text-end">{item.cantidad} {item.unidad || 'unidad'}</td>
                      <td className="text-end">${item.precio_venta.toFixed(2)}</td>
                      <td className="text-end">${(item.cantidad * item.precio_venta).toFixed(2)}</td>
                      <td className="text-center">
                        {modoCreacion === 'manual' ? (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => quitarItem(index)}
                          >
                            Quitar
                          </Button>
                        ) : (
                          <div className="d-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => {
                                const nuevosItems = [...items];
                                if (nuevosItems[index].cantidad > 1) {
                                  nuevosItems[index].cantidad -= 1;
                                  setItems(nuevosItems);
                                }
                              }}
                              disabled={items[index].cantidad <= 1}
                            >
                              -
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-secondary"
                              onClick={() => {
                                const nuevosItems = [...items];
                                nuevosItems[index].cantidad += 1;
                                setItems(nuevosItems);
                              }}
                            >
                              +
                            </Button>
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={() => quitarItem(index)}
                            >
                              Quitar
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="table-primary">
                    <th colSpan="3" className="text-end">Total</th>
                    <th className="text-end">${total.toFixed(2)}</th>
                    <th></th>
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}

          <div className="text-end">
            <Alert variant="info" className="mb-3">
              <strong>💡 Cómo funciona:</strong><br/>
              • Se devuelve el stock de los productos automáticamente<br/>
              • Se descuenta el monto de los ingresos en reportes<br/>
              • Los totales de ventas se ajustan automáticamente<br/>
              • Se genera un PDF de la nota de crédito
            </Alert>
         <div className="d-flex gap-2 justify-content-end">
           <Button
             variant="primary"
             size="lg"
             onClick={confirmarNotaCredito}
             disabled={!cliente || !motivo || items.length === 0}
           >
             📦 Crear Nota de Crédito
           </Button>
         </div>
          </div>
        </Card>

        {/* Lista de notas de crédito */}
        <Card className="p-3">
          <h5>Historial de Notas de Crédito</h5>
          
          {cargando ? (
            <Alert variant="info">Cargando...</Alert>
          ) : (
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Nº Nota</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Motivo</th>
                  <th className="text-end">Total</th>
                  <th>Factura Original</th>
                  <th className="text-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {notas.length > 0 ? (
                  notas.map(nota => (
                    <tr key={nota.id}>
                      <td>{nota.numero_nota}</td>
                      <td>{new Date(nota.fecha).toLocaleDateString()}</td>
                      <td>{nota.cliente}</td>
                      <td>{nota.motivo}</td>
                      <td className="text-end text-danger">${Number(nota.total).toFixed(2)}</td>
                      <td>{nota.numero_factura_original || '—'}</td>
                      <td className="text-center">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => generarNotaCreditoPDF(nota)}
                        >
                          📄 PDF
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center">No hay notas de crédito</td>
                  </tr>
                )}
              </tbody>
            </Table>
          )}
        </Card>
      </Card>
    </Container>
  );
};

export default NotasCreditoPage;
