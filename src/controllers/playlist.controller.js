import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  //TODO: create playlist
  //steps included
  //1. get name , description from req.body
  //2. get userId from req.user._id
  //3. check that name and description alreday exists or not
  //4. if not then proceed otherwise throw error that create a new one with unique name or unique decription
  //5. owner which is field in playlists connected with userId
  //6. then send the response
  if (!name.trim()) {
    throw new ApiError(400, "Playlist name is required");
  }
  if (!description.trim()) {
    throw new ApiError(400, "Playlist Description is required");
  }
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(404, "User doesn't found");
  }
  const playlist = await Playlist.create({
    name: name,
    description: description,
    owner: userId,
  });
  return res.status(200).json({
    success: true,
    data: playlist,
    message: "Playlist has been created successfully",
  });
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists
  //steps
  //1. get userId from params
  //2. check validation
  //3. now as owner is my userId so for all owners tke out all playlists name as well as descriptions
  //4. send the response
  if (!userId) {
    throw new ApiError(404, "Playlists for particular userId doesn't found");
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User doesn't found");
  }
  const allPlaylists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      // get all videos details from each playlists
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        totalVideos: {
          $size: "$videoDetails",
        },
        thumbnail: {
          $first: "$videoDetails.thumbnail",
        },
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  if (!allPlaylists?.length) {
    throw new ApiError(404, "Playlists doesn't found");
  }
  return res.status(200).json({
    success: true,
    data: allPlaylists,
    message: "Get all user playlists",
  });
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  //steps
  //1. get playlistId from req.params
  //2. simply send the response with this Id
  if (!playlistId) {
    throw new ApiError(400, "PlaylistId is required");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId),
      },
    },
    {
      // get full video details
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      // get playlist owner details
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $project: {
        name: 1,
        description: 1,
        createdAt: 1,
        updatedAt: 1,
        // video fields
        "videoDetails._id": 1,
        "videoDetails.title": 1,
        "videoDetails.thumbnail": 1,
        "videoDetails.duration": 1,
        "videoDetails.views": 1,
        // total count
        totalVideos: { $size: "$videoDetails" },
        // owner fields
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
      },
    },
  ]);

  if (!playlist?.length) {
    throw new ApiError(404, "Playlist not found");
  }

  return res.status(200).json({
    success: true,
    data: playlist[0],
    message: "Playlist fetched successfully",
  });
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  //steps included
  //1. get playlistId and videoId from params
  //2. validation check
  //3. get video from videoId
  //which includes thumbanial , description , ownmer, title, durations, views
  //4. now get playlist with playlistId
  //5. then simply create obj and add it
  //6. send the response
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
