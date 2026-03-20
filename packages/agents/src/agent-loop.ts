/**
 * Agent loop implementation using Google Gemini Interactions API
 */

import { GoogleGenAI } from "@google/genai";
import type { Tool, AgentState, AgentConfig, MessageContent } from "./types.js";

export class AgentLoop {
	private client: GoogleGenAI;
	private modelName = "gemini-3-flash-preview";
	private config: AgentConfig;
	private interactionId?: string;

	private normalizeThoughtSummary(value: unknown): string {
		if (typeof value === "string") return value;
		if (!value) return "";

		if (Array.isArray(value)) {
			const joined = value
				.map((part) => {
					if (typeof part === "string") return part;
					if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
						return (part as { text: string }).text;
					}
					return "";
				})
				.filter(Boolean)
				.join(" ");
			if (joined) return joined;
		}

		if (typeof value === "object") {
			const maybeText = (value as { text?: unknown }).text;
			if (typeof maybeText === "string") return maybeText;

			const maybeContent = (value as { content?: unknown }).content;
			if (typeof maybeContent === "string") return maybeContent;
			if (Array.isArray(maybeContent)) {
				const joined = maybeContent
					.map((part) => {
						if (typeof part === "string") return part;
						if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
							return (part as { text: string }).text;
						}
						return "";
					})
					.filter(Boolean)
					.join(" ");
				if (joined) return joined;
			}

			try {
				return JSON.stringify(value);
			} catch {
				return "";
			}
		}

		return String(value);
	}

	private stripMarkdown(value: string): string {
		return value
			.replace(/```[\s\S]*?```/g, " ")
			.replace(/`([^`]+)`/g, "$1")
			.replace(/\*\*([^*]+)\*\*/g, "$1")
			.replace(/\*([^*]+)\*/g, "$1")
			.replace(/__([^_]+)__/g, "$1")
			.replace(/_([^_]+)_/g, "$1")
			.replace(/^#{1,6}\s+/gm, "")
			.replace(/^[-*+]\s+/gm, "")
			.replace(/^\d+\.\s+/gm, "")
			.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
			.replace(/\s+/g, " ")
			.trim();
	}

	constructor(config: AgentConfig) {
		this.config = config;
		this.client = new GoogleGenAI({ apiKey: this.config.apiKey });
	}

	/**
	 * Convert our tools to Gemini function format
	 */
	private toolsToFunctionDeclarations() {
		return this.config.tools.map((tool) => ({
			type: "function" as const,
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		}));
	}

	/**
	 * Execute a single iteration of the agent loop
	 */
	private async executeIteration(state: AgentState): Promise<AgentState> {
		console.log(`\n[Iteration ${state.currentIteration}/${state.maxIterations ?? "unbounded"}]`);
		this.config.onEvent?.({
			type: "iteration_started",
			iteration: state.currentIteration,
			maxIterations: state.maxIterations,
		});

		// Build the input - either first message or continuation
		let input: any;
		let usePreviousInteraction = false;

		if (state.messages.length === 1) {
			// First iteration - just send the user message
			const lastMessage = state.messages[state.messages.length - 1];
			const userMessage = lastMessage.content
				.filter((c) => c.type === "text")
				.map((c) => (c as any).text)
				.join("\n");
			input = userMessage;
		} else {
			// Continuation - send tool results as an array
			const prevMsg = state.messages[state.messages.length - 2];
			const toolResultMsg = state.messages[state.messages.length - 1];

			// Build array of function results
			const functionResults: any[] = [];
			for (const content of prevMsg.content) {
				if (content.type === "tool_call") {
					for (const tc of toolResultMsg.content) {
						if (tc.type === "tool_result" && (tc as any).tool_call_id === content.id) {
							functionResults.push({
								type: "function_result",
								name: content.name,
								call_id: content.id,
								result: tc.content,
							});
						}
					}
				}
			}

			if (functionResults.length > 0) {
				input = functionResults;
				usePreviousInteraction = true;
			} else {
				// Fallback to just text
				const lastMessage = state.messages[state.messages.length - 1];
				input = lastMessage.content
					.filter((c) => c.type === "text")
					.map((c) => (c as any).text)
					.join("\n");
			}
		}

		try {
			// Create interaction
			const interactionConfig: any = {
				model: this.modelName,
				input,
				tools: this.toolsToFunctionDeclarations(),
				system_instruction: state.systemPrompt,
				generation_config: {
					thinking_summaries: "auto",
				},
			};

			// If we have a previous interaction, continue from it
			if (usePreviousInteraction && this.interactionId) {
				interactionConfig.previous_interaction_id = this.interactionId;
			}

			console.log("📤 Sending request to Gemini...");
			this.config.onEvent?.({ type: "model_request", iteration: state.currentIteration });
			const interaction = await this.client.interactions.create(interactionConfig);

			// Save interaction ID for continuation
			this.interactionId = interaction.id;

			console.log("\n📤 Agent response:");

			// Check for function calls in outputs
			let hasFunctionCall = false;
			let functionCalls: any[] = [];

			const outputs = (interaction as any).outputs || [];
			for (const output of outputs) {
				console.log(`\n📝 Output type: ${output.type}`);

				if (output.type === "thought") {
					const summaryText = this.normalizeThoughtSummary((output as any).summary || output.text || "");
					const preview = this.stripMarkdown(summaryText);
					if (preview) {
						console.log(`🧠 ${preview}`);
						this.config.onEvent?.({
							type: "model_thought",
							iteration: state.currentIteration,
							textPreview: preview,
						});
					}
				}

				if (output.type === "text" && output.text) {
					const preview = output.text.slice(0, 240);
					console.log(`💭 ${preview}...`);
					this.config.onEvent?.({
						type: "model_text",
						iteration: state.currentIteration,
						textPreview: preview,
					});
				}

				if (output.type === "function_call") {
					hasFunctionCall = true;
					functionCalls.push(output);
					console.log(`🔧 Tool call: ${output.name}`);
					console.log(`   Args:`, JSON.stringify(output.arguments, null, 2));
					this.config.onEvent?.({
						type: "tool_called",
						iteration: state.currentIteration,
						name: output.name,
						argsPreview: JSON.stringify(output.arguments).slice(0, 240),
					});
				}
			}

			if (hasFunctionCall) {
				// Model is calling tools
				const assistantContent: MessageContent[] = [];
				const toolResults: MessageContent[] = [];

				// Add tool calls to assistant message
				for (const call of functionCalls) {
					const toolCallId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

					assistantContent.push({
						type: "tool_call",
						id: toolCallId,
						name: call.name,
						arguments: call.arguments,
					});

					// Execute the tool
					const tool = this.config.tools.find((t) => t.name === call.name);
					if (!tool) {
						console.error(`❌ Tool not found: ${call.name}`);
						toolResults.push({
							type: "tool_result",
							tool_call_id: toolCallId,
							content: `Error: Tool ${call.name} not found`,
						});
						continue;
					}

					try {
						const result = await tool.execute(call.arguments);
						console.log(`✅ Tool result (${result.length} chars)`);
					this.config.onEvent?.({
						type: "tool_result",
						iteration: state.currentIteration,
						name: call.name,
						resultLength: result.length,
						resultPreview: this.stripMarkdown(result),
					});
						toolResults.push({
							type: "tool_result",
							tool_call_id: toolCallId,
							content: result,
						});
					} catch (error) {
						console.error(`❌ Tool error:`, error);
						toolResults.push({
							type: "tool_result",
							tool_call_id: toolCallId,
							content: `Error: ${error instanceof Error ? error.message : String(error)}`,
						});
					}
				}

				// Add messages to state
				state.messages.push({
					role: "assistant",
					content: assistantContent,
				});

				state.messages.push({
					role: "tool",
					content: toolResults,
				});

				state.currentIteration++;
				return state;
			} else {
				// Model is done, no more tool calls
				const textOutput = outputs.find((o: any) => o.type === "text");
				const text = textOutput?.text || "";

				console.log(`✨ Final response:\n${text.slice(0, 500)}...`);

				state.messages.push({
					role: "assistant",
					content: [{ type: "text", text }],
				});

				state.isComplete = true;
				return state;
			}
		} catch (error) {
			console.error(`❌ Error in iteration ${state.currentIteration}:`, error);
			this.config.onEvent?.({
				type: "iteration_failed",
				iteration: state.currentIteration,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Run the agent loop until completion or max iterations
	 */
	async run(initialPrompt: string): Promise<AgentState> {
		const state: AgentState = {
			messages: [
				{
					role: "user",
					content: [{ type: "text", text: initialPrompt }],
				},
			],
			tools: this.config.tools,
			systemPrompt: this.config.systemPrompt,
			currentIteration: 1,
			maxIterations: this.config.maxIterations,
			isComplete: false,
			metadata: {},
		};

		// Reset interaction ID for new run
		this.interactionId = undefined;

		console.log("🚀 Starting agent loop...");
		console.log(`📝 Initial prompt: ${initialPrompt.slice(0, 200)}...`);
		this.config.onEvent?.({ type: "run_started", promptPreview: initialPrompt.slice(0, 240) });

		while (!state.isComplete && (state.maxIterations === undefined || state.currentIteration <= state.maxIterations)) {
			await this.executeIteration(state);
		}

		if (!state.isComplete && state.maxIterations !== undefined) {
			console.log(`\n⚠️  Reached max iterations (${state.maxIterations})`);
		}

		console.log(`\n✅ Agent loop completed after ${state.currentIteration - 1} iterations`);
		this.config.onEvent?.({
			type: "run_completed",
			iterations: state.currentIteration - 1,
			complete: state.isComplete,
		});
		return state;
	}

	/**
	 * Extract the final text response from the agent state
	 */
	getFinalResponse(state: AgentState): string {
		const lastMessage = state.messages[state.messages.length - 1];
		if (lastMessage && lastMessage.role === "assistant") {
			return lastMessage.content
				.filter((c) => c.type === "text")
				.map((c) => (c as any).text)
				.join("\n");
		}
		return "";
	}
}
