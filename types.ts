
export interface ProjectFile {
  path: string;
  content: string;
  description?: string;
}

export interface ProjectMetadata {
  name: string;
  summary: string;
  architecture: string;
  roles: string[];
  techStack: {
    frontend: string[];
    backend: string[];
    database: string[];
  };
  promptHistory?: string[];
}

export interface ProjectResponse {
  metadata: ProjectMetadata;
  files: ProjectFile[];
}

export enum AppStatus {
  IDLE = 'IDLE',
  PLANNING = 'PLANNING',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export type ActiveTab = 'code' | 'architecture' | 'summary' | 'preview';
