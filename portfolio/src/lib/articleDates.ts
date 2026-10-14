type Dates = {
	published: boolean;
	date?: Date | string;
	updated?: Date | string;
};

function validDate(value?: Date | string) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isFinite(date.valueOf()) ? date : null;
}

export function articleDates(data: Dates) {
	// Draft scheduling dates are not publication events.
	const published = data.published ? validDate(data.date) : null;
	const revision = data.published ? validDate(data.updated) : null;
	return {
		published,
		updated: published && revision && revision > published ? revision : null,
	};
}

export function formatArticleDate(date: Date, lang: "en" | "es") {
	return date.toLocaleDateString(lang === "es" ? "es-ES" : "en-GB", {
		year: "numeric",
		month: "long",
		day: "numeric",
		timeZone: "UTC",
	});
}
