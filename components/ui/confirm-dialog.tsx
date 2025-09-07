import React from "react";
import { Alert, Platform } from "react-native";

interface ConfirmDialogProps {
	visible: boolean;
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel: () => void;
	confirmText?: string;
	cancelText?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
	visible,
	title,
	message,
	onConfirm,
	onCancel,
	confirmText = "Delete",
	cancelText = "Cancel",
}) => {
	// Use native Alert on mobile platforms
	if (Platform.OS !== "web") {
		React.useEffect(() => {
			if (visible) {
				Alert.alert(title, message, [
					{
						text: cancelText,
						style: "cancel",
						onPress: onCancel,
					},
					{
						text: confirmText,
						style: "destructive",
						onPress: onConfirm,
					},
				]);
			}
		}, [visible, title, message, onConfirm, onCancel, confirmText, cancelText]);

		return null;
	}

	// Use window.confirm for web
	React.useEffect(() => {
		if (visible) {
			if (window.confirm(`${title}\n\n${message}`)) {
				onConfirm();
			} else {
				onCancel();
			}
		}
	}, [visible, title, message, onConfirm, onCancel]);

	return null;
};

// Context for managing confirm dialog state
const ConfirmDialogContext = React.createContext<{
	showDialog: (options: {
		title: string;
		message: string;
		onConfirm: () => void;
		onCancel?: () => void;
		confirmText?: string;
		cancelText?: string;
	}) => void;
} | null>(null);

export const ConfirmDialogProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [dialogState, setDialogState] = React.useState<{
		visible: boolean;
		title: string;
		message: string;
		onConfirm: () => void;
		onCancel: () => void;
		confirmText: string;
		cancelText: string;
	}>({
		visible: false,
		title: "",
		message: "",
		onConfirm: () => {},
		onCancel: () => {},
		confirmText: "Confirm",
		cancelText: "Cancel",
	});

	const showDialog = React.useCallback(
		(options: {
			title: string;
			message: string;
			onConfirm: () => void;
			onCancel?: () => void;
			confirmText?: string;
			cancelText?: string;
		}) => {
			const {
				title,
				message,
				onConfirm,
				onCancel = () => {},
				confirmText = "Confirm",
				cancelText = "Cancel",
			} = options;

			setDialogState({
				visible: true,
				title,
				message,
				onConfirm: () => {
					onConfirm();
					setDialogState((prev) => ({ ...prev, visible: false }));
				},
				onCancel: () => {
					onCancel();
					setDialogState((prev) => ({ ...prev, visible: false }));
				},
				confirmText,
				cancelText,
			});
		},
		[],
	);

	const hideDialog = React.useCallback(() => {
		setDialogState((prev) => ({ ...prev, visible: false }));
	}, []);

	return (
		<ConfirmDialogContext.Provider value={{ showDialog }}>
			{children}
			<ConfirmDialog
				visible={dialogState.visible}
				title={dialogState.title}
				message={dialogState.message}
				onConfirm={dialogState.onConfirm}
				onCancel={dialogState.onCancel}
				confirmText={dialogState.confirmText}
				cancelText={dialogState.cancelText}
			/>
		</ConfirmDialogContext.Provider>
	);
};

// Hook to use the confirm dialog
export const useConfirmDialog = () => {
	const context = React.useContext(ConfirmDialogContext);
	if (!context) {
		throw new Error(
			"useConfirmDialog must be used within a ConfirmDialogProvider",
		);
	}
	return context;
};

// Utility function to show confirmation dialog
export const showConfirmDialog = (options: {
	title: string;
	message: string;
	onConfirm: () => void;
	onCancel?: () => void;
	confirmText?: string;
	cancelText?: string;
}) => {
	const {
		title,
		message,
		onConfirm,
		onCancel = () => {},
		confirmText,
		cancelText,
	} = options;

	if (Platform.OS !== "web") {
		Alert.alert(title, message, [
			{
				text: cancelText || "Cancel",
				style: "cancel",
				onPress: onCancel,
			},
			{
				text: confirmText || "Confirm",
				style: "destructive",
				onPress: onConfirm,
			},
		]);
	} else {
		// Use window.confirm for web
		if (window.confirm(`${title}\n\n${message}`)) {
			onConfirm();
		} else {
			onCancel();
		}
	}
};
