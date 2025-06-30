"use server";

// Dummy file upload action for compatibility
export const getGcsSignedUrl = async (_file: File) => {
  await Promise.resolve();
  console.warn("File upload not implemented in QA³");
  return {
    url: "",
    error: "File upload not available in QA³"
  };
};