import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Form, Button, Card, Container, Alert } from 'react-bootstrap';

export default function Login() {
  const { usuario, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  if (usuario) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      await login(email, password);
      nav('/', { replace: true });
    } catch (e) {
      setErr(e?.message || 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container className="py-5" style={{ maxWidth: 420 }}>
      <Card className="p-4 shadow-sm">
        <h3 className="mb-3">Iniciar sesión</h3>
        {err && <Alert variant="danger">{err}</Alert>}
        <Form onSubmit={onSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Contraseña</Form.Label>
            <Form.Control type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </Form.Group>
          <Button type="submit" disabled={loading}>{loading ? 'Ingresando…' : 'Ingresar'}</Button>
        </Form>
        <div className="mt-3 text-muted" style={{fontSize:12}}>
          Probá con tu usuario de Supabase (p. ej. <code>naim@test.com</code>)
        </div>
      </Card>
    </Container>
  );
}
