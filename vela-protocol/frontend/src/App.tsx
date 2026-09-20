import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { useStore } from './store/useStore';

const PasskeyLogin = lazy(() => import('./components/PasskeyLogin').then(module => ({ default: module.PasskeyLogin })));
const ScoreDisplay = lazy(() => import('./components/ScoreDisplay').then(module => ({ default: module.ScoreDisplay })));
const ProofGenerator = lazy(() => import('./components/ProofGenerator').then(module => ({ default: module.ProofGenerator })));
const BlendPosition = lazy(() => import('./components/BlendPosition').then(module => ({ default: module.BlendPosition })));
const AnchorTransfer = lazy(() => import('./components/AnchorTransfer').then(module => ({ default: module.AnchorTransfer })));
const TransparencyPanel = lazy(() => import('./components/TransparencyPanel').then(module => ({ default: module.TransparencyPanel })));
const EvidencePanel = lazy(() => import('./components/EvidencePanel').then(module => ({ default: module.EvidencePanel })));

const RouteLoading = () => (
  <div className="glass-panel mx-auto max-w-xl p-8 text-center" role="status" aria-live="polite">
    <p className="font-semibold">Opening this step…</p>
    <p className="mt-1 text-sm text-gray-500">Loading only the code needed for this screen.</p>
  </div>
);

function App() {
  const {
    setStep, isAuthenticated, score, proofGenerated, position, guidedDemo, anchorTransactions,
  } = useStore();
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

  const authenticated = (screen: ReactNode) => isAuthenticated ? screen : <Navigate to="/" replace />;
  const afterScore = (screen: ReactNode) => authenticated(score !== null ? screen : <Navigate to="/score" replace />);
  const afterCommitment = (screen: ReactNode) => afterScore(proofGenerated ? screen : <Navigate to="/proof" replace />);
  const afterSupply = (screen: ReactNode) => afterCommitment(
    position || guidedDemo ? screen : <Navigate to="/position" replace />,
  );
  const canOpenReceipt = guidedDemo || !!position || anchorTransactions.length > 0;

  return (
    <Layout>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<PasskeyLogin />} />
          <Route path="/evidence" element={<EvidencePanel />} />
          <Route path="/score" element={authenticated(<ScoreDisplay />)} />
          <Route path="/proof" element={afterScore(<ProofGenerator />)} />
          <Route path="/position" element={afterCommitment(<BlendPosition />)} />
          <Route path="/anchor" element={afterSupply(<AnchorTransfer />)} />
          <Route path="/transparency" element={afterCommitment(canOpenReceipt ? <TransparencyPanel /> : <Navigate to="/anchor" replace />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
