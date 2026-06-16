import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: toggle like on video
  //steps included in it
  //1. get videoId from parms
  //2. if videoId not present then through error
  //3. userId from req.user._id
  //4. if userId not exit then through Api error
  //5. if userId toggle on videoId then stored data of userId in likedBy object
  //6. if likedBy userId already exists then then unlike it and send the response or else if userId liked which is never exist then liked it and then send the response
  if (!videoId) {
    throw new ApiError(400, "VideoId is required");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }
  const userId = req.user._id;
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: userId,
  });
  if (existingLike) {
    await Like.deleteOne({
      video: videoId,
      likedBy: userId,
    });
    return res.status(201).json({
      success: true,
      liked: false,
      message: "Video unliked successfully",
    });
  } else {
    await Like.create({
      video: videoId,
      likedBy: userId,
    });
    return res.status(201).json({
      success: true,
      liked: true,
      message: "Video liked successfully",
    });
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment
  //steps
  //1. Get commentId from params
  //2. If not exist then throw error
  //3. check comment must present in my database
  //4. from req.user._id get userId
  //5. if not exists then throw error
  //6. if alreday liked by user then send response as false
  //7. if not likedBy userid then send response as true
  if (!commentId) {
    throw new ApiError(404, "CommentId doesn't exist");
  }
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment doesn't found");
  }
  const userId = req.user._id;
  if (!userId) {
    throw new ApiError(404, "User doen't found");
  }
  const existingLiked = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });
  if (existingLiked) {
    await Like.deleteOne({
      comment: commentId,
      likedBy: userId,
    });
    return res.status(201).json({
      success: true,
      liked: false,
      message: "Comment unliked successfully",
    });
  } else {
    await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    return res.status(201).json({
      success: true,
      liked: true,
      message: "Comment liked successfully",
    });
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  //steps
  //1. Get tweetId from params
  //2. If not then throw ApiError
  //3. for that particular tweetId get tweet
  //4. get userId
  //5. if not then throw error
  //6. if tweet already liked then unliked it and send the response
  //7. if tweet alreday unliked then liked it and then send the response
  if (!tweetId) {
    throw new ApiError(404, "TweetId doesn't exists");
  }
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet doesn't exists");
  }
  const userId = req.user._id;
  const existingLiked = await Like.findOne({
    tweet: tweetId,
    likedBy: userId,
  });
  if (existingLiked) {
    await Like.deleteOne({
      tweet: tweetId,
      likedBy: userId,
    });
    return res.status(200).json({
      success: true,
      liked: false,
      message: "Tweet unliked successfully",
    });
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
    return res.status(200).json({
      success: true,
      liked: true,
      message: "Tweet liked successfully",
    });
  }
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  //steps
  //Here concepts of aggregate pipelined used i guess
  //1. get video from req.body
  //2. get videoId from video
  //3. then show all likes for a particular videoId for that user who owns channel
  //corrected steps
  //1. Get userId from req.user._id
  //2. find all likes where likedBy === userId and video exits
  //3. Populate video details for each like
  //4. send response
  const userId = req.user._id;
  const likedVideos = await Like.aggregate([
    {
      //from this step we will get all videos which were likedBY user only
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: {
          $exists: true,
          $ne: null,
        },
      },
    },
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
      // get video owner details
      $lookup: {
        from: "users",
        localField: "videoDetails.owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $project: {
        // video fields
        "videoDetails._id": 1,
        "videoDetails.title": 1,
        "videoDetails.thumbnail": 1,
        "videoDetails.duration": 1,
        "videoDetails.views": 1,
        "videoDetails.createdAt": 1,
        // owner fields
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
  ]);
  if (!likedVideos?.length) {
    throw new ApiError(404, "No liked Videos found !!");
  }
  return res.status(200).json({
    success: true,
    data: likedVideos,
    message: "Liked videos data fetched out successfully",
  });
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
