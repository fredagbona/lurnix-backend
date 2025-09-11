import jwt from "jsonwebtoken";
import { JWTPayload } from "../types/auth.js";

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Custom error classes
export class JWTError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JWTError";
  }
}

export class TokenExpiredError extends JWTError {
  constructor() {
    super("Token has expired");
    this.name = "TokenExpiredError";
  }
}

export class InvalidTokenError extends JWTError {
  constructor() {
    super("Invalid token");
    this.name = "InvalidTokenError";
  }
}

// Generate JWT access token
export function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): string {
  try {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
  } catch (error) {
    throw new JWTError("Failed to generate token");
  }
}

// Generate refresh token (longer expiration)
export function generateRefreshToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): string {
  try {
    return jwt.sign({ ...payload, type: "refresh" }, JWT_SECRET, {
      expiresIn: "7d",
    });
  } catch (error) {
    throw new JWTError("Failed to generate refresh token");
  }
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError();
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new InvalidTokenError();
    } else {
      throw new JWTError("Token verification failed");
    }
  }
}

// Decode token without verification (for debugging)
export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Check if token is expired without throwing error
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    return Date.now() >= decoded.exp * 1000;
  } catch (error) {
    return true;
  }
}

// Extract token from Authorization header
export function extractTokenFromHeader(
  authHeader: string | undefined
): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

// Generate token pair (access + refresh)
export function generateTokenPair(payload: Omit<JWTPayload, "iat" | "exp">) {
  return {
    accessToken: generateToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}
