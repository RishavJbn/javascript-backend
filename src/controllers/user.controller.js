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
    //  isme humko userid milta hai 
    //  usse hum generate karte hai rt aur at 
    //  rt ko update karte hai db main 
    //  rt aur at ko return karte hai 
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


const refreshAcessToken = asyncHandler(async (req,res)=>{
  //isme hum cookies as rt nikalte hain 
   //usko decode karte hain 
   //decodet se user nikalte hain
   //compare karte hain incoming rt aur userid ka rt se db wala 
   //phir rt aur at generate karte hain 
   //iska main kab hai ki check karne rt ko aur iske baas new rt and at generate karwana 
    const incomingRefreshToken = req.body.refreshToken || req.cookies.refreshToken

     if (!incomingRefreshToken) {
        throw new ApiError(401,"unauthorized request ")
     }
    
    try {
          const decodedToken = await jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
          
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

    if (!existedUser) {
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
        //creating the data
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


const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    //find the user
    //password check
    //access and referesh token
    //send cookie
    const { email, username, password } = req.body;
    // console.log(email);

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

    //humko auth se req.user mein logged in user mil jata hai 
    //usme hum user ka rt ko delete karte hai 
    //jisse user logged out ho jayega
    // return mein at aur rt ka cookies clear kar dete hai 
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

const changePassword = asyncHandler(async (req,res) =>{
    const{oldPassword,newPassword}=req.body
    
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401,"current password is wrong or incorrect")

    }
    user.password = newPassword;
    user.save({validateBeforeSave:false})

    return res
    .status(200)
    .json(new ApiResponse(200,{},"password changed successfully"
    ))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
   
    return res.
    status(200)
    .json(new ApiResponse(200,req.user,"current user fetched successfully"))

})

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Account details updated successfully")
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path; //kyunki body mein sirf single file le rahe hai 

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Avatar image updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }

    //TODO: delete old image - assignment

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url,
            },
        },
        { new: true }
    ).select("-password");

    return res
        .status(200)
        .json(new ApiResponse(200, user, "Cover image updated successfully"));
});
// 

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAcessToken,
    getCurrentUser,
    changePassword,
};
