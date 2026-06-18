import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination
  // Step 2 — build dynamic $match
  const matchConditions = {};

  // if search query exists
  // search in title AND description
  if (query) {
    matchConditions.$or = [
      {
        title: {
          $regex: query, //  partial match
          $options: "i", //  case insensitive
        },
      },
      {
        description: {
          $regex: query,
          $options: "i",
        },
      },
    ];
  }

  // if userId exists filter by owner
  if (userId) {
    matchConditions.owner = new mongoose.Types.ObjectId(userId);
  }

  // only show published videos
  matchConditions.isPublished = true;

  // Step 3 — build dynamic $sort
  const sortConditions = {};
  sortConditions[sortBy] = sortType === "asc" ? 1 : -1;
  // sortType asc  → 1  (low to high)
  // sortType desc → -1 (high to low)

  // Step 4 — aggregate pipeline
  const videosAggregate = Video.aggregate([
    {
      // dynamic match
      $match: matchConditions,
    },
    {
      // get owner details
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
      // dynamic sort
      $sort: sortConditions,
    },
    {
      $project: {
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        isPublished: 1,
        createdAt: 1,
        "ownerDetails._id": 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
      },
    },
  ]);

  // Step 5 — paginate
  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const result = await Video.aggregatePaginate(videosAggregate, options);

  if (!result) {
    throw new ApiError(500, "Something went wrong");
  }

  // Step 6 — send response
  return res.status(200).json({
    success: true,
    data: result,
    message: "Videos fetched successfully",
  });
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
  //steps included here
  //1. get title and description from my body
  //2. get cloadinary file from req.file like this const avatarLocalPath = req.files?.avatar[0]?.path;
  //3. publish it where ever i want and store the url getting from cloudinary in my db of video
  if (!title || !description) {
    throw new ApiError(400, "Title and description are required");
  }

  // Step 2: Get local path of the video (and optional thumbnail) from req.files
  const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoFileLocalPath) {
    throw new ApiError(400, "Video file is missing");
  }

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is missing");
  }

  // Step 3: Upload files to Cloudinary
  const videoFile = await uploadOnCloudinary(videoFileLocalPath);
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!videoFile) {
    throw new ApiError(500, "Failed to upload video to Cloudinary");
  }

  if (!thumbnail) {
    throw new ApiError(500, "Failed to upload thumbnail to Cloudinary");
  }

  // Step 4: Create video entry in Database
  const video = await Video.create({
    videoFile: videoFile.url, // Cloudinary URL
    thumbnail: thumbnail.url, // Cloudinary Thumbnail URL
    title,
    description,
    duration: videoFile.duration, // Cloudinary automatically gives video duration!
    owner: req.user?._id, // Assuming user is authenticated via middleware
    isPublished: true,
  });

  // Step 5: Send final response
  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully!"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  // Step 1: Validate the ObjectId
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID format");
  }

  // Step 2: Fetch the video from DB
  const video = await Video.findById(videoId);

  // Step 3: Check if video exists
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Step 4: Return success response
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
  //steps included
  //1. take videoId from req.params
  //2. if not present then show error
  //3. take out my cloudinary path
  //4. take out my title , decription and thumnail from req.body
  //5. check validation
  //6. now get then video from db of Video by using findbyid and update
  //7. add there files as well as all these fields
  //8. if updated video is not exists then send the error
  //9. send the reponse
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID format");
  }

  // Step 4 & 5: Take title and description from req.body and validate
  const { title, description } = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required fields");
  }

  // Step 3: Get the local path of the new thumbnail from req.file
  const thumbnailLocalPath = req.file?.path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required for update");
  }

  // Upload the new thumbnail to Cloudinary
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

  if (!thumbnail?.url) {
    throw new ApiError(500, "Error while uploading thumbnail to Cloudinary");
  }

  // Step 6, 7 & 8: Find the video and update the fields
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: thumbnail.url, // Cloudinary naya URL yahan set hoga
      },
    },
    {
      new: true, // Yeh option updated document return karta hai, purana nahi
    }
  );

  if (!updatedVideo) {
    throw new ApiError(404, "Video not found or failed to update");
  }

  // Step 9: Send the success response
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video details updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
  //steps included for delete video
  //1. get videoId from params
  //2. now get the user from req.user._id cgeck the owner and user must be same if not then throw error
  //3. now delete the video and send the response
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID format");
  }

  // Find the video in database first
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Step 2: Check if the logged-in user is the owner of the video
  // Note: MongoDB IDs objects hote hain, isliye .toString() use karna zaroori hai comparison ke liye
  if (video.owner.toString() !== req.user?._id?.toString()) {
    throw new ApiError(403, "You do not have permission to delete this video");
  }

  // Step 3: Delete files from Cloudinary (Production Best Practice)
  try {
    // Extract public IDs from Cloudinary URLs
    // URL format: res.cloudinary.com/cloud_name/video/upload/v123456/folder/public_id.mp4
    const videoPublicId = video.videoFile.split("/").pop().split(".")[0];
    const thumbnailPublicId = video.thumbnail.split("/").pop().split(".")[0];

    // Delete video from Cloudinary (resource_type: "video" specify karna padta hai)
    await cloudinary.v2.uploader.destroy(videoPublicId, {
      resource_type: "video",
    });

    // Delete thumbnail from Cloudinary (default image hota hai)
    await cloudinary.v2.uploader.destroy(thumbnailPublicId);

    console.log("Cloudinary assets deleted successfully");
  } catch (cloudinaryError) {
    // Log the error but don't stop DB deletion if you want, or handle accordingly
    console.error(
      "Failed to delete files from Cloudinary:",
      cloudinaryError.message
    );
  }

  // Step 4: Delete the video document from DB
  await Video.findByIdAndDelete(videoId);

  // Step 5: Send the final response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        "Video and associated files deleted successfully"
      )
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  // Step 1: Extract and validate videoId
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid Video ID format");
  }

  // Step 2: Find the video in database
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // Step 3: Owner validation (Strict Security)
  if (video.owner.toString() !== req.user?._id?.toString()) {
    throw new ApiError(
      403,
      "You do not have permission to toggle this video's publish status"
    );
  }

  // Step 4: Toggle the boolean value
  video.isPublished = !video.isPublished;

  // Step 5: Save the updated document back to the database
  const updatedVideo = await video.save({ validateBeforeSave: false });

  // Step 6: Send the success response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isPublished: updatedVideo.isPublished },
        `Video status updated to ${updatedVideo.isPublished ? "Published" : "Unpublished"}`
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
