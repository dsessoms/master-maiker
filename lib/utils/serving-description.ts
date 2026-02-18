import { FoodRow } from "@/types";
import { Fraction } from "fraction.js";

/**
 * Matches: 1/4 crust (half cooked)
 * group 1 - descriptionMultiplier: number ex: 5 | 1/4 | .25 | undefined
 * group 2 - description: serving size ex: crust
 * group 3 - extra: extra meta ex: (half cooked) | undefined
 */
const fatSecretServingRegex =
	/^((?<descriptionMultiplier>[0-9]*\s[0-9]*\/[0-9]*|[0-9]*|[0-9]*\/[0-9]*|\.[0-9]*)\s)*(?<description>[^\(^,]+)\s*(?<extra>\(.*\)|,.*)*$/;

/**
 * Unicode superscript characters for building fractions
 */
const superscript: Record<string, string> = {
	"0": "⁰",
	"1": "¹",
	"2": "²",
	"3": "³",
	"4": "⁴",
	"5": "⁵",
	"6": "⁶",
	"7": "⁷",
	"8": "⁸",
	"9": "⁹",
};

/**
 * Unicode subscript characters for building fractions
 */
const subscript: Record<string, string> = {
	"0": "₀",
	"1": "₁",
	"2": "₂",
	"3": "₃",
	"4": "₄",
	"5": "₅",
	"6": "₆",
	"7": "₇",
	"8": "₈",
	"9": "₉",
};

/**
 * Unicode fraction slash character
 */
const slash = "⁄";

/**
 * Common fractions mapped to Unicode characters
 */
const fractions: Record<string, string> = {
	"1/2": "½",
	"1/3": "⅓",
	"2/3": "⅔",
	"1/4": "¼",
	"3/4": "¾",
	"1/5": "⅕",
	"2/5": "⅖",
	"3/5": "⅗",
	"4/5": "⅘",
	"1/6": "⅙",
	"5/6": "⅚",
	"1/7": "⅐",
	"1/8": "⅛",
	"3/8": "⅜",
	"5/8": "⅝",
	"7/8": "⅞",
	"1/9": "⅑",
	"1/10": "⅒",
};

/**
 * Reduce a fraction to its simplest form
 */
function reduce(numerator: number, denominator: number): [number, number] {
	function gcd(a: number, b: number): number {
		return b ? gcd(b, a % b) : a;
	}
	const divisor = gcd(numerator, denominator);
	return [numerator / divisor, denominator / divisor];
}

/**
 * Converts a fraction to a nicely formatted Unicode representation
 */
export function getFraction(numerator: string, denominator: string): string {
	const num = numerator.trim();
	const den = denominator.trim();

	// Check if we have a common fraction
	if (fractions[num + "/" + den]) {
		return fractions[num + "/" + den];
	}

	// Try to reduce if both are numeric
	if (den !== "0" && /^\d+$/.test(num) && /^\d+$/.test(den)) {
		const [reducedNum, reducedDen] = reduce(parseInt(num), parseInt(den));
		const key = reducedNum + "/" + reducedDen;
		if (fractions[key]) {
			return fractions[key];
		}

		// Build using superscript/subscript
		let numOut = "";
		let denOut = "";

		reducedNum
			.toString()
			.split("")
			.forEach((val) => {
				numOut += superscript[val] || val;
			});

		reducedDen
			.toString()
			.split("")
			.forEach((val) => {
				denOut += subscript[val] || val;
			});

		return numOut + slash + denOut;
	}

	// Fall back to building with super/subscript
	let numOut = "";
	let denOut = "";

	num.split("").forEach((val) => {
		numOut += superscript[val] || val;
	});

	den.split("").forEach((val) => {
		denOut += subscript[val] || val;
	});

	return numOut + slash + denOut;
}

/**
 * Get a formatted serving description with fancy Unicode fractions
 * @param numberOfServings - Number of servings to display
 * @param serving - Serving object with measurement details
 * @returns Formatted serving description string
 */
export function getServingDescription(
	numberOfServings: number,
	serving: {
		measurement_description: string | null;
		number_of_units: number | null;
		serving_description?: string | null;
	},
	food: {
		fat_secret_id?: number | null;
		food_type?: FoodRow["food_type"] | null;
	},
): string {
	let description =
		food.food_type === "Generic"
			? serving.measurement_description
			: serving.serving_description;

	let descriptionMultiplier = 1;
	let totalUnits = numberOfServings * (serving.number_of_units || 1);

	if (food.fat_secret_id != null && description) {
		const found = fatSecretServingRegex.exec(description);

		if (found) {
			const groups = found.groups as {
				descriptionMultiplier?: string;
				description?: string;
				extra?: string;
			};
			descriptionMultiplier = new Fraction(
				groups.descriptionMultiplier ?? 1,
			).valueOf();
			description = groups.description ?? description;

			totalUnits =
				numberOfServings *
				Number(serving.number_of_units) *
				descriptionMultiplier;
		}
	}

	// Use fancy fractions
	const fraction = new Fraction(totalUnits).simplify();

	// Get the whole number and fractional parts
	const wholeNumber = Math.floor(fraction.valueOf());
	const fractionalPart = fraction.sub(wholeNumber);

	let totalUnitsFractionString = "";

	// Build the display string
	if (wholeNumber > 0) {
		totalUnitsFractionString = wholeNumber.toString();
		if (fractionalPart.valueOf() > 0) {
			totalUnitsFractionString +=
				" " +
				getFraction(fractionalPart.n.toString(), fractionalPart.d.toString());
		}
	} else if (fractionalPart.valueOf() > 0) {
		totalUnitsFractionString = getFraction(
			fractionalPart.n.toString(),
			fractionalPart.d.toString(),
		);
	} else {
		totalUnitsFractionString = "0";
	}

	return serving.measurement_description
		? `${totalUnitsFractionString} ${serving.measurement_description}`
		: totalUnitsFractionString;
}
