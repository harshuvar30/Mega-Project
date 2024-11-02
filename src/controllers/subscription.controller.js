import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const toggleSubscription = asyncHandler(async(req,res)=>{
    const {channelId} = req.params;
    const channel = await User.findById(channelId);
    if(!channel)
        throw new ApiError(404,'Channel does not exits.');
    const loggedInUser = req.user._id;
    if(!loggedInUser)
        throw new ApiError(401,'You must be logged in to perform this action.');
    const unsubscribe = await Subscription.findOneAndDelete({
        subscriber:loggedInUser,
        channel:channelId
    });
    if(unsubscribe){
        return res
        .status(200)
        .json(new ApiResponse(200,'Successfully unsubscribed the channel'))
    }

    const subscribe = await Subscription.create(
      {  subscriber:loggedInUser,
        channel:channelId}
    )
    const subscribedUser = await Subscription.findById(subscribe._id);
    if(!subscribedUser){
        throw new ApiError(500,'Failed to subscribe to the channel');
        }
    return res
    .status(200)
    .json(new ApiResponse(200,'Successfully subscribed the channel.'))
    

})
const getUserChannelSubscribers = asyncHandler(async(req,res)=>{
    const { channelId } = req.params;
    if (!isValidObjectId(channelId)) {
      throw new ApiError(400, "Channel not exist");
    }
    if (req.user?._id.toString() !== channelId) {
      throw new ApiError(400, "Unauthorized request you are not a channel owner");
    }
    const getSubscribe = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(channelId),
        },
      },
      {
        $facet: {
          subscribers: [
            {
              $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      fullName: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                subscribers: {
                  $first: "$subscribers",
                },
              },
            },
          ],
          subscribersCount: [{ $count: "subscribers" }],
        },
      },
    ]);
    return res
      .status(200)
      .json(
        new ApiResponse(
          "200",
          getSubscribe[0],
          "All subscribers fetched successfully"
        )
      );
})
const getSubscribedChannels = asyncHandler(async(req,res)=>{
    const { subscriberId } = req.params;
  
    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
      throw new ApiError(400, "Subscriber ID is not valid.");
    }
  
    if (req.user?._id.toString() !== subscriberId) {
      throw new ApiError(
        400,
        "Unauthorized request: the request user and the subscriber are not the same person."
      );
    }
  
    const getChannels = await Subscription.aggregate([
      {
        $match: {
          subscriber: new mongoose.Types.ObjectId(subscriberId),
        },
      },
      {
        $facet: {
          channelSubscribedTo: [
            {
              $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      fullName: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            {
              $addFields: {
                channel: {
                  $first: "$channel",
                },
              },
            },
          ],
          channelsSubscribedToCount: [{ $count: "channel" }],
        },
      },
    ]);
  
    return res
      .status(200)
      .json(new ApiResponse(200, getChannels[0], "Subscribed channels fetched."));
  });
  
  export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };