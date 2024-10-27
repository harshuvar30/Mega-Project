import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiResponse} from '../utils/ApiResponse.js'
import {ApiError} from '../utils/ApiError.js'
import {Video} from '../models/video.model.js'
import {Comment} from '../models/comment.model.js'
import mongoose from "mongoose";


const getAllComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
  
    if (!videoId) {
      throw new ApiError(400, "Video ID not provided in params");
    }
    console.log(videoId)
    if (isNaN(pageNum) || isNaN(limitNum) || pageNum <= 0 || limitNum <= 0) {
      throw new ApiError(400, "Please provide valid page and limit values");
    }
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(404, "Invalid video ID");
    }
  
    const getComments = await Comment.aggregate([
      {
        $match: {
          video: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        $skip: (pageNum - 1) * limitNum,
      },
      {
        $limit: limitNum,
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "ownerOfComment",
          pipeline: [
            {
              $project: {
                username: 1,
                fullname: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "likes",
          localField: "_id",
          foreignField: "comment",
          as: "totalLikeOnComment",
        },
      },
      {
        $addFields: {
          likedByUser: {
            $in: [req.user?._id, "$totalLikeOnComment.likedBy"],
          },
        },
      },
      {
        $group: {
          _id: "$_id",
          content: { $first: "$content" },
          ownerOfComment: { $first: "$ownerOfComment" },
          videoToComment: { $first: "$video" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
          totalLikesOnComment: { $first: { $size: "$totalLikeOnComment" } },
          likedByUser: { $first: "$likedByUser" },
        },
      },
      {
        $addFields: {
          owner: { $arrayElemAt: ["$ownerOfComment", 0] },
          isOwner: {
            $cond: {
              if: { $eq: [req.user?._id, { $arrayElemAt: ["$ownerOfComment._id", 0] }] },
              then: true,
              else: false,
            },
          },
        },
      },
    ]);
  
    if (!getComments?.length) {
      throw new ApiError(404, "No comments found for this video. Or, try a lower page number.");
    }
  
    return res.status(200).json(new ApiResponse(200, getComments, "Comments fetched successfully"));
  });
  

const addComment  = asyncHandler(async(req,res)=>{
    const{ videoId }= req.params;
    const {content} = req.body;
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
    const newComment = await Comment.create(
        {
        content:content,
        video:videoId,
        owner:userId
        });
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
    const {content}  = req.body
    console.log(content)

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
      await Comment.findByIdAndUpdate(commentId,{
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
    getAllComments,
    addComment,
    deleteComment,
    updateComment
}