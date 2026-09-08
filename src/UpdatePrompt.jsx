import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div style={{ padding: '12px', backgroundColor: 'var(--vivid-cyan)', color: 'var(--dark-magenta)', textAlign: 'center', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
      <span>New update available!</span>
      <button 
        onClick={() => updateServiceWorker(true)} 
        style={{ padding: '6px 15px', borderRadius: '20px', border: 'none', backgroundColor: 'var(--dark-magenta)', color: 'var(--white)', cursor: 'pointer', fontWeight: 'bold' }}
      >
        Refresh App
      </button>
    </div>
  );
}