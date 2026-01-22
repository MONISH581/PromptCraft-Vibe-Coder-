
import React, { useState, useEffect } from 'react';
import { ProjectResponse, AppStatus, ActiveTab } from './types';
import { generateFullStackApp } from './services/geminiService';
import { puterAuth, puterDB, SavedProjectMetadata, PuterUser } from './services/puter';
import { TerminalIcon, CpuIcon, SendIcon, LoaderIcon, UserIcon, LogOutIcon, FolderIcon, FileIcon, PlusIcon } from './components/Icons';
import FileExplorer from './components/FileExplorer';
import CodeViewer from './components/CodeViewer';
import ProjectHeader from './components/ProjectHeader';
import PreviewPane from './components/PreviewPane';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { Toast } from './components/Toast';

const App: React.FC = () => {
  // Auth & Data State
  const [user, setUser] = useState<PuterUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [history, setHistory] = useState<SavedProjectMetadata[]>([]);

  // App State
  const [view, setView] = useState<'home' | 'project'>('home');
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [project, setProject] = useState<ProjectResponse | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);

  // Initial Auth Check
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const u = await puterAuth.getUser();
      if (u.is_logged_in) {
        setUser(u);
        loadHistory(u.id);
      }
    } catch (e) {
      console.error("Auth check failed", e);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadHistory = async (userId: string) => {
    try {
      const projects = await puterDB.getProjects(userId);
      setHistory(projects);
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const handleLogin = async () => {
    try {
      const u = await puterAuth.signIn();
      setUser(u);
      loadHistory(u.id);
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleLogout = async () => {
    await puterAuth.signOut();
    setUser(null);
    setHistory([]);
    setView('home');
    setProject(null);
    setProject(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
        setToast({ message: "Image attached successfully", type: "success" });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim() || status === AppStatus.GENERATING) return;

    setStatus(AppStatus.GENERATING);
    setError(null);

    try {
      let finalPrompt = prompt;
      let currentHistory = project?.metadata.promptHistory || [];

      // If we are iterating on an existing project, append context
      if (project && view === 'project') {
        const iterationContext = `
        BASE PROJECT CONTEXT:
        Name: ${project.metadata.name}
        Summary: ${project.metadata.summary}
        Architecture: ${project.metadata.architecture}
        
        EXISTING FILES MAP (path): ${project.files.map(f => f.path).join(', ')}

        The user wants to ITERATE on this EXACT project. Do NOT regenerate a random new one.
        Maintain file structure. Apply the following changes:
        `;
        finalPrompt = `${iterationContext}\n\nUSER REQUEST FOR ITERATION: ${prompt}`;
      } else {
        // New project
        currentHistory = [];
      }

      const result = await generateFullStackApp(finalPrompt, attachedImage || undefined);

      // Merge history
      result.metadata.promptHistory = [...currentHistory, prompt];

      // Save if user is logged in
      if (user) {
        try {
          const savedMeta = await puterDB.saveProject(result, user.id);
          setHistory(prev => [savedMeta, ...prev]);
          setToast({ message: "Project saved to your dashboard", type: 'success' });
        } catch (saveErr) {
          console.error("Failed to save project", saveErr);
          setToast({ message: "Failed to auto-save project", type: 'error' });
        }
      }

      setProject(result);
      if (result.files.length > 0) {
        // Try to keep same selected file if it exists, else default
        const currentPath = selectedFilePath;
        const mainFile = result.files.find(f => f.path.includes('App.tsx') || f.path.includes('server.js')) || result.files[0];

        if (result.files.find(f => f.path === currentPath)) {
          // Keep current selection
          setSelectedFilePath(currentPath); // Explicitly set to ensure re-render if needed
        } else {
          setSelectedFilePath(mainFile.path);
        }
      }
      setStatus(AppStatus.COMPLETED);
      setActiveTab('preview');
      setView('project');

      // Clear input and attachments after successful generation
      setPrompt('');
      setAttachedImage(null);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
      setStatus(AppStatus.ERROR);
    }
  };

  const loadProject = async (projectId: string) => {
    setStatus(AppStatus.GENERATING);
    try {
      const loadedProj = await puterDB.getProject(projectId);
      if (loadedProj) {
        setProject(loadedProj);
        if (loadedProj.files.length > 0) {
          const mainFile = loadedProj.files.find((f: any) => f.path.includes('App.tsx') || f.path.includes('server.js')) || loadedProj.files[0];
          setSelectedFilePath(mainFile.path);
        }
        setStatus(AppStatus.COMPLETED);
        setActiveTab('preview');
        setView('project');
      }
    } catch (e) {
      console.error("Failed to load project", e);
      setError("Failed to load project.");
      setStatus(AppStatus.IDLE);
    }
  };

  const handleDownload = async () => {
    if (!project) return;
    const zip = new JSZip();
    const projectName = project.metadata.name.toLowerCase().replace(/\s+/g, '-');

    project.files.forEach(file => {
      const path = file.path.startsWith('/') || file.path.startsWith('\\') ? file.path.slice(1) : file.path;
      zip.file(path, file.content);
    });

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${projectName}.zip`);
    } catch (error) {
      console.error('Failed to generate zip:', error);
      setError("Failed to download project files.");
    }
  };

  // --- RENDER HELPERS ---

  if (authLoading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center text-blue-500">
        <LoaderIcon className="w-10 h-10" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-100 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent opacity-50"></div>
        <div className="z-10 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/20 mx-auto mb-8">
            <CpuIcon className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Prompt Craft <span className="text-blue-500">AI</span></h1>
          <p className="text-gray-400 mb-8">Login to access your personalized Prompt Craft dashboard and save your projects.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-white text-gray-950 font-bold py-4 rounded-xl hover:bg-gray-100 transition shadow-xl flex items-center justify-center gap-3"
          >
            <UserIcon className="w-5 h-5" />
            Sign In with Puter.com
          </button>
        </div>
      </div>
    );
  }

  const selectedFile = project?.files.find(f => f.path === selectedFilePath) || null;

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden font-sans">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Navigation */}
      <nav className="h-16 border-b border-gray-800 bg-gray-950 flex items-center px-6 shrink-0 z-20 justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
            <CpuIcon className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Prompt Craft <span className="text-blue-500">AI</span></h1>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Elite Code Generation Engine</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <span>{user.username}</span>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-red-400 transition">
            <LogOutIcon className="w-5 h-5" />
          </button>
        </div>
      </nav>

      <main className="flex-1 flex min-h-0 relative">

        {/* --- VIEW: HOME --- */}
        {view === 'home' && (
          <div className="flex-1 overflow-y-auto">
            <div className="min-h-full flex flex-col items-center p-6 pt-20">
              <div className="max-w-3xl w-full text-center mb-16">
                <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
                  Craft Your Next <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Production-Ready</span> App.
                </h2>
                <p className="text-gray-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
                  Simply describe your product idea. Our engine generates complete system designs,
                  database schemas, and high-fidelity source code.
                </p>

                <form onSubmit={handleGenerate} className="relative group mb-8">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl blur opacity-25 group-focus-within:opacity-50 transition duration-1000"></div>
                  <div className="relative flex items-center bg-gray-900 p-2 rounded-2xl border border-gray-800 shadow-2xl">
                    <TerminalIcon className="ml-4 text-gray-500 w-5 h-5" />
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="E.g., A real-time crypto trading dashboard with portfolio tracking..."
                      className="flex-1 bg-transparent border-none outline-none py-4 px-4 text-lg text-white placeholder:text-gray-600"
                    />
                    <div className="flex items-center gap-2">
                      {/* File Attachment Button (Home) */}
                      <input
                        type="file"
                        id="file-upload-home"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept="image/*"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('file-upload-home')?.click()}
                        className={`p-2 rounded-lg hover:bg-gray-800 transition ${attachedImage ? 'text-blue-500' : 'text-gray-500'}`}
                        title={attachedImage ? "Image attached" : "Attach image"}
                      >
                        <PlusIcon className="w-6 h-6" />
                      </button>

                      <button
                        type="submit"
                        disabled={status === AppStatus.GENERATING}
                        className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center gap-2 shadow-lg"
                      >
                        {status === AppStatus.GENERATING ? <LoaderIcon className="w-5 h-5" /> : <SendIcon className="w-5 h-5" />}
                        <span>Generate</span>
                      </button>
                    </div>
                  </div>
                  {attachedImage && <div className="text-xs text-blue-400 mt-2 text-right">Image attached</div>}
                </form>
                {error && <div className="text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-500/20">{error}</div>}
              </div>

              {/* History Section - Always Visible */}
              <div className="max-w-4xl w-full mt-12 border-t border-gray-800 pt-12">
                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                  <FolderIcon className="w-4 h-4" /> Your Projects
                </h3>

                {history.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {history.map((proj) => (
                      <div key={proj.id} onClick={() => loadProject(proj.id)} className="bg-gray-900/50 hover:bg-gray-900 border border-gray-800 hover:border-blue-500/50 p-6 rounded-xl cursor-pointer transition group">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-gray-200 group-hover:text-blue-400 transition">{proj.name}</h4>
                          <span className="text-xs text-gray-600 font-mono">{new Date(proj.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2 mb-4">{proj.summary}</p>
                        <div className="flex gap-2">
                          {proj.techStack.slice(0, 3).map((tech, i) => (
                            <span key={i} className="text-[10px] bg-gray-800 px-2 py-1 rounded-md text-gray-400">{tech}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-900/30 rounded-2xl border border-gray-800 border-dashed">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-600">
                      <FolderIcon className="w-6 h-6" />
                    </div>
                    <p className="text-gray-400 font-medium">No projects yet</p>
                    <p className="text-sm text-gray-600 mt-1">Generate your first application to save it here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW: PROJECT --- */}
        {view === 'project' && (
          <div className="flex-1 flex min-h-0">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-0 border-r border-gray-800">
              {status === AppStatus.GENERATING ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 bg-gray-950">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <CpuIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-blue-500 animate-pulse" />
                  </div>
                  <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold">Initializing Prompt Craft Engine...</h2>
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-1.5 w-64 bg-gray-900 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }}></div>
                      </div>
                      <p className="text-gray-500 text-sm animate-pulse">Generating full-stack implementation & preview...</p>
                    </div>
                  </div>
                  <style>{`
                      @keyframes loading {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(200%); }
                      }
                    `}</style>
                </div>
              ) : project ? (
                <>
                  <ProjectHeader
                    metadata={project.metadata}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    onDownload={handleDownload}
                  />
                  <div className="flex-1 flex min-h-0 overflow-hidden relative">
                    {/* ... (Existing Tabs: Summary, Architecture, Preview, Code) ... */}
                    {/* I need to inline the Tab content here or re-use components. Since I don't want to break existing components I will try to inline logic for simplicity of refactor */}
                    {activeTab === 'summary' && (
                      <div className="flex-1 overflow-y-auto p-12 bg-gray-950">
                        <div className="max-w-4xl mx-auto space-y-12">
                          <section>
                            <h3 className="text-blue-500 font-bold text-xs uppercase tracking-widest mb-4">The Solution</h3>
                            <p className="text-2xl text-gray-200 leading-relaxed font-light">{project.metadata.summary}</p>
                          </section>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <section>
                              <h3 className="text-blue-500 font-bold text-xs uppercase tracking-widest mb-6">User Roles</h3>
                              <ul className="space-y-4">
                                {project.metadata.roles.map((role, i) => (
                                  <li key={i} className="flex items-start gap-4">
                                    <div className="w-8 h-8 bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center shrink-0 font-mono text-blue-400 text-xs">{i + 1}</div>
                                    <span className="text-gray-300 mt-1">{role}</span>
                                  </li>
                                ))}
                              </ul>
                            </section>
                            <section>
                              <h3 className="text-blue-500 font-bold text-xs uppercase tracking-widest mb-6">Tech Stack</h3>
                              <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-2xl space-y-6">
                                <div>
                                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Frontend</p>
                                  <p className="text-gray-300">{project.metadata.techStack.frontend.join(', ')}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Backend</p>
                                  <p className="text-gray-300">{project.metadata.techStack.backend.join(', ')}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">Database</p>
                                  <p className="text-gray-300">{project.metadata.techStack.database.join(', ')}</p>
                                </div>
                              </div>
                            </section>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab === 'architecture' && (
                      <div className="flex-1 overflow-y-auto p-12 bg-gray-950">
                        <div className="max-w-4xl mx-auto">
                          <h3 className="text-blue-500 font-bold text-xs uppercase tracking-widest mb-8">System Design & Architecture</h3>
                          <div className="prose prose-invert prose-blue max-w-none">
                            <pre className="whitespace-pre-wrap font-sans text-lg text-gray-300 leading-relaxed bg-gray-900/30 p-8 rounded-3xl border border-gray-800">
                              {project.metadata.architecture}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}
                    {activeTab === 'preview' && <PreviewPane files={project.files} />}
                    {activeTab === 'code' && (
                      <>
                        <div className="w-80 shrink-0 border-r border-gray-800">
                          <FileExplorer files={project.files} selectedPath={selectedFilePath} onSelectFile={setSelectedFilePath} />
                        </div>
                        <CodeViewer file={selectedFile} />
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Right Sidebar: Iterative Prompt */}
            <div className="w-80 bg-gray-950 border-l border-gray-800 flex flex-col shrink-0">
              <div className="p-4 border-b border-gray-800 font-bold text-sm text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <TerminalIcon className="w-4 h-4" /> Prompt Refinement
              </div>
              <div className="flex-1 p-4 overflow-y-auto">
                {/* PROMPT HISTORY RENDER */}
                {project && project.metadata.promptHistory && project.metadata.promptHistory.length > 0 ? (
                  project.metadata.promptHistory.map((hist, idx) => (
                    <div key={idx} className={`mb-4 p-3 rounded-lg border ${idx === 0 ? 'bg-blue-900/20 border-blue-800' : 'bg-gray-900/50 border-gray-800'}`}>
                      <p className="text-xs text-gray-500 mb-1 font-bold">
                        {idx === 0 ? "INITIAL REQUEST" : `REFINEMENT #${idx}`}
                      </p>
                      <p className="text-sm text-gray-300">{hist}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm mt-10 italic">
                    No history available.
                  </div>
                )}

                {error && <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded mb-4">{error}</div>}
              </div>
              <div className="p-4 border-t border-gray-800 bg-gray-900/30">
                <form onSubmit={handleGenerate}>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg p-3 text-sm text-gray-200 focus:border-blue-500 outline-none resize-none h-32 mb-3"
                    placeholder="Describe changes or new features..."
                  />
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="file"
                      id="file-upload-project"
                      className="hidden"
                      onChange={handleFileUpload}
                      accept="image/*"
                    />
                    <button
                      type="button"
                      onClick={() => document.getElementById('file-upload-project')?.click()}
                      className={`p-2 rounded-lg hover:bg-gray-800 transition ${attachedImage ? 'text-blue-500' : 'text-gray-500'}`}
                      title={attachedImage ? "Image attached" : "Attach image"}
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                    {attachedImage && <span className="text-xs text-blue-400">Image attached</span>}
                  </div>

                  <button
                    type="submit"
                    disabled={status === AppStatus.GENERATING}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                  >
                    {status === AppStatus.GENERATING ? <LoaderIcon className="w-4 h-4" /> : <SendIcon className="w-4 h-4" />}
                    Update Project
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
