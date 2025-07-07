import React, { useEffect, useState } from 'react';

interface QdrantStatus {
  status: string;
  version: any;
  collections: any;
  collectionInfo: any;
}

interface QdrantDocument {
  id: string;
  payload: any;
}

const QdrantDashboard: React.FC = () => {
  const [status, setStatus] = useState<QdrantStatus | null>(null);
  const [backendStatus, setBackendStatus] = useState<string>('Carregando...');
  const [documents, setDocuments] = useState<QdrantDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Novos: buscas e uploads recentes (mock)
  const [recentSearches, setRecentSearches] = useState<string[]>(['Art. 5º CF', 'Prazos recursais', 'Resumo do processo 098309']);
  const [recentUploads, setRecentUploads] = useState<string[]>(['Processo 098309_2025_11.txt', 'CDC 2013', 'CLT 7ed']);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Função para filtrar documentos
  const filteredDocuments = documents.filter(doc => {
    const payload = doc.payload || {};
    const matchesSearch = searchTerm === '' || JSON.stringify(payload).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === '' || (payload.type && payload.type === filterType);
    const matchesFolder = filterFolder === '' || (payload.folder && payload.folder === filterFolder);
    const matchesDate = filterDate === '' || (payload.date && payload.date.startsWith(filterDate));
    return matchesSearch && matchesType && matchesFolder && matchesDate;
  });

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/qdrant/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      setError('Erro ao buscar status do Qdrant');
    } finally {
      setLoading(false);
    }
  };

  const fetchBackendStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) setBackendStatus('Online');
      else setBackendStatus('Offline');
    } catch {
      setBackendStatus('Offline');
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/qdrant/documents');
      const data = await res.json();
      setDocuments(data.points || []);
    } catch (err) {
      setError('Erro ao buscar documentos');
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchBackendStatus();
    fetchDocuments();
  }, []);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Painel de Controle AUXJURIS</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Status do Sistema</h2>
          <ul>
            <li>Backend: <span className={backendStatus === 'Online' ? 'text-green-600' : 'text-red-600'}>{backendStatus}</span></li>
            <li>Qdrant: <span className={status ? 'text-green-600' : 'text-red-600'}>{status ? 'Online' : 'Offline'}</span></li>
            <li>Versão Qdrant: {status?.version?.version || '-'}</li>
            <li>Documentos indexados: {documents.length}</li>
          </ul>
        </div>
        <div className="bg-white rounded shadow p-4 flex flex-col gap-2">
          <h2 className="font-semibold mb-2">Atalhos Rápidos</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700" onClick={() => window.location.hash = '#upload'}>Upload de Documento</button>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700" onClick={() => window.location.hash = '#busca'}>Nova Busca Jurídica</button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700" onClick={() => window.location.hash = '#minuta'}>Gerar Minuta/Petição</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Buscas Recentes</h2>
          <ul className="list-disc ml-6">
            {recentSearches.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div className="bg-white rounded shadow p-4">
          <h2 className="font-semibold mb-2">Uploads Recentes</h2>
          <ul className="list-disc ml-6">
            {recentUploads.map((u, i) => <li key={i}>{u}</li>)}
          </ul>
        </div>
      </div>
      <div className="bg-white rounded shadow p-4 mt-8">
        <h2 className="font-semibold mb-2">Documentos Indexados</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <input type="text" placeholder="Buscar palavra/artigo..." title="Buscar palavra ou artigo" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="border px-2 py-1 rounded" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border px-2 py-1 rounded" title="Filtrar por tipo de documento">
            <option value="">Tipo</option>
            <option value="lei">Lei</option>
            <option value="processo">Processo</option>
            <option value="doutrina">Doutrina</option>
          </select>
          <input type="text" placeholder="Pasta" title="Filtrar por pasta" value={filterFolder} onChange={e => setFilterFolder(e.target.value)} className="border px-2 py-1 rounded" />
          <input type="date" title="Filtrar por data" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="border px-2 py-1 rounded" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left">ID</th>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Pasta</th>
                <th className="px-3 py-2 text-left">Data</th>
                <th className="px-3 py-2 text-left">Payload</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-400 py-4">Nenhum documento encontrado.</td></tr>
              ) : (
                filteredDocuments.map(doc => {
                  const payload = doc.payload || {};
                  return (
                    <tr key={doc.id} className="border-b">
                      <td className="px-3 py-2 text-xs break-all max-w-[120px]">{doc.id}</td>
                      <td className="px-3 py-2 text-xs">{payload.type || '-'}</td>
                      <td className="px-3 py-2 text-xs">{payload.folder || '-'}</td>
                      <td className="px-3 py-2 text-xs">{payload.date || '-'}</td>
                      <td className="px-3 py-2 text-xs break-all max-w-[300px]">{JSON.stringify(payload).slice(0, 120)}...</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {error && <div className="mt-4 text-red-600">{error}</div>}
    </div>
  );
};

export default QdrantDashboard; 