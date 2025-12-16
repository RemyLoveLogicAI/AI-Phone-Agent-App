import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Config } from '../../config/config.schema';
import OpenAI from 'openai';
import { cosine } from 'ml-distance';

/**
 * Phase 6: RAG (Retrieval Augmented Generation) Service
 * Handles knowledge base embeddings and semantic search
 */
@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly openai: OpenAI;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Config>,
  ) {
    const apiKey = this.configService.get('OPENAI_API_KEY', { infer: true });
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ingest text into knowledge base with chunking
   */
  async ingestDocument(params: {
    content: string;
    source?: string;
    metadata?: Record<string, any>;
    chunkSize?: number;
  }): Promise<number> {
    const { content, source, metadata, chunkSize = 1000 } = params;

    // Simple chunking by sentences/paragraphs
    const chunks = this.chunkText(content, chunkSize);
    let ingestedCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      try {
        // Generate embedding
        const embedding = await this.generateEmbedding(chunk);

        // Store in database
        await this.prisma.knowledgeChunk.create({
          data: {
            content: chunk,
            embedding: JSON.stringify(embedding),
            source: source || 'unknown',
            chunkIndex: i,
            metadata: metadata ? JSON.stringify(metadata) : null,
          },
        });

        ingestedCount++;
      } catch (error) {
        this.logger.error(`Failed to ingest chunk ${i}: ${error.message}`);
      }
    }

    this.logger.log(`Ingested ${ingestedCount}/${chunks.length} chunks from ${source}`);
    return ingestedCount;
  }

  /**
   * Semantic search in knowledge base
   */
  async search(query: string, limit: number = 5): Promise<Array<{
    content: string;
    similarity: number;
    source?: string;
    metadata?: Record<string, any>;
  }>> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(query);

      // Get all knowledge chunks
      const chunks = await this.prisma.knowledgeChunk.findMany();

      // Calculate similarities
      const results = chunks.map((chunk) => {
        const chunkEmbedding = JSON.parse(chunk.embedding);
        const similarity = 1 - cosine(queryEmbedding, chunkEmbedding);

        return {
          content: chunk.content,
          similarity,
          source: chunk.source,
          metadata: chunk.metadata ? JSON.parse(chunk.metadata) : undefined,
        };
      });

      // Sort by similarity and return top results
      return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      this.logger.error(`Search failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get relevant context for a query
   * Returns formatted context string for LLM
   */
  async getContext(query: string, limit: number = 3): Promise<string> {
    const results = await this.search(query, limit);

    if (results.length === 0) {
      return '';
    }

    const context = results
      .map((r, idx) => `[${idx + 1}] ${r.content} (relevance: ${(r.similarity * 100).toFixed(1)}%)`)
      .join('\n\n');

    return `Relevant information from knowledge base:\n\n${context}`;
  }

  /**
   * Simple text chunking
   */
  private chunkText(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Delete knowledge by source
   */
  async deleteBySource(source: string): Promise<number> {
    const result = await this.prisma.knowledgeChunk.deleteMany({
      where: { source },
    });

    this.logger.log(`Deleted ${result.count} chunks from source: ${source}`);
    return result.count;
  }

  /**
   * Get knowledge base stats
   */
  async getStats() {
    const total = await this.prisma.knowledgeChunk.count();
    const sources = await this.prisma.knowledgeChunk.groupBy({
      by: ['source'],
      _count: true,
    });

    return {
      totalChunks: total,
      sources: sources.map((s) => ({
        source: s.source,
        count: s._count,
      })),
    };
  }
}
