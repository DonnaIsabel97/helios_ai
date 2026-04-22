import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import pool from "../db/connection.js";

const generateToken = (id, role) => {
    return jwt.sign({id, role}, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });
};

export const registerUser = async (req, res, next) => {
    try{
        const {full_name, email, password, role} = req.body;

        if (!full_name || !email || !password || !role) {
            res.status(400);
            throw new Error("All filed are required");
        }

        const existingUserResult = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [email]
        );

        if (existingUserResult.rows.length > 0) {
            res.status(400);
            throw new Error("User already exists");
        }

        const password_hash = await bcrypt.hash(password, 10);

        const newUserResult = await pool.query(
            `INSERT INTO users (full_name, email, password_hash, role) 
            VALUES ($1, $2, $3, $4)
            RETURNING id, full_name, email, role`,
            [full_name, email, password_hash, role]    
        );

        const newUser = newUserResult.rows[0];

        res.status(201).json({
            id: newUser.id,
            full_name: newUser.full_name,
            email: newUser.email,
            role: newUser.role,
            token: generateToken(newUser.id, newUser.role)
        });

    } catch (error){
        next(error);
    }
};

export const loginUser = async (req, res, next) => {
    try {
        const {email, password} = req.body;

        if (!email || !password){
            res.status(400);
            throw new Error ("Email and password are required");
        }

        const userResult = await pool.query(
            `SELECT id, full_name, email, password_hash, role FROM users WHERE email=$1`,
            [email]
        );

        if (userResult.rows.length === 0){
            res.status(401)
            throw new Error ('Invalid credentials')
        }

        const user = userResult.rows[0];

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            res.status(401)
            throw new Error ("Invalid credentials")
        }

        res.status(200).json({
            id : user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            token: generateToken(user.id, user.role),
        });
    } catch (error) {
        next(error);
    }
};

export const getCurrentUser = async (req, res, next) => {
    try {
        const userResult = await pool.query(
            `SELECT id, full_name, email, role, created_at FROM users WHERE id=$1`,
            [req.user.id]
        );

        if (userResult.rows.length === 0){
            res.status(404);
            throw new Error ("User not found");
        }

        res.status(200).json(userResult.rows[0]);
    } catch (error) {
        next(error);
    }
};