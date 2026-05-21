type SupabaseLikeError = {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
};

export function getSupabaseErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const supabaseError = error as SupabaseLikeError;
    return [supabaseError.message, supabaseError.details, supabaseError.hint]
      .filter(Boolean)
      .join(" ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "未知错误";
}
