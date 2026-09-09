import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import App from './App';
import './App.css'; 

export default function AuthGate() {
  const [session, setSession] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');

    // Remove spaces and make lowercase, then append our dummy domain
    const formattedEmail = `${username.trim().toLowerCase().replace(/\s+/g, '')}@akwarts.com`;

    if (isSignUp) {
      // 1. Validate the Invite Code (with trim and debugging)
      const cleanCode = inviteCode.trim();
      
      const { data, error: codeErr } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', cleanCode)
        .eq('is_used', false)
        .single();
        
      if (codeErr) console.error("Supabase Error:", codeErr); // This will tell us the exact issue in the browser console

      if (codeErr || !data) return setError('Invalid or used invite code.');

      // 2. Create the Account using the formatted email
      const { error: signUpErr } = await supabase.auth.signUp({ email: formattedEmail, password });
      if (signUpErr) return setError(signUpErr.message);

      // 3. Burn the Code
      await supabase.from('invite_codes').update({ is_used: true }).eq('id', data.id);
    } else {
      // Log In using the formatted email
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email: formattedEmail, password });
      if (signInErr) return setError('Invalid username or password.');
    }
  };

  // If a session exists, open the gate to the main app!
  if (session) return <App />; 

  return (
    <div className="app-container" style={{ justifyContent: 'center', padding: '20px' }}>
      <div className="form-card">
        <h2 style={{ color: 'var(--dark-magenta)' }}>{isSignUp ? 'Create Account' : 'Welcome Back'}</h2>
        <form onSubmit={handleAuth}>
          {/* Replace the old email input with this: */}
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={e => setUsername(e.target.value)} 
            className="input-field" 
            required 
          />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="input-field" required />
          
          {isSignUp && (
            <input type="text" placeholder="Invite Code" value={inviteCode} onChange={e => setInviteCode(e.target.value)} className="input-field" required />
          )}
          
          {error && <p style={{ color: 'var(--vivid-crimson)', marginBottom: '15px', textAlign: 'center', fontWeight: 'bold' }}>{error}</p>}
          
          <button type="submit" className="submit-button" style={{ backgroundColor: 'var(--vivid-cyan)', color: 'var(--dark-magenta)' }}>
            {isSignUp ? 'Sign Up' : 'Log In'}
          </button>
        </form>
        
        <button 
          onClick={() => { setIsSignUp(!isSignUp); setError(''); }} 
          style={{ background: 'none', border: 'none', color: '#888', width: '100%', marginTop: '15px', cursor: 'pointer', fontWeight: '600' }}
        >
          {isSignUp ? 'Already have an account? Log In' : 'Have an invite code? Sign Up'}
        </button>
      </div>
    </div>
  );
}