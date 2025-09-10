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

	// Extract options from children
	React.useEffect(() => {
		const extractedOptions: Option[] = [];

		const extractFromChildren = (children: React.ReactNode) => {
			React.Children.forEach(children, (child) => {
				if (React.isValidElement(child)) {
					if (child.type === SelectItem) {
						const props = child.props as SelectItemProps;
						extractedOptions.push({
							value: props.value,
							label: props.label,
							disabled: props.disabled,
						});
					} else if (
						child.props &&
						typeof child.props === "object" &&
						"children" in child.props
					) {
						extractFromChildren((child.props as any).children);
					}
				}
			});
		};

		extractFromChildren(children);
		setOptions(extractedOptions);
	}, [children]);

	const contextValue = {
		value,
		onValueChange: onValueChange || (() => {}),
		options,
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

		const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
			const selectedValue = e.target.value;
			const selectedOption = options.find((opt) => opt.value === selectedValue);
			if (selectedOption) {
				onValueChange({
					value: selectedOption.value,
					label: selectedOption.label,
				});
			}
		};

		// Filter out any conflicting props
		const divProps = { ...props };
		delete (divProps as any).onChange;

		return (
			<div className="relative" ref={ref}>
				<select
					className={cn(
						"border-input dark:bg-input/30 bg-background flex h-10 w-full appearance-none items-center justify-between gap-2 rounded-md border px-3 py-2 pr-10 text-sm shadow-sm shadow-black/5 sm:h-9",
						"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none",
						"disabled:cursor-not-allowed disabled:opacity-50",
						"text-foreground cursor-pointer",
						size === "sm" && "h-8 py-2 sm:py-1.5",
						className,
					)}
					value={value?.value || ""}
					onChange={handleChange}
					disabled={disabled}
				>
					{!value && (
						<option value="" disabled>
							{/* Placeholder will be handled by SelectValue */}
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
		);
	},
);

SelectTrigger.displayName = "SelectTrigger";

function SelectValue({ className, placeholder, ...props }: SelectValueProps) {
	// This component is just for API compatibility - the value display is handled by the native select
	return null;
}

function SelectContent({ children, ...props }: SelectContentProps) {
	// This component is ignored in web - native select handles the dropdown
	return null;
}

function SelectLabel({ children, ...props }: SelectLabelProps) {
	// Labels are not supported in native select, so we ignore this
	return null;
}

function SelectItem({ children, value, label, disabled }: SelectItemProps) {
	// Items are handled by the context system, this component doesn't render anything
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
