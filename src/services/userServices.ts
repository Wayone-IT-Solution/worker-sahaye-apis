import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../modals/userModal";

const JWT_SECRET = process.env.JWT_SECRET || "your_fallback_jwt_secret";

/**
 * User Service
 */
export class UserService {
  /**
   * Get user details by user ID
   */
  static async getUserById(userId: string) {
    const user = await User.findById({ _id: userId, status: true });
    return user;
  }

  /**
   * Create a new user
   */
  static async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role: string;
    status: boolean;
  }) {
    const { username, email, password, role, status } = userData;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser)
      throw new Error("User with this email or username already exists");

    const user = new User({ username, email, password, role, status });
    return await user.save();
  }

  /**
   * Login a user
   */
  static async loginUser(loginData: { email: string; password: string }) {
    const { email, password } = loginData;

    const user = await User.findOne({ email });
    if (!user) throw new Error("User not found with this email");

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw new Error("Password is incorrect");

    const token = jwt.sign(
      { _id: user._id, email: user.email, role: user.role ?? "admin" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return {
      message: "Login successful",
      token,
      user: {
        id: user._id,
        role: user?.role,
        email: user.email,
        username: user.username,
      },
    };
  }
}
