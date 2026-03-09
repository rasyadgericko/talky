import { NextRequest, NextResponse } from "next/server";

// ─── System Prompts ────────────────────────────────────────────

const systemPrompts: Record<string, string> = {
  optimize: `You are a world-class prompt engineer. Your sole job is to take raw, dictated speech and rewrite it as a perfectly crafted prompt for an AI assistant (like ChatGPT or Claude).

Think step-by-step about what the speaker actually wants, then produce a prompt that would get the best possible response.

Rules:
- FIRST: Identify the speaker's core intent — what do they actually want the AI to do?
- Remove all filler words and speech artifacts (um, uh, like, you know, so, basically, I mean)
- Remove false starts, corrections, and repeated phrases from the speech
- If the intent is a question, make it precise and unambiguous
- If the intent is a task, break it into clear numbered steps or bullet points
- Add relevant context or constraints that were implied but not stated
- Use direct, imperative language ("Write...", "Create...", "Analyze...", "Explain...")
- If the speaker mentions a specific format (email, code, list, essay), specify it explicitly
- Keep the speaker's domain-specific terminology intact
- CRITICAL: Output ONLY the final prompt text — no titles, no labels, no "Here's the optimized prompt:", no quotation marks, no explanations`,

  refine: `You are a senior editor at a top publication. Take raw dictated speech and transform it into polished, publication-ready prose.

Rules:
- Fix all grammar, spelling, and punctuation errors
- Remove filler words, false starts, repetitions, and verbal tics
- Restructure sentences for clarity and flow — break run-on sentences, combine fragments
- Vary sentence length for natural rhythm (mix short punchy sentences with longer descriptive ones)
- Maintain the speaker's original voice, personality, and intent — don't make it sound generic
- Preserve technical terms, proper nouns, and domain-specific language exactly as spoken
- Organize into logical paragraphs if the text is long enough
- Use active voice where possible
- CRITICAL: Output ONLY the refined text — no titles, no labels, no "Here's the refined version:", no quotation marks, no commentary`,

  summarize: `You are an expert at distilling information. Take raw dictated speech and produce a clean, scannable summary.

Rules:
- Identify the 3-7 most important points, ideas, or action items
- Present each point as a concise bullet using "- " prefix
- Each bullet should be one clear sentence — no sub-bullets
- Preserve specific details: names, numbers, dates, deadlines, decisions
- Order bullets by importance or chronologically (whichever fits better)
- Remove all filler, tangents, repetition, and small talk
- If there are action items or decisions, put those first
- CRITICAL: Output ONLY the bullet points — no titles like "Summary:", no introductions, no closing remarks`,

  transform: `You are a precise text transformation engine. The user has highlighted text in an application and given you a spoken voice command describing how to change it. Execute the command exactly.

Rules:
- Apply the user's spoken instruction to the provided text faithfully
- The instruction may be informal or brief (e.g., "make it better", "fix this", "shorter") — interpret it sensibly:
  * "improve/better/enhance" → make it clearer, more professional, better structured
  * "shorter/concise/brief" → reduce length while keeping all key information
  * "longer/expand/elaborate" → add detail, examples, or explanations
  * "fix/correct" → fix grammar, spelling, punctuation, and factual errors
  * "formal/professional" → elevate the register and tone
  * "casual/friendly" → make it conversational and approachable
  * "translate to X" → translate to the specified language
  * "simplify" → use simpler words and shorter sentences
- Preserve the original formatting style (markdown, plain text, code, etc.)
- Preserve the original length roughly unless the instruction explicitly asks to change it
- Do NOT wrap the output in quotation marks or code blocks unless the original had them
- CRITICAL: Output ONLY the transformed text — no labels, no "Here's the result:", no explanations of what you changed`,
};

// ─── Provider Implementations ──────────────────────────────────

interface HistoryMessage {
  role: "user" | "assistant";
  content: string;
}

async function callOllama(
  systemPrompt: string,
  userMessage: string,
  ollamaUrl: string,
  ollamaModel: string,
  history: HistoryMessage[] = []
): Promise<string> {
  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: ollamaModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage },
      ],
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Ollama error:", errorText);
    throw new Error("Ollama request failed");
  }

  const data = await response.json();
  return data.message?.content || "";
}

async function callGroq(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  history: HistoryMessage[] = []
): Promise<string> {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as Record<string, Record<string, string>>)?.error?.message ||
      `Groq API error (${response.status})`;
    console.error("Groq error:", msg);
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callCerebras(
  systemPrompt: string,
  userMessage: string,
  apiKey: string,
  history: HistoryMessage[] = []
): Promise<string> {
  const response = await fetch(
    "https://api.cerebras.ai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama3.1-8b",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const msg =
      (errorData as Record<string, Record<string, string>>)?.error?.message ||
      `Cerebras API error (${response.status})`;
    console.error("Cerebras error:", msg);
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// ─── Route Handler ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const {
      text,
      mode,
      instruction,
      provider = "ollama",
      apiKey,
      ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434",
      ollamaModel = process.env.OLLAMA_MODEL || "llama3.2",
      history = [],
    } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Build the prompt
    let systemPrompt: string;
    let userMessage: string;

    if (mode === "transform" && instruction) {
      systemPrompt = systemPrompts.transform;
      userMessage = `Instruction: ${instruction}\n\nText to transform:\n${text}`;
    } else {
      systemPrompt = systemPrompts[mode] || systemPrompts.optimize;
      userMessage = text;
    }

    // Route to the chosen provider
    let result: string;

    switch (provider) {
      case "groq": {
        if (!apiKey) {
          return NextResponse.json(
            { error: "Groq API key is required. Add it in Settings." },
            { status: 400 }
          );
        }
        result = await callGroq(systemPrompt, userMessage, apiKey, history);
        break;
      }
      case "cerebras": {
        if (!apiKey) {
          return NextResponse.json(
            { error: "Cerebras API key is required. Add it in Settings." },
            { status: 400 }
          );
        }
        result = await callCerebras(systemPrompt, userMessage, apiKey, history);
        break;
      }
      case "ollama":
      default: {
        result = await callOllama(
          systemPrompt,
          userMessage,
          ollamaUrl,
          ollamaModel,
          history
        );
        break;
      }
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Optimization error:", error);

    // Ollama connection error
    if (
      error instanceof TypeError &&
      (error as NodeJS.ErrnoException).cause
    ) {
      return NextResponse.json(
        {
          error:
            "Cannot connect to Ollama. Make sure Ollama is running (open the Ollama app).",
        },
        { status: 503 }
      );
    }

    // Pass through provider-specific error messages
    if (error instanceof Error && error.message) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to optimize text. Please try again." },
      { status: 500 }
    );
  }
}
