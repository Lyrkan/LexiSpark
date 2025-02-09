import { CategoryDefinition } from "../lib/categories";

declare module "../data/categories-en.json" {
  const value: CategoryDefinition[];
  export default value;
}

declare module "../data/categories-fr.json" {
  const value: CategoryDefinition[];
  export default value;
}
