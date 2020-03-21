import { injectable } from "tsyringe";
import { Controller, ClassMiddleware, Post, Middleware, Get, Delete } from "@overnightjs/core";
import { Request, Response } from "express";
import { checkAuthentication } from "../services/middleware/checkAuthentication";
import { BodyMatches } from "../services/middleware/joi/bodyMatches";
import { PermittedAccountTypes } from "../services/middleware/permittedAccountTypes";
import { CreateProjectSchema } from "../services/middleware/joi/schemas/createProject";
import { ProjectDbo } from "../database/entities/projectDbo";
import { BAD_REQUEST, CREATED, OK, INTERNAL_SERVER_ERROR, NOT_FOUND } from "http-status-codes";
import { IApiResponse } from "../dto/common/apiResponse";
import { ICreateProjectResponse } from "../dto/supplier/createProject";
import { IUserToken } from "../dto/common/userToken";
import { IProjectResponse } from "../dto/supplier/project";
import { ProjectRepository } from "../repositories/projectRepository";
import { UserRepository } from "../repositories/userRepository";

@injectable()
@Controller("project")
@ClassMiddleware(checkAuthentication)
export class ProjectController {

  constructor(
    private projectRepository: ProjectRepository,
    private userRepository: UserRepository
  ) { }

  @Post("create")
  @Middleware([
    BodyMatches.schema(CreateProjectSchema),
    PermittedAccountTypes.are(["Supplier"])
  ])
  public async createProject(req: Request, res: Response) {
    const { title } = req.body;

    try {
      const user = await this.userRepository.getUserByEmail((req.user as IUserToken).email);
      if (!user) {
        throw new Error("Error finding user");
      }

      await this.projectRepository.addProject(user, title);

      res.status(CREATED);
      res.json({
        errors: [],
        payload: {
          title
        }
      } as IApiResponse<ICreateProjectResponse>);
    } catch (error) {
      const errors: string[] = [
        error.message ? error.message : "Error creating project"
      ];

      res.status(INTERNAL_SERVER_ERROR);
      res.json({ errors } as IApiResponse<ICreateProjectResponse>);
    }
  }

  @Post()
  public async getProjectById(req: Request, res: Response) {
    const { id } = req.body;

    try {
      const project = await this.projectRepository.getProjectById(id);

      if (!project) {
        throw new Error("That project does not exist");
      }

      res.json({
        errors: [],
        payload: ((record: ProjectDbo) =>
          ({
            id: record.id,
            title: record.title,
            suites: record.suites.map(s => ({
              id: s.id,
              title: s.title
            }))
          })
        )(project)
      } as IApiResponse<IProjectResponse>);
      res.status(OK);
    } catch (error) {
      res.status(NOT_FOUND);
      res.json({
        errors: [error.message]
      } as IApiResponse<IProjectResponse>);
    }
  }

  @Get("all")
  public async getProjects(req: Request, res: Response) {
    try {
      let projects = await this.projectRepository.getProjectsForUser((req.user as IUserToken).email);
      projects = projects ? projects : [];

      res.status(OK);
      res.json({
        errors: [],
        payload: projects.map(r =>
          ({
            id: r.id,
            title: r.title
          }))
      } as IApiResponse<IProjectResponse[]>)
    } catch (error) {
      res.status(INTERNAL_SERVER_ERROR);
      res.json({
        errors: [error.message]
      } as IApiResponse<IProjectResponse>);
    }
  }

  @Delete(":id")
  public async deleteProject(req: Request, res: Response) {
    const projectId = req.params.id;

    try {
      const deletedProject = await this.projectRepository.deleteProjectById(projectId);
      res.status(OK);
      res.json({
        errors: []
      } as unknown as IApiResponse<any>);
      return;

    } catch (error) {
      res.status(BAD_REQUEST);
      res.json({
        errors: [error.message]
      } as IApiResponse<any>);
    }
  }
}
