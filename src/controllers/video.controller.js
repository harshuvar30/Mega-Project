import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";


const publishVideo = asyncHandler(async(req,res) =>{
    const {title,description} = req.body

    //CHECK IF TITLE AND DESCRIPTION ARE PROVIDED OR NOT
    if([title,description].some((field) =>{field?.trim() === ""})){
        throw new ApiError(400,"Please fill in all fields")
    }

    //Now extract video and thumbnail file paths from the body 
    const videoFileLocalPath = req.files?.videoFile[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path;
    if(!videoFileLocalPath)
        throw new ApiError(400,'Video File is requied')

    if(!thumbnailLocalPath)
        throw new ApiError(400,'Thumbnail File is required')

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    

    if(!videoFile || !thumbnail)
        throw new ApiError(400,'Failed to upload video or thumbnail')
    console.log(videoFile)
    const videoDuration = videoFile.duration
    console.log(videoDuration)
    const video = await Video.create({
        title,
        description,
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration:videoDuration,
        owner:req.user._id

    })
    
    const uploadedVideo = await Video.findById(video?._id)
    if(!uploadedVideo)
        throw new ApiError(500,"Something went wrong while creating video details in db")

    return res
    .status(201)
    .json(
      new ApiResponse ( 200,  uploadedVideo,'Video pulbish successfully!')
    )


})

const deleteVideo = asyncHandler(async(req,res) =>{
    const {videoId} = req.params
    const video = await Video.findById(videoId)
    if(!video)
        throw new ApiError(404,'Video not found')
    if(video.owner.toString() !== req.user._id.toString())
        throw new ApiError(403,'You are not allowed to delete this video')


    const videoUrl = video.videoFile;
    const thumbnailUrl = video.thumbnail;
    if (!videoUrl || !thumbnailUrl) {
      throw new ApiError(500, "video and thumbnail missing at database");
    }
    await Video.findByIdAndDelete(videoId)
    const response = Video.findById(videoId)
    await deleteFromCloudinary(video.videoFile)
    await deleteFromCloudinary(video.thumbnail)
    return res
    .status(200)
    .json(
        new ApiResponse(200,response?.[0],'Video deleted successfully!')
    )
})
const getVideoById = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    const video = await Video.findById(videoId)
    if (!video) {
        return res.status(404).json(new ApiError(404,"Video not found"));
    }
    return res
    .status(200)
    .json(new ApiResponse(200,video,"Video fetched successfully "))
})



export {
    getVideoById,
    publishVideo,
    deleteVideo
}