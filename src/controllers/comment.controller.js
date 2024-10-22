import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiResponse} from '../utils/ApiResponse.js'
import {ApiError} from '../utils/ApiError.js'
import {Video} from '../models/video.model.js'
import {Comment} from '../models/comment.model.js'



// const getVideoComments = asyncHandler(async(req,res) =>{
//     const videoId = req.params;
//     const video = await Video.findById(videoId);
//     if(!video) {
//         return new ApiError(404, 'Video not found')
//     }
//     const comments = await Comment.find({videoId: videoId})

    
// })

const addComment  = asyncHandler(async(req,res)=>{
    const videoId = req.params;
    const comment = req.body;
    const userId = req.user?._id;
    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content can't be empty");
      }
    if(!videoId)
        throw new ApiError(404,'Video is not provided')
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Video ID is not valid.");
      }

    const video = await Video.findById(videoId)
    if(!video)
        throw new ApiError(404,'Video is not found')
    const newComment = await Comment.create({
        content:comment,
        video:videoId,
        owner:userId});
    const getComment = await Comment.findById(newComment._id)
    if(!getComment)
        throw new ApiError(500,'Something went wrong while posting the comment')

    return res
    .status(201)
    .json(new ApiResponse(201,getComment,'Comment posted successfully'))

   
})

const deleteComment = asyncHandler(async(req,res)=>{
    const {commentId,videoId} = req.params;
    
    const userId = req.user?._id;
    if(!commentId)
        throw new ApiError(404,'Comment is not provided')
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Comment ID is not valid.");
    }
    const comment = await Comment.findById(commentId)

    if(!comment)
        throw new ApiError(404,'Comment is not found')
    if(comment.owner.toString() !== userId.toString())
        throw new ApiError(403,'You are not authorized to delete this comment')
    if (videoId !== comment.video.toString()) {
        throw new ApiError(200, "which video to delete the comment is not found");
      }
    const deletedComment = await Comment.findByIdAndDelete(commentId)

    try{
        await Comment.findByIdAndDelete(commentId);
        return res
        .status(200)
        .json(new ApiResponse(200,'Comment deleted successfully'))
    }
    catch(error){
        throw new ApiError(500,'Something went wrong while deleting the comment')
    }

})

const updateComment = asyncHandler(async(req,res) =>{
    const {commentId,videoId} = req.params
    const content  = req.body

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Content can't be empty");
      }
    
    const userId = req.user?._id;
    if(!commentId)
        throw new ApiError(404,'Comment is not provided')
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Comment ID is not valid.");
    }
    const oldComment = await Comment.findById(commentId);
    if (oldComment.video.toString() !== videoId) {
      throw new ApiError(400, "Invalid video");
    }
    if (oldComment.owner?.toString() !== userId.toString()) {
      throw new ApiError(403, "You are not authorized to edit this comment");
    }
   

    try{
       const updatedComment =  await Comment.findByIdAndUpdate(commentId,{
            $set:{
                content:content
            }
        },{new:true})
        return res
        .status(200)
        .json(new ApiResponse(200,'Comment updated successfully'))
    }
    catch(error){
        throw new ApiError(500,'Something went wrong while deleting the comment')
    }

})

export{
    addComment,
    deleteComment,
    updateComment
}