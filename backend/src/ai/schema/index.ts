import { NodeIntent } from "@db";
import { z } from "zod";

export const IntentClassificationSchema = z.object({
    intent: z.enum([NodeIntent.ACTION_ITEM, NodeIntent.DECISION, NodeIntent.OPEN_QUESTION, NodeIntent.REFERENCE, NodeIntent.UNCLASSIFIED]).describe(`
        Please classify the intent of the following sticky note text into one of the following intents:
        - ACTION_ITEM: A task or action that needs to be done. Usually starts with a verb or implies someone needs to do something.
        - DECISION: A conclusion or choice that has been made. e.g. "We will use PostgreSQL", "Decided to drop mobile support for v1"
        - OPEN_QUESTION: An unresolved question or uncertainty. e.g. "Should we support SSO?", "What's the deadline?"
        - REFERENCE: A link, resource, or informational note with no action implied. e.g. "See Figma file", "Docs: notion.so/xyz"
        - UNCLASSIFIED: The text is too short, vague, or unclear to classify confidently.`),
    confidence: z.number().min(0).max(1).describe(`Confidence score between 0 and 1.`),
    title: z.string().describe(`A short, clean action-oriented title extracted from the sticky note text. Max 60 characters.`),
    description: z.string().nullable().describe(`A brief description or context from the text. Null if nothing meaningful to add beyond the title.`),

});
