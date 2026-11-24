import { describe } from "vitest";

export const describeDatabase = process.env.TEST_DATABASE_URL ? describe : describe.skip;
