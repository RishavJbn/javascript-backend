import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");
        //we are using req.header("Authorization") for phone apps because token is sent in zips in phone
        // Authorization: Bearer <token>
        // this is the format of jwt token

        if (!token) {
            throw new ApiError(401, "Unauthorized request ");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); //vverify

        const user = await User.findById(decodedToken?._id).select(
            "-password -refreshToken"
        ); //here _id is from user.model  generatereacesstoken

        if (!user) {
            throw new ApiError(401, "Invalid Acess token");
        }

        req.user = user; //we are updating it from our user
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid access token ");
    }
});
