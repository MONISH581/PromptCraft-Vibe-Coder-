
import React, { useState } from 'react';
import { ProjectFile } from '../types';
import { FolderIcon, FileIcon } from './Icons';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedPath: string;
  onSelectFile: (path: string) => void;
}

interface TreeItem {
  name: string;
  path: string;
  children: Record<string, TreeItem>;
  isFile: boolean;
}

const buildTree = (files: ProjectFile[]): TreeItem => {
  const root: TreeItem = { name: 'root', path: '', children: {}, isFile: false };
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    
    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      const currentPath = parts.slice(0, index + 1).join('/');
      
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: currentPath,
          children: {},
          isFile: isLast
        };
      }
      current = current.children[part];
    });
  });
  
  return root;
};

const TreeView: React.FC<{ 
  item: TreeItem; 
  level: number; 
  selectedPath: string; 
  onSelect: (path: string) => void 
}> = ({ item, level, selectedPath, onSelect }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = selectedPath === item.path;
  const hasChildren = Object.keys(item.children).length > 0;

  const handleClick = () => {
    if (item.isFile) {
      onSelect(item.path);
    } else {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div>
      <div 
        onClick={handleClick}
        className={`flex items-center gap-2 py-1.5 px-3 cursor-pointer transition-colors duration-150 rounded-md
          ${isSelected ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-gray-800 text-gray-400'}`}
        style={{ paddingLeft: `${level * 16}px` }}
      >
        {item.isFile ? (
          <FileIcon className="w-4 h-4" />
        ) : (
          <FolderIcon className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
        )}
        <span className="text-sm font-medium truncate">{item.name}</span>
      </div>
      
      {isOpen && hasChildren && (
        <div>
          {/* Fix: Added explicit TreeItem types to sort and map to fix 'unknown' type inference issues */}
          {Object.values(item.children)
            .sort((a: TreeItem, b: TreeItem) => (a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1))
            .map((child: TreeItem) => (
              <TreeView 
                key={child.path} 
                item={child} 
                level={level + 1} 
                selectedPath={selectedPath} 
                onSelect={onSelect} 
              />
            ))
          }
        </div>
      )}
    </div>
  );
};

const FileExplorer: React.FC<FileExplorerProps> = ({ files, selectedPath, onSelectFile }) => {
  const tree = buildTree(files);
  
  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Explorer</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {/* Fix: Added explicit TreeItem type annotation to resolve 'unknown' property access errors */}
        {Object.values(tree.children).map((child: TreeItem) => (
          <TreeView 
            key={child.path} 
            item={child} 
            level={1} 
            selectedPath={selectedPath} 
            onSelect={onSelectFile} 
          />
        ))}
      </div>
    </div>
  );
};

export default FileExplorer;
