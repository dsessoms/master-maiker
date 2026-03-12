import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import axiosWithAuth from "@/lib/axiosWithAuth";

export type Cuisine = {
	id: number;
	name: string;
};

export type Diet = {
	id: number;
	name: string;
};

export type DishType = {
	id: number;
	name: string;
};

export type Tag = {
	id: number;
	name: string;
};

export function useCuisines() {
	return useQuery({
		queryKey: ["cuisines"],
		queryFn: async () => {
			const { data } = await axiosWithAuth.get<Cuisine[]>(
				"/api/recipes/classifications/cuisines",
			);
			return data;
		},
		staleTime: 1000 * 60 * 60, // 1 hour - cuisines rarely change
	});
}

export function useDiets() {
	return useQuery({
		queryKey: ["diets"],
		queryFn: async () => {
			const { data } = await axiosWithAuth.get<Diet[]>(
				"/api/recipes/classifications/diets",
			);
			return data;
		},
		staleTime: 1000 * 60 * 60, // 1 hour
	});
}

export function useDishTypes() {
	return useQuery({
		queryKey: ["dish-types"],
		queryFn: async () => {
			const { data } = await axiosWithAuth.get<DishType[]>(
				"/api/recipes/classifications/dish-types",
			);
			return data;
		},
		staleTime: 1000 * 60 * 60, // 1 hour
	});
}

export function useTags() {
	return useQuery({
		queryKey: ["tags"],
		queryFn: async () => {
			const { data } = await axiosWithAuth.get<Tag[]>(
				"/api/recipes/classifications/tags",
			);
			return data;
		},
		staleTime: 1000 * 60 * 5, // 5 minutes - tags are user-generated and change more often
	});
}

export function useDeleteTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (tagId: number) => {
			const { data } = await axiosWithAuth.delete(
				`/api/recipes/classifications/tags?id=${tagId}`,
			);
			return data;
		},
		onSuccess: () => {
			// Invalidate tags query to refetch the list
			queryClient.invalidateQueries({ queryKey: ["tags"] });
		},
	});
}
