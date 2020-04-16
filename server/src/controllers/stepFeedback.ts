import { Post, Controller, Get, Middleware } from "@overnightjs/core";
import { Request, Response } from "express";
import { UserRepository } from "../repositories/userRepository";
import StepRepository from "../repositories/stepRepository";
import { StepFeedbackRepository } from "../repositories/stepFeedbackRepository";
import { ApiError } from "../services/apiError";
import { BAD_REQUEST } from "http-status-codes";
import { BaseController } from "./baseController";
import { injectable } from "tsyringe";
import { BASE_ENDPOINT } from "./BASE_ENDPOINT";
import { ICreateFeedbackRequest } from "../dto/request/client/feedback.interface";
import { BodyMatches } from "../services/middleware/joi/bodyMatches";
import { Validator } from "joiful";
import { CreateFeedback } from "../services/middleware/joi/schemas/createFeedback";
import { IStepFeedbackResponse } from "../dto/response/client/feedback.interface";
import { StepFeedbackDbo } from "../database/entities/stepFeedbackDbo";
import { UserDbo } from "../database/entities/userDbo";
import { IUserStepFeedbackResponse } from "../dto/response/supplier/userStepFeedback.interface";

@injectable()
@Controller(`${BASE_ENDPOINT}/feedback`)
export class StepFeedbackController extends BaseController {

  constructor(
    private userRepository: UserRepository,
    private stepRepository: StepRepository,
    private stepFeedbackRepository: StepFeedbackRepository
  ) {
    super();
  }

  @Post()
  @Middleware(new BodyMatches(new Validator()).schema(CreateFeedback))
  public async addStepFeedback(req: Request, res: Response) {
    const model: ICreateFeedbackRequest = req.body;

    try {
      const user = await this.userRepository.getUserByEmail(req.user?.email || "");
      if (!user) throw new ApiError("User not found", BAD_REQUEST);

      const step = await this.stepRepository.getStepById(model.stepId.toString());
      if (!step) throw new ApiError("Step not found", BAD_REQUEST);

      const addFeedback = await this.stepFeedbackRepository.addStepFeedback(user, step, model.notes, model.status);

      return this.created<IStepFeedbackResponse>(res, {
        createdDate: addFeedback.createdDate,
        id: addFeedback.id.toString(),
        notes: addFeedback.notes,
        status: {
          id: addFeedback.status.id.toString(),
          label: addFeedback.status.label
        }
      });
    } catch (error) {
      return this.serverError(res, error);
    }
  }

  @Get()
  public async getLatestUserFeedbackForStep(req: Request, res: Response) {
    try {
      if (!req.query.userEmail && req.query.stepId) {
        const feedbackPerUser: UserDbo[] = await this.stepFeedbackRepository.getAllUserFeedbackForStep(req.query.stepId);
        return this.OK<IUserStepFeedbackResponse[]>(res, feedbackPerUser.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdDate: user.createdDate,
          feedback: user.stepFeedback.map(s => ({
            id: s.id.toString(),
            createdDate: s.createdDate,
            notes: s.notes,
            status: {
              id: s.status.id.toString(),
              label: s.status.label
            }
          }))
        })));
      }

      if (req.query.projectId) {
        const feedbackPerUser: UserDbo[] = await this.stepFeedbackRepository.getFeedbackForProject(req.query.projectId);
        const userFeedbackMap: any = {};

        // tslint:disable-next-line: prefer-for-of
        console.time("Mapped user feedback data");
        for (let i = 0; i < feedbackPerUser.length; i++) {
          const results: any = {};
          const u = feedbackPerUser[i];
          // tslint:disable-next-line: prefer-for-of
          for (let j = 0; j < u.stepFeedback.length; j++) {
            const f = u.stepFeedback[j];
            if (!results[f.step.id]) {
              results[f.step.id] = f;
            }
          }
          userFeedbackMap[u.email] = results;
        }
        console.timeEnd("Mapped user feedback data");

        return this.OK<any[]>(res, feedbackPerUser.map(user => ({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdDate: user.createdDate,
          feedback: userFeedbackMap[user.email]
        })));
      }

      const feedback = await this.stepFeedbackRepository.getUserFeedbackForStep(req.query.stepId, req.query.userEmail);
      if (req.query.onlyLatest) {
        const latestFeedback: StepFeedbackDbo | undefined = feedback[0];

        if (latestFeedback) {
          return this.OK<IStepFeedbackResponse>(res, {
            createdDate: latestFeedback.createdDate,
            id: latestFeedback.id.toString(),
            notes: latestFeedback.notes,
            status: {
              id: latestFeedback.status.id.toString(),
              label: latestFeedback.status.label
            },
            user: {
              createdDate: latestFeedback.user.createdDate,
              email: latestFeedback.user.email,
              firstName: latestFeedback.user.firstName,
              lastName: latestFeedback.user.lastName,
              id: latestFeedback.user.id
            }
          });
        }
        return this.OK(res);
      }

      return this.OK<IStepFeedbackResponse[]>(res, feedback.map(f => ({
        createdDate: f.createdDate,
        id: f.id.toString(),
        notes: f.notes,
        status: {
          id: f.status.id.toString(),
          label: f.status.label
        },
        user: {
          createdDate: f.user.createdDate,
          email: f.user.email,
          firstName: f.user.firstName,
          lastName: f.user.lastName,
          id: f.user.id
        }
      })));
    } catch (error) {
      return this.serverError(res, error);
    }
  }
}
