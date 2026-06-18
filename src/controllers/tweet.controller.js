import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  //create steps
  //1. get content from req.body
  //2. now check the owner with req.user._id
  //3. now if that tweet alreday present by tthe owner then don't create it duplicate
  //4. if not present then create a obj with this content as well as owner will be the user
  //5. now send the response
  const { content } = req.body;
  if (!content) {
    throw new ApiError(404, "Content of the following tweet doesn't exists");
  }
  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });
  if (!tweet) {
    throw new ApiError(404, "Unable to create a tweet");
  }
  return res.status(201).json({
    success: true,
    data: tweet,
    message: "Tweet has been created successfully",
  });
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  //steps included
  //1. get the userId from req.params
  //2. if not present then give the message throw error
  //3. now here i will do lookup aggegate pipeline
  //4. ,match will be from userId
  //5. now $lookup in that my from is users and localfield is owner , and foreignfield is _id
  //6. $unwind all content details
  //7. now in project i will show alll content as well as count of my tweets
  //8. return response
  const { userId } = req.params;
  if (!userId) {
    throw new ApiError(404, "userId doesn't exists");
  }
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, "User doen't find");
  }
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(user),
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
      },
    },
    {
      $group: {
        _id: null,
        totalTweets: { $sum: 1 },
        tweets: {
          $push: "$$ROOT",
        },
      },
    },
  ]);
  // handle no tweets
  if (!tweets?.length) {
    return res.status(200).json({
      success: true,
      data: {
        totalTweets: 0,
        tweets: [],
      },
      message: "No tweets found",
    });
  }

  // Step 8 — send response
  return res.status(200).json({
    success: true,
    data: {
      totalTweets: tweets[0].totalTweets,
      tweets: tweets[0].tweets,
    },
    message: "User tweets fetched successfully",
  });
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  //steps included
  //1. get the tweetId from req.params
  //2. if not exists then throw error
  //3. now i will content from Tweet db with this id
  //4. now i will do findby id and update with this tweet as well as owner
  //5. initially if that tweet doesn't exist to that particular user_id i won't approved after that i will approved
  //6. now send the updated response
  const { tweetId } = req.params;
  const { content } = req.body; //  NEW content from req.body

  // Step 2 — validation
  if (!tweetId) {
    throw new ApiError(400, "TweetId is required");
  }

  // Step 4 — validate content
  if (!content?.trim()) {
    throw new ApiError(400, "Tweet content is required");
  }

  // Step 5 & 6 — find tweet + check exists
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // Step 7 — ownership check
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this tweet");
  }

  // Step 8 — update tweet
  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: { content }, //  only update content
    },
    { new: true } // return updated document
  );

  if (!updatedTweet) {
    throw new ApiError(500, "Something went wrong while updating tweet");
  }

  // Step 9 — send response
  return res.status(200).json({
    success: true,
    data: updatedTweet,
    message: "Tweet updated successfully",
  });
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  //steps included into this
  //1. get my tweetId from req.params
  //2. now get the user
  //3. chec the validation
  //4. only the owner can delete the tweetv
  //5. after that just use await Tweet.findbyidanddelete(tweetid) and then send the respinse
  const { tweetId } = req.params;

  // Error 1 fix ✅
  if (!tweetId) {
    throw new ApiError(400, "TweetId is required");
  }

  // Error 2 fix ✅
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  const userId = req.user._id;
  if (tweet.owner.toString() !== userId.toString()) {
    // ✅ tweet.owner not tweet
    throw new ApiError(403, "You are not allowed to delete this tweet");
  }

  // Error 3 fix ✅
  await Tweet.findByIdAndDelete(tweetId);

  // Error 4 fix ✅
  return res.status(200).json({
    success: true,
    message: "Tweet deleted successfully",
  });
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
