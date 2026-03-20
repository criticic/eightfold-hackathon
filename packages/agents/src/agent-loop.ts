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

	constructor(config: AgentConfig) {
		this.config = config;
		this.client = new GoogleGenAI({});
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
		console.log(`\n[Iteration ${state.currentIteration}/${state.maxIterations}]`);

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
			};

			// If we have a previous interaction, continue from it
			if (usePreviousInteraction && this.interactionId) {
				interactionConfig.previous_interaction_id = this.interactionId;
			}

			console.log("📤 Sending request to Gemini...");
			const interaction = await this.client.interactions.create(interactionConfig);

			// Save interaction ID for continuation
			this.interactionId = interaction.id;

			console.log("\n📤 Agent response:");

			// Check for function calls in outputs
			let hasFunctionCall = false;
			let functionCalls: any[] = [];

			for (const output of interaction.outputs) {
				console.log(`\n📝 Output type: ${output.type}`);

				if (output.type === "text" && output.text) {
					console.log(`💭 ${output.text.slice(0, 200)}...`);
				}

				if (output.type === "function_call") {
					hasFunctionCall = true;
					functionCalls.push(output);
					console.log(`🔧 Tool call: ${output.name}`);
					console.log(`   Args:`, JSON.stringify(output.arguments, null, 2));
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
				const textOutput = interaction.outputs.find((o: any) => o.type === "text");
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
			state.messages.push({
				role: "assistant",
				content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
			});
			state.isComplete = true;
			return state;
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

		while (!state.isComplete && state.currentIteration <= state.maxIterations) {
			await this.executeIteration(state);
		}

		if (!state.isComplete) {
			console.log(`\n⚠️  Reached max iterations (${state.maxIterations})`);
		}

		console.log(`\n✅ Agent loop completed after ${state.currentIteration - 1} iterations`);
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
