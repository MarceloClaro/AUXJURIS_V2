import React from 'react';
import { UserIcon } from './icons';

// Interface para representar um agente legal
export interface LegalAgent {
  id: string;
  name: string;
  description: string;
}

interface AgentSelectorProps {
  agents: LegalAgent[];
  currentAgentId: string;
  onAgentChange: (agentId: string) => void;
}

export const AgentSelector: React.FC<AgentSelectorProps> = ({
  agents,
  currentAgentId,
  onAgentChange,
}) => {
  if (!agents || agents.length === 0) {
    return <p className="text-sm text-gray-400">Nenhum agente jurídico disponível.</p>;
  }

  return (
    <div className="w-full mb-4">
      <label htmlFor="agent-selector" className="block text-sm font-medium text-sky-300 mb-1 flex items-center">
        <UserIcon className="h-4 w-4 mr-1" />
        Especialista Jurídico
      </label>
      <select
        id="agent-selector"
        value={currentAgentId}
        onChange={(e) => onAgentChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
      >
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-400">
        {agents.find(agent => agent.id === currentAgentId)?.description || ''}
      </p>
    </div>
  );
};
