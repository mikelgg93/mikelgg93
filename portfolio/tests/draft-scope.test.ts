import { expect, test } from "bun:test";
import { visibleInBuild } from "../src/lib/draft-scope";

test("article previews include published posts and only their own bilingual draft", () => {
	const ids = [
		"webgl-eye-03-lens",
		"webgl-eye-04-retina",
		"webgl-eye-05-models",
	];
	for (const branch of ids) {
		expect(visibleInBuild("webgl-eye-02-pupil", true, true, branch)).toBe(true);
		for (const id of ids)
			for (const suffix of ["", "-es"]) {
				expect(visibleInBuild(id + suffix, false, true, branch)).toBe(
					id === branch,
				);
				expect(visibleInBuild(id + suffix, false, false, branch)).toBe(false);
			}
	}
	expect(
		visibleInBuild(ids[0]!, false, true, "review/pupil-science-and-rendering"),
	).toBe(true);
	expect(visibleInBuild(ids[0]!, false, false, "master")).toBe(false);
});
