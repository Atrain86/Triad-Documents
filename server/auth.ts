import bcrypt from "bcryptjs";
import storage from "./storage";

export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

// Example export to show usage
export default {
  hashPassword,
  comparePassword,
  storage,
};
