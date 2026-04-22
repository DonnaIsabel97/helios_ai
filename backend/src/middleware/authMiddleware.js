import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = decoded;
      next();
      return;
    } catch (error) {
      res.status(401);
      next(new Error("Not authorized, token failed"));
      return;
    }
  }

  res.status(401);
  next(new Error("Not authorized, no token"));
};