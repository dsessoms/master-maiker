import { ApiResponseType, ExpandedRecipe } from '../../../../types';
import { NextRequest, NextResponse } from 'next/server';

import { Database } from '../../../../database.types';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export interface PostBatchRecipesRequest {
  type: 'GET';
  recipeIds: string[];
}
export type PostBatchRecipesResponse = NonNullable<
  ApiResponseType<typeof POST>
>;

export async function POST(req: NextRequest): Promise<
  NextResponse<{
    recipes: ExpandedRecipe[];
  }>
> {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ recipes: [] }, { status: 401 });
  }

  // get body
  const { recipeIds } = (await req.json()) as PostBatchRecipesRequest;

  // get recipes
  const { data, error, status } = await supabase
    .from('recipe')
    .select(
      `*,
      macros:recipe_macros (*),
      ingredient (
        *,
        food (
          *,
          food_id:fat_secret_id,
          serving(*)
        ),
        serving (serving_id:fat_secret_id, *)
      ),
      instruction (*)
      `
    )
    .in('id', recipeIds)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ recipes: [] }, { status });
  }

  return NextResponse.json({ recipes: data });
}
