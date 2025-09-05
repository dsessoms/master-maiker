import { NextRequest, NextResponse } from 'next/server';

import { searchFoodV2 } from '../../_helper/fat-secret-helper';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Database } from '../../../../../database.types';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const supabase = createRouteHandlerClient<Database>({ cookies });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(null, { status: 401 });
  }

  const result = await searchFoodV2(
    request.nextUrl.searchParams.get('query') as string
  );

  if (result.error) {
    Sentry.captureException(result.error.message);
    return NextResponse.json(null, { status: 429 });
  }

  return NextResponse.json(result);
}
