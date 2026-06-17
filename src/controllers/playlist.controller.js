import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

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
  if (!playlistId || !videoId) {
    throw new ApiError(400, "PlaylistId and VideoId are required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to modify this playlist");
  }

  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already exists in playlist");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $push: { videos: videoId } },
    { new: true }
  );

  if (!updatedPlaylist) {
    throw new ApiError(500, "Something went wrong while adding video");
  }

  return res.status(200).json({
    success: true,
    data: updatedPlaylist,
    message: "Video added to playlist successfully",
  });
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
  //steps included
  //1. Get videoId , playlistId from req. params
  //2. Validation check
  //3. find the video from videoId
  //4. Check the user and owner of the playlist must same if not then send the error that not allowed to delete the video from the playlist
  //5. now if that video is alreday deleted from my playlist then throw error that video has been alreday deleted
  //6. now delete the video
  //7. send the response

  if (!playlistId) {
    throw new ApiError(400, "PlaylistId is required");
  }
  if (!videoId) {
    throw new ApiError(400, "VideoId is required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video with this id doesn't exists");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist with this ID doesn't exists");
  }
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(
      404,
      "You are not allowed to delete this video from this playlist"
    );
  }
  if (!playlist.videos.includes(video)) {
    throw new ApiError(404, "This video doesn't exists in this playlist");
  }
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $pull: {
        videos: videoId,
      },
    },
    {
      new: true,
    }
  );
  if (!updatedPlaylist) {
    throw new ApiError(500, "Something went wrong ");
  }
  return res.status(200).json({
    success: true,
    data: updatedPlaylist,
    message: "Video removed from the playlist successfully",
  });
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
  //steps included
  //1. Get playlistId from req.params
  //2. if not present then throw error
  //3. get the playlist from palylistId
  //4. if not present then throw error
  //5. if owner and req.user._id deoens't matched then u r not allowed to delete this playlist
  //6. give the updated playlist with delete with this playulist id and here i wikll use $pull
  //7. if that updated playlist doesn't exists then give error
  //8. return the response
  if (!playlistId) {
    throw new ApiError(400, "PlaylistId is required");
  }

  // Step 3 & 4 — find playlist + check exists
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // Step 5 — ownership check
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  // Step 6 — delete entire playlist document
  await Playlist.findByIdAndDelete(playlistId);

  // Step 8 — response
  return res.status(200).json({
    success: true,
    message: "Playlist deleted successfully",
  });
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
  //steps included for update are
  //1. get playlistId from req.params
  //2. get name , description from my req.body
  //3. if not prent then throw error
  //4. now get playlist from playlistId
  //5. if not prsent then throw error
  //6. now i have access DB of playlist now check owner and req.user._id same
  //7. now just override the values of playlist.name wityh this name as well as oplaylist.description = description
  //8. send the updated playlist response
  //9. before sending just check the valiodation that it should be exist
  // Step 3 — validation first
  if (!name?.trim()) {
    throw new ApiError(400, "Playlist name is required");
  }
  if (!description?.trim()) {
    throw new ApiError(400, "Playlist description is required");
  }

  // Step 4 & 5 — find + check exists
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // Step 6 — ownership check
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }

  // Step 7 — update using $set
  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    {
      $set: {
        name, // update name
        description, //  update description
      },
    },
    { new: true } //  return updated document
  );

  // Step 8 — check update successful
  if (!updatedPlaylist) {
    throw new ApiError(500, "Something went wrong while updating playlist");
  }

  // Step 9 — send response
  return res.status(200).json({
    success: true,
    data: updatedPlaylist,
    message: "Playlist updated successfully",
  });
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
