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
} from '../services/cuentasService';
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

  async function refrescarCuentas() {
    const conSaldos = await obtenerSaldosPorCuenta();
    setCuentas(conSaldos);
    if (conSaldos.length && !selected) setSelected(conSaldos[0]);
    else if (selected) {
      setSelected(conSaldos.find(c => c.id === selected.id) || null);
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
        await refrescarCuentas();
      } catch (e) {
        console.error(e);
        Swal.fire('❌ Error', e.message || 'No se pudieron cargar cuentas', 'error');
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
        const montoReal = movDescuento 
          ? monto - (monto * Number(movDescuento)) / 100
          : monto;
        
        Swal.fire({
          title: '✅ Pago registrado',
          html: `
            <div class="text-center">
              <p><strong>Cliente:</strong> ${selected.cliente}</p>
              <p><strong>Concepto:</strong> ${movConcepto || 'Pago cuenta corriente'}</p>
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

    const rows = movs.map(m => [
      new Date(m.fecha).toLocaleDateString(),
      m.factura || '—',
      m.concepto || '—',
      m.tipo,
      m.descuento ? `${m.descuento}%` : '—',
      `${m.tipo === 'pago' ? '-' : ''}$${Number(m.monto).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [["Fecha", "Factura", "Concepto", "Tipo", "Descuento", "Monto"]],
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

  return (
    <Container fluid>
      <Card className="p-3 shadow">
        <h1>Cuenta Corriente</h1>

        <div className="mb-3 text-end">
          <Button variant="success" onClick={generarFactura} disabled={!selected} className="me-2">
            Generar Factura PDF
          </Button>
        </div>

        <Importador onImportado={refrescarCuentas} />

        <div className="row g-3">
          <div className="col-lg-4">
            <Card className="p-3 mb-3">
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
                              background: selected?.id === c.id ? '#f6f9ff' : '',
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
            <Card className="p-3 mb-3">
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
            </Card>
          </div>
        </div>
      </Card>
    </Container>
  );
};

export default CuentaCorriente;
