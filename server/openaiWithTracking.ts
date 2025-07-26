import OpenAI from "openai";
import { storage } from "./storage";

// Centralized OpenAI client with comprehensive token usage tracking
class TrackedOpenAI {
  private client: OpenAI;
  
  constructor() {
    this.client = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  }

  // Track all chat completion calls
  async chatCompletions(params: any, options: { 
    userId?: number; 
    operation: string; 
    description?: string;
  }) {
    const startTime = Date.now();
    let success = false;
    let tokensUsed = 0;
    let cost = 0;
    let errorMessage = '';

    try {
      console.log(`🔍 OpenAI API Call: ${options.operation} - ${options.description || 'No description'}`);
      
      const response = await this.client.chat.completions.create(params);
      
      // Calculate tokens and cost
      tokensUsed = response.usage?.total_tokens || 0;
      cost = this.calculateCost(params.model, response.usage);
      success = true;

      console.log(`✅ OpenAI Success: ${tokensUsed} tokens, $${cost.toFixed(4)} cost`);

      // Log usage to database
      if (options.userId) {
        await this.logUsage({
          userId: options.userId,
          operation: options.operation,
          description: options.description,
          tokensUsed,
          cost,
          model: params.model,
          success: true
        });
      }

      return response;

    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ OpenAI Failed: ${options.operation} - ${errorMessage}`);

      // Log failed attempt
      if (options.userId) {
        await this.logUsage({
          userId: options.userId,
          operation: options.operation,
          description: options.description,
          tokensUsed: 0,
          cost: 0,
          model: params.model,
          success: false,
          errorMessage
        });
      }

      throw error;
    }
  }

  // Raw fetch method for Vision API (maintains existing functionality)
  async visionApiCall(payload: any, options: {
    userId?: number;
    operation: string;
    description?: string;
    imageSize?: number;
  }) {
    const startTime = Date.now();
    let success = false;
    let tokensUsed = 0;
    let cost = 0;
    let errorMessage = '';

    try {
      console.log(`🖼️ OpenAI Vision API Call: ${options.operation} - ${options.description || 'Image processing'}`);
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      // Calculate tokens and cost
      tokensUsed = data.usage?.total_tokens || 0;
      cost = this.calculateCost(payload.model, data.usage);
      success = true;

      console.log(`✅ Vision API Success: ${tokensUsed} tokens, $${cost.toFixed(4)} cost`);

      // Log usage to database
      if (options.userId) {
        await this.logUsage({
          userId: options.userId,
          operation: options.operation,
          description: options.description,
          tokensUsed,
          cost,
          model: payload.model,
          success: true,
          imageSize: options.imageSize
        });
      }

      return data;

    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Vision API Failed: ${options.operation} - ${errorMessage}`);

      // Log failed attempt
      if (options.userId) {
        await this.logUsage({
          userId: options.userId,
          operation: options.operation,
          description: options.description,
          tokensUsed: 0,
          cost: 0,
          model: payload.model,
          success: false,
          errorMessage,
          imageSize: options.imageSize
        });
      }

      throw error;
    }
  }

  // Calculate cost based on model and usage
  private calculateCost(model: string, usage: any): number {
    if (!usage) return 0;

    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    
    // GPT-4o pricing (as of 2024)
    if (model.includes('gpt-4o')) {
      const inputCost = inputTokens * 0.000005;  // $0.005 per 1K input tokens
      const outputCost = outputTokens * 0.000015; // $0.015 per 1K output tokens
      return inputCost + outputCost;
    }
    
    // GPT-4 pricing
    if (model.includes('gpt-4')) {
      const inputCost = inputTokens * 0.00003;   // $0.03 per 1K input tokens
      const outputCost = outputTokens * 0.00006; // $0.06 per 1K output tokens
      return inputCost + outputCost;
    }
    
    // GPT-3.5 pricing
    if (model.includes('gpt-3.5')) {
      const inputCost = inputTokens * 0.0000015;  // $0.0015 per 1K input tokens
      const outputCost = outputTokens * 0.000002; // $0.002 per 1K output tokens
      return inputCost + outputCost;
    }
    
    // Default estimation for unknown models
    return (inputTokens + outputTokens) * 0.00001;
  }

  // Log usage to database
  private async logUsage(data: {
    userId: number;
    operation: string;
    description?: string;
    tokensUsed: number;
    cost: number;
    model: string;
    success: boolean;
    errorMessage?: string;
    imageSize?: number;
  }) {
    try {
      await storage.logTokenUsage({
        userId: data.userId,
        operation: data.operation,
        tokensUsed: data.tokensUsed,
        cost: data.cost,
        model: data.model,
        success: data.success,
        errorMessage: data.errorMessage,
        imageSize: data.imageSize
      });
      
      console.log(`📊 Usage logged: ${data.operation} - ${data.tokensUsed} tokens, $${data.cost.toFixed(4)}`);
    } catch (error) {
      console.error('Failed to log token usage:', error);
    }
  }

  // Get direct client for advanced usage (discouraged - use tracked methods instead)
  get directClient() {
    console.warn('⚠️ Using direct OpenAI client - usage will NOT be tracked!');
    return this.client;
  }
}

// Export singleton instance
export const trackedOpenAI = new TrackedOpenAI();
export default trackedOpenAI;