import { NextRequest, NextResponse } from 'next/server';

import { ApiResponseType } from '../../../../../types';
import { Database } from '../../../../../database.types';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { simplifiedFoodConverter } from '../../../../../utils/simplified-food-converter';

export const dynamic = 'force-dynamic';

export type GetParsedIngredientResponse = ApiResponseType<typeof GET>;

export async function GET(req: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const ingredient = req.nextUrl.searchParams.get('ingredient');

  if (!ingredient) {
    return NextResponse.json({ recipe: undefined }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ recipe: undefined }, { status: 401 });
  }

  try {
    const result = await simplifiedFoodConverter(ingredient);
    return NextResponse.json({ ingredient: result.topParsedResult });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ recipe: undefined });
  }
}
