import { GetShoppingListsResponse } from "@/app/api/shopping-lists/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { useQuery } from "@tanstack/react-query";

export const useShoppingLists = () => {
	const { data, ...rest } = useQuery({
		queryKey: ["shopping-lists"],
		queryFn: async () => {
			const response = await axiosWithAuth.get<GetShoppingListsResponse>(
				"/api/shopping-lists",
			);
			return response.data.lists;
		},
	});

	return {
		lists: data,
		...rest,
	};
};
