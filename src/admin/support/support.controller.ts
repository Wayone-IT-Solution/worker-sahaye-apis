import {
  LOW_PRIORITY_TAGS,
  HIGH_PRIORITY_TAGS,
  MEDIUM_PRIORITY_TAGS,
  CRITICAL_PRIORITY_TAGS,
} from "../../modals/ticket.model";
import ApiError from "../../utils/ApiError";
import Agent from "../../modals/agent.model";
import Admin from "../../modals/admin.model";
import { User } from "../../modals/user.model";
import Ticket from "../../modals/ticket.model";
import ApiResponse from "../../utils/ApiResponse";
import { Request, Response, NextFunction } from "express";
import { getPipeline, paginationResult } from "../../utils/helper";

// CREATE a new ticket
export const createTicket = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.user;
    const { tags, title, description } = req.body;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0); // set to start of the day

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999); // set to end of the day

    const result = await Ticket.aggregate([
      {
        $match: {
          requester: id,
          createdAt: {
            $gte: todayStart,
            $lte: todayEnd,
          },
        },
      },
    ]);

    if (result.length === 2)
      return res.status(200).json({
        data: result,
        success: true,
        message: "You can raise upto 2 tickets a day",
      });

    const parsedDueDate = new Date();
    const dueDatePlus24 = new Date(
      parsedDueDate.getTime() + 48 * 60 * 60 * 1000
    );

    const obj = {
      tags,
      title,
      description,
      requester: id,
      status: "open",
      dueDate: dueDatePlus24,
      priority: await checkPriority(tags),
      relatedTickets: await checkRelatedTickets(tags),
    };

    const ticket = new Ticket(obj);
    const response: any = await ticket.save();
    await assignTicketToAgent(response._id);
    return res.status(200).json({
      data: ticket,
      success: true,
      message: "Ticket generated successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      success: false,
      message: "Failed to create ticket",
    });
  }
};

export const createAgent = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { userId, availability, skills } = req.body;
    const userData: any = await Admin.findById(userId);
    if (!userData)
      return res.status(404).json(new ApiError(404, "User not found"));

    const email = userData.email;
    const name = userData.username;

    const isAgentExist = await Agent.findOne({ email: email });
    if (isAgentExist)
      return res
        .status(200)
        .json(
          new ApiResponse(200, null, "Agent with this email already exists")
        );

    const agent = new Agent({
      name,
      email,
      skills,
      userId,
      availability: availability === "active",
    });
    const response = await agent.save();
    return res.status(200).json({
      success: true,
      data: response,
      message: "Agent created successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(new ApiError(400, "Failed to create ticket"));
  }
};

// Helper function to assign a ticket to an agent
const assignTicketToAgent = async (ticketId: string): Promise<any> => {
  try {
    let ticket: any = await Ticket.findById(ticketId);
    const availableAgents = await Agent.find({
      availability: true,
      skills: { $in: ticket.tags },
    }).sort("activeTickets");

    let assignedAgent;
    if (availableAgents.length > 0) {
      assignedAgent = availableAgents[0];
      ticket.assignee = assignedAgent._id;
      ticket.status = "in_progress";
      await ticket.save();

      assignedAgent.activeTickets += 1;
      await assignedAgent.save();
    } else {
      ticket.status = "open";
      await ticket.save();
    }

    return true;
  } catch (error: any) {
    throw new Error("Error assigning ticket to agent: " + error.message);
  }
};

const checkPriority = async (tags: any): Promise<any> => {
  const lowPriority = [];
  const highPriority = [];
  const mediumPriority = [];
  const criticalPriority = [];

  tags.forEach((tag: any) => {
    if (HIGH_PRIORITY_TAGS.includes(tag)) {
      highPriority.push(tag);
    } else if (MEDIUM_PRIORITY_TAGS.includes(tag)) {
      mediumPriority.push(tag);
    } else if (LOW_PRIORITY_TAGS.includes(tag)) {
      lowPriority.push(tag);
    } else if (CRITICAL_PRIORITY_TAGS.includes(tag)) {
      criticalPriority.push(tag);
    }
  });

  function decideOverallPriority() {
    if (lowPriority.length > 0) return "low";
    else if (highPriority.length > 0) return "high";
    else if (mediumPriority.length > 0) return "medium";
    else if (criticalPriority.length > 0) return "critical";
    return "low";
  }
  return decideOverallPriority();
};

const checkRelatedTickets = async (tags: any): Promise<any> => {
  const response = await Ticket.aggregate([
    { $match: { tags: { $in: tags } } },
    { $project: { _id: 1 } },
  ]);
  return response.map((ticket) => ticket._id);
};

// READ - Get a single ticket by ID
export const getTicket = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { role } = req.user;
    const { id } = req.params;

    const data = await getData(id, role);

    return res.status(200).json({
      data: data,
      success: true,
      message: "Ticket Fetched successfully",
    });
  } catch (error) {
    next(new ApiError(500, "Error fetching ticket", error));
  }
};

export const deactivateAgent = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const agent = await Agent.findById(id);

    if (!agent)
      return res.status(400).json(new ApiError(400, "Agent not found"));

    await Ticket.updateMany(
      {
        assignee: id,
        status: { $nin: ["closed", "resolved"] },
      },
      { $unset: { assignee: "" }, $set: { status: "re_assigned" } }
    );

    agent.availability = !agent.availability;
    agent.activeTickets = 0;
    await agent.save();

    return res.status(200).json({
      success: true,
      message: `Agent ${
        agent.availability ? "activated " : "deactivated "
      } successfully`,
    });
  } catch (error) {
    next(new ApiError(500, "Error fetching ticket", error));
  }
};

export const getAgentByID = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const agent = await Agent.findById(id);

    if (!agent) return next(new ApiError(400, "Agent not found"));

    return res.status(200).json({
      data: agent,
      success: true,
      message: `Agent Fetched successfully`,
    });
  } catch (error) {
    next(new ApiError(500, "Error fetching ticket", error));
  }
};

// READ - Get all tickets (with optional filters)
export const getTickets = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { _id, role } = req.user;
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    let id = _id;
    if (role === "agent") {
      const userAgent = await Agent.findOne({
        userId: _id,
        availability: true,
      });
      if (!userAgent)
        return res
          .status(404)
          .json(new ApiError(404, "Agent not active or not found"));
      id = userAgent._id;
    }

    const query: any = { ...req.query };
    if (role === "agent") query.assignee = id;
    const { pipeline, matchStage, options } = getPipeline(query);

    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "requester",
          foreignField: "_id",
          as: "requesterInfo",
        },
      },
      {
        $unwind: {
          path: "$requesterInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "agents",
          localField: "assignee",
          foreignField: "_id",
          as: "assigneeInfo",
        },
      },
      {
        $unwind: {
          path: "$assigneeInfo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          status: 1,
          dueDate: 1,
          priority: 1,
          createdAt: 1,
          resolutionDate: 1,
          assigneeName: "$assigneeInfo.name",
          assigneeEmail: "$assigneeInfo.email",
          requesterName: "$requesterInfo.name",
          requesterNumber: "$requesterInfo.phoneNumber",
        },
      }
    );

    const response = await Ticket.aggregate(pipeline, options);
    const totalTickets = await Ticket.countDocuments(
      Object.keys(matchStage).length > 0 ? matchStage : {}
    );

    if (!response.length) {
      return res.status(404).json(new ApiError(404, "No Tickets found"));
    }
    const data = paginationResult(
      pageNumber,
      limitNumber,
      totalTickets,
      response
    );
    return res
      .status(200)
      .json(new ApiResponse(200, data, "Tickets fetched successfully"));
  } catch (error) {
    console.log(error);
    next(new ApiError(500, "Error fetching tickets", error));
  }
};

export const getAgents = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNumber = parseInt(page);
    const limitNumber = parseInt(limit);

    const { pipeline, matchStage, options } = getPipeline(req.query);

    const response = await Agent.aggregate(pipeline, options);
    const totalAgents = await Agent.countDocuments(
      Object.keys(matchStage).length > 0 ? matchStage : {}
    );

    if (!response.length) {
      return res.status(200).json(new ApiError(200, "No Tickets found"));
    }
    const data = paginationResult(
      pageNumber,
      limitNumber,
      totalAgents,
      response
    );
    return res
      .status(200)
      .json(new ApiResponse(200, data, "Tickets fetched successfully"));
  } catch (error) {
    console.log(error);
    next(new ApiError(500, "Error fetching tickets", error));
  }
};

export const getUniqueAgents = async (
  req: Request | any,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const users = await Admin.find(
      { role: { $in: ["agent"] }, status: true },
      { _id: 1 }
    );
    const userIds = users.map((admin: any) => admin._id.toString());
    const existingAgents = await Agent.find({}, { _id: 0, userId: 1 });
    const existingAgentsIds = existingAgents.map((agent) =>
      agent.userId.toString()
    );
    const unique =
      userIds && userIds.filter((id) => !existingAgentsIds.includes(id));
    if (unique?.length > 0) {
      const unassignedAgents = await Admin.find({ _id: { $in: unique } });
      const filterdata = unassignedAgents.map((agent: any) => ({
        _id: agent?._id,
        name: agent?.username,
      }));

      return res
        .status(200)
        .json(new ApiResponse(200, filterdata, "Agents Fetched Successfully"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, [], "Agents Fetched Successfully"));
  } catch (error) {
    console.log(error);
    next(new ApiError(500, "Error fetching unique agents", error));
  }
};

// DELETE - Delete a ticket by ID
export const deleteTicket = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const ticketDaTa = await Ticket.findById(id);
    if (!ticketDaTa)
      return res.status(400).json(new ApiError(400, "Ticket not found"));
    if (ticketDaTa && ticketDaTa?.assignee) {
      const agentData = await Agent.findById({ _id: ticketDaTa?.assignee });
      if (agentData) {
        if (agentData.activeTickets > 0) agentData.activeTickets -= 1;
        await agentData.save();
      }
    }
    await Ticket.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Failed to delete ticket", error));
  }
};

// DELETE - Delete a Agent by ID
export const deleteAgent = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  try {
    const { id } = req.params;
    const agent = await Agent.findById(id);

    if (!agent)
      return res.status(400).json(new ApiError(400, "Agent not found"));

    await Ticket.updateMany(
      {
        assignee: id,
        status: { $nin: ["closed", "resolved"] },
      },
      { $unset: { assignee: "" }, $set: { status: "re_assigned" } }
    );

    await Agent.findByIdAndDelete(id);
    res
      .status(200)
      .json({ success: true, message: "Agent deleted successfully!" });
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Failed to delete ticket", error));
  }
};

const createInteractionObject = ({
  initiator,
  receiver,
  initiatorType,
  receiverType,
  action,
  content,
}: any): Promise<any> => {
  const interaction: any = {
    initiator,
    receiver,
    initiatorType,
    receiverType,
    action,
    timestamp: new Date(),
  };

  if (action === "commented") {
    if (!content)
      throw new ApiError(400, "Content is required for 'commented' action");
    interaction.content = content;
  }
  return interaction;
};

// ADD INTERACTION - Add an interaction to a ticket
export const addInteraction = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  try {
    let { role } = req.user;

    if (role === "user") role = "user";

    const { initiator, receiver, action, content, ticketId } = req.body;

    const ticket = await Ticket.findById({ _id: ticketId });
    if (!ticket)
      return res.status(404).json(new ApiError(404, "Ticket not found"));

    if (ticket && ticket?.status === "closed")
      return res.status(404).json(new ApiError(404, "Ticket has been closed"));

    const userExist = await User.findById({
      _id: role === "user" ? initiator : receiver,
    });
    if (!userExist)
      return res.status(404).json(new ApiError(404, "User not found"));

    const agentExist = await Agent.findById({
      _id: role === "user" ? receiver : initiator,
    });
    if (!agentExist)
      return res.status(404).json(new ApiError(404, "Agent not found"));

    const interaction = createInteractionObject({
      action, // for user interaction it must be "commented" and for agent can be anything
      content, // shows the interaction content
      receiver, // if role is user then it will be agent ID or vice-versa
      initiator, // if role is user then it will be user ID or vice-versa
      receiverType: role === "user" ? "Agent" : "user",
      initiatorType: role === "user" ? "user" : "Agent",
    });

    ticket.interactions.push(interaction);
    await ticket.save();

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.log(error);
    res.status(500).json(new ApiError(500, "Failed to add interaction", error));
  }
};

export const manualAssignTicketToAgent = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  try {
    const { ticketId, agentId } = req.body;

    const ticket: any = await Ticket.findById({ _id: ticketId });
    if (!ticket)
      return res.status(404).json(new ApiError(404, "Ticket not found"));

    if (ticket?.assignee)
      return res
        .status(404)
        .json(new ApiError(404, "Ticket is already assigned"));

    const assignedAgent = await Agent.findById({ _id: agentId });
    if (!assignedAgent)
      return res.status(404).json(new ApiError(404, "Agent not found"));

    if (!assignedAgent?.availability)
      return res.status(404).json(new ApiError(404, "Agent is not available"));

    ticket.assignee = assignedAgent._id;
    ticket.status = "in_progress";
    await ticket.save();

    assignedAgent.activeTickets += 1;
    await assignedAgent.save();

    res.status(200).json({
      success: true,
      data: ticket,
      message: "Successfully assigned to agent",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(new ApiError(500, "Failed to Assigned manually"));
  }
};

const getData = async (id: any, role: any): Promise<any> => {
  let ticketData: any = await Ticket.findById({ _id: id })
    .populate("requester", "name email")
    .populate("assignee", "name email")
    .populate("relatedTickets", "title status");

  if (!ticketData) throw new Error("Ticket Doesn not exist: ");

  ticketData = JSON.parse(JSON.stringify(ticketData));

  const interaction: any = [];
  if (ticketData?.interactions?.length > 0) {
    ticketData.interactions.forEach((action: any) => {
      const isUser = role === "user";
      const isSender =
        (isUser && action?.initiatorType === "user") ||
        (!isUser && action?.initiatorType === "Agent");
      interaction.push({ ...action, isSender });
    });
  }
  ticketData.requester.name = ticketData?.requester?.name;
  return { ...ticketData, interactions: interaction };
};

export const updateTicketStatus = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { role } = req.user;
  const { status, id } = req.params;
  try {
    const ticket = await Ticket.findById({ _id: id });
    if (!ticket)
      return res.status(404).json(new ApiError(404, "Ticket not found"));

    if (ticket.status === status)
      return res.status(200).json({ success: true, message: "Status Updated" });

    if (ticket.status === "closed")
      return res
        .status(200)
        .json({ success: true, message: "Ticket has been already closed" });

    if (!ticket?.assignee)
      return res
        .status(404)
        .json(new ApiError(404, "Ticket is not yet assigned"));

    if (
      (status === "closed" || status === "resolved") &&
      !ticket.resolutionDate
    ) {
      ticket.resolutionDate = new Date();
      const agentData: any = await Agent.findById({ _id: ticket.assignee });
      agentData.activeTickets -= 1;
      agentData.resolvedTickets += 1;
      await agentData.save();
    }

    ticket.status = status;
    await ticket.save();

    const data = await getData(id, role);

    return res.status(200).json({
      data: data,
      success: true,
      message: "updated",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(new ApiError(500, "Failed to Assigned manually"));
  }
};

export const updateAgent = async (
  req: Request | any,
  res: Response
): Promise<any> => {
  const { skills, userId, availability } = req.body;
  try {
    const agent = await Agent.findById({ _id: userId });
    if (!agent)
      return res.status(404).json(new ApiError(404, "Agent not found"));

    if (!availability) {
      await Ticket.updateMany(
        {
          assignee: userId,
          status: { $nin: ["closed", "resolved"] },
        },
        { $unset: { assignee: "" }, $set: { status: "re_assigned" } }
      );
      agent.activeTickets = 0;
    }
    agent.availability = availability === "active";
    agent.skills = skills;
    await agent.save();

    return res.status(200).json({
      success: true,
      message: "Agent updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json(new ApiError(500, "Failed to Assigned manually"));
  }
};
