import { supabase } from "@/lib/supabase";

export type HomeworkStatus =
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "completed"
  | "archived";

export type Homework = {
  id: string;
  user_id: string;
  course_id: string | null;
  assignment_id: string | null;

  title: string;
  description: string;

  file_name: string | null;
  file_path: string | null;
  file_type: string | null;
  file_size: number | null;

  status: HomeworkStatus;

  ai_summary: string;
  ai_solution: string;
  ai_explanation: string;
  ai_hints: string[];

  created_at: string;
  updated_at: string;
};

export async function getHomework() {
  const { data, error } = await supabase
    .from("homework")
    .select("*")
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Homework[];
}

export async function getHomeworkById(id: string) {
  const { data, error } = await supabase
    .from("homework")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Homework;
}

export async function createHomework(input: {
  title: string;
  description?: string;
  course_id?: string | null;
  assignment_id?: string | null;
  file_name?: string | null;
  file_path?: string | null;
  file_type?: string | null;
  file_size?: number | null;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be logged in.");
  }

  if (!input.title.trim()) {
    throw new Error("Homework title is required.");
  }

  const { data, error } = await supabase
    .from("homework")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      description: input.description || "",
      course_id: input.course_id || null,
      assignment_id: input.assignment_id || null,
      file_name: input.file_name || null,
      file_path: input.file_path || null,
      file_type: input.file_type || null,
      file_size: input.file_size || null,
      status: "uploaded",
    })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Homework;
}

export async function updateHomework(
  id: string,
  changes: Partial<{
    title: string;
    description: string;
    course_id: string | null;
    assignment_id: string | null;
    status: HomeworkStatus;
    ai_summary: string;
    ai_solution: string;
    ai_explanation: string;
    ai_hints: string[];
    file_name: string | null;
    file_path: string | null;
    file_type: string | null;
    file_size: number | null;
  }>
) {
  const { data, error } = await supabase
    .from("homework")
    .update({
      ...changes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Homework;
}

export async function deleteHomework(id: string) {
  const homework = await getHomeworkById(id);

  if (homework.file_path) {
    await supabase.storage
      .from("homework")
      .remove([homework.file_path]);
  }

  const { error } = await supabase
    .from("homework")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function uploadHomeworkFile(
  file: File,
  homeworkId: string
) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(
      `Authentication error: ${authError.message}`
    );
  }

  if (!user) {
    throw new Error("You must be logged in.");
  }

  if (!file) {
    throw new Error("No file was selected.");
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");

  const path =
    `${user.id}/${homeworkId}/${safeName}`;

  console.log("1. Uploading file:", path);

  const { error: uploadError } =
    await supabase.storage
      .from("homework")
      .upload(path, file, {
        contentType:
          file.type ||
          "application/octet-stream",
        upsert: false,
      });

  if (uploadError) {
    console.error(
      "Storage upload failed:",
      uploadError
    );

    throw new Error(
      `Storage upload failed: ${uploadError.message}`
    );
  }

  console.log(
    "2. Storage upload successful"
  );

  /*
   * Update the homework database row.
   */
  const { data: updatedHomework, error: updateError } =
    await supabase
      .from("homework")
      .update({
        file_path: path,
        file_name: file.name,
        file_type:
          file.type || null,
        file_size: file.size,
        updated_at:
          new Date().toISOString(),
      })
      .eq("id", homeworkId)
      .eq("user_id", user.id)
      .select("*")
      .single();

  if (updateError) {
    console.error(
      "Database update failed:",
      updateError
    );

    await supabase.storage
      .from("homework")
      .remove([path]);

    throw new Error(
      `Could not attach file to homework: ${updateError.message}`
    );
  }

  console.log(
    "3. Database updated:",
    updatedHomework
  );

  /*
   * Verify the actual database value.
   */
  if (!updatedHomework.file_path) {
    console.error(
      "CRITICAL: file_path is still empty:",
      updatedHomework
    );

    await supabase.storage
      .from("homework")
      .remove([path]);

    throw new Error(
      "The file uploaded, but StudySpace could not attach it to the homework record."
    );
  }

  console.log(
    "4. File successfully attached:",
    updatedHomework.file_path
  );

  return updatedHomework as Homework;
}

export async function getHomeworkDownloadUrl(
  filePath: string
) {
  const { data, error } = await supabase.storage
    .from("homework")
    .createSignedUrl(filePath, 60 * 10);

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}