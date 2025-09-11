import axios from "axios";
import { supabase } from "../config/supabase";
import { Platform } from "react-native";

const baseURL = process.env.EXPO_PUBLIC_BASE_URL as string;

// Create an Axios instance
const axiosWithAuth = axios.create({
	baseURL: Platform.OS !== "web" ? "http://192.168.12.219:8081" : baseURL,
});

// Add a request interceptor to attach the Supabase access token
axiosWithAuth.interceptors.request.use(async (config) => {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (session?.access_token) {
		config.headers = config.headers || {};
		config.headers["Authorization"] = `Bearer ${session.access_token}`;
		config.headers["refresh"] = session.refresh_token;
	}
	return config;
});

export default axiosWithAuth;
