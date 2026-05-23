import { blink } from '../blink/client'

export interface ScriptAnalysis {
  genre: string
  structure: string
  predictedQuality: number
  intelligentScore: number
  weaknesses: {
    category: string
    description: string
    severity: number
  }[]
  recommendations: {
    issue: string
    recommendation: string
  }[]
  emotionalCurve: {
    timestamp: number
    sentiment: number
  }[]
}

const ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    genre: { type: 'string' },
    structure: { type: 'string', enum: ['Linear', 'Nonlinear', 'Circular', 'In Media Res', 'Episodic'] },
    predictedQuality: { type: 'number', minimum: 0, maximum: 100 },
    intelligentScore: { type: 'number', minimum: 0, maximum: 100 },
    weaknesses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          category: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'number', minimum: 1, maximum: 100 }
        },
        required: ['category', 'description', 'severity']
      }
    },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          issue: { type: 'string' },
          recommendation: { type: 'string' }
        },
        required: ['issue', 'recommendation']
      }
    },
    emotionalCurve: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          timestamp: { type: 'number' },
          sentiment: { type: 'number', minimum: -1, maximum: 1 }
        },
        required: ['timestamp', 'sentiment']
      }
    }
  },
  required: ['genre', 'structure', 'predictedQuality', 'intelligentScore', 'weaknesses', 'recommendations', 'emotionalCurve']
}

export async function analyzeScript(content: string): Promise<ScriptAnalysis> {
  const { object } = await blink.ai.generateObject({
    model: 'google/gemini-1.5-flash',
    prompt: `You are an expert cinematic Script Doctor and ML analysis engine. 
    Analyze the following movie script content and provide a detailed structured analysis.
    
    Script Content:
    ${content.slice(0, 15000)} // Increased to 15k characters for more depth
    
    Tasks:
    1. Identify the primary Genre.
    2. Detect the Story Structure.
    3. Predict the Script Quality (0-100) based on professional standards.
    4. Calculate an Intelligent Score (0-100) considering market potential.
    5. Detect specific Weaknesses (Weak dialogue, Pacing drops, Character depth, etc.).
    6. Generate Expert Script Doctor Recommendations.
    7. Generate an Emotional Sentiment Curve (at least 10 data points across the script).`,
    schema: ANALYSIS_SCHEMA as any
  })

  if (!object) {
    throw new Error('AI failed to generate a valid analysis object.')
  }

  return object as ScriptAnalysis
}
