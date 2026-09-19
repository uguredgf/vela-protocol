import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { PasskeyLogin } from './components/PasskeyLogin';
import { ScoreDisplay } from './components/ScoreDisplay';
import { ProofGenerator } from './components/ProofGenerator';
import { BlendPosition } from './components/BlendPosition';
import { AnchorTransfer } from './components/AnchorTransfer';
import { TransparencyPanel } from './components/TransparencyPanel';
import { EvidencePanel } from './components/EvidencePanel';
import { useStore } from './store/useStore';

function App() {
  const { setStep, isAuthenticated } = useStore();
  const location = useLocation();

  useEffect(() => {
    switch (location.pathname) {
      case '/': setStep(0); break;
      case '/score': setStep(1); break;
      case '/proof': setStep(2); break;
      case '/position': setStep(3); break;
      case '/anchor': setStep(4); break;
      case '/transparency': setStep(5); break;
    }
  }, [location, setStep]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<PasskeyLogin />} />
        <Route path="/evidence" element={<EvidencePanel />} />
        <Route path="/score" element={isAuthenticated ? <ScoreDisplay /> : <Navigate to="/" replace />} />
        <Route path="/proof" element={isAuthenticated ? <ProofGenerator /> : <Navigate to="/" replace />} />
        <Route path="/position" element={isAuthenticated ? <BlendPosition /> : <Navigate to="/" replace />} />
        <Route path="/anchor" element={isAuthenticated ? <AnchorTransfer /> : <Navigate to="/" replace />} />
        <Route path="/transparency" element={isAuthenticated ? <TransparencyPanel /> : <Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
