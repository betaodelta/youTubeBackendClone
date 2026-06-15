import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
  //1. Get userId from req.user._id (channel = logged in user)
  //2. Total videos -> count all videos where owner === userId
  //3. Total video views -> Sum of all views field across all videos where owner === userId
  //4. Total subscribers -> count all subscriptions where channel === userId
  //5. Total likes -> count all likes where video owner === userId
  //6. Send all stats to response

  const userId = req.user._id;
  const videoStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: {
          $sum: 1,
        },
        totalViews: {
          $sum: "$views",
        },
      },
    },
  ]);
  const subscriberStats = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribers: {
          $sum: 1,
        },
      },
    },
  ]);
  const likeStats = await Like.aggregate([
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $unwind: "$videoDetails",
    },
    {
      $match: {
        "videoDetails.owner": new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalLikes: {
          $sum: 1,
        },
      },
    },
  ]);
  const totalVideos = videoStats[0]?.totalVideos || 0;
  const totalViews = videoStats[0]?.totalViews || 0;
  const totalSubscribers = subscriberStats[0]?.totalSubscribers || 0;
  const totalLikes = likeStats[0]?.totalLikes || 0;
  return res.status(200).json({
    success: true,
    date: {
      totalVideos,
      totalViews,
      totalSubscribers,
      totalLikes,
    },
    message: "Channel stats fetched out successfully",
  });
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  //1. Get userId from req.user._id
  //2. Get all videos from Video as owner === userId along with thumbnail, videoFile, title, description
  //3. Send the response
  const userId = req.user._id;

  // Step 2 — Get all videos with extra stats
  const videos = await Video.aggregate([
    {
      // Match only this channel's videos
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      // Get likes count for each video
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      // Get comments count for each video
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $project: {
        // your fields ✅
        thumbnail: 1,
        videoFile: 1,
        title: 1,
        description: 1,
        // missing fields ✅
        views: 1,
        duration: 1,
        isPublished: 1,
        createdAt: 1,
        // computed fields ✅
        likesCount: { $size: "$likes" },
        commentsCount: { $size: "$comments" },
      },
    },
    {
      // newest videos first
      $sort: { createdAt: -1 },
    },
  ]);

  // Step 3 — Check exists
  if (!videos?.length) {
    throw new ApiError(404, "No videos found for this channel");
  }

  // Step 4 — Send response
  return res.status(200).json({
    success: true,
    data: videos,
    message: "Channel videos fetched successfully",
  });
});

export { getChannelStats, getChannelVideos };
