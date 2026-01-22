
import React from 'react';
import { ProjectMetadata, ActiveTab } from '../types';
import { DownloadIcon } from './Icons';

interface ProjectHeaderProps {
  metadata: ProjectMetadata;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onDownload: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ metadata, activeTab, setActiveTab, onDownload }) => {
  return (
    <div className="bg-gray-900 border-b border-gray-800 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{metadata.name}</h1>
          <p className="text-gray-400 text-sm max-w-2xl">{metadata.summary}</p>
        </div>

        <div className="flex bg-gray-800 p-1 rounded-lg items-center gap-2">
          <div className="flex bg-gray-700/50 p-0.5 rounded-lg mr-2">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-4 py-1.5 rounded-md text-sm transition-all ${activeTab === 'summary' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-4 py-1.5 rounded-md text-sm transition-all ${activeTab === 'architecture' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Design
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-1.5 rounded-md text-sm transition-all ${activeTab === 'preview' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-4 py-1.5 rounded-md text-sm transition-all ${activeTab === 'code' ? 'bg-gray-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
            >
              Source
            </button>
          </div>
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold transition-all shadow-lg shadow-blue-900/20"
          >
            <DownloadIcon className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        {metadata.techStack.frontend.map(t => (
          <span key={t} className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">{t}</span>
        ))}
        {metadata.techStack.backend.map(t => (
          <span key={t} className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20">{t}</span>
        ))}
        {metadata.techStack.database.map(t => (
          <span key={t} className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">{t}</span>
        ))}
      </div>
    </div>
  );
};

export default ProjectHeader;
