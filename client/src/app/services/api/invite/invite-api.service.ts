import { Injectable } from "@angular/core";
import { ApiService } from "../api.service";
import { SessionService } from "../../session/session.service";
import { ISetupAccountRequest } from "src/app/models/api/request/common/setup-account";
import { IApiResponse } from "src/app/models/api/response/api-response.interface";

@Injectable({
  providedIn: "root"
})
export class InviteApiService {

  protected readonly baseUrl: string = "/invite";

  constructor(
    protected apiService: ApiService,
    protected sessionService: SessionService
  ) { }

  public async setupAccount(payload: ISetupAccountRequest) {
    const response = await this.apiService.post<void>(this.baseUrl + "/setup", payload);

    if (response.errors.length === 0) {
      this.sessionService.setUser();
    }

    return response;
  }

  public async inviteClients(emails: string[], projectId: string): Promise<IApiResponse<void>> {
    return await this.apiService.post<void>(this.baseUrl + "/client", {
      emails,
      projectId
    });
  }

  public async revokeInvite(inviteId: string) {
    const response = await this.apiService.delete(this.baseUrl + "/" + inviteId);
  }

  public async resendInvite(inviteId: string) {
    const response = await this.apiService.get(this.baseUrl + "/resend/" + inviteId);
  }
}
