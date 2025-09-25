import React, { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
	useGenerateRecipeChat,
	type QuickOption,
	type RecipePreview,
	type ChatMessage,
} from "@/hooks/recipes/use-generate-recipe-chat";

export interface ChatDisplayMessage {
	id: string;
	role: "assistant" | "user";
	content: string;
	quickOptions?: QuickOption[];
	recipePreview?: RecipePreview;
}

interface ChatTabProps {
	onGenerate: (chatMessages: ChatDisplayMessage[]) => Promise<void>;
	isGenerating: boolean;
}

export const ChatTab = ({ onGenerate, isGenerating }: ChatTabProps) => {
	const scrollViewRef = useRef<ScrollView>(null);
	const [messages, setMessages] = useState<ChatDisplayMessage[]>([
		{
			id: "1",
			role: "assistant",
			content:
				"Hi! I'd love to help you create a recipe. What type of dish are you in the mood for today?",
		},
	]);
	const [inputText, setInputText] = useState("");
	const { sendMessage, isPending } = useGenerateRecipeChat();

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		setTimeout(() => {
			if (scrollViewRef.current?.scrollToEnd) {
				scrollViewRef.current.scrollToEnd({ animated: true });
			}
		}, 100);
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

			try {
				// Convert to API format
				const apiMessages: ChatMessage[] = updatedMessages.map((msg) => ({
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
		onGenerate(messages);
	};

	const handleQuickOptionSelect = async (option: QuickOption) => {
		if (!isPending) {
			// Special handling for "Generate Recipe" option
			if (option.title === "Generate Recipe") {
				// Add user message indicating they chose to generate recipe
				const userMessage: ChatDisplayMessage = {
					id: Date.now().toString(),
					role: "user",
					content: option.title,
				};

				const updatedMessages = [...messages, userMessage];
				setMessages(updatedMessages);

				// Trigger recipe generation with the current chat messages
				handleGenerate();
				return;
			}

			// Normal quick option handling for other options
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
			const apiMessages: ChatMessage[] = existingMessages.map((msg) => ({
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
					padding: 16,
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
											{message.recipePreview.description}
										</Text>
										{message.recipePreview.ingredients &&
											message.recipePreview.ingredients.length > 0 && (
												<View>
													<Text className="text-sm font-medium text-foreground mb-1">
														Key Ingredients:
													</Text>
													<Text className="text-muted-foreground text-xs">
														{message.recipePreview.ingredients.join(", ")}
													</Text>
												</View>
											)}
									</Card>
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
					</View>
				))}
			</ScrollView>

			{/* Fixed bottom section with generate button and input */}
			<View className="border-t border-border bg-background px-4 py-3">
				{/* Generate Recipe Button - Always visible above input */}
				<Button
					onPress={handleGenerate}
					disabled={isGenerating || messages.length < 3 || isPending}
					className="mb-3"
				>
					<Text>
						{isGenerating
							? "Generating Recipe..."
							: "Generate Recipe from Chat"}
					</Text>
				</Button>

				{/* Input Row */}
				<View className="flex-row gap-2">
					<Input
						placeholder="Type your response..."
						value={inputText}
						onChangeText={setInputText}
						onSubmitEditing={handleSendMessage}
						returnKeyType="send"
						className="flex-1"
						editable={!isPending}
					/>
					<Button
						onPress={handleSendMessage}
						disabled={isPending || !inputText.trim()}
					>
						<Text>{isPending ? "..." : "Send"}</Text>
					</Button>
				</View>
			</View>
		</View>
	);
};
