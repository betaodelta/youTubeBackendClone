import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const commentsAggregate = Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
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
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        "ownerDetails._id": 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
      },
    },
  ]);
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };
  const result = await Comment.aggregatePaginate(commentsAggregate, options);
  if (!result) {
    throw new ApiError(404, "Something went wrong");
  }
  return res.status(200).json({
    success: true,
    data: result,
    message: "Fetched all details related video",
  });
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  //steps
  //1. Get videoId from req.params and het comment from req.body
  //2. Then post a comment for a particular videoId only
  //3. show comment as well as users username , avatar
  const { videoId } = req.params;
  const { content } = req.body;
  if (!content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id,
  });
  const populatedComment = await Comment.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(comment._id),
      },
    },
    {
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
        content: 1,
        createdAt: 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
      },
    },
  ]);
  return res.status(201).json({
    success: true,
    data: populatedComment[0],
    message: "Comment added successfully",
  });
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  //steps
  //1. Get commentId from req.params        ← not videoId
  //2. Get new content from req.body
  //3. Validate new content is not empty
  //4. Find comment by commentId in DB
  //5. Check comment exists
  //6. Check req.user._id === comment.owner ← ownership check
  //7. Update comment with new content
  //8. Return updated comment in response

  const { commentId } = req.params;
  const { content } = req.body;
  if (!content?.trim()) {
    throw new ApiError(404, "New Comment is missing");
  }
  const commentIdDB = await Comment.findById(commentId);
  if (!commentIdDB) {
    throw new ApiError(404, "Comment ID from DB is missing");
  }
  const userId = req.user._id;
  if (userId.toString() !== commentIdDB.owner.toString()) {
    throw new ApiError(404, "U are not eligible to update this comment");
  }
  const newComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );
  return res.status(201).json({
    success: true,
    date: newComment,
    message: "Comment is updated successfully",
  });
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  //1. Get commentId from req.params
  //2. Find comment from DB using commentId
  //3. Check comment exists
  //4. Get userId from req.user._id
  //5. Check userId === comment.owner
  //6. If same → delete comment
  //7. Return success response
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Sorry this comment does not exists");
  }
  const userId = req.user._id;
  if (userId.toString() !== comment.owner.toString()) {
    throw new ApiError(404, "You are not eligible to delete this comment");
  }
  await Comment.findByIdAndDelete(commentId);
  return res.status(200).json({
    success: true,
    message: "Comment has been deleted successfully",
  });
});

export { getVideoComments, addComment, updateComment, deleteComment };
