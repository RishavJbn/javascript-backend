import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler( async (req,res)=>
{ console.log("hii it is working")
    res.status(200).json({ message: "ok chai aur code" });
})

export { registerUser };