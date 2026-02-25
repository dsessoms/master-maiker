export interface FeatureFlag {
	id: string;
	name: string;
	description?: string;
	enabled: boolean;
	created_at: string;
	updated_at: string;
}

export interface FeatureFlagUser {
	id: string;
	feature_flag_id: string;
	user_id: string;
	enabled: boolean;
	created_at: string;
}
