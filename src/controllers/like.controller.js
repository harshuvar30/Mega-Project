import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleLike  = asyncHandler(async(req,res)=>{
    const {type,id} = req.params;
    const types = ['video','tweet','comment'];
    if(!types.includes(type)){
        throw new ApiError(400,'Invalid type');
    }
    const model = type === 'video' ? Video : type === 'tweet' ? Tweet :Comment;
    const entity = await model.findById(id);
    if(!entity){
        throw new ApiError(404,`This ${type} does not exist.`);
    }
    const userId = req.user?._id;
    
    const user = await User.findById(userId);
    if(!user)
        throw new ApiError(404,'User not found')

    let likeCriteria = {likedBy:userId};
    likeCriteria[type] = entity;
    const alreadyLiked = await Like.findOneAndDelete(likeCriteria);
    if(alreadyLiked){
        return res
        .status(200)
        .json(
            new ApiResponse(200,`Your like has been removed from this ${type}`)
        )
    }
    const like = await Like.create({
        likedBy:userId,
        [type]:entity
    })

    const liked = await Like.findById(like._id);

    if(!liked)
        throw new ApiError(500,'Failed to create like')

    return res
    .status(200)
    .json(
        new ApiResponse(200,`You have liked this ${type}`)
    )
})

const likedVideos = asyncHandler(async(req,res) =>{
    const userId = req.user?._id;
    const getLikedVideos = await Like.aggregate([
        {
            $match:{
                likedBy:new mongoose.Types.ObjectId(userId),
            }
        },
            {
                $lookup:{
                    from:"videos",
                    localField:"video",
                    foreignField:"_id",
                    as:"video",
                    pipeline:[
                        {
                            $lookup:{
                                from:"users",
                                localField:"owner",
                                foreignField:'_id',
                                as:"owner",
                                pipeline:[
                                   { 
                                    $project:{
                                        fullname:1,
                                        avatar:1,
                                        username:1
                                    },
                                   },
                                ],
                            },
                        },
                        {
                            $addFields:
                            {
                                owner:{$first:"$owner"}
                            }
                        }
                    ]
                }
            },
            {
                $addFields:{
                    video:{$first:"$video"}
                }
            }
    ])

    // const getLikedVideos = await Like.aggregate([
    //     {
    //         $match: {
    //             likedBy: new mongoose.Types.ObjectId(userId)
    //         }
    //     },
    //     {
    //         $lookup: {
    //             from: "videos",
    //             localField: "video",
    //             foreignField: "_id",
    //             as: "video"
    //         }
    //     },
    //     {
    //         $addFields: {
    //             video: { $first: "$video" }
    //         }
    //     }
    // ]);
    
    if(!getLikedVideos)
        throw new ApiError(404,"You havn't liked any video yet!")

    return res
    .status(200)
    .json(
        new ApiResponse(200,getLikedVideos,'Liked videos are fetched successflully')
    )
})

export{
    toggleLike,
    likedVideos
}