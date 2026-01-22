
import React from 'react';
import { ProjectFile } from '../types';

interface PreviewPaneProps {
  files: ProjectFile[];
}

const PreviewPane: React.FC<PreviewPaneProps> = ({ files }) => {
  const previewFile = files.find(f => f.path === 'preview.html' || f.path === '/preview.html' || f.path === 'index.html');

  if (!previewFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-950 p-12 text-center">
        <div className="w-16 h-16 bg-gray-900 rounded-2xl flex items-center justify-center mb-6 text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </div>
        <h4 className="text-xl font-bold text-gray-300">No Preview Available</h4>
        <p className="mt-2 text-sm max-w-sm">The engine didn't generate a standalone preview file for this project architecture. Check the Source Code tab for implementation details.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      <div className="flex items-center px-4 h-10 bg-gray-100 border-b border-gray-200">
        <div className="flex gap-1.5 mr-4">
          <div className="w-3 h-3 rounded-full bg-red-400"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
          <div className="w-3 h-3 rounded-full bg-green-400"></div>
        </div>
        <div className="flex-1 max-w-md bg-white border border-gray-300 rounded px-3 py-0.5 text-[10px] text-gray-500 font-mono truncate">
          http://localhost:3000/preview
        </div>
      </div>
      <iframe 
        title="Project Preview"
        srcDoc={previewFile.content}
        className="w-full h-full border-none"
        sandbox="allow-scripts allow-forms"
      />
    </div>
  );
};

export default PreviewPane;
