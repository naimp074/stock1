// Reportes con gráficos (usar la ruta de imports que corresponda en tu proyecto)
import React, { useEffect, useMemo, useState } from 'react';
import { Container, Card, Table } from 'react-bootstrap';
// Ajustá estas rutas según dónde esté tu archivo:
import { listarVentas } from '../../services/ventasService';
import { listarProductos } from '../../services/productosService';
import { listarNotasCredito, obtenerEstadisticasNotasCredito } from '../../services/notasCreditoService';

// Charts
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line,
} from 'recharts';

export default function ReportesPage() {
  const [ventas, setVentas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [notasCredito, setNotasCredito] = useState([]);
  const [estadisticasNotas, setEstadisticasNotas] = useState({
    totalHoy: 0,
    totalSemana: 0,
    totalMes: 0,
    totalGeneral: 0,
    cantidad: 0
  });
  const [cargando, setCargando] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [vts, prods, notas, statsNotas] = await Promise.all([
        listarVentas(500), 
        listarProductos(),
        listarNotasCredito(100),
        obtenerEstadisticasNotasCredito()
      ]);
      setVentas(vts || []);
      setProductos(prods || []);
      setNotasCredito(notas || []);
      setEstadisticasNotas(statsNotas);
      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    
    // Actualizar datos cada 30 segundos para mantener sincronización
    const interval = setInterval(cargarDatos, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const hoy = new Date();
  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const hace7 = new Date(hoy); hace7.setDate(hace7.getDate() - 6);

  const {
    totalHoy, totalSemana, totalMes,
    topProductos, lowStock, serie7d,
    ingresosPorAno, ingresosPorMes, totalAnual,
    totalNotasHoy, totalNotasSemana, totalNotasMes
  } = useMemo(() => {
    try {
      let th = 0, ts = 0, tm = 0;
      let tnh = 0, tns = 0, tnm = 0; // Totales de notas de crédito
      const contador = new Map(); // id -> {nombre, cantidad}
      const ingresosAno = new Map(); // año -> total
      const ingresosMes = new Map(); // año-mes -> total

      // base de 7 días
      const dias = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(hoy);
        d.setDate(hoy.getDate() - i);
        dias.push({ 
          key: d.toISOString().slice(0,10), 
          label: d.toLocaleDateString('es-AR', { 
            day: '2-digit', 
            month: '2-digit' 
          }), 
          total: 0 
        });
      }

    for (const v of ventas || []) {
      if (!v || !v.fecha) continue;
      
      const f = new Date(v.fecha);
      if (isNaN(f.getTime())) continue; // Validar fecha
      
      const t = Number(v.total || 0);
      const año = f.getFullYear();
      const mes = f.getMonth() + 1;
      const keyMes = `${año}-${mes.toString().padStart(2, '0')}`;

      if (f >= inicioDia) th += t;
      if (f >= hace7) ts += t;
      if (f >= inicioMes) tm += t;

      // línea 7 días
      const k = f.toISOString().slice(0,10);
      const bucket = dias.find(x => x.key === k);
      if (bucket) bucket.total += t;

      // Ingresos por año
      ingresosAno.set(año, (ingresosAno.get(año) || 0) + t);
      ingresosMes.set(keyMes, (ingresosMes.get(keyMes) || 0) + t);

      for (const it of v.items || []) {
        if (!it || !it.id) continue;
        const prev = contador.get(it.id) || { nombre: it.nombre || 'Sin nombre', cantidad: 0 };
        prev.cantidad += Number(it.cantidad || 0);
        contador.set(it.id, prev);
      }
    }

      // Procesar notas de crédito (descontar de los ingresos y productos)
      for (const nota of notasCredito || []) {
        if (!nota || !nota.fecha) continue;
        
        const f = new Date(nota.fecha);
        if (isNaN(f.getTime())) continue;
        
        const t = Number(nota.total || 0);
        
        // DESCONTAR de los totales de ventas
        if (f >= inicioDia) {
          th -= t; // Descontar de ventas de hoy
          tnh += t; // Sumar a notas de crédito de hoy
        }
        if (f >= hace7) {
          ts -= t; // Descontar de ventas de 7 días
          tns += t; // Sumar a notas de crédito de 7 días
        }
        if (f >= inicioMes) {
          tm -= t; // Descontar de ventas del mes
          tnm += t; // Sumar a notas de crédito del mes
        }
        
        // DESCONTAR de la serie de 7 días
        const k = f.toISOString().slice(0,10);
        const bucket = dias.find(x => x.key === k);
        if (bucket) bucket.total -= t; // Descontar de ese día específico
        
        // DESCONTAR CANTIDADES de productos en el contador
        for (const item of nota.items || []) {
          if (!item || !item.id) continue;
          const prev = contador.get(item.id) || { nombre: item.nombre || 'Sin nombre', cantidad: 0 };
          prev.cantidad -= Number(item.cantidad || 0); // DESCONTAR cantidad devuelta
          contador.set(item.id, prev);
        }
      }

      const top = [...contador.entries()]
      .map(([id, v]) => ({ 
        id, 
        ...v, 
        cantidad: Math.max(0, v.cantidad) // Asegurar que no sea negativo
      }))
      .filter(item => item.cantidad > 0) // Solo productos con cantidad > 0
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 7); // top 7 para el gráfico
      
      console.log('Top productos calculados:', top);

    const low = (productos || [])
      .filter(p => Number(p.cantidad || 0) <= 5)
      .sort((a, b) => Number(a.cantidad || 0) - Number(b.cantidad || 0));

    const serie7d = dias.map(d => ({ 
      fecha: d.label, 
      total: Math.max(0, d.total) // Asegurar que no sea negativo
    }));
    
    console.log('Serie de 7 días generada:', serie7d);
    console.log('Debug cálculos:', {
      ventasProcesadas: (ventas || []).length,
      notasProcesadas: (notasCredito || []).length,
      totalHoy: th,
      totalSemana: ts,
      totalMes: tm,
      diasConDatos: dias.filter(d => d.total > 0).length
    });

    // Preparar datos de ingresos por año (descontando notas de crédito)
    const ingresosPorAnoMap = new Map(ingresosAno);
    
    // Descontar notas de crédito por año
    for (const nota of notasCredito || []) {
      if (!nota || !nota.fecha) continue;
      
      const f = new Date(nota.fecha);
      if (isNaN(f.getTime())) continue;
      
      const año = f.getFullYear();
      const t = Number(nota.total || 0);
      
      const totalActual = ingresosPorAnoMap.get(año) || 0;
      ingresosPorAnoMap.set(año, totalActual - t);
    }
    
    const ingresosPorAno = [...ingresosPorAnoMap.entries()]
      .map(([año, total]) => ({ año, total: Math.max(0, total) }))
      .sort((a, b) => b.año - a.año);
    
    console.log('Ingresos por año calculados:', ingresosPorAno);

    // Preparar datos de ingresos por mes (últimos 12 meses)
    const ingresosPorMes = [...ingresosMes.entries()]
      .map(([key, total]) => {
        const [año, mes] = key.split('-');
        const fecha = new Date(parseInt(año), parseInt(mes) - 1);
        return {
          año: parseInt(año),
          mes: parseInt(mes),
          mesNombre: fecha.toLocaleDateString('es-AR', { month: 'short', year: 'numeric' }),
          total
        };
      })
      .sort((a, b) => b.año - a.año || b.mes - a.mes)
      .slice(0, 12);

    const totalAnual = ingresosPorAno.reduce((acc, item) => acc + item.total, 0);

    return { 
      totalHoy: th, 
      totalSemana: ts, 
      totalMes: tm, 
      topProductos: top, 
      lowStock: low, 
      serie7d,
      ingresosPorAno,
      ingresosPorMes,
      totalAnual,
      totalNotasHoy: tnh,
      totalNotasSemana: tns,
      totalNotasMes: tnm
    };
    } catch (error) {
      console.error('Error en cálculos de reportes:', error);
      return {
        totalHoy: 0,
        totalSemana: 0,
        totalMes: 0,
        topProductos: [],
        lowStock: [],
        serie7d: [],
        ingresosPorAno: [],
        ingresosPorMes: [],
        totalAnual: 0,
        totalNotasHoy: 0,
        totalNotasSemana: 0,
        totalNotasMes: 0
      };
    }
  }, [ventas, productos, notasCredito]);

  return (
    <Container fluid>
      <Card className="p-3 shadow">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1>Reportes</h1>
          <div className="text-muted small">
            {ultimaActualizacion && (
              <span>Última actualización: {ultimaActualizacion.toLocaleTimeString()}</span>
            )}
            <button 
              className="btn btn-sm btn-outline-secondary ms-2" 
              onClick={cargarDatos}
              disabled={cargando}
            >
              {cargando ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </div>

        {cargando ? <p>Cargando…</p> : (
          <>
            {/* KPI cards */}
            <div className="row g-3 mb-3">
              <div className="col-md-2">
                <Card className="p-3">
                  <div className="text-muted">Ingresos Netos Hoy</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    ${totalHoy.toFixed(2)}
                  </div>
                  <small className="text-muted">
                    {totalNotasHoy > 0 && `-${totalNotasHoy.toFixed(2)} devoluciones`}
                  </small>
                </Card>
              </div>
              <div className="col-md-2">
                <Card className="p-3">
                  <div className="text-muted">Ingresos Netos 7 días</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    ${totalSemana.toFixed(2)}
                  </div>
                  <small className="text-muted">
                    {totalNotasSemana > 0 && `-${totalNotasSemana.toFixed(2)} devoluciones`}
                  </small>
                </Card>
              </div>
              <div className="col-md-2">
                <Card className="p-3">
                  <div className="text-muted">Ingresos Netos Mes</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    ${totalMes.toFixed(2)}
                  </div>
                  <small className="text-muted">
                    {totalNotasMes > 0 && `-${totalNotasMes.toFixed(2)} devoluciones`}
                  </small>
                </Card>
              </div>
              <div className="col-md-2">
                <Card className="p-3 bg-danger text-white">
                  <div className="text-white-50">Devoluciones Hoy</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    ${totalNotasHoy.toFixed(2)}
                  </div>
                </Card>
              </div>
              <div className="col-md-2">
                <Card className="p-3 bg-warning text-white">
                  <div className="text-white-50">Devoluciones Mes</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    ${totalNotasMes.toFixed(2)}
                  </div>
                </Card>
              </div>
              <div className="col-md-2">
                <Card className="p-3 bg-primary text-white">
                  <div className="text-white-50">Total Histórico</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    ${totalAnual.toFixed(2)}
                  </div>
                  <small className="text-white-50">Todos los años</small>
                </Card>
              </div>
            </div>

            {/* Gráficos */}
            <div className="row g-3 mb-3">
              <div className="col-lg-4">
                <Card className="p-3">
                  <h5 className="mb-3">Top Productos Vendidos</h5>
                  {topProductos.length > 0 ? (
                    <>
                      <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                          <BarChart data={topProductos.map(p => ({ 
                            nombre: p.nombre.length > 15 ? p.nombre.substring(0, 15) + '...' : p.nombre, 
                            cantidad: p.cantidad 
                          }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="nombre" 
                              tick={{ fontSize: 10 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              tick={{ fontSize: 12 }}
                              domain={[0, 'dataMax']}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value} unidades`, 'Cantidad']}
                              labelFormatter={(label) => `Producto: ${label}`}
                            />
                            <Bar 
                              dataKey="cantidad" 
                              fill="#6f42c1" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 text-center">
                        <small className="text-muted">
                          Incluye descuentos por notas de crédito
                        </small>
                      </div>
                    </>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center" style={{ height: 320 }}>
                      <div className="text-center">
                        <div className="text-muted mb-2">📦</div>
                        <div className="text-muted">No hay productos vendidos</div>
                        <small className="text-muted">en el período seleccionado</small>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              <div className="col-lg-4">
                <Card className="p-3">
                  <h5 className="mb-3">Ingresos Netos últimos 7 días</h5>
                  {serie7d.some(d => d.total > 0) ? (
                    <>
                      <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                          <LineChart data={serie7d}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="fecha" 
                              tick={{ fontSize: 12 }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                            />
                            <YAxis 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => `$${value.toLocaleString()}`}
                              domain={[0, 'dataMax']}
                            />
                            <Tooltip 
                              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos Netos']}
                              labelFormatter={(label) => `Fecha: ${label}`}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="total" 
                              stroke="#28a745" 
                              strokeWidth={3}
                              dot={{ fill: '#28a745', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#28a745', strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 text-center">
                        <small className="text-muted">
                          Incluye descuentos por notas de crédito
                        </small>
                      </div>
                    </>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center" style={{ height: 320 }}>
                      <div className="text-center">
                        <div className="text-muted mb-2">📊</div>
                        <div className="text-muted">No hay datos de ventas</div>
                        <small className="text-muted">en los últimos 7 días</small>
                      </div>
                    </div>
                  )}
                </Card>
              </div>

              <div className="col-lg-4">
                <Card className="p-3">
                  <h5 className="mb-3">Ingresos Netos por Año</h5>
                  {ingresosPorAno.length > 0 ? (
                    <>
                      <div style={{ width: '100%', height: 320 }}>
                        <ResponsiveContainer>
                          <BarChart data={ingresosPorAno}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="año" 
                              tick={{ fontSize: 12 }}
                            />
                            <YAxis 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => `$${value.toLocaleString()}`}
                              domain={[0, 'dataMax']}
                            />
                            <Tooltip 
                              formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Ingresos Netos']}
                              labelFormatter={(label) => `Año: ${label}`}
                            />
                            <Bar 
                              dataKey="total" 
                              fill="#17a2b8" 
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-2 text-center">
                        <small className="text-muted">
                          Incluye descuentos por notas de crédito
                        </small>
                      </div>
                    </>
                  ) : (
                    <div className="d-flex align-items-center justify-content-center" style={{ height: 320 }}>
                      <div className="text-center">
                        <div className="text-muted mb-2">📊</div>
                        <div className="text-muted">No hay datos de ventas</div>
                        <small className="text-muted">por año</small>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* Tablas de apoyo */}
            <div className="row g-3">
              <div className="col-lg-2">
                <Card className="p-3">
                  <h5>Top Productos</h5>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th className="text-end">Unidades</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topProductos.length > 0 ? topProductos.map((p, index) => (
                          <tr key={p.id}>
                            <td>
                              <div className="d-flex align-items-center">
                                <span className="badge bg-primary me-2">{index + 1}</span>
                                <small>{p.nombre}</small>
                              </div>
                            </td>
                            <td className="text-end">
                              <strong>{p.cantidad}</strong>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan="2" className="text-center">Sin datos</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </div>
              <div className="col-lg-2">
                <Card className="p-3">
                  <h5>Stock bajo (≤ 5)</h5>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th className="text-end">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStock.length ? lowStock.map(p => (
                          <tr key={p.id}>
                            <td>{p.nombre}</td>
                            <td className="text-end">{Number(p.cantidad || 0)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="2" className="text-center">Sin alertas</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </div>
              <div className="col-lg-2">
                <Card className="p-3">
                  <h5>Ingresos Cuenta Corriente</h5>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th className="text-end">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(ventas || [])
                          .filter(v => v && v.cliente && v.cliente.includes('Cuenta Corriente'))
                          .slice(0, 3)
                          .map(v => (
                            <tr key={v.id || Math.random()}>
                              <td>{v.cliente?.replace('Cuenta Corriente - ', '') || 'Pago CC'}</td>
                              <td className="text-end text-success">${Number(v.total || 0).toFixed(2)}</td>
                            </tr>
                          ))
                        }
                        {(ventas || []).filter(v => v && v.cliente && v.cliente.includes('Cuenta Corriente')).length === 0 && (
                          <tr><td colSpan="2" className="text-center">Sin pagos CC</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </div>
              <div className="col-lg-3">
                <Card className="p-3">
                  <h5>Notas de Crédito Recientes</h5>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Cliente</th>
                          <th className="text-end">Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(notasCredito || [])
                          .slice(0, 5)
                          .map(nota => (
                            <tr key={nota.id}>
                              <td>{nota.cliente}</td>
                              <td className="text-end text-danger">${Number(nota.total || 0).toFixed(2)}</td>
                            </tr>
                          ))
                        }
                        {(notasCredito || []).length === 0 && (
                          <tr><td colSpan="2" className="text-center">Sin notas de crédito</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </div>
              <div className="col-lg-3">
                <Card className="p-3">
                  <h5>Ingresos por año</h5>
                  <div className="table-responsive">
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Año</th>
                          <th className="text-end">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingresosPorAno.length ? ingresosPorAno.map(item => (
                          <tr key={item.año}>
                            <td>{item.año}</td>
                            <td className="text-end text-success">${item.total.toFixed(2)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan="2" className="text-center">Sin datos</td></tr>
                        )}
                      </tbody>
                    </Table>
                  </div>
                </Card>
              </div>
            </div>

            {/* Tabla detallada de ingresos mensuales */}
            <div className="row g-3 mt-3">
              <div className="col-12">
                <Card className="p-3">
                  <h5>Ingresos mensuales (últimos 12 meses)</h5>
                  <div className="table-responsive">
                    <Table striped bordered hover>
                      <thead>
                        <tr>
                          <th>Mes/Año</th>
                          <th className="text-end">Ingresos</th>
                          <th className="text-end">% del total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ingresosPorMes.length ? ingresosPorMes.map(item => (
                          <tr key={`${item.año}-${item.mes}`}>
                            <td>{item.mesNombre}</td>
                            <td className="text-end text-success">${item.total.toFixed(2)}</td>
                            <td className="text-end">
                              {totalAnual > 0 ? ((item.total / totalAnual) * 100).toFixed(1) : '0.0'}%
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan="3" className="text-center">Sin datos</td></tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="table-primary">
                          <th>Total Histórico</th>
                          <th className="text-end">${totalAnual.toFixed(2)}</th>
                          <th className="text-end">100%</th>
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </Card>
    </Container>
  );
}
