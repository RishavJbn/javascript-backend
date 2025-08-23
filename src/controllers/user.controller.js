import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"

const options = {
    httponly: true,
    secure: true,
};

const generateAccessandRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAcessToken();
        const refreshToken = user.generateRefreshToken();

        //update the refresh token in the user data base
        user.refreshToken = refreshToken;
        // By default, Mongoose checks all fields in the User schema before saving.
        // Setting validateBeforeSave: false stops this validation, since we're only updating refreshToken.
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "something went wrong while generating tokens "
        );
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body;
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some(
            (field) => !field || field?.trim() === ""
        )
    ) {
        console.log("All fields are required");
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        );
});

const refreshAcessToken = asyncHandler(async (req,res)=>{

    const incomingRefreshToken = req.body.refreshToken || req.cookies.refreshToken

     if (!incomingRefreshTokenx) {
        throw new ApiError(401,"unauthorized request ")
     }
    
    try {
          const decodedToken = await jwt.verify(incomingRefreshToken,process.env.ACCESS_TOKEN_SECRET)
          
          const user = await User.findById(decodedToken?._id)
    
          if (!user) {
            throw new ApiError(401,"invalid refresh token ")
          }
    
          if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"refresh token is expired ")
          }
        
        const {accessToken,refreshToken: newrefreshToken} = await generateAccessandRefreshTokens(user._id)
    
          return res.status(200)
          .cookies("newrefreshToken",refreshToken,options)
          .cookies("accessToken",accessToken,options)
          .json(new ApiResponse(200,{accessToken,refreshToken:newrefreshToken},"refresh token is generated "))
    
    } catch (error) {
        throw new ApiError(401,error?.message || "invalid refresh token")
    }
})

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    //find the user
    //password check
    //access and referesh token
    //send cookie
    const { email, username, password } = req.body;
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")

    // }

    const user = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged In Successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    //refresh token ko undefined kar denge
    //clear cookies
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
            },
        },
        {
            new: true,
        }
    );

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out "));
});

// const updateUser = asynchandler(async (req,res ) =>{
//     const {username , email,password, fullname } = req.body
    


// })

export { registerUser, loginUser, logoutUser,refreshAcessToken };
