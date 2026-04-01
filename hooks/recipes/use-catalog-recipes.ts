import { GetCatalogRecipesResponse } from "@/app/api/recipes/catalog/index+api";
import axiosWithAuth from "@/lib/axiosWithAuth";
import { useQuery } from "@tanstack/react-query";

interface UseCatalogRecipesOptions {
	search?: string;
	page?: number;
}

export const useCatalogRecipes = ({
	search = "",
	page = 1,
}: UseCatalogRecipesOptions = {}) => {
	const { data, ...rest } = useQuery({
		queryKey: ["catalog-recipes", { search, page }],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (search) params.set("search", search);
			if (page > 1) params.set("page", String(page));
			const qs = params.toString();
			const response = await axiosWithAuth.get<GetCatalogRecipesResponse>(
				`/api/recipes/catalog${qs ? `?${qs}` : ""}`,
			);
			return response.data;
		},
	});

	return {
		recipes: data?.recipes,
		total: data && "total" in data ? data.total : 0,
		...rest,
	};
};
