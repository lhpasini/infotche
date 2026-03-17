'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fazerLogin } from '../actions/auth';

export default function LoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');

    const res = await fazerLogin(login, senha);
    
    if (res.sucesso) {
      router.push('/admin'); // Manda para o painel se a senha estiver certa
    } else {
      setErro(res.erro || 'Erro ao logar');
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', background: '#eef2f5', fontFamily: 'Segoe UI' }}>
      <div style={{ background: '#fff', padding: '40px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '350px', textAlign: 'center' }}>
        
        {/* Puxa a mesma logo que você já tem no sistema */}
        <img src="/logo-admin.png" alt="Logo" style={{ width: '80px', marginBottom: '20px' }} />
        <h2 style={{ color: '#2c3e50', marginBottom: '20px', fontSize: '18px', textTransform: 'uppercase', fontWeight: '900' }}>
          Acesso Restrito
        </h2>
        
        {erro && (
          <div style={{ background: '#e74c3c', color: '#fff', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '12px', fontWeight: 'bold' }}>
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="text" 
            placeholder="Usuário" 
            value={login} 
            onChange={e => setLogin(e.target.value)} 
            required 
            style={{ padding: '12px', border: '1px solid #dce3e8', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
          />
          <input 
            type="password" 
            placeholder="Senha" 
            value={senha} 
            onChange={e => setSenha(e.target.value)} 
            required 
            style={{ padding: '12px', border: '1px solid #dce3e8', borderRadius: '4px', fontSize: '14px', outline: 'none' }}
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ background: '#3498db', color: '#fff', border: 'none', padding: '12px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', transition: '0.2s', marginTop: '10px' }}
          >
            {loading ? 'Aguarde...' : 'ENTRAR'}
          </button>
        </form>
      </div>
    </div>
  );
}