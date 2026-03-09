import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  // Default: check Ollama (backwards compatible)
  return checkOllama();
}

export async function POST(request: NextRequest) {
  const { provider, apiKey, ollamaUrl, ollamaModel } = await request.json();

  switch (provider) {
    case "groq":
      return checkGroq(apiKey);
    case "cerebras":
      return checkCerebras(apiKey);
    case "ollama":
    default:
      return checkOllama(ollamaUrl, ollamaModel);
  }
}

async function checkOllama(
  ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434",
  ollamaModel = process.env.OLLAMA_MODEL || "llama3.2"
) {
  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return NextResponse.json({
        status: "disconnected",
        provider: "ollama",
        model: null,
      });
    }

    const data = await response.json();
    const models = data.models || [];
    const hasModel = models.some(
      (m: { name: string }) =>
        m.name === ollamaModel || m.name.startsWith(`${ollamaModel}:`)
    );

    return NextResponse.json({
      status: "connected",
      provider: "ollama",
      model: hasModel ? ollamaModel : null,
      availableModels: models.map((m: { name: string }) => m.name),
      // Backwards compatibility
      ollama: true,
    });
  } catch {
    return NextResponse.json({
      status: "disconnected",
      provider: "ollama",
      model: null,
      ollama: false,
    });
  }
}

async function checkGroq(apiKey?: string) {
  if (!apiKey) {
    return NextResponse.json({
      status: "no_key",
      provider: "groq",
      model: null,
    });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({
        status: "invalid_key",
        provider: "groq",
        model: null,
      });
    }

    return NextResponse.json({
      status: "connected",
      provider: "groq",
      model: "llama-3.3-70b-versatile",
    });
  } catch {
    return NextResponse.json({
      status: "error",
      provider: "groq",
      model: null,
    });
  }
}

async function checkCerebras(apiKey?: string) {
  if (!apiKey) {
    return NextResponse.json({
      status: "no_key",
      provider: "cerebras",
      model: null,
    });
  }

  try {
    const response = await fetch("https://api.cerebras.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json({
        status: "invalid_key",
        provider: "cerebras",
        model: null,
      });
    }

    return NextResponse.json({
      status: "connected",
      provider: "cerebras",
      model: "llama3.1-8b",
    });
  } catch {
    return NextResponse.json({
      status: "error",
      provider: "cerebras",
      model: null,
    });
  }
}
