import asyncHandler  from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { validate } from "email-validator"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js"

const generateAccessAndRefreshToken = async(userId) => {
  try {
    const user = await User.findById(userId)
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
    
    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})

    return {accessToken, refreshToken}

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    
  }
}

const registerUser = asyncHandler(async (req,res) => {
  // get user details from frontend 
  // validation - not empty
  // check if user already exists - username, email
  // check for avatar and coverimage
  // upload them to cloudinary, avatar 
  // create user object on mongoDB
  // remove password and refresh token field from response 
  // check for user creation 
  // return response

  const {username, email, fullName, password} = req.body
  
  const avatarLocalPath = req.files?.avatar[0]?.path
  let coverImageLocalPath;

  if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
  }

  if (
    [fullName, username, email, password].some((field) =>
    field?.trim() === "" )
  ){
    throw new ApiError(400, "All fields are required.")
  } 
  console.log(avatarLocalPath)
  console.log(coverImageLocalPath)
  if (!validate(email)){
    throw new ApiError(400, "Invalid email.")
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists.")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!avatar){
    throw new ApiError(400, "Avatar file is required.")
  }

  const user = await User.create({
    fullName, 
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    username: username.toLowerCase(),
    email,
    password

  })

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }
   
  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully.")
  )


})

const loginUser = asyncHandler(async (req,res) => {
  // get username and password 
  // check if given username exists and password matches with the encrypted password in database 
  // provide user an access and a refresh token 
  // store the refresh token in the database

  const {email, username, password} = req.body 

  if (!(username || email)){
    throw new ApiError(400, "username or email is required")
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  })

  if (!user) {
    throw new ApiError(404, "User does not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
  }

  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200, 
      {
        user: loggedInUser, accessToken,
        refreshToken
      },
      "User logged in successfully"
    )
  )
})

const logoutUser = asyncHandler( async(req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged out"))
})


export {
  registerUser,
  loginUser,
  logoutUser
}
