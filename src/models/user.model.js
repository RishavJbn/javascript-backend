import mongoose, { model, Schema } from "mongoose";
import bcrypt from "bcrypt"; 
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String,
            required: true,
        },
        coverImage: {
            type: String,
        },
        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: "Video",
            },
        ],  //[] because there will be multiple videos so we store it in array 
        password: {
            type: String,
            required: [true, "Password is required"], //it another way of writing  where if it is not true than it will display the message that is password is required
        },
        refreshToken: {
            type: String,
        },
    },
    { timestamps: true } // it gives as createdAt and updatedAt fields
);


//pre is nodejs middleware which is used to perform actions before saving a document
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); //isModified is a mongoose method that checks if a specific field has been modified

    this.password = await bcrypt.hash(this.password, 10); // bcrypt.hash is used to hash the password before saving it to the database , hashing means converting the original password into a secure format
    next(); // then we move to the next middleware
});

userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAcessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    );
};

userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    );
};

export const User = model("User", userSchema);
