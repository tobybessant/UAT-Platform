import { Component, OnInit, ViewChild, ElementRef, OnDestroy, Input, Output, EventEmitter } from "@angular/core";
import { ITestSuiteResponse } from "src/app/models/response/supplier/suite.interface";
import { NbMenuItem, NbMenuService } from "@nebular/theme";
import { filter, map } from "rxjs/operators";

@Component({
  selector: "app-test-suite-list",
  templateUrl: "./test-suite-list.component.html",
  styleUrls: ["./test-suite-list.component.scss"]
})
export class TestSuiteListComponent implements OnInit, OnDestroy {

  @Input()
  public set suitesData(data: ITestSuiteResponse[]) {
    this.mapAndAddSuitesToItems(data);
  }

  @Output()
  public suiteSelected = new EventEmitter<string>();

  @Output()
  public suiteAdded = new EventEmitter<string>();

  public newSuiteName: string = "";
  public suites: NbMenuItem[] = [];

  private alive: boolean = true;
  private isAddingSuite: boolean = false;

  @ViewChild("suiteNameInput")
  suiteNameInputRef: ElementRef<HTMLInputElement>;

  constructor(private nbMenuService: NbMenuService) { }

  ngOnInit(): void {
    this.nbMenuService.onItemClick()
      .pipe(
        filter(({ tag }) => tag === "test-suites"),
        map(({ item }) => item)
      )
      .subscribe(item => {
        if (this.alive) {
          this.suiteSelected.emit(item.data.id);
        }
      });
  }

  ngOnDestroy(): void {
    this.alive = false;
  }

  private mapAndAddSuitesToItems(suites: ITestSuiteResponse[] = []) {
    const suiteItems = suites.map(s => ({
      title: s.suiteName,
      data: {
        id: s.id
      }
    }) as NbMenuItem);

    this.suites = suiteItems;
  }

  public getIsAddingSuite(): boolean {
    return this.isAddingSuite;
  }

  public setIsAddingSuite(value: boolean): void {
    if (value === true) {
      setTimeout(() => this.suiteNameInputRef.nativeElement.focus());
      this.newSuiteName = "";
    }

    this.isAddingSuite = value;
  }

  public async addSuite(): Promise<void> {
    if (this.newSuiteName) {
      this.suiteAdded.emit(this.newSuiteName);
      this.newSuiteName = "";
    }
  }
}
