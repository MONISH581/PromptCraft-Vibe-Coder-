
import React from 'react';
import { ProjectFile } from '../types';

interface CodeViewerProps {
  file: ProjectFile | null;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ file }) => {
  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-950">
        <div className="p-8 border border-dashed border-gray-800 rounded-2xl flex flex-col items-center text-center max-w-sm">
          <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mb-4 text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          </div>
          <h4 className="text-lg font-medium text-gray-300">No file selected</h4>
          <p className="mt-2 text-sm">Select a file from the explorer to view its implementation details.</p>
        </div>
      </div>
    );
  }

  const getLanguage = (path: string) => {
    if (path.endsWith('.tsx') || path.endsWith('.jsx')) return 'typescript';
    if (path.endsWith('.ts') || path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.json')) return 'json';
    return 'plaintext';
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0d1117] overflow-hidden">
      <div className="flex items-center px-4 h-12 bg-[#161b22] border-b border-gray-800">
        <span className="text-xs font-mono text-gray-400">{file.path}</span>
        {file.description && (
          <span className="ml-auto text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
            {file.description}
          </span>
        )}
      </div>
      <div className="flex-1 overflow-auto p-6 font-mono text-sm leading-relaxed">
        <pre className="text-gray-300">
          <code>{file.content}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeViewer;
