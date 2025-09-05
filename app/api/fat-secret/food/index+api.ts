import * as Sentry from "@sentry/nextjs";

import { NextRequest, NextResponse } from "next/server";

import { ApiResponseType } from "../../../../types";
import { Database } from "../../../../database.types";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { getFoodItem } from "../_helper/fat-secret-helper";

export const dynamic = "force-dynamic";

export type GetFoodResponse = NonNullable<ApiResponseType<typeof GET>>;

export async function GET(request: NextRequest) {
	const supabase = createRouteHandlerClient<Database>({ cookies });

	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		return NextResponse.json(null, { status: 401 });
	}

	const fatSecretId = request.nextUrl.searchParams.get("fatSecretId");

	if (!fatSecretId) {
		return NextResponse.json(null, { status: 400 });
	}

	const result = await getFoodItem(fatSecretId);
	if (result.error) {
		Sentry.captureException(result.error.message);
		return NextResponse.json(null, { status: 429 });
	}

	const food = result.food;

	return NextResponse.json({ food });
}
