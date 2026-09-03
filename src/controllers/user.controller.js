import asyncHandler  from '../utils/asyncHandler.js'
import ApiError from '../utils/ApiError.js'
import { validate } from "email-validator"
import { User } from "../models/user.model.js"
import uploadOnCLoudinary from "../utils/cloudinary.js"
import ApiResponse from "../utils/ApiResponse.js"

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
  const coverImageLocalPath = req.files?.coverImage[0]?.path

  if (
    [fullName, username, email, password].some((field) =>
    field?.trim() === "" )
  ){
    throw new ApiError(400, "All fields are required.")
  } 
  if(avatarLocalPath){
    throw new ApiError(400, "Avatar file is required.")
  }
  if (!validate(email)){
    throw new ApiError(400, "Invalid email.")
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists.")
  }

  const avatar = await uploadOnCLoudinary(avatarLocalPath)
  const coverImage = await uploadOnCLoudinary(coverImageLocalPath)

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

  if (createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user")
  }
   
  return res.status(201).json(
    new ApiResponse(201, createdUser, "User registered successfully.")
  )


})

export default registerUser