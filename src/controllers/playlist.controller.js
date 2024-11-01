import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || !description)
    throw new ApiError(400, "Name and description are required");
  const userId = req.user?._id;
  const playlist = await Playlist.create({
    name: name,
    description: description,
    owner: userId,
  });
  const createdPlaylist = await Playlist.findById(playlist._id);
  if (!createdPlaylist)
    throw new ApiError(500, "Something went wrong while creating the playlist");
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        createPlaylist,
        "Your playlist is created successfully"
      )
    );
});
const getUserPlaylist = asyncHandler(async (req, res) => {
  const {userId} = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(404, "User Id not found!");
  }
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const userPlaylist = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user),
      },
    },
  ]);
  if (!userPlaylist.length) throw new ApiError(401, "User has no playlist");
  return res
    .status(200)
    .json(new ApiResponse(200, userPlaylist, "Playlist fetched"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              _id: 1,
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        owner: { $first: "$owner" },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    fullname: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: { $first: "$owner" },
            },
          },
        ],
      },
    },
  ]);
  if (!playlist.length) throw new ApiError(404, "This playlist does not exist");

  return res.status(200).json(new ApiResponse(200, playlist, "Playlist fetched"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const {videoId, playlistId } = req.params;
  const userId = req.user?._id;
  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);
  if (!playlist) {
    throw new ApiError(404, "Playlist does not exists");
  }

  if (!video) {
    throw new ApiError(404, "Video does not exists");
  }
  if (Array.isArray(playlist.videos) && playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already in playlist");
  }

  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { $push: { videos: videoId } },
      { new: true }
    );
    return res
      .status(200)
      .json(new ApiResponse(200, updatedPlaylist, "Video is addesd to your playlist"));
  } catch (error) {
    throw new ApiError(500, "Internal Server Error");
  }
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;
  const playlist = await Playlist.findById(playlistId);
  const video = await Video.findById(videoId);
  if (!playlist) {
    throw new ApiError(404, "Playlist does not exists");
  }
  if (!video) {
    throw new ApiError(404, "Video does not exists");
  }
  if (!Array.isArray(playlist.videos) || !playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video is not in playlist");
  }
  if (req.user._id.toString() !== playlist.owner.toString()) {
    throw new ApiError(404, "You cannot change");
  }
  try {
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
      playlistId,
      { $pull: { videos: videoId } },
      { new: true }
    );
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedPlaylist,
          "Video is removed from your playlist"
        )
      );
  } catch (error) {
    throw new ApiError(500, "Unable to delete video from playlist, try again.");
  }
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const userId = req.user?._id;
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist does not exists");
  }
  if (userId.toString() !== playlist.owner.toString()) {
    throw new ApiError(403, "You cannot delete this playlist");
  }
  try {
    await Playlist.findByIdAndDelete(playlistId);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Playlist is deleted"));
  } catch (error) {
    throw new ApiError(500, "Unable to delete playlist, try again.");
  }
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  const userId = req.user?._id;
  const playlist = await Playlist.findById(playlistId);
  if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid or missing playlistId");
  }
  if (
    (name && name.trim() === "") ||
    (description && description.trim() === "")
  ) {
    throw new ApiError(400, "Name and description cannot be empty");
  }
  if (req.user._id.toString() !== playlist.owner.toString()) {
    throw new ApiError(403, "You cannot update this playlist");
  }
  const updateData = {};
  if (name) updateData.name = name.trim();
  if (description) updateData.description = description.trim();

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "At least one field must be provided for update");
  }
  try {
    const updatedPlaylist = await Playlist.findOneAndUpdate(
      { _id: playlistId, owner: req.user._id }, // Ensure ownership check during update
      { $set: updateData },
      { new: true }
    );

    if (!updatedPlaylist) {
      throw new ApiError(
        404,
        "Playlist not found or you're not authorized to update it"
      );
    }

    return res
      .status(200)
      .json(
        new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
      );
  } catch (error) {
    throw new ApiError(500, "Unable to update playlist, try again.");
  }
});

export {
  createPlaylist,
  getUserPlaylist,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
