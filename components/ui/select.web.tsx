import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react-native";
import * as React from "react";

type Option = {
	label: string;
	value: string;
	disabled?: boolean;
};

// Context for the Select component
interface SelectContextType {
	value?: { value: string; label: string } | null;
	onValueChange: (option: { value: string; label: string } | null) => void;
	options: Option[];
	registerOption: (option: Option) => void;
	unregisterOption: (value: string) => void;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

function useSelectContext() {
	const context = React.useContext(SelectContext);
	if (!context) {
		throw new Error("Select components must be used within a Select provider");
	}
	return context;
}

// Root Select component that provides context and renders native select
interface SelectRootProps {
	children: React.ReactNode;
	value?: { value: string; label: string } | null;
	onValueChange?: (option: { value: string; label: string } | null) => void;
}

function SelectRoot({ children, value, onValueChange }: SelectRootProps) {
	const [options, setOptions] = React.useState<Option[]>([]);

	const registerOption = React.useCallback((option: Option) => {
		setOptions((prev) => {
			// Check if option already exists
			const exists = prev.some((opt) => opt.value === option.value);
			if (exists) return prev;
			return [...prev, option];
		});
	}, []);

	const unregisterOption = React.useCallback((value: string) => {
		setOptions((prev) => prev.filter((opt) => opt.value !== value));
	}, []);

	const contextValue = {
		value,
		onValueChange: onValueChange || (() => {}),
		options,
		registerOption,
		unregisterOption,
	};

	return (
		<SelectContext.Provider value={contextValue}>
			{children}
		</SelectContext.Provider>
	);
}

interface SelectTriggerProps
	extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
	children?: React.ReactNode;
	size?: "default" | "sm";
	disabled?: boolean;
}

interface SelectValueProps extends React.HTMLAttributes<HTMLSpanElement> {
	placeholder?: string;
}

interface SelectItemProps {
	children: React.ReactNode;
	value: string;
	label: string;
	disabled?: boolean;
}

interface SelectContentProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	insets?: any; // For compatibility with RN
}

interface SelectLabelProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
}

interface SelectSeparatorProps extends React.HTMLAttributes<HTMLHRElement> {}

interface SelectGroupProps extends React.HTMLAttributes<HTMLDivElement> {
	children: React.ReactNode;
	label?: string;
}

// Native select implementation that ignores unsupported components
const SelectTrigger = React.forwardRef<HTMLDivElement, SelectTriggerProps>(
	({ className, children, size = "default", disabled, ...props }, ref) => {
		const { value, onValueChange, options } = useSelectContext();
		const [placeholder, setPlaceholder] = React.useState("Select an option");

		// Extract placeholder from SelectValue child
		React.useEffect(() => {
			const extractPlaceholder = (children: React.ReactNode): string | null => {
				const childrenArray = Array.isArray(children) ? children : [children];

				for (const child of childrenArray) {
					if (React.isValidElement(child)) {
						const props = child.props as any;
						if (child.type === SelectValue && props?.placeholder) {
							return props.placeholder;
						}
						if (props && typeof props === "object" && "children" in props) {
							const found = extractPlaceholder(props.children);
							if (found) return found;
						}
					}
				}
				return null;
			};

			const found = extractPlaceholder(children);
			if (found) setPlaceholder(found);
		}, [children]);

		const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
			const selectedValue = e.target.value;
			if (!selectedValue) return;

			const selectedOption = options.find((opt) => opt.value === selectedValue);
			if (selectedOption) {
				onValueChange({
					value: selectedOption.value,
					label: selectedOption.label,
				});
			}
		};

		return (
			<div className={className} ref={ref}>
				<div className="relative">
					<select
						className={cn(
							"border-input dark:bg-input/30 bg-background flex h-10 w-full appearance-none items-center justify-between gap-2 rounded-md border px-3 py-2 pr-10 text-sm",
							"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
							"disabled:cursor-not-allowed disabled:opacity-50",
							"cursor-pointer",
							!value && "text-muted-foreground",
							value && "text-foreground",
							size === "sm" && "h-8 py-2 sm:py-1.5",
						)}
						value={value?.value || ""}
						onChange={handleChange}
						disabled={disabled}
					>
						{!value && (
							<option value="" disabled>
								{placeholder}
							</option>
						)}
						{options.map((option) => (
							<option
								key={option.value}
								value={option.value}
								disabled={option.disabled}
								className="text-foreground bg-background"
							>
								{option.label}
							</option>
						))}
					</select>
					<div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
						<Icon
							as={ChevronDown}
							aria-hidden={true}
							className="text-muted-foreground size-4"
						/>
					</div>
				</div>
			</div>
		);
	},
);

SelectTrigger.displayName = "SelectTrigger";

function SelectValue({ className, placeholder, ...props }: SelectValueProps) {
	// This component is just for API compatibility - the value display is handled by the native select
	return null;
}

function SelectContent({ children, ...props }: SelectContentProps) {
	// Render children so SelectItems can register themselves, but don't display anything
	return <div style={{ display: "none" }}>{children}</div>;
}

function SelectLabel({ children, ...props }: SelectLabelProps) {
	// Labels are not supported in native select, so we ignore this
	return null;
}

function SelectItem({ children, value, label, disabled }: SelectItemProps) {
	const { registerOption, unregisterOption } = useSelectContext();

	React.useEffect(() => {
		registerOption({ value, label, disabled });
		return () => unregisterOption(value);
	}, [value, label, disabled, registerOption, unregisterOption]);

	return null;
}

function SelectSeparator(props: SelectSeparatorProps) {
	// Separators are not supported in native select
	return null;
}

function SelectGroup({ children, label, ...props }: SelectGroupProps) {
	// Groups are partially supported - we just render the children
	return <>{children}</>;
}

// Placeholder components for API compatibility
function SelectScrollUpButton() {
	return null;
}

function SelectScrollDownButton() {
	return null;
}

function NativeSelectScrollView({
	children,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return <>{children}</>;
}

export {
	NativeSelectScrollView,
	SelectRoot as Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectScrollDownButton,
	SelectScrollUpButton,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
	type Option,
};
