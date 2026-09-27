type AnyRecord = Record<string, unknown>;

function clean(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return String(value);
}

function pickText(
  record: AnyRecord,
  keys: string[]
) {
  for (const key of keys) {
    const value = clean(record[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

export function formatCourseAIContext(context: {
  course: AnyRecord;
  notes: AnyRecord[];
  resources: AnyRecord[];
}) {
  const { course, notes, resources } = context;

  const sections: string[] = [];

  sections.push(`
COURSE

Code: ${clean(course.code)}
Name: ${clean(course.name)}
Professor: ${clean(course.professor) || "Not provided"}
Room: ${clean(course.room) || "Not provided"}
Schedule: ${clean(course.schedule) || "Not provided"}
Progress: ${clean(course.progress) || "Not provided"}
Target grade: ${clean(course.target_grade) || "Not provided"}
Credits: ${clean(course.credits) || "Not provided"}
Semester: ${clean(course.semester) || "Not provided"}

Description:
${clean(course.description) || "Not provided"}
`);

  /*
   * NOTES
   */

  if (notes.length > 0) {
    sections.push(`
COURSE NOTES

${notes
  .map((note, index) => {
    const title =
      pickText(note, [
        "title",
        "name",
        "heading",
        "subject",
      ]) || `Note ${index + 1}`;

    const content =
      pickText(note, [
        "content",
        "body",
        "text",
        "note",
        "description",
      ]) || "(No note text available.)";

    return `
NOTE ${index + 1}
Title: ${title}

${content}
`;
  })
  .join("\n")}
`);
  } else {
    sections.push(`
COURSE NOTES

No course notes were found.
`);
  }

  /*
   * MATERIALS / RESOURCES
   */

  if (resources.length > 0) {
    sections.push(`
COURSE MATERIALS / RESOURCES

${resources
  .map((resource, index) => {
    const title =
      pickText(resource, [
        "title",
        "name",
        "heading",
      ]) || `Resource ${index + 1}`;

    const description =
      pickText(resource, [
        "description",
        "content",
        "body",
        "text",
      ]);

    const url =
      pickText(resource, [
        "url",
        "file_url",
        "resource_url",
      ]);

    return `
RESOURCE ${index + 1}
Title: ${title}
${description ? `Description: ${description}` : ""}
${url ? `URL: ${url}` : ""}
`;
  })
  .join("\n")}
`);
  } else {
    sections.push(`
COURSE MATERIALS / RESOURCES

No course materials were found.
`);
  }

  return sections.join("\n\n");
}