import FileUpload from "../modals/fileupload.model";
import { deleteFromS3 } from "../config/s3Uploader";

/**
 * Upsert file upload with create-first-then-update pattern
 * If file with same tag and userId exists -> UPDATE it
 * If file doesn't exist -> CREATE it
 * Always deletes old S3 file when updating
 */
export const upsertFileUpload = async (
  userId: string,
  tag: string,
  fileData: {
    s3Key: string;
    url: string;
    sizeInBytes?: number;
    mimeType?: string;
    originalName?: string;
  }
) => {
  try {
    // Check if file with same tag already exists for this user
    const existingFile = await FileUpload.findOne({ userId, tag });

    if (existingFile) {
      // UPDATE: Delete old S3 file if s3Key is different
      if (existingFile.s3Key !== fileData.s3Key) {
        try {
          await deleteFromS3(existingFile.s3Key);
          console.log(`✅ Deleted old S3 file: ${existingFile.s3Key}`);
        } catch (deleteError) {
          console.error(`⚠️ Failed to delete old S3 file: ${deleteError}`);
          // Continue with update even if S3 deletion fails
        }
      }

      // Update the existing record
      const updatedFile = await FileUpload.findByIdAndUpdate(
        existingFile._id,
        {
          s3Key: fileData.s3Key,
          url: fileData.url,
          sizeInBytes: fileData.sizeInBytes,
          mimeType: fileData.mimeType,
          originalName: fileData.originalName,
        },
        { new: true }
      );

      console.log(`✅ Updated existing file with tag '${tag}' for user ${userId}`);
      return {
        success: true,
        isNew: false,
        data: updatedFile,
        message: "File updated successfully",
      };
    }

    // CREATE: File doesn't exist, create new one
    const newFile = await FileUpload.create({
      userId,
      tag,
      s3Key: fileData.s3Key,
      url: fileData.url,
      sizeInBytes: fileData.sizeInBytes,
      mimeType: fileData.mimeType,
      originalName: fileData.originalName,
    });

    console.log(`✅ Created new file with tag '${tag}' for user ${userId}`);
    return {
      success: true,
      isNew: true,
      data: newFile,
      message: "File created successfully",
    };
  } catch (error) {
    console.error(`❌ Error in upsertFileUpload: ${error}`);
    throw error;
  }
};

/**
 * Upsert multiple files in parallel
 */
export const upsertMultipleFileUploads = async (
  userId: string,
  files: Array<{
    s3Key: string;
    url: string;
    tag: string;
    sizeInBytes?: number;
    mimeType?: string;
    originalName?: string;
  }>
) => {
  const results = await Promise.all(
    files.map((file) =>
      upsertFileUpload(userId, file.tag, {
        s3Key: file.s3Key,
        url: file.url,
        sizeInBytes: file.sizeInBytes,
        mimeType: file.mimeType,
        originalName: file.originalName,
      })
    )
  );

  return results;
};
