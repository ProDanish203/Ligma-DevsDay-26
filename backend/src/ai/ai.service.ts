import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NodeIntent } from '@db';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateText, LanguageModel, Output } from 'ai';
import { ZodType } from 'zod';
import { IntentClassificationSchema } from './schema';
import { INTENT_CLASSIFICATION_SYSTEM_PROMPT } from './prompts/intent-classification.prompt';

@Injectable()
export class AiService {
    private logger = new Logger(AiService.name);
    private readonly model: LanguageModel;

    constructor(private readonly configService: ConfigService) {
        const rawApiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (!rawApiKey) {
            throw new Error('GEMINI_API_KEY is not set in the environment variables');
        }
        // Remove any invisible/non-ASCII characters (like zero-width space \u2060) 
        // that could cause "TypeError: Cannot convert argument to a ByteString" in Undici headers.
        const GEMINI_API_KEY = rawApiKey.replace(/[^\x20-\x7E]/g, '');

        const geminiModels = createGoogleGenerativeAI({
            apiKey: GEMINI_API_KEY,
        })
        this.model = geminiModels('gemini-2.0-flash-lite')
    }

    async generateStructuredData<T>(
        prompt: string,
        schema: ZodType<T>,
        schemaName: string,
        systemPrompt?: string,
    ): Promise<T> {
        try {
            const response = await generateText({
                model: this.model,
                prompt,
                output: Output.object({ schema, name: schemaName }),
                system: systemPrompt,
                maxRetries: 0,
            });
            return response.output;
        } catch (error) {
            console.error('Error generating structured data:', error);
            throw new InternalServerErrorException('Failed to generate structured data');
        }
    }

    async generateText(prompt: string): Promise<string> {
        try {
            const response = await generateText({
                model: this.model,
                prompt,
            });
            return response.text;
        } catch (error) {
            console.error('Error generating text:', error);
            throw new InternalServerErrorException('Failed to generate text');
        }
    }

    async classifyIntent(text: string): Promise<{ intent: NodeIntent; title?: string; description?: string | null }> {
        if (!text?.trim()) return { intent: NodeIntent.UNCLASSIFIED };

        const result = await this.generateStructuredData<{
            intent: NodeIntent;
            title?: string;
            description?: string | null;
            confidence: number;
        }>(
            `Classify the intent of this sticky note text: "${text}"`,
            IntentClassificationSchema,
            'IntentClassification',
            INTENT_CLASSIFICATION_SYSTEM_PROMPT,
        );

        if (result.confidence < 0.5) return { intent: NodeIntent.UNCLASSIFIED };

        return {
            intent: result.intent,
            title: result.title,
            description: result.description,
        };
    }

}