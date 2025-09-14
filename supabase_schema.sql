-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.cuentas_corrientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cliente text NOT NULL,
  saldo numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cuentas_corrientes_pkey PRIMARY KEY (id)
);
CREATE TABLE public.pagos_corrientes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cuenta_id uuid NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  nota text,
  user_id uuid NOT NULL,
  concepto text,
  tipo text NOT NULL DEFAULT 'cargo'::text CHECK (tipo = ANY (ARRAY['cargo'::text, 'pago'::text])),
  CONSTRAINT pagos_corrientes_pkey PRIMARY KEY (id),
  CONSTRAINT pagos_corrientes_cuenta_id_fkey FOREIGN KEY (cuenta_id) REFERENCES public.cuentas_corrientes(id)
);
CREATE TABLE public.productos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  sku text UNIQUE,
  precio numeric NOT NULL DEFAULT 0,
  stock integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  precio_costo numeric NOT NULL DEFAULT 0,
  precio_venta numeric NOT NULL DEFAULT 0,
  cantidad integer NOT NULL DEFAULT 0,
  proveedor text,
  telefono text,
  imagen text,
  CONSTRAINT productos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ventas (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  cliente text,
  total numeric NOT NULL DEFAULT 0,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT ventas_pkey PRIMARY KEY (id)
);