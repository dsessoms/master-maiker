import { Platform, ScrollView, TextInput, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import {
	RecipeChatMessage,
	RecipeChatMultiSelectOptions,
	RecipeChatQuickOption,
	RecipePreview,
} from "@/app/api/recipes/generate/chat/index+api";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { KeyboardHint } from "@/components/ui/keyboard-hint";
import { Text } from "@/components/ui/text";
import { useGenerateRecipeChat } from "@/hooks/recipes/use-generate-recipe-chat";

export interface ChatDisplayMessage {
	id: string;
	role: "assistant" | "user";
	content: string;
	quickOptions?: RecipeChatQuickOption[];
	multiSelectOptions?: RecipeChatMultiSelectOptions;
	recipePreview?: RecipePreview;
}

interface ChatTabProps {
	onGenerate: (recipePreview: RecipePreview) => Promise<void>;
	isGenerating: boolean;
}

export const ChatTab = ({ onGenerate, isGenerating }: ChatTabProps) => {
	const scrollViewRef = useRef<ScrollView>(null);
	const inputRef = useRef<TextInput>(null);
	const [messages, setMessages] = useState<ChatDisplayMessage[]>([
		{
			id: "1",
			role: "assistant",
			content:
				"Hi! I'd love to help you create a recipe. What type of dish are you in the mood for today?",
		},
	]);
	const [inputText, setInputText] = useState("");
	const [selectedMultiOptions, setSelectedMultiOptions] = useState<Set<string>>(
		new Set(),
	);
	const { sendMessage, isPending } = useGenerateRecipeChat();

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		setTimeout(() => {
			if (scrollViewRef.current?.scrollToEnd) {
				scrollViewRef.current.scrollToEnd({ animated: true });
			}
		}, 100);
	}, [messages]);

	// Clear multi-select state when new messages don't have multi-select options
	useEffect(() => {
		const lastMessage = messages[messages.length - 1];
		if (lastMessage?.role === "assistant" && !lastMessage.multiSelectOptions) {
			setSelectedMultiOptions(new Set());
		}
	}, [messages]);

	const handleSendMessage = async () => {
		if (inputText.trim() && !isPending) {
			const userMessage: ChatDisplayMessage = {
				id: Date.now().toString(),
				role: "user",
				content: inputText.trim(),
			};

			const updatedMessages = [...messages, userMessage];
			setMessages(updatedMessages);
			setInputText("");

			// Keep focus on web after sending message
			if (Platform.OS === "web" && inputRef.current) {
				setTimeout(() => {
					inputRef.current?.focus();
				}, 0);
			}

			try {
				// Convert to API format
				const apiMessages: RecipeChatMessage[] = updatedMessages.map((msg) => ({
					role: msg.role,
					content: msg.content,
				}));

				const response = await sendMessage({ messages: apiMessages });

				// Create assistant message from response
				const assistantMessage: ChatDisplayMessage = {
					id: (Date.now() + 1).toString(),
					role: "assistant",
					content: response.content || response.text || "",
					quickOptions: response.quickOptions,
					multiSelectOptions: response.multiSelectOptions,
					recipePreview: response.recipePreview,
				};

				setMessages((prev) => [...prev, assistantMessage]);
			} catch (error) {
				console.error("Error sending message:", error);
				// Add an error message
				setMessages((prev) => [
					...prev,
					{
						id: (Date.now() + 2).toString(),
						role: "assistant",
						content: "Sorry, I encountered an error. Please try again.",
					},
				]);
			}
		}
	};

	const handleGenerate = () => {
		// Find the latest assistant message with a recipe preview
		const latestAssistantMessage = [...messages]
			.reverse()
			.find((msg) => msg.role === "assistant" && msg.recipePreview);

		if (latestAssistantMessage?.recipePreview) {
			onGenerate(latestAssistantMessage.recipePreview);
		} else {
			console.error("No recipe preview found for generation");
		}
	};

	const handleMultiOptionToggle = (optionTitle: string) => {
		setSelectedMultiOptions((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(optionTitle)) {
				newSet.delete(optionTitle);
			} else {
				newSet.add(optionTitle);
			}
			return newSet;
		});
	};

	const handleMultiSelectSubmit = async () => {
		if (selectedMultiOptions.size === 0 || isPending) return;

		// Create user message with selected options
		const selectedOptionsText = Array.from(selectedMultiOptions).join(", ");
		const userMessage: ChatDisplayMessage = {
			id: Date.now().toString(),
			role: "user",
			content: selectedOptionsText,
		};

		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);
		setSelectedMultiOptions(new Set()); // Clear selections

		// Send the message
		await sendMessageWithOption(updatedMessages);
	};

	const handleQuickOptionSelect = async (option: RecipeChatQuickOption) => {
		if (!isPending) {
			// Normal quick option handling
			const userMessage: ChatDisplayMessage = {
				id: Date.now().toString(),
				role: "user",
				content: option.title,
			};

			const updatedMessages = [...messages, userMessage];
			setMessages(updatedMessages);

			// Auto-send the message
			await sendMessageWithOption(updatedMessages);
		}
	};

	const sendMessageWithOption = async (
		existingMessages: ChatDisplayMessage[],
	) => {
		try {
			// Convert to API format
			const apiMessages: RecipeChatMessage[] = existingMessages.map((msg) => ({
				role: msg.role,
				content: msg.content,
			}));

			const response = await sendMessage({ messages: apiMessages });

			// Create assistant message from response
			const assistantMessage: ChatDisplayMessage = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: response.content || response.text || "",
				quickOptions: response.quickOptions,
				multiSelectOptions: response.multiSelectOptions,
				recipePreview: response.recipePreview,
			};

			setMessages((prev) => [...prev, assistantMessage]);
		} catch (error) {
			console.error("Error sending message:", error);
			// Add an error message
			setMessages((prev) => [
				...prev,
				{
					id: (Date.now() + 2).toString(),
					role: "assistant",
					content: "Sorry, I encountered an error. Please try again.",
				},
			]);
		}
	};

	return (
		<View className="flex-1">
			{/* Chat Messages - Scrollable area that takes available space */}
			<ScrollView
				ref={scrollViewRef}
				className="flex-1"
				contentContainerStyle={{
					paddingBottom: 8,
					flexGrow: 1,
				}}
				showsVerticalScrollIndicator={true}
				scrollEventThrottle={16}
				onContentSizeChange={() => {
					if (scrollViewRef.current?.scrollToEnd) {
						scrollViewRef.current.scrollToEnd({ animated: true });
					}
				}}
				onLayout={() => {
					if (scrollViewRef.current?.scrollToEnd) {
						scrollViewRef.current.scrollToEnd({ animated: true });
					}
				}}
				keyboardShouldPersistTaps="handled"
				style={{ flex: 1 }}
			>
				{messages.map((message, index) => (
					<View key={message.id} className="mb-3">
						<View
							className={`flex-row ${
								message.role === "user" ? "justify-end" : "justify-start"
							}`}
						>
							<View
								className={`max-w-[80%] p-3 rounded-lg ${
									message.role === "user" ? "bg-primary" : "bg-secondary"
								}`}
							>
								<Text
									className={`${
										message.role === "user"
											? "text-primary-foreground"
											: "text-foreground"
									}`}
								>
									{message.content}
								</Text>
							</View>
						</View>

						{/* Recipe Preview Card - Only show for assistant messages with recipe preview and if it's the latest message */}
						{message.role === "assistant" &&
							message.recipePreview &&
							index === messages.length - 1 &&
							!isPending && (
								<View className="mt-3 max-w-[80%]">
									<Card className="p-4 bg-card border border-border">
										<Text className="text-lg font-semibold text-foreground mb-2">
											{message.recipePreview.title}
										</Text>
										<Text className="text-muted-foreground text-sm mb-3">
											Serves {message.recipePreview.servings}
										</Text>
										{message.recipePreview.ingredients &&
											message.recipePreview.ingredients.length > 0 && (
												<View className="mb-3">
													<Text className="text-sm font-medium text-foreground mb-1">
														Ingredients:
													</Text>
													<Text className="text-muted-foreground text-xs">
														{message.recipePreview.ingredients.join(", ")}
													</Text>
												</View>
											)}
										{message.recipePreview.instructions && (
											<View>
												<Text className="text-sm font-medium text-foreground mb-1">
													Instructions:
												</Text>
												<Text className="text-muted-foreground text-xs">
													{message.recipePreview.instructions.length > 200
														? `${message.recipePreview.instructions.substring(0, 200)}...`
														: message.recipePreview.instructions}
												</Text>
											</View>
										)}
									</Card>

									{/* Generate Recipe Button - Always show when recipePreview is present */}
									<Button
										onPress={handleGenerate}
										disabled={isGenerating}
										className="mt-3"
									>
										<Text>
											{isGenerating ? "Generating..." : "Generate Recipe"}
										</Text>
									</Button>
								</View>
							)}

						{/* Quick Options - Only show for assistant messages with options and if it's the latest message */}
						{message.role === "assistant" &&
							message.quickOptions &&
							message.quickOptions.length > 0 &&
							index === messages.length - 1 &&
							!isPending && (
								<View className="mt-2 flex-row flex-wrap gap-2">
									{message.quickOptions.map((option, optionIndex) => (
										<Button
											key={optionIndex}
											variant="outline"
											size="sm"
											onPress={() => handleQuickOptionSelect(option)}
											className="mr-2 mb-2"
										>
											<Text className="text-sm">{option.title}</Text>
										</Button>
									))}
								</View>
							)}

						{/* Multi-Select Options - Only show for assistant messages with multi-select options and if it's the latest message */}
						{message.role === "assistant" &&
							message.multiSelectOptions &&
							message.multiSelectOptions.options.length > 0 &&
							index === messages.length - 1 &&
							!isPending && (
								<View className="mt-3 max-w-[80%]">
									<Card className="p-4 bg-card border border-border">
										<Text className="text-sm font-medium text-foreground mb-3">
											{message.multiSelectOptions.title}
										</Text>
										<View>
											{message.multiSelectOptions.options.map(
												(option, optionIndex) => (
													<View
														key={optionIndex}
														className="flex-row items-center mb-2"
													>
														<Checkbox
															checked={selectedMultiOptions.has(option.title)}
															onCheckedChange={() =>
																handleMultiOptionToggle(option.title)
															}
														/>
														<Text className="text-sm text-foreground flex-1 ml-2">
															{option.title}
														</Text>
													</View>
												),
											)}
										</View>
										<Button
											onPress={handleMultiSelectSubmit}
											disabled={selectedMultiOptions.size === 0}
											className="mt-4"
											size="sm"
										>
											<Text className="text-sm">
												Submit Selection
												{selectedMultiOptions.size > 0
													? ` (${selectedMultiOptions.size})`
													: ""}
											</Text>
										</Button>
									</Card>
								</View>
							)}
					</View>
				))}

				{/* Thinking indicator - Show when bot is processing */}
				{isPending && (
					<View className="mb-3">
						<View className="flex-row justify-start">
							<View className="max-w-[80%] p-3 rounded-lg bg-secondary">
								<Text className="text-foreground italic">thinking...</Text>
							</View>
						</View>
					</View>
				)}
			</ScrollView>

			{/* Fixed bottom section with generate button and input */}
			<View className="border-t border-border bg-background px-4 py-3">
				{/* Input Row */}
				<View className="flex-row">
					<Input
						ref={inputRef}
						placeholder="Type your response..."
						value={inputText}
						onChangeText={setInputText}
						onSubmitEditing={handleSendMessage}
						returnKeyType="send"
						className="flex-1"
						blurOnSubmit={Platform.OS !== "web"}
					/>
				</View>

				<KeyboardHint keyLabel="Enter" actionText="to send" />
			</View>
		</View>
	);
};
