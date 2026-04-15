import { useFeatureFlag } from "@/hooks/feature-flags/useFeatureFlag";

export const GatedFeature = ({
	flagName,
	children,
}: {
	flagName: string;
	children: any;
}) => {
	const { enabled } = useFeatureFlag(flagName);

	if (!enabled) {
		return null;
	}

	return children;
};
