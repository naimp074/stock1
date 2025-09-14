// Test directo de conexión a Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cdvvxvkoxsbyyprflmhd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkdnZ4dmtveHNieXlwcmZsbWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2MzY5NTcsImV4cCI6MjA3MzIxMjk1N30.iqqhXbPWkIXi89XAhRaA2jBTrV1n';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Probando conexión directa...');

// Probar productos
supabase
  .from('productos')
  .select('*')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.log('❌ Error en productos:', error.message);
    } else {
      console.log('✅ Productos OK:', data?.length || 0, 'registros');
    }
  });

// Probar cuentas corrientes
supabase
  .from('cuentas_corrientes')
  .select('*')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.log('❌ Error en cuentas:', error.message);
    } else {
      console.log('✅ Cuentas OK:', data?.length || 0, 'registros');
    }
  });
