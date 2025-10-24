import storage from "./storage";

export const handleReceiptUpload = async (file: Express.Multer.File) => {
  // Placeholder logic – save file metadata to DB or process it as needed
  console.log("Uploaded receipt:", file.filename);
  return {
    message: "Receipt processed successfully",
    filePath: file.path,
  };
};

export default handleReceiptUpload;
