// src/cuenta-corriente/Cuenta-corriente.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Table, Button, Form } from 'react-bootstrap';
import Swal from 'sweetalert2';
import {
  listarCuentas,
  crearCuenta,
  listarMovimientos,
  registrarMovimiento,
  obtenerSaldosPorCuenta,
} from '../services/cuentasService';

const CuentaCorriente = () => {
  const [cuentas, setCuentas] = useState([]);
  const [selected, setSelected] = useState(null); // cuenta seleccionada
  const [movs, setMovs] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [nuevoCliente, setNuevoCliente] = useState('');
  const [movTipo, setMovTipo] = useState('cargo'); // cargo/pago
  const [movMonto, setMovMonto] = useState('');
  const [movConcepto, setMovConcepto] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setCargando(true);
        const conSaldos = await obtenerSaldosPorCuenta();
        setCuentas(conSaldos);
        if (conSaldos.length) setSelected(conSaldos[0]);
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
      return acc + sign * Number(m.monto || 0);
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

      const conSaldos = await obtenerSaldosPorCuenta();
      setCuentas(conSaldos);
      setSelected(conSaldos.find(x => x.id === c.id) || c);

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
      });
      setMovMonto(''); setMovConcepto('');

      const m = await listarMovimientos(selected.id, 200);
      setMovs(m);

      const conSaldos = await obtenerSaldosPorCuenta();
      setCuentas(conSaldos);
      setSelected(conSaldos.find(x => x.id === selected.id) || selected);

      Swal.fire('✅ OK', 'Movimiento registrado', 'success');
    } catch (e) {
      console.error(e);
      Swal.fire('❌ Error', e.message || 'No se pudo registrar el movimiento', 'error');
    }
  }

  return (
    <Container fluid>
      <Card className="p-3 shadow">
        <h1>Cuenta Corriente</h1>

        <div className="row g-3">
          <div className="col-lg-4">
            <Card className="p-3 mb-3">
              <h5>Clientes</h5>

              {cargando ? <p>Cargando…</p> : (
                <div className="table-responsive" style={{ maxHeight: 360, overflow: 'auto' }}>
                  <Table hover size="sm">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th className="text-end">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuentas.length ? cuentas.map(c => (
                        <tr
                          key={c.id}
                          onClick={() => setSelected(c)}
                          style={{ cursor: 'pointer', background: selected?.id === c.id ? '#f6f9ff' : '' }}
                        >
                          <td>{c.cliente}</td>
                          <td className="text-end">${Number(c.saldo || 0).toFixed(2)}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan="2" className="text-center">Sin cuentas</td></tr>
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
                <h5>Movimientos {selected ? `— ${selected.cliente}` : ''}</h5>
                <div><strong>Saldo:</strong> ${saldo.toFixed(2)}</div>
              </div>

              <div className="table-responsive">
                <Table striped bordered hover size="sm">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Tipo</th>
                      <th className="text-end">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected ? (
                      movs.length ? movs.map(m => (
                        <tr key={m.id}>
                          <td>{new Date(m.fecha).toLocaleString()}</td>
                          <td>{m.concepto || '—'}</td>
                          <td>{m.tipo}</td>
                          <td className="text-end">
                            {m.tipo === 'pago' ? '-' : ''}${Number(m.monto || 0).toFixed(2)}
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan="4" className="text-center">Sin movimientos</td></tr>
                      )
                    ) : (
                      <tr><td colSpan="4" className="text-center">Elegí un cliente</td></tr>
                    )}
                  </tbody>
                </Table>
              </div>

              <Form onSubmit={onRegistrarMov} className="row g-2">
                <div className="col-md-3">
                  <Form.Label>Tipo</Form.Label>
                  <Form.Select value={movTipo} onChange={e => setMovTipo(e.target.value)}>
                    <option value="cargo">Cargo</option>
                    <option value="pago">Pago</option>
                  </Form.Select>
                </div>
                <div className="col-md-3">
                  <Form.Label>Monto</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={movMonto}
                    onChange={e => setMovMonto(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <Form.Label>Concepto (opcional)</Form.Label>
                  <Form.Control
                    value={movConcepto}
                    onChange={e => setMovConcepto(e.target.value)}
                  />
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <Button type="submit" disabled={!selected}>Agregar</Button>
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
