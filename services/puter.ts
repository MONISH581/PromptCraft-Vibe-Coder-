
export interface PuterUser {
    id: string;
    username: string;
    is_logged_in: boolean;
}

export interface SavedProjectMetadata {
    id: string;
    name: string;
    summary: string;
    techStack: string[];
    createdAt: number;
}

const getPuter = () => {
    const puter = (window as any).puter;
    if (!puter) throw new Error("Puter.js not loaded");
    return puter;
};

export const puterAuth = {
    signIn: async () => {
        return await getPuter().auth.signIn();
    },
    signOut: async () => {
        return await getPuter().auth.signOut();
    },
    getUser: async (): Promise<PuterUser> => {
        return await getPuter().auth.getUser();
    },
    isSignedIn: async () => {
        return await getPuter().auth.isSignedIn();
    }
};

export const puterDB = {
    saveProject: async (project: any, userId: string) => {
        const projectId = crypto.randomUUID();
        const metadata: SavedProjectMetadata = {
            id: projectId,
            name: project.metadata.name,
            summary: project.metadata.summary,
            techStack: [
                ...project.metadata.techStack.frontend,
                ...project.metadata.techStack.backend
            ],
            createdAt: Date.now()
        };

        // Save full project
        await getPuter().kv.set(`project_${projectId}`, { ...project, id: projectId, createdAt: Date.now() });

        // Update user's project list
        const listKey = `projects_${userId}`;
        const existingList = (await getPuter().kv.get(listKey)) || [];
        await getPuter().kv.set(listKey, [metadata, ...existingList]);

        return metadata;
    },

    getProjects: async (userId: string): Promise<SavedProjectMetadata[]> => {
        return (await getPuter().kv.get(`projects_${userId}`)) || [];
    },

    getProject: async (projectId: string) => {
        return await getPuter().kv.get(`project_${projectId}`);
    }
};
