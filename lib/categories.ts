import { normalizeText } from "./textUtils";

export interface CategoryRule {
  type: string;
  params: {
    letter?: string;
    length?: number;
    words?: string[];
    suffix?: string;
    pattern?: string;
  };
}

export interface CategoryDefinition {
  name: string;
  description: string;
  rules?: CategoryRule;
  subcategories?: CategoryDefinition[];
}

export function evaluateRule(rule: CategoryRule, word: string): boolean {
  switch (rule.type) {
    case "starts_with":
      if (!rule.params.letter)
        throw new Error("Letter parameter is required for starts_with rule");
      return word.toLowerCase().startsWith(rule.params.letter.toLowerCase());

    case "ends_with":
      if (!rule.params.suffix)
        throw new Error("Suffix parameter is required for ends_with rule");
      return word.toLowerCase().endsWith(rule.params.suffix.toLowerCase());

    case "contains":
      if (!rule.params.pattern)
        throw new Error("Pattern parameter is required for contains rule");
      return word.toLowerCase().includes(rule.params.pattern.toLowerCase());

    case "length":
      if (!rule.params.length)
        throw new Error("Length parameter is required for length rule");
      return word.length === rule.params.length;

    case "max_length":
      if (!rule.params.length)
        throw new Error("Length parameter is required for max_length rule");
      return word.length <= rule.params.length;

    case "min_length":
      if (!rule.params.length)
        throw new Error("Length parameter is required for min_length rule");
      return word.length >= rule.params.length;

    case "in_set":
      if (!rule.params.words)
        throw new Error("Words parameter is required for in_set rule");
      return new Set(
        rule.params.words.map((w: string) => normalizeText(w)),
      ).has(word);

    default:
      throw new Error(`Unknown rule type: ${rule.type}`);
  }
}

// Import categories from JSON files
import englishCategoriesData from "../data/categories-en.json";
import frenchCategoriesData from "../data/categories-fr.json";

export const englishCategories: CategoryDefinition[] = englishCategoriesData;
export const frenchCategories: CategoryDefinition[] = frenchCategoriesData;
