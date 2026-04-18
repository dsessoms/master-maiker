import { Platform, TextInput, View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import { Redo2, Send, Shuffle, Undo2 } from "@/lib/icons";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

interface ChatBarProps {
	lastMessage?: string;
	input: string;
	onInputChange: (text: string) => void;
	onSend: () => void;
	onShuffle: () => void;
	onKeep: () => void;
	onDiscard: () => void;
	onUndo: () => void;
	canUndo: boolean;
	onRedo: () => void;
	canRedo: boolean;
	isPending: boolean;
	isSaving: boolean;
}

export function ChatBar({
	lastMessage,
	input,
	onInputChange,
	onSend,
	onShuffle,
	onKeep,
	onDiscard,
	onUndo,
	canUndo,
	onRedo,
	canRedo,
	isPending,
	isSaving,
}: ChatBarProps) {
	const isBusy = isPending || isSaving;
	return (
		<View className="m-2 bg-card border-t border-x border-border rounded-2xl shadow-lg">
			{lastMessage && (
				<View className="mx-3 mt-3 mb-1 px-3.5 py-2.5 rounded-xl bg-secondary">
					<Text className="text-sm font-medium">{lastMessage}</Text>
				</View>
			)}

			<View className="flex-row items-center gap-2 px-3 pt-3 pb-1.5">
				<Button
					variant="outline"
					size="icon"
					onPress={onUndo}
					disabled={!canUndo || isBusy}
					className={cn(
						"flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-border",
						(!canUndo || isBusy) && "opacity-40",
					)}
				>
					<Icon as={Undo2} size={13} className="text-foreground" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					onPress={onRedo}
					disabled={!canRedo || isBusy}
					className={cn(
						"flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-border",
						(!canRedo || isBusy) && "opacity-40",
					)}
				>
					<Icon as={Redo2} size={13} className="text-foreground" />
				</Button>
				<Button
					variant="outline"
					size="icon"
					onPress={onShuffle}
					disabled={isBusy}
					className={cn(
						"flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border border-border",
						isBusy && "opacity-40",
					)}
				>
					{isPending ? (
						<LoadingIndicator className="text-foreground" />
					) : (
						<Icon as={Shuffle} size={13} className="text-foreground" />
					)}
				</Button>
				<View className="flex-1" />
				<Button size="sm" onPress={onKeep} disabled={isBusy}>
					<Text className="text-primary-foreground font-semibold text-sm">
						{isSaving ? "Saving…" : "Keep"}
					</Text>
				</Button>
				<Button
					size="sm"
					variant="outline"
					onPress={onDiscard}
					disabled={isBusy}
				>
					<Text className="text-sm font-medium">Discard</Text>
				</Button>
			</View>

			<View className="flex-row items-end gap-2 px-3 pb-4 pt-1">
				<TextInput
					className={cn(
						"flex-1 bg-muted rounded-2xl px-4 py-2.5 text-base text-foreground min-h-[44px] max-h-[120px]",
						Platform.select({ web: "outline-none" }),
					)}
					placeholder="Tell me what you'd like to change"
					placeholderTextColor="#888"
					value={input}
					onChangeText={onInputChange}
					multiline
					editable={!isBusy}
					returnKeyType="default"
					submitBehavior="blurAndSubmit"
					onSubmitEditing={onSend}
					onKeyPress={
						Platform.OS === "web"
							? (e) => {
									const ne = e.nativeEvent as {
										key: string;
										metaKey?: boolean;
										ctrlKey?: boolean;
									};
									if ((ne.metaKey || ne.ctrlKey) && ne.key === "Enter") {
										e.preventDefault();
										if (input.trim() && !isBusy) onSend();
									}
								}
							: undefined
					}
				/>
				<Button
					variant="default"
					size="icon"
					onPress={onSend}
					disabled={!input.trim() || isBusy}
				>
					{isPending ? (
						<LoadingIndicator />
					) : (
						<Send size={17} className="text-primary-foreground" />
					)}
				</Button>
			</View>
		</View>
	);
}
