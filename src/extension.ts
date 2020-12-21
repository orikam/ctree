// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { resolve } from 'dns';
import { Func } from 'mocha';
import * as vscode from 'vscode';
const cp = require('child_process');

class FuncInfo {
	funcName: string = '';
	fileName: string = '';
	desc: string = '';
	pos: number;
	callee: Array<Callee>;

	constructor(funcName: string, fileName: string, pos: number) {
		this.funcName = funcName;
		this.fileName = fileName;
		this.pos = pos;
		this.callee = <Callee[]>[];
	}
}

class Callee {
	funcInfo: FuncInfo;
	pos: Number;
	desc: String;

	constructor(func:FuncInfo, pos:Number, desc:String) {
		this.funcInfo = func;
		this.pos = pos;
		this.desc = desc;
	}
}

export class TreeViewItem extends vscode.TreeItem {
	constructor(
		public readonly label: string,
		private version: string,
		public readonly collapsibleState: vscode.TreeItemCollapsibleState,
		public readonly funcInfo:FuncInfo
	) {
		super(label, collapsibleState);
		this.tooltip = `${this.label}-${this.version}`;
		this.description = this.version;
	}

	contextValue = 'ctreeItem';
}


export class CtreeProvider implements vscode.TreeDataProvider<TreeViewItem> {
	
	constructor(private workspaceRoot?: string) { 
		ctreeViewProvider = this;
	}

	private _onDidChangeTreeData: vscode.EventEmitter<TreeViewItem | undefined | null | void> = new vscode.EventEmitter<TreeViewItem | undefined | null | void>();
  	readonly onDidChangeTreeData: vscode.Event<TreeViewItem | undefined | null | void> = this._onDidChangeTreeData.event;

  	refresh(): void {
    	this._onDidChangeTreeData.fire();
  	}

	getTreeItem(element: TreeViewItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: TreeViewItem): Thenable<TreeViewItem[]> {
		//if (!this.workspaceRoot) {
		//	vscode.window.showInformationMessage('No dependency in empty workspace');
		//	return Promise.resolve([]);
		//}

		if (element) {
			return Promise.resolve(this.getFuncInfo(element.funcInfo));
		} 
		return Promise.resolve(this.getFuncInfo());
	}

	/**
	 * Given the path to package.json, read all its dependencies and devDependencies.
	 */
	private getFuncInfo(func?:FuncInfo): TreeViewItem[] {
		let res:Array<TreeViewItem> = <TreeViewItem[]>[];

		if (func == null) {
			rootGraph.forEach(element => {
				let item:TreeViewItem = new TreeViewItem(element.funcName, '1', vscode.TreeItemCollapsibleState.Collapsed, element);
				res.push(item);
			});
		}
		else {
			func.callee.forEach(element => {
				let item:TreeViewItem = new TreeViewItem(element.funcInfo.funcName, element.funcInfo.pos.toString(), vscode.TreeItemCollapsibleState.Collapsed, element.funcInfo);
				res.push(item);
			});
		}
		return res;
	}

	
}

let ctreeViewProvider: CtreeProvider;
  




export function getRoot(): string {
	let rFolder: vscode.Uri;
	let folder: string = "";

	// The code you place here will be executed every time your command is executed
	if (vscode.workspace.workspaceFolders !== undefined) {
		rFolder = vscode.workspace.workspaceFolders[0].uri;
		folder = rFolder.toString();
		folder = folder.replace('file:', '');

	}
	return folder;
}

export function doCLI(command: string) {

	let dir = getRoot();
	return new Promise((resolve, reject) => {
		cp.exec(command, { cwd: dir }, (error: string, stdout: string, stderr: string) => {
			if (error) {
				console.error(`exec error: ${error}`);
				return;
			}
			resolve(stdout);
		});
	});
}

export async function buildAndLoadDatabase() {
	//	let dir = getRoot();
	await doCLI(`find . -name *.c -o -name *.h > cscope.files`);
	await doCLI(`cscope -b -R -i cscope.files`);
	//await doCLI(`mv cscope.out cscope.out`);

	/*
	let dir = getRoot();
	await doCLI(`find ${dir} -name *.c -o -name *.h > ${dir}/cscope.files`);
	await doCLI(`cscope -b -R -i ${dir}/cscope.files`);
	await doCLI(`mv cscope.out ${dir}/cscope.out`);
	*/
	return ('build done');
}

export function getWord() {
	return new Promise((resolve, reject) => {
		vscode.commands.executeCommand('editor.action.addSelectionToNextFindMatch').then(() => {
			const editor = vscode.window.activeTextEditor;
			{
				if (!editor) {
					vscode.window.showInformationMessage('NO text editor selected');
					return;
				}
			}
			const text = editor.document.getText(editor.selection);
			resolve (text);
		});
	});
}



interface Dictionary<T> {
	[Key: string]: T;
}

let dFunctions:Dictionary<FuncInfo>;


export function decodeLine(line: string): FuncInfo {
	let lineSplit = line.split(' ');
	return new FuncInfo(lineSplit[1], lineSplit[0], Number(lineSplit[2]));
}

/*
export function decodeCaller(line: string): Callee {
	let lineSplit = line.split(' ', 4);
	
	return new Callee(dFunctions[tempCaller.funcName];, lineSplit[0], Number(lineSplit[2]));
}
*/

export async function buildGraph(funcName:string, rootArray:Array<FuncInfo>) {

	let definition = await doCLI(`cscope -d -fcscope.out -L1 ${funcName} `);
	let base = decodeLine(definition as string);
	dFunctions[base.funcName] = base;

	// Find caller functions
	let data:string = await doCLI(`cscope -d -fcscope.out -L3 ${funcName} `) as string;
	// If no caller it means it is root.
	let lines = data.split('\n');
	if(lines.length <= 1) {
		rootArray.push(base);
		return;
	}

	for(let i:number = 0; i < lines.length; i++) {
		let line = lines[i];
		let info:FuncInfo;
		if(line.length > 3) {
			let tempCaller = decodeLine(line);
			let caller = dFunctions[tempCaller.funcName];
			if (caller == null) {
				await buildGraph(tempCaller.funcName, rootArray);
				caller = dFunctions[tempCaller.funcName];
			}
			let callee = new Callee(dFunctions[base.funcName], tempCaller.pos, tempCaller.desc);
			caller.callee.push(callee);
			
		}

	};
	return;
}

let rootGraph:Array<FuncInfo> = <FuncInfo[]>[];

export function showTree(offset:string, funcInfo:FuncInfo) {
	funcInfo.callee.forEach(callee => {
		showTree(offset + '+', callee.funcInfo);
	});
}

export function gotoLine(node:TreeViewItem) {
	let dir = getRoot();
	const uriref: vscode.Uri = vscode.Uri.file(dir + '/' + node.funcInfo.fileName);
        vscode.workspace.openTextDocument(uriref).then(doc => {
            vscode.window.showTextDocument(doc ).then(() => {
				const line: number = node.funcInfo.pos;
				if (vscode.window.activeTextEditor == null)
					return;
                let reviewType: vscode.TextEditorRevealType = vscode.TextEditorRevealType.InCenter;
        		if (line === vscode.window.activeTextEditor.selection.active.line) {
            		reviewType = vscode.TextEditorRevealType.InCenterIfOutsideViewport;
        		}
        		const newSe = new vscode.Selection(line, 0, line, 0);
        		vscode.window.activeTextEditor.selection = newSe;
        		vscode.window.activeTextEditor.revealRange(newSe, reviewType);
            });
        });
}

export async function findCaller() {
	dFunctions = {};
	rootGraph = [];
	let word = await getWord();
	let definition = await doCLI(`cscope -d -fcscope.out -L1 ${word} `);
	let base = decodeLine(definition as string);
	await buildGraph(base.funcName, rootGraph).then(() => {
		rootGraph.forEach(element => {
			showTree('+', element);
		});
	});
	ctreeViewProvider.refresh();
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {


	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ctree.build', () => {
		let rFolder: vscode.Uri;
		let folder: string;

		// The code you place here will be executed every time your command is executed
		if (vscode.workspace.workspaceFolders !== undefined) {
			rFolder = vscode.workspace.workspaceFolders[0].uri;
			folder = rFolder.toString();
			folder = folder.replace('file:', '');
		}



		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from ctree!');
		//buildDatabase();
		buildAndLoadDatabase().then(() => {
			vscode.window.showInformationMessage('Done building database');
		});
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('ctree.findcaller', findCaller);
	context.subscriptions.push(disposable);

	
	disposable = vscode.commands.registerCommand('ctree.gotoline', gotoLine);
	context.subscriptions.push(disposable);

	const ctreeProvider = new CtreeProvider();
	vscode.window.registerTreeDataProvider('ctreeview', ctreeProvider);
	//vscode.window.createTreeView('ctreeview', {treeDataProvider: new CtreeProvider()});

}

// this method is called when your extension is deactivated
export function deactivate() { }
