import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Subscription } from "../models/subscription.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  // TODO: toggle subscription
  //steps included
  //1. get the channelId from req.params
  //2. if not present then throw error
  //3. now from this channelId get my users db from that id which is foreingn ID
  //4. now check that does that user alreday subscribed to this channelId which is my local id
  //5. if not then toggle it which means in subscriber add one count
  //6. and then send the response
  /*1. Get channelId from req.params
            2. Validate channelId exists
            3. Check user is not subscribing themselves
            4. Check if subscription already exists
            → Subscription.findOne({
                subscriber: req.user._id,
                channel: channelId
                })
            5. If EXISTS  → delete it (unsubscribe)
            If NOT EXISTS → create it (subscribe)
            6. Send response with current state*/
  if (!channelId) {
    throw new ApiError(404, "ChannelId is required");
  }
  const channel = await Subscription.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel not found");
  }
  if (channelId.toString() === req.user._id.toString()) {
    throw new ApiError(404, "You cannot subscribed to yourself");
  }
  const existingSubscription = await Subscription.findOne({
    subscriber: req.user._id,
    channel: channelId,
  });
  if (existingSubscription) {
    await Subscription.deleteOne({
      subscriber: req.user._id,
      channel: channelId,
    });
    return res.status(201).json({
      success: true,
      subscribed: false,
      message: "Unsubcribed the channel successfully",
    });
  }
  await Subscription.create({
    subscriber: req.user._id,
    channel: channelId,
  });
  return res.status(201).json({
    success: true,
    subscribed: true,
    message: "Subcribed the channel successfully",
  });
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  //steps included
  //1. get channelId from req.params
  //2. if not present then throw error
  //3. now i want all channels where this channelId as subscribed
  //4. now here i will write aggegate pipelines with $match = channelId
  //5. lookup my localfield is channelId and foreign field is subscriber which is connected to users as _id
  //6. $sum of all
  //7. return the respose

  //---- corrected ----//
  //1. Get channelId from req.params
  //2. Validate channelId exists
  //3. Match all subscriptions where
  //channel === channelId
  //4. Lookup subscriber details from users
  //localField: subscriber (in subscription)
  //foreignField: _id (in users)
  //5. Project subscriber details
  //username, avatar, _id
  //6. Add total subscriber count
  //7. Send response
  if (!channelId) {
    throw new ApiError(404, "channelId must required ");
  }
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriptionDetails",
      },
    },
    {
      $unwind: "$subscriptionDetails",
    },
    {
      $project: {
        "subscriptionDetails._id": 1,
        "subscriptionDetails.username": 1,
        "subscriptionDetails.avatar": 1,
      },
    },
    {
      $group: {
        _id: null,
        totalSubscribers: { $sum: 1 },
        subscribers: {
          $push: "$subscriptionDetails",
        },
      },
    },
  ]);
  // handle no subscribers
  if (!subscribers?.length) {
    return res.status(200).json({
      success: true,
      data: {
        totalSubscribers: 0,
        subscribers: [],
      },
      message: "No subscribers found",
    });
  }

  // Step 7 — send response
  return res.status(200).json({
    success: true,
    data: {
      totalSubscribers: subscribers[0].totalSubscribers,
      subscribers: subscribers[0].subscribers,
    },
    message: "Subscribers fetched successfully",
  });
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  // validation
  if (!subscriberId) {
    throw new ApiError(400, "SubscriberId is required");
  }

  const subscribedChannels = await Subscription.aggregate([
    {
      // match all subscriptions
      // by this subscriber
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      // get channel details
      $lookup: {
        from: "users",
        localField: "channel", //  channel field in subscription
        foreignField: "_id", //  _id in users
        as: "channelDetails",
      },
    },
    {
      $unwind: "$channelDetails",
    },
    {
      $project: {
        "channelDetails._id": 1,
        "channelDetails.username": 1,
        "channelDetails.avatar": 1,
        "channelDetails.fullName": 1,
      },
    },
    {
      $group: {
        _id: null,
        totalChannels: { $sum: 1 },
        channels: {
          $push: "$channelDetails",
        },
      },
    },
  ]);

  if (!subscribedChannels?.length) {
    return res.status(200).json({
      success: true,
      data: {
        totalChannels: 0,
        channels: [],
      },
      message: "No subscribed channels found",
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      totalChannels: subscribedChannels[0].totalChannels,
      channels: subscribedChannels[0].channels,
    },
    message: "Subscribed channels fetched successfully",
  });
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
