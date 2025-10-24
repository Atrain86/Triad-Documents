import passport from "passport";
import memoize from "memoizee";
import storage from "./storage";

export const configureAuth = () => {
  console.log("Replit authentication disabled in local mode.");
  return passport;
};

export default configureAuth;
