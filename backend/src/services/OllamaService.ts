import axios from 'axios';
import { createLogger } from 'winston';
import { ISMControl, NISTControl } from '../models/Control';

export interface ControlMapping {
  nistControlId: string;
  confidence: number;
  reasoning: string;
}

export interface MappingAnalysisResult {
  mappings: ControlMapping[];
  processingTime: number;
  model: string;
  timestamp: Date;
}

const logger = createLogger({
  level: 'info',
  format: require('winston').format.json(),
  transports: [
    new (require('winston').transports.Console)()
  ]
});

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

export class OllamaService {
  private config: Required<OllamaConfig>;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor(config: OllamaConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:11434',
      model: config.model || 'llama3.1',
      timeout: config.timeout || 180000 // Increased to 3 minutes for 8B model
    };

    logger.info(`Ollama service initialized with model: ${this.config.model}`);
  }

  /**
   * Analyze an ISM control and find NIST mappings using Ollama
   */
  async analyzeControlMapping(
    ismControl: ISMControl,
    nistControls: NISTControl[]
  ): Promise<MappingAnalysisResult> {
    const startTime = Date.now();

    try {
      const prompt = this.buildMappingPrompt(ismControl, nistControls);

      logger.info(`Analyzing mapping for ISM control: ${ismControl.id} using Ollama`);

      const response = await axios.post(`${this.config.baseUrl}/api/generate`, {
        model: this.config.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
          num_predict: 500,
          num_ctx: 2048
        }
      }, {
        timeout: this.config.timeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const processingTime = Date.now() - startTime;
      this.requestCount++;

      if (!response.data || !response.data.response) {
        throw new Error('No response from Ollama');
      }

      const mappings = this.parseResponse(response.data.response);

      logger.info(`Successfully analyzed ${ismControl.id} with Ollama, found ${mappings.length} mappings`);

      return {
        mappings,
        processingTime,
        model: this.config.model,
        timestamp: new Date()
      };

    } catch (error) {
      logger.error(`Failed to analyze control mapping for ${ismControl.id} with Ollama:`, error);
      throw new Error(`Ollama analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch analyze multiple ISM controls (sequential for reliability)
   */
  async batchAnalyzeControls(
    ismControls: ISMControl[],
    nistControls: NISTControl[],
    onProgress?: (completed: number, total: number, latestResult?: [string, MappingAnalysisResult]) => void
  ): Promise<Map<string, MappingAnalysisResult>> {
    const results = new Map<string, MappingAnalysisResult>();
    const total = ismControls.length;
    const concurrency = 1; // Process 1 control at a time for reliability
    let completed = 0;

    logger.info(`Starting sequential batch analysis of ${total} ISM controls with Ollama (concurrency: ${concurrency})`);
    logger.info(`DEBUG: Processing ${total} controls in batches of ${concurrency}`);

    // Process controls in batches of 'concurrency' size
    for (let i = 0; i < ismControls.length; i += concurrency) {
      const batch = ismControls.slice(i, i + concurrency);
      logger.info(`DEBUG: Processing batch ${Math.floor(i / concurrency) + 1}, batch size: ${batch.length}, control IDs: ${batch.map(c => c.id).join(', ')}`);

      // Process this batch in parallel
      const batchPromises = batch.map(async (control) => {
        try {
          const result = await this.analyzeControlMapping(control, nistControls);
          return { control, result, success: true };
        } catch (error) {
          logger.error(`Failed to analyze control ${control.id}:`, error);
          return { control, error, success: false };
        }
      });

      // Wait for all controls in this batch to complete
      const batchResults = await Promise.all(batchPromises);

      // Process results and update progress individually
      for (const batchResult of batchResults) {
        completed++;

        if (batchResult.success && batchResult.result) {
          results.set(batchResult.control.id, batchResult.result);

          // Call progress callback for each individual result
          if (onProgress) {
            onProgress(completed, total, [batchResult.control.id, batchResult.result]);
          }

          logger.info(`Completed ${completed}/${total} controls - ${batchResult.control.id}`);

          // Small delay between individual progress updates to prevent race conditions
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          // Still update progress even on failure
          if (onProgress) {
            onProgress(completed, total);
          }

          logger.warn(`Failed ${completed}/${total} controls - ${batchResult.control.id}`);
        }
      }

      // Small delay between batches to prevent overwhelming Ollama
      if (i + concurrency < ismControls.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    logger.info(`Sequential batch analysis completed. Successfully processed ${results.size}/${total} controls`);
    return results;
  }

  /**
   * Prioritize NIST controls that are more likely to be relevant to the ISM control
   */
  private prioritizeRelevantControls(nistControls: NISTControl[], ismControl: ISMControl): NISTControl[] {
    // Define keyword mappings for better control prioritization
    const keywordMappings: { [key: string]: string[] } = {
      'access': ['AC', 'IA'],
      'authentication': ['IA', 'AC'],
      'authorization': ['AC', 'IA'],
      'audit': ['AU', 'SI'],
      'logging': ['AU', 'SI'],
      'monitoring': ['AU', 'SI', 'IR'],
      'incident': ['IR', 'AU'],
      'backup': ['CP', 'SC'],
      'recovery': ['CP', 'IR'],
      'encryption': ['SC', 'MP'],
      'cryptographic': ['SC', 'MP'],
      'network': ['SC', 'AC'],
      'firewall': ['SC', 'AC'],
      'personnel': ['PS', 'AT'],
      'training': ['AT', 'PS'],
      'awareness': ['AT', 'PS'],
      'physical': ['PE', 'MP'],
      'media': ['MP', 'PE'],
      'configuration': ['CM', 'SI'],
      'vulnerability': ['SI', 'RA'],
      'assessment': ['CA', 'RA'],
      'risk': ['RA', 'PM'],
      'planning': ['PL', 'PM'],
      'policy': ['PL', 'PM'],
      'procedure': ['PL', 'PM']
    };

    // Extract keywords from ISM control
    const controlText = `${ismControl.title} ${ismControl.description} ${ismControl.implementationGuidance}`.toLowerCase();
    const relevantFamilies = new Set<string>();

    // Find relevant control families based on keywords
    for (const [keyword, families] of Object.entries(keywordMappings)) {
      if (controlText.includes(keyword)) {
        families.forEach(family => relevantFamilies.add(family));
      }
    }

    // Sort controls: relevant families first, then alphabetically
    return nistControls.sort((a, b) => {
      const aFamily = a.id.split('-')[0];
      const bFamily = b.id.split('-')[0];

      const aRelevant = relevantFamilies.has(aFamily);
      const bRelevant = relevantFamilies.has(bFamily);

      if (aRelevant && !bRelevant) return -1;
      if (!aRelevant && bRelevant) return 1;

      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Build the mapping analysis prompt for Ollama
   */
  public buildMappingPrompt(ismControl: ISMControl, nistControls: NISTControl[]): string {
    // Create a condensed list of NIST controls for context, prioritizing relevant families
    const relevantControls = this.prioritizeRelevantControls(nistControls, ismControl);
    const nistControlSummary = relevantControls
      .slice(0, 15) // Reduced for faster processing
      .map(control => `${control.id}: ${control.title}`)
      .join('\n');

    return `You are a world-class cybersecurity compliance expert with 20+ years of experience specializing in government security frameworks. You are a recognized authority on both the Australian Information Security Manual (ISM) and NIST 800-53, having implemented both frameworks in real-world government and enterprise environments.

EXPERT CONTEXT:
- ISM: Developed by Australian Cyber Security Centre (ACSC) for Australian government agencies
- NIST 800-53: US federal standard widely adopted globally
- You understand the nuanced differences between Australian and US regulatory contexts
- You have deep knowledge of how these controls translate to actual security implementations
- You think like a senior compliance auditor who must justify mappings to regulators

ANALYSIS FRAMEWORK:
When mapping ISM to NIST controls, consider:
1. FUNCTIONAL EQUIVALENCE: Do they achieve the same security outcome?
2. IMPLEMENTATION SIMILARITY: Are the technical/procedural requirements comparable?
3. SCOPE ALIGNMENT: Do they protect the same assets against similar threats?
4. COMPLIANCE INTENT: Would they satisfy similar audit requirements?
5. RISK MITIGATION: Do they address equivalent risk scenarios?
6. ORGANIZATIONAL IMPACT: Do they require similar capabilities and resources?

ISM Control to Analyze:
ID: ${ismControl.id}
Title: ${ismControl.title}
Description: ${ismControl.description}
Implementation Guidance: ${ismControl.implementationGuidance}
Control Family: ${ismControl.controlFamily}
Risk Level: ${ismControl.riskLevel}

Available NIST 800-53 Controls (sample):
${nistControlSummary}

EXPERT CONFIDENCE SCORING:
- 95-100: Functionally identical - could substitute in compliance audit
- 85-94: Strong alignment - minor language/emphasis differences
- 75-84: Good mapping - same intent, some implementation variations
- 65-74: Reasonable correlation - related objectives, notable gaps
- 55-64: Weak relationship - some overlap, significant differences
- Below 55: Poor mapping - different objectives or scope

CRITICAL: Consider Australian government context vs US federal context. Account for differences in:
- Classification systems (PROTECTED/SECRET vs Low/Moderate/High impact)
- Regulatory environment (Australian Privacy Act vs US regulations)
- Threat landscape (Australian-specific threats vs US-focused)
- Implementation culture (Australian government practices vs US federal)

Provide up to 3 most relevant NIST 800-53 control mappings with expert-level analysis:

Respond in JSON format:
{
  "mappings": [
    {
      "nistControlId": "AC-1",
      "confidence": 85,
      "reasoning": "Expert analysis: Both controls establish foundational access control governance. ISM focuses on [specific Australian context], while NIST AC-1 emphasizes [US federal approach]. Key alignment: [specific similarities]. Notable differences: [specific gaps]. Compliance perspective: [audit considerations]."
    }
  ]
}

If no appropriate mappings exist, return empty mappings array with reasoning explaining why from a compliance expert perspective.`;
  }

  /**
   * Parse the Ollama response
   */
  private parseResponse(content: string): ControlMapping[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.mappings || !Array.isArray(parsed.mappings)) {
        throw new Error('Invalid response format: missing mappings array');
      }

      return parsed.mappings.map((mapping: any) => {
        if (!mapping.nistControlId || typeof mapping.confidence !== 'number' || !mapping.reasoning) {
          throw new Error('Invalid mapping format: missing required fields');
        }

        return {
          nistControlId: this.normalizeNistControlId(mapping.nistControlId),
          confidence: Math.max(0, Math.min(100, mapping.confidence)),
          reasoning: mapping.reasoning
        };
      });
    } catch (error) {
      logger.error('Failed to parse Ollama response:', error);
      logger.debug('Raw response:', content);

      // Fallback: create a basic mapping if parsing fails
      return [{
        nistControlId: this.normalizeNistControlId('AC-1'),
        confidence: 50,
        reasoning: 'Automated mapping failed - manual review required. Raw response parsing error.'
      }];
    }
  }

  /**
   * Test the Ollama connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.config.baseUrl}/api/tags`, {
        timeout: 5000
      });

      // Check if our model is available
      const models = response.data.models || [];
      const modelAvailable = models.some((model: any) =>
        model.name.includes(this.config.model)
      );

      if (!modelAvailable) {
        logger.warn(`Model ${this.config.model} not found. Available models:`,
          models.map((m: any) => m.name));
      }

      return true;
    } catch (error) {
      logger.error('Ollama connection test failed:', error);
      return false;
    }
  }

  /**
   * Normalize NIST control IDs to consistent uppercase format
   */
  private normalizeNistControlId(controlId: string): string {
    // Convert to uppercase and ensure proper format (e.g., "ac-1" -> "AC-1")
    return controlId.toUpperCase().trim();
  }

  /**
   * Get service statistics
   */
  getStats(): { requestCount: number; model: string; baseUrl: string } {
    return {
      requestCount: this.requestCount,
      model: this.config.model,
      baseUrl: this.config.baseUrl
    };
  }
}