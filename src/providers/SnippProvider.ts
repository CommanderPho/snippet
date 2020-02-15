import * as vscode from "vscode";
import { join as pathJoin } from "path";
import Snipp from "../interfaces/snipp";

/**
 * Group interface
 */
export interface Group {
  name: string;
  contentType: string | undefined;
}
export class SnippModel {
  constructor(
    readonly view: string,
    private context: vscode.ExtensionContext
  ) {}

  public get roots(): Thenable<Group[]> {
    const snipps = this.context?.globalState?.get("snipps", []);
    const types = snipps
      .map((snipp: Snipp) => snipp.contentType)
      .filter((value, index, self) => self.indexOf(value) === index)
      .map(type => ({ name: type, contentType: undefined }));
    return Promise.resolve(types);
  }

  public getChildren(node: Group): Thenable<Snipp[]> {
    const snipps = this.context?.globalState
      ?.get("snipps", [])
      .filter((snipp: Snipp) => {
        return snipp.contentType === node.name;
      });
    return Promise.resolve(snipps);
  }

  public getContent(resource: vscode.Uri): Thenable<string> {
    return Promise.resolve("");
  }
}

export class GroupModel {}

export class SnippProvider
  implements
    vscode.TreeDataProvider<Snipp | Group>,
    vscode.TextDocumentContentProvider {
  private _onDidChangeTreeData: vscode.EventEmitter<
    any
  > = new vscode.EventEmitter<any>();
  readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData
    .event;

  constructor(
    private readonly model: SnippModel,
    private context: vscode.ExtensionContext
  ) {}

  public refresh(): any {
    this._onDidChangeTreeData.fire();
  }

  public isSnipp(object: any): object is Group {
    return "content" in object;
  }

  public getTreeItem(element: Snipp | Group): vscode.TreeItem {
    const t = element.name;
    let icn = pathJoin(
      __filename,
      "..",
      "..",
      "..",
      "resources",
      "icons",
      `folder-${t}.svg`
    );
    const isSnip = this.isSnipp(element);
    if (isSnip) {
      const it = element.contentType;
      icn = pathJoin(
        __filename,
        "..",
        "..",
        "..",
        "resources",
        "icons",
        `${it}.svg`
      );
    }

    return {
      label: isSnip ? element.name : element.name.toUpperCase(),
      iconPath: icn,
      collapsibleState: !isSnip
        ? vscode.TreeItemCollapsibleState.Collapsed
        : undefined
    };
  }

  public getChildren(
    element?: Snipp | Group
  ): Snipp[] | Thenable<Snipp[]> | Group[] | Thenable<Group[]> {
    return element ? this.model.getChildren(element) : this.model.roots;
  }

  public provideTextDocumentContent(
    uri: vscode.Uri,
    token?: vscode.CancellationToken
  ): vscode.ProviderResult<string> {
    return this.model.getContent(uri).then(content => {
      return content;
    });
  }
}

export class SnippExplorer {
  private snippViewer: vscode.TreeView<Snipp>;

  constructor(context: vscode.ExtensionContext) {
    const snippModel = new SnippModel("recent", context);

    const snippDataProvider = new SnippProvider(snippModel, context);

    this.snippViewer = vscode.window.createTreeView("allSnipps", {
      treeDataProvider: snippDataProvider
    });

    vscode.commands.registerCommand("allSnipps.refreshEntry", () => {
      snippDataProvider.refresh();
    });

    vscode.commands.registerCommand("allSnipps.addEntry", () => {
      vscode.window.showInformationMessage(`Successfully called add entry.`);
    });

    vscode.commands.registerCommand(
      "allSnipps.deleteEntry",
      (snippToDelete: Snipp) => {
        const existingSnipps = context.globalState.get("snipps", []);

        const updatedSnipps = existingSnipps.filter((snipp: Snipp) => {
          return JSON.stringify(snipp) !== JSON.stringify(snippToDelete);
        });

        context.globalState.update("snipps", updatedSnipps);

        vscode.window.showInformationMessage(`Snipp deleted`);
        snippDataProvider.refresh();
      }
    );

    vscode.commands.registerCommand("allSnipps.insertEntry", (snipp: Snipp) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && snippDataProvider.isSnipp(snipp)) {
        const position = editor?.selection.active;
        editor.edit(edit => {
          edit.insert(position, snipp.content || "");
        });
      } else if(editor && !snippDataProvider.isSnipp(snipp)) {
        vscode.window.showErrorMessage(`Please choose a Snipp instead of a group`);
      } else if (!editor){
        vscode.window.showErrorMessage(`Please open a file to insert a Snipp`);
      } else  {
        vscode.window.showErrorMessage(`Failed to insert Snipp!`);
      }
    });
  }
}
