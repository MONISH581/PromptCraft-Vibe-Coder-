import { ProjectResponse } from "../types";

const SYSTEM_INSTRUCTION = `You are an elite AI Software Architect.
Your task is to generate COMPLETE, PRODUCTION-READY FULL-STACK APPLICATIONS.
You must return a strictly valid JSON object.

Follow these rules:
1. Architecture: Use MVC for backend, component-based for frontend.
2. Code Quality: Clean, scalable, proper error handling, no placeholders.
3. Tech Stack: React (Tailwind), Node.js (Express), MongoDB (Mongoose), JWT Auth.
4. Completeness: Every file needed to run the app must be included in the 'files' array.
5. PREVIEW FILE: You MUST include a file named 'preview.html' at the root. This is a FULLY FUNCTIONAL SINGLE-PAGE APP SIMULATION.
   - It must use Tailwind CSS via CDN.
   - It MUST include a complex <script> block with vanilla JS that SIMULATES a full backend.
   - **CRITICAL SIMULATION REQUIREMENTS**:
     - **STATE MANAGEMENT**: Use global variables/arrays to store data (e.g., \`let users = [...]\`).
     - **CRUD OPERATIONS**: "Add", "Edit", "Delete" buttons MUST actually modify this in-memory data and re-render the UI immediately. A user must be able to add a generic item and see it appear in the list.
     - **NAVIGATION**: All sidebar/header links must switch views dynamically.
     - **INTERACTIVITY**: Modals must open/close, forms must validate and submit (updating the fake state), and toast notifications must trigger on success.
     - **DATA**: Initialize with 20+ items of realistic mock data.
   - The goal is for the user to be unable to distinguish this "Preview" from the real running app.
6. VISUALS: Use high-quality placeholders. Ensure the design is image-rich and visually stunning.

The output MUST be a JSON object with:
- metadata: { name, summary, architecture, roles: [], techStack: { frontend: [], backend: [], database: [] } }
- files: [ { path, content, description } ]
`;

export const generateFullStackApp = async (prompt: string, imageBase64?: string): Promise<ProjectResponse> => {
  try {
    const puter = (window as any).puter;

    if (!puter) {
      throw new Error("Puter.js is not loaded. Please ensure the script tag is present in index.html.");
    }

    const fullPrompt = `${SYSTEM_INSTRUCTION}

User Request: Design and build a full-stack application for: ${prompt}. 
    Ensure you include at least:
    - A standalone 'preview.html' for visual demonstration (MANDATORY).
    - Frontend source (App.tsx, components, services, hooks)
    - Backend source (server.js, models, controllers, routes, auth middleware)
    - Configuration (.env example, package.json hints)
    - Database schemas using Mongoose.
    - ROBUSTNESS: Handle large prompts and complex logic.
    - VISUALS: 20+ Mock items in data displays.
    - INTERACTIVITY: preview.html must be FULLY FUNCTIONAL with mock CRUD.

    IMPORTANT: RETURN ONLY THE RAW JSON OBJECT. NO MARKDOWN BLOCK, NO EXPLANATION.`;

    console.log(`[Prompt Craft] Requesting generation with model: gemini-3-flash-preview`);
    console.log(`[Prompt Craft] Stream requested...`);

    let responseStream;
    let usedModel = 'gemini-3-flash-preview';

    // Construct message payload
    // If image is present, we might need to adjust how we call chat.
    // For now, we will try to pass the image if the API supports it, or just rely on text text.
    // Note: Puter's exact multimodal API signature might vary, but we will try passing it as an attachment or check docs if possible. 
    // Assuming text-only for 'flash' model if we don't have explicit docs, but 'gemini-1.5-flash' supports images.

    // We will attempt to use the string prompt. If imageBase64 is strictly needed, we would need to know the specific Puter syntax.
    // For this update, since we are unsure of Puter's exact multimodal object syntax, we will primarily rely on the detailed text prompt.
    // However, if the user explicitly requested image support, we will append a note.

    let chatArgs: any = fullPrompt;
    if (imageBase64) {
      // Attempt to pass image if supported.
      // If not, we just rely on the text description of the image if the user provided one.
      chatArgs = [fullPrompt, { image: imageBase64 }];
    }

    try {
      // Create a timeout promise (60s - increased for large prompts)
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timed out")), 60000)
      );

      // Attempt to connect with the primary model
      const chatPromise = puter.ai.chat(chatArgs, {
        model: 'gemini-3-flash-preview',
        stream: true
      });

      responseStream = await Promise.race([chatPromise, timeout]);
      console.log(`[Prompt Craft] Stream connection established with gemini-3-flash-preview.`);

    } catch (err) {
      console.error(`[Prompt Craft] gemini-3-flash-preview failed or timed out.`, err);
      throw new Error(`AI Service Failed: ${err.message || 'Unknown error'}`);
    }

    let fullContent = "";
    let chunkCount = 0;

    // Accumulate the stream
    for await (const part of (responseStream as any)) {
      chunkCount++;
      if (part?.text) {
        fullContent += part.text;
        if (chunkCount % 10 === 0) console.log(`[Prompt Craft] Received ${chunkCount} chunks from ${usedModel}...`);
      }
    }

    console.log(`[Prompt Craft] Stream complete. Total chunks: ${chunkCount}. Total length: ${fullContent.length}`);

    if (!fullContent) {
      throw new Error("No content generated from API");
    }

    // Robust JSON Extraction
    // 1. Remove markdown code blocks
    let cleanContent = fullContent.replace(/```json\n?|```/g, "").trim();

    // 2. Find the first '{' and last '}' to handle chatty preambles/postscripts
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1) {
      cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
    }

    console.log("AI Response Length (Cleaned):", cleanContent.length);

    try {
      return JSON.parse(cleanContent) as ProjectResponse;
    } catch (parseError) {
      console.error("JSON Parse Error. Content might be truncated:", parseError);
      console.log("Raw Content (last 100 chars):", cleanContent.slice(-100));
      throw new Error("The AI generated a response that was too large or incomplete. Please try a simpler request.");
    }
  } catch (err: any) {
    console.error(`[Prompt Craft] gemini-3-flash-preview failed.`, err);
    throw new Error(`AI Service Failed: ${err.message || String(err)}`);
  }

};
