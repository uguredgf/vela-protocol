import React from 'react';
import { Sparkles } from 'lucide-react';

export const ProtocolCore: React.FC = () => (
  <div className="protocol-core" aria-hidden="true">
    <div className="protocol-core__ring protocol-core__ring--outer" />
    <div className="protocol-core__ring protocol-core__ring--inner" />
    <div className="protocol-core__orbit protocol-core__orbit--one"><span /></div>
    <div className="protocol-core__orbit protocol-core__orbit--two"><span /></div>
    <div className="protocol-core__center">
      <Sparkles size={16} />
      <strong>V</strong>
      <span className="protocol-core__glint" />
    </div>
  </div>
);
