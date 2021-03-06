import { IMock, Mock, It, Times } from "typemoq";
import { ProjectController } from "../../src/controllers";

import { RepositoryService } from "../../src/services/repositoryService";
import { BaseController } from "../../src/controllers/baseController";

import { Request, Response } from "express";
import { UserDbo } from "../../src/database/entities/userDbo";
import { ProjectRepository } from "../../src/repositories/projectRepository";
import { IProjectResponse } from "../../src/dto/response/supplier/project";
import { UserRepository } from "../../src/repositories/userRepository";
import { CREATED, OK, BAD_REQUEST, INTERNAL_SERVER_ERROR } from "http-status-codes";
import { ProjectDbo } from "../../src/database/entities/projectDbo";
import { IUserToken } from "../../src/dto/response/common/userToken";
import { TestSuiteRepository } from "../../src/repositories/suiteRepository";
import { SuiteDbo } from "../../src/database/entities/suiteDbo";
import { ProjectInviteRepository } from "../../src/repositories/projectInviteRepository";
import { deepStrictEqual } from "../testUtils/deepStrictEqual";
import { CaseDbo } from "../../src/database/entities/caseDbo";
import { StepDbo } from "../../src/database/entities/stepDbo";

suite("Project Controller", () => {
  let userRepository: IMock<UserRepository>;
  let projectRepository: IMock<ProjectRepository>;
  let projectInviteRepository: IMock<ProjectInviteRepository>;
  let suiteRepository: IMock<TestSuiteRepository>;
  let repositoryService: IMock<RepositoryService>;

  let req: IMock<Request>;
  let res: IMock<Response>;

  let subject: ProjectController;

  setup(() => {
    userRepository = Mock.ofType<UserRepository>();
    projectRepository = Mock.ofType<ProjectRepository>();
    projectInviteRepository = Mock.ofType<ProjectInviteRepository>();
    suiteRepository = Mock.ofType<TestSuiteRepository>();
    repositoryService = Mock.ofType<RepositoryService>();

    req = Mock.ofType<Request>();
    res = Mock.ofType<Response>();

    subject = new ProjectController(projectRepository.object, userRepository.object, projectInviteRepository.object);
  });

  teardown(() => {
    userRepository.reset();
    repositoryService.reset();
    req.reset();
    res.reset();
  });

  suite("Create Project", async () => {
    let createProjectBody: any;
    let savedProject: ProjectDbo;
    let createProjectResponse: IProjectResponse | undefined;
    let user: UserDbo | undefined;

    suite("Valid request conditions", () => {
      setup(() => {
        createProjectBody = {
          title: "New Project!"
        };

        savedProject = new ProjectDbo();
        savedProject.id = 4;
        savedProject.createdDate = new Date();
        savedProject.suites = [];
        savedProject.title = createProjectBody.title;

        createProjectResponse = {
          title: savedProject.title,
          id: savedProject.id.toString(),
          suites: savedProject.suites.map(suite => ({
            id: suite.id.toString(),
            title: suite.title
          }))
        };

        user = new UserDbo();
      });

      test("It should return the projectName in the response body", async () => {
        given_userRepository_getUserByEmail_returns_whenGiven(user, It.isAny());
        given_projectRepository_addProject_returns(savedProject);
        given_Request_body_is(createProjectBody);

        await subject.createProject(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.payload, createProjectResponse))), Times.once());
      });

      test("It should have statusCode 201", async () => {
        given_userRepository_getUserByEmail_returns_whenGiven(user, It.isAny());
        given_projectRepository_addProject_returns(savedProject);
        given_Request_body_is(createProjectBody);

        await subject.createProject(req.object, res.object);

        res.verify(r => r.status(CREATED), Times.once());
      });
    });

    suite("Find user by email fails to find a user", async () => {
      setup(() => {
        createProjectBody = {
          projectName: "New Project2!"
        };
        createProjectResponse = undefined;
        user = undefined;
      });

      test("Should return error 'Error finding user'", async () => {
        given_userRepository_getUserByEmail_returns_whenGiven(user, It.isAny());
        given_Request_body_is(createProjectBody);

        await subject.createProject(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.errors, ["Error finding user"]))), Times.once());
      });

      test("It should have statusCode 400", async () => {
        given_userRepository_getUserByEmail_returns_whenGiven(user, It.isAny());
        given_Request_body_is(createProjectBody);

        await subject.createProject(req.object, res.object);

        res.verify(r => r.status(BAD_REQUEST), Times.once());
      });
    });

    suite("Unexpected 'Error' thrown by userRepository", () => {

      setup(() => {
        createProjectBody = {
          title: "New Project!"
        };
      });

      test(`Response payload contains generic '${BaseController.INTERNAL_SERVER_ERROR_MESSAGE}' error message`, async () => {
        given_Request_body_is(createProjectBody);
        given_userRepository_getUserByEmail_throws();

        await subject.createProject(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.errors, [BaseController.INTERNAL_SERVER_ERROR_MESSAGE]))), Times.once());
      });

      test("Response returns statusCode 500", async () => {
        given_Request_body_is(createProjectBody);
        given_userRepository_getUserByEmail_throws();

        await subject.createProject(req.object, res.object);

        res.verify(r => r.status(INTERNAL_SERVER_ERROR), Times.once());
      });

    });

    suite("Unexpected 'Error' thrown by projectRepository", () => {

      setup(() => {
        createProjectBody = {
          title: "New Project!"
        };

        user = new UserDbo();
      });

      test(`Response payload contains generic '${BaseController.INTERNAL_SERVER_ERROR_MESSAGE}' error message`, async () => {
        given_Request_body_is(createProjectBody);
        given_userRepository_getUserByEmail_returns_whenGiven(user, It.isAny());
        given_projectRepository_getProjectById_throws();

        await subject.createProject(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.errors, [BaseController.INTERNAL_SERVER_ERROR_MESSAGE]))), Times.once());
      });

      test("Response returns statusCode 500", async () => {
        given_Request_body_is(createProjectBody);
        given_userRepository_getUserByEmail_returns_whenGiven(user, It.isAny());
        given_projectRepository_getProjectById_throws();

        await subject.createProject(req.object, res.object);

        res.verify(r => r.status(INTERNAL_SERVER_ERROR), Times.once());
      });

    });

  });

  suite("Get Project by ID", async () => {
    let params: any;
    let getProjectBody: any;
    let project: ProjectDbo;
    let projectResponse: IProjectResponse;
    let query: any;

    suite("Valid request conditions, fetching non-extended result", () => {
      setup(() => {
        const testSuite = new SuiteDbo();
        testSuite.id = 3;
        testSuite.title = "Suite 1";

        project = new ProjectDbo();
        project.id = 4000;
        project.title = "Fetched Project Title";
        project.suites = [testSuite];

        params = {
          id: project.id
        };

        projectResponse = {
          id: project.id.toString(),
          title: project.title,
          suites: project.suites.map(s => ({
            id: s.id.toString(),
            title: s.title
          }))
        };

        query = {
          extensive: false
        };
      });

      test("Should return project in response body", async () => {
        given_Request_query_is(query);
        given_projectRepository_userHasAccessToProject_returns(true);
        given_projectRepository_getProjectById_returns_whenGiven(project, params.id, query.extensive);
        given_Request_params_are(params);

        await subject.getProjectById(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.payload, projectResponse))), Times.once());
      });

      test("Should have statusCode 200", async () => {
        given_Request_query_is(query);
        given_projectRepository_userHasAccessToProject_returns(true);
        given_projectRepository_getProjectById_returns_whenGiven(project, params.id, query.extensive);
        given_Request_params_are(params);

        await subject.getProjectById(req.object, res.object);

        res.verify(r => r.status(OK), Times.once());
      });
    });

    suite("Valid request conditions, fetching extended result", () => {
      let testCase: CaseDbo;
      let step: StepDbo;

      setup(() => {
        step = new StepDbo();
        step.id = 4;
        step.description = "step 1";

        testCase = new CaseDbo();
        testCase.id = 5;
        testCase.steps = [step];

        const testSuite = new SuiteDbo();
        testSuite.id = 3;
        testSuite.title = "Suite 1";
        testSuite.cases = [testCase];

        project = new ProjectDbo();
        project.id = 4000;
        project.title = "Fetched Project Title";
        project.suites = [testSuite];

        params = {
          id: project.id
        };

        projectResponse = {
          id: project.id.toString(),
          title: project.title,
          suites: project.suites.map(s => ({
            id: s.id.toString(),
            title: s.title,
            cases: s.cases.map(c => ({
              id: c.id.toString(),
              title: c.title,
              steps: c.steps.map(st => ({
                id: st.id.toString(),
                description: st.description
              }))
            }))
          }))
        };

        query = {
          extensive: true
        };
      });

      test("Should return entire project in response body", async () => {
        given_Request_query_is(query);
        given_projectRepository_userHasAccessToProject_returns(true);
        given_projectRepository_getProjectById_returns_whenGiven(project, params.id, query.extensive);
        given_Request_params_are(params);

        await subject.getProjectById(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.payload, projectResponse))), Times.once());
      });

      test("Should return responseCode 200", async () => {
        given_Request_query_is(query);
        given_projectRepository_userHasAccessToProject_returns(true);
        given_projectRepository_getProjectById_returns_whenGiven(project, params.id, query.extensive);
        given_Request_params_are(params);

        await subject.getProjectById(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.payload, projectResponse))), Times.once());
      });

    });


    suite("Find project by id does not find project", () => {
      setup(() => {
        getProjectBody = {
          id: "4000"
        };
      });

      test("Should return 'Error finding project' in response errors", async () => {
        given_projectRepository_getProjectById_returns_whenGiven(undefined, It.isAny());
        given_Request_body_is(getProjectBody);

        await subject.getProjectById(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.errors, ["Error finding project"]))), Times.once());
      });

      test("Should have statusCode 400", async () => {
        given_projectRepository_getProjectById_returns_whenGiven(undefined, It.isAny());
        given_Request_body_is(getProjectBody);

        await subject.getProjectById(req.object, res.object);

        res.verify(r => r.status(BAD_REQUEST), Times.once());
      });
    });

    suite("Unexpected 'Error' thrown by projectRepository", () => {
      setup(() => {
        getProjectBody = {
          id: project.id
        };
      });

      test(`Error 'Error finding project' returned in response errors`, async () => {
        given_Request_body_is(getProjectBody);
        given_projectRepository_getProjectById_throws();

        await subject.getProjectById(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.errors, ["Error finding project"]))), Times.once());
      });

      test("Response returns statusCode 500", async () => {
        given_Request_body_is(getProjectBody);
        given_projectRepository_getProjectById_throws();

        await subject.getProjectById(req.object, res.object);

        res.verify(r => r.status(BAD_REQUEST), Times.once());
      });

    });

  });

  suite("Get projects", () => {
    let userToken: IUserToken;
    const projects: ProjectDbo[] = [];
    const projectsResponse: IProjectResponse[] = [];

    suite("Valid request conditions", () => {
      setup(() => {
        userToken = {
          email: "test@me.com",
          type: "Supplier"
        };

        for (let i = 0; i < 10; i++) {
          const p = new ProjectDbo();
          p.id = i;
          p.title = "Project " + i;
          projects.push(p);
        }

        for (const project of projects) {
          projectsResponse.push({
            id: project.id.toString(),
            title: project.title
          });
        }
      });

      test("Should return list of projects in response body", async () => {
        given_Request_user_is(userToken);
        given_projectRepository_getProjectsForUser_returns_whenGiven(projects, userToken.email);

        await subject.getProjects(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.payload, projectsResponse))), Times.once());
      });

      test("Should return statusCode of 200", async () => {
        given_Request_user_is(userToken);
        given_projectRepository_getProjectsForUser_returns_whenGiven(projects, userToken.email);

        await subject.getProjects(req.object, res.object);

        res.verify(r => r.status(OK), Times.once());
      });
    });

    suite("Unexpected 'Error' thrown by projectRepository", () => {

      setup(() => {
        userToken = {
          email: "test@me.com",
          type: "Supplier"
        };
      });

      test(`Generic error '${BaseController.INTERNAL_SERVER_ERROR_MESSAGE}' returned in response errors`, async () => {
        given_Request_user_is(userToken);
        given_projectRepository_getProjectsForUser_throws();

        await subject.getProjects(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.errors, [BaseController.INTERNAL_SERVER_ERROR_MESSAGE]))), Times.once());
      });

      test("Response returns statusCode 500", async () => {
        given_Request_user_is(userToken);
        given_projectRepository_getProjectsForUser_throws();

        await subject.getProjects(req.object, res.object);

        res.verify(r => r.status(INTERNAL_SERVER_ERROR), Times.once());
      });
    });

  });

  suite("Delete project", () => {
    let requestParams: any;

    suite("Valid request condtions", () => {
      setup(() => {
        requestParams = {
          id: "10"
        };
      });

      test("Nothing is returned in the response payload", async () => {
        given_projectRepository_deleteProject_returns_whenGiven(undefined, requestParams.id);
        given_Request_params_are(requestParams);

        await subject.deleteProject(req.object, res.object);

        res.verify(r => r.json(It.is(body => body.payload === undefined)), Times.once());
      });

      test("Status code is 200", async () => {
        given_projectRepository_deleteProject_returns_whenGiven(undefined, requestParams.id);
        given_Request_params_are(requestParams);

        await subject.deleteProject(req.object, res.object);

        res.verify(r => r.status(OK), Times.once());
      });
    });

    suite("Unexpected 'Error' thrown by projectRepository", () => {

      setup(() => {
        requestParams = {
          id: "10"
        };
      });

      test(`Generic error '${BaseController.INTERNAL_SERVER_ERROR_MESSAGE}' returned in response errors`, async () => {
        given_Request_params_are(requestParams);
        given_projectRepository_deleteProjectById_throws();

        await subject.deleteProject(req.object, res.object);

        res.verify(r => r.json(It.is(body => deepStrictEqual(body.errors, [BaseController.INTERNAL_SERVER_ERROR_MESSAGE]))), Times.once());
      });

      test("Response returns statusCode 500", async () => {
        given_Request_params_are(requestParams);
        given_projectRepository_deleteProjectById_throws();

        await subject.deleteProject(req.object, res.object);

        res.verify(r => r.status(INTERNAL_SERVER_ERROR), Times.once());
      });
    });
  });

  function given_Request_user_is(user: IUserToken) {
    req
      .setup(r => r.user)
      .returns(() => user);
  }

  function given_Request_query_is(q: any) {
    req
      .setup(r => r.query)
      .returns(() => q);
  }

  function given_Request_body_is(body: any): void {
    req
      .setup(r => r.body)
      .returns(() => body);
  }

  function given_Request_params_are(params: any): void {
    req
      .setup(r => r.params)
      .returns(() => params);
  }

  function given_userRepository_getUserByEmail_returns_whenGiven(returns: UserDbo | undefined, whenGiven: any) {
    userRepository
      .setup(ur => ur.getUserByEmail(whenGiven))
      .returns(async () => returns);
  }

  function given_userRepository_getUserByEmail_throws() {
    userRepository
      .setup(ur => ur.getUserByEmail(It.isAny()))
      .throws(new Error("Error containing sensitive database information!"));
  }

  function given_projectRepository_addProject_returns(returns: ProjectDbo) {
    projectRepository
      .setup(pr => pr.addProject(It.isAny(), It.isAny()))
      .returns(async () => returns);
  }

  function given_projectRepository_getProjectById_returns_whenGiven(returns: ProjectDbo | undefined, ...[id, extensive]: any[]) {
    projectRepository
      .setup(pr => pr.getProjectById(id, extensive))
      .returns(async () => returns);
  }

  function given_projectRepository_getProjectsForUser_returns_whenGiven(returns: ProjectDbo[] | undefined, whenGiven: any) {
    projectRepository
      .setup(pr => pr.getProjectsForUser(whenGiven))
      .returns(async () => returns);
  }

  function given_projectRepository_deleteProject_returns_whenGiven(returns: any, whenGiven: any) {
    projectRepository
      .setup(pr => pr.deleteProjectById(whenGiven))
      .returns(async () => returns);
  }

  function given_projectRepository_getTestSuitesForProject_returns_whenGiven(returns: SuiteDbo[], whenGiven: any) {
    projectRepository
      .setup(pr => pr.getTestSuitesForProject(whenGiven))
      .returns(async () => returns);
  }

  function given_projectRepository_getProjectById_throws() {
    projectRepository
      .setup(pr => pr.getProjectById(It.isAny()))
      .throws(new Error("Sensitive database information!"));
  }

  function given_projectRepository_getProjectsForUser_throws() {
    projectRepository
      .setup(pr => pr.getProjectsForUser(It.isAny()))
      .throws(new Error("Sensitive database information!"));
  }

  function given_projectRepository_deleteProjectById_throws() {
    projectRepository
      .setup(pr => pr.deleteProjectById(It.isAny()))
      .throws(new Error("Sensitive database information!"));
  }

  function given_projectRepository_userHasAccessToProject_returns(returns: boolean) {
    projectRepository
      .setup(p => p.userHasAccessToProject(It.isAny(), It.isAny()))
      .returns(async () => returns);
  }
});
