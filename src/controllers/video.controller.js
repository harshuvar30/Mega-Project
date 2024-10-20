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
const updateVideo = asyncHandler(async(req,res)=>{
    const {videoId} = req.params
    const videoDetails = await Video.findById(videoId)
    if(!videoDetails)
        throw new ApiError(404,'Video not found')
    const oldVideoThumbnail = videoDetails.thumbnail
    console.log("This is link of old thumbnail = ",oldVideoThumbnail)
    await deleteFromCloudinary(oldVideoThumbnail)
    const thumbnailLocalPath = req.file?.path
    console.log("this is the link of new Thumbnail = ",thumbnailLocalPath)

    if(!thumbnailLocalPath)
        throw new ApiError(400,'Thumbnail file is missing')

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail)
        throw new ApiError(500,'Failed to upload thumbnail')
    const video = await Video.findByIdAndUpdate(videoId,{
        $set:{
            thumbnail:thumbnail.url
        }
    },{new:true})

    return res
    .status(200)
    .json(
        new ApiResponse(200,video,"Video updated successfully")
    )
})
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query = '', sortBy = 'createdAt', sortType = 'desc', userId } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Build the match filter (for search or filtering by user)
    const match = {
        isPublished: true, // To ensure only published videos are returned
        $or: [
            { title: { $regex: query, $options: "i" } }, // Case-insensitive search by title
            { description: { $regex: query, $options: "i" } } // Case-insensitive search by description
        ]
    };

    // If userId is provided, filter videos by the owner (user)
    if (userId) {
        match.owner = userId;
    }

    try {
        // Fetch videos with pagination, sorting, and filtering
        const videos = await Video.find(match)
            .sort({ [sortBy]: sortType === 'asc' ? 1 : -1 }) // Sorting
            .skip((pageNumber - 1) * limitNumber) // Pagination
            .limit(limitNumber)
            .populate('owner', 'username fullname avatar'); // Populate owner details

        // Count total documents for pagination
        const totalVideos = await Video.countDocuments(match);

        return res.status(200).json(
           new ApiResponse (
            200,
            {
            data: videos,
            page: pageNumber,
            limit: limitNumber,
            totalPages: Math.ceil(totalVideos / limitNumber),
            totalVideos,
        },'All videos fetched successfully!'));
    } catch (error) {
        throw new ApiError(500, "Failed to retrieve videos");
    }
});


export {
    getVideoById,
    publishVideo,
    deleteVideo,
    updateVideo,
    getAllVideos
}