import { Controller, ClassMiddleware, Post } from "@overnightjs/core";
import { injectable } from "tsyringe";
import { checkAuthentication } from "../services/middleware/checkAuthentication";
import { TestRepository } from "../repositories/testRepository";
import { Request, Response } from "express";
import { TestSuiteRepository } from "../repositories/testSuiteRepository";
import { TestDbo } from "../database/entities/testDbo";
import { ITestResponse } from "../dto/supplier/test";
import { IApiResponse } from "../dto/common/apiResponse";
import { OK, INTERNAL_SERVER_ERROR } from "http-status-codes";

@injectable()
@Controller("test")
@ClassMiddleware(checkAuthentication)
export class TestController {
  constructor(
    private testRepository: TestRepository,
    private suiteRepository: TestSuiteRepository
  ) { }


  @Post("create")
  public async addTest(req: Request, res: Response) {
    const { testCase, suiteId } = req.body;

    const suite = await this.suiteRepository.getTestSuiteById(suiteId);
    if (suite) {
      const test = await this.testRepository.addTest(suite, testCase);

      res.status(OK);
      res.json({
        errors: [],
        payload: ((record: TestDbo) =>
          ({
            id: record.id,
            testCase: record.testCase
          })
        )(test)
      } as IApiResponse<ITestResponse>);

    } else {
      res.status(INTERNAL_SERVER_ERROR);
      res.json({
        errors: ["Failure adding suite"],
      } as IApiResponse<ITestResponse>);
    }
  }

  @Post()
  public async getTestsForSuite(req: Request, res: Response) {
    const { suiteId } = req.body;

    try {
      const tests = await this.testRepository.getTestsForTestSuite(suiteId);

      res.status(OK);
      res.json({
        errors: [],
        payload: tests!.map(t =>
          ({
            id: t.id,
            testCase: t.testCase,
          }))
      } as IApiResponse<ITestResponse[]>);
    } catch (error) { }
  }
}