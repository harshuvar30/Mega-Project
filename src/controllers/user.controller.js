//  import req from "express/lib/request.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
const generateAccessAndRefreshToken = async (userId) =>{
    try {
        console.log(userId)
        const user = await User.findById(userId)
        // console.log(user)
        const accessToken =  user.generateAccessToken()
        const refreshToken =  user.generateRefreshToken()
        // console.log("accesToken is ",accessToken)
        // console.log("refreshToken is ",refreshToken)
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new  ApiError(500,"Something went wrong while generating access token!")
    }
}
 const registerUser = asyncHandler(async (req,res) =>{
    // get user details from frontend
    // validation - field should not be empty
    // check if user already exists: username or email
    // check for images , check for avatar
    // upload them to cloudinary avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response
    console.log(req.body)

    const {fullname, email,username, password} = req.body
    console.log("email: ",email)
    // if(fullname === ""){
    //     throw new ApiError(400,"fullname is required")
    // }
    if(
        [fullname,email,username,password].some((field)=>
            {field?.trim() === "" })
    ){
        throw new ApiError(400,"all fields are requied")
    }
   const existedUser = await User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"user with this email or username already exist")
    }
    console.log(req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0)
        coverImageLocalPath = req.files?.coverImage[0]?.path;

    if(!avatarLocalPath)
        throw new ApiError(400,'Avatar files is required')

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar)
        throw new ApiError(400,"Avatar files is required");

    const user = await  User.create({
        fullname,
        avatar:avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser)
        throw new ApiError(500,"Something went wrong while registring the user")

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User register successfully")
    )
 })

 const loginUser = asyncHandler(async (req,res)=>{
    // validate user if registered

    const {username,email,password} = req.body
    if(!username && !email)
        throw new ApiError(400,"username or email is required")
    if(!password)
        throw new ApiError(400,"password is required")

    const user = await User.findOne({
        $or: [{ username: username }, { email: email }]
      });
      
    if(!user)
        throw new ApiError(404,"No user found with given username or email")

    const isValidPassword = await user.isPasswordCorrect(password);
    if(!isValidPassword)
        throw new ApiError(401,"Wrong  password!")
   const  {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)
    
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

   const options = {
    httpOnly:true,
    secure:true
   }

   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(new ApiResponse(200,
    {
    user:loggedInUser,accessToken,refreshToken
    },
    "User logged in successfully"))


 })

 const logoutUser = asyncHandler(async (req,res) =>{
    // remove cookies
    // res.clearCookie("accessToken");
   await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: { refreshToken: undefined },
        },
        { new: true }
    )
    const options={
        httpOnly:true,
        secure:true
    }
    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User logged out"));
 })

 const refreshAccessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unathorized request")
    }
    try {
        const decoded = jwt
        .verify
        (incomingRefreshToken,
        process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decoded?._id)
        if(!user){
            throw new ApiError(401,"Invalid refresh token")
        }
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
        }
        const options={
            httpOnly:true,
            secure:true
        }
        const {accessToken,newRefreshToken} = generateAccessAndRefreshToken(user._id)

        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken:newRefreshToken},
                "Access token refreshed successfully"
            )
        )


    } catch (error) {
        throw new ApiError(401,error?.message||"Invalid refresh token!!")
    }
 })
  

 export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
 }